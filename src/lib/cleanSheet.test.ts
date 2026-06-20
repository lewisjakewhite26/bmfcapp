import { describe, expect, it } from 'vitest'
import {
  goalkeepersFromLiveLog,
  resolveCleanSheetGoalkeepers,
} from './cleanSheet'
import { aggregatePlayerStats } from './playerStats'
import type { FixtureWithResult, Lineup, SquadMember } from '../types'
import type { LiveLogEntry } from './liveMatchEvents'

const squad: SquadMember[] = [
  {
    id: 's1',
    player_id: 'gk1',
    display_name: 'Tom GK',
    squad_number: null,
    position: 'Goalkeeper',
    joined_date: '2023-08-01',
    active: true,
  },
  {
    id: 's2',
    player_id: 'gk2',
    display_name: 'Ben GK',
    squad_number: null,
    position: 'Goalkeeper',
    joined_date: '2023-08-01',
    active: true,
  },
  {
    id: 's3',
    player_id: 'fwd1',
    display_name: 'Sam Forward',
    squad_number: null,
    position: 'Forward',
    joined_date: '2023-08-01',
    active: true,
  },
]

function shutoutFixture(overrides: Partial<FixtureWithResult> & { id: string }): FixtureWithResult {
  return {
    id: overrides.id,
    match_date: overrides.match_date ?? '2025-09-01T12:00:00.000Z',
    opponent: overrides.opponent ?? 'Rivals FC',
    home_away: 'home',
    competition: 'League',
    venue: null,
    kickoff_time: '10:30:00',
    ddsfl_fixture_id: null,
    status: 'completed',
    created_at: '2025-09-01T12:00:00.000Z',
    result: overrides.result ?? {
      id: `r-${overrides.id}`,
      fixture_id: overrides.id,
      goals_for: 1,
      goals_against: 0,
      notes: null,
      created_at: '2025-09-01T12:00:00.000Z',
    },
    events: overrides.events ?? [],
  }
}

describe('resolveCleanSheetGoalkeepers', () => {
  it('uses live log with keeper substitution on a shutout', () => {
    const liveLog: LiveLogEntry[] = [
      {
        id: 'sub1',
        kind: 'substitution',
        minute: 60,
        player_off_id: 'gk1',
        player_on_id: 'gk2',
      },
    ]

    const resolution = resolveCleanSheetGoalkeepers({
      liveLogEntries: liveLog,
      lineupSlots: [{ position: 'GK', player_id: 'gk1' }],
      manualGoalkeeperId: null,
      squad,
    })

    expect(resolution.source).toBe('live')
    expect(resolution.keeperIds.sort()).toEqual(['gk1', 'gk2'])
  })

  it('uses saved lineup when no live log exists', () => {
    const resolution = resolveCleanSheetGoalkeepers({
      liveLogEntries: [],
      lineupSlots: [{ position: 'GK', player_id: 'gk1' }],
      manualGoalkeeperId: 'gk2',
      squad,
    })

    expect(resolution.source).toBe('lineup')
    expect(resolution.keeperIds).toEqual(['gk1'])
  })

  it('uses manual override when no live log or lineup exists', () => {
    const resolution = resolveCleanSheetGoalkeepers({
      liveLogEntries: null,
      lineupSlots: null,
      manualGoalkeeperId: 'gk2',
      squad,
    })

    expect(resolution.source).toBe('manual')
    expect(resolution.keeperIds).toEqual(['gk2'])
  })

  it('returns no keepers when no data is available', () => {
    const resolution = resolveCleanSheetGoalkeepers({
      liveLogEntries: null,
      lineupSlots: null,
      manualGoalkeeperId: null,
      squad,
    })

    expect(resolution.source).toBeNull()
    expect(resolution.keeperIds).toEqual([])
  })
})

describe('goalkeepersFromLiveLog', () => {
  it('tracks starter and replacement keeper', () => {
    const keepers = goalkeepersFromLiveLog(
      [
        {
          id: 'sub1',
          kind: 'substitution',
          minute: 70,
          player_off_id: 'gk1',
          player_on_id: 'gk2',
        },
      ],
      'gk1',
      (id) => squad.find((m) => m.player_id === id)?.position === 'Goalkeeper',
    )

    expect(keepers.sort()).toEqual(['gk1', 'gk2'])
  })
})

describe('aggregatePlayerStats clean sheets', () => {
  it('credits clean sheet from live log source', () => {
    const fixtures = [
      shutoutFixture({
        id: 'f-live',
        result: {
          id: 'r-live',
          fixture_id: 'f-live',
          goals_for: 2,
          goals_against: 0,
          notes: null,
          live_log_entries: [
            {
              id: 'sub1',
              kind: 'substitution',
              minute: 55,
              player_off_id: 'gk1',
              player_on_id: 'gk2',
            },
          ],
          created_at: '2025-09-01T12:00:00.000Z',
        },
      }),
    ]

    const lineups = new Map<string, Lineup | null>([
      [
        'f-live',
        {
          id: 'l1',
          fixture_id: 'f-live',
          formation: '4-4-2',
          slots: [{ position: 'GK', player_id: 'gk1' }],
          created_at: '2025-09-01T12:00:00.000Z',
          updated_at: '2025-09-01T12:00:00.000Z',
        },
      ],
    ])

    const { stats, cleanSheetMissingFixtureIds } = aggregatePlayerStats(squad, fixtures, {
      lineupsByFixtureId: lineups,
    })

    expect(cleanSheetMissingFixtureIds).toEqual([])
    expect(stats.find((s) => s.player_id === 'gk1')?.clean_sheets).toBe(1)
    expect(stats.find((s) => s.player_id === 'gk2')?.clean_sheets).toBe(1)
  })

  it('credits clean sheet from lineup when no live log exists', () => {
    const fixtures = [shutoutFixture({ id: 'f-lineup' })]
    const lineups = new Map<string, Lineup | null>([
      [
        'f-lineup',
        {
          id: 'l2',
          fixture_id: 'f-lineup',
          formation: '4-4-2',
          slots: [{ position: 'GK', player_id: 'gk1' }],
          created_at: '2025-09-01T12:00:00.000Z',
          updated_at: '2025-09-01T12:00:00.000Z',
        },
      ],
    ])

    const { stats, cleanSheetMissingFixtureIds } = aggregatePlayerStats(squad, fixtures, {
      lineupsByFixtureId: lineups,
    })

    expect(cleanSheetMissingFixtureIds).toEqual([])
    expect(stats.find((s) => s.player_id === 'gk1')?.clean_sheets).toBe(1)
    expect(stats.find((s) => s.player_id === 'gk2')?.clean_sheets).toBe(0)
  })

  it('credits clean sheet from manual override', () => {
    const fixtures = [
      shutoutFixture({
        id: 'f-manual',
        result: {
          id: 'r-manual',
          fixture_id: 'f-manual',
          goals_for: 1,
          goals_against: 0,
          notes: null,
          goalkeeper_player_id: 'gk2',
          created_at: '2025-09-01T12:00:00.000Z',
        },
      }),
    ]

    const { stats, cleanSheetMissingFixtureIds } = aggregatePlayerStats(squad, fixtures)

    expect(cleanSheetMissingFixtureIds).toEqual([])
    expect(stats.find((s) => s.player_id === 'gk2')?.clean_sheets).toBe(1)
  })

  it('does not credit anyone when shutout lacks goalkeeper data', () => {
    const fixtures = [shutoutFixture({ id: 'f-missing' })]

    const { stats, cleanSheetMissingFixtureIds } = aggregatePlayerStats(squad, fixtures)

    expect(cleanSheetMissingFixtureIds).toEqual(['f-missing'])
    expect(stats.find((s) => s.player_id === 'gk1')?.clean_sheets).toBe(0)
    expect(stats.find((s) => s.player_id === 'gk2')?.clean_sheets).toBe(0)
  })
})
