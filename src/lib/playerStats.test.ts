import { describe, expect, it } from 'vitest'
import { aggregatePlayerStats } from './playerStats'
import type { FixtureWithResult, Lineup, SquadMember } from '../types'

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
    player_id: 'fwd1',
    display_name: 'Sam Forward',
    squad_number: null,
    position: 'Forward',
    joined_date: '2023-08-01',
    active: true,
  },
]

const fixtures: FixtureWithResult[] = [
  {
    id: 'f1',
    match_date: '2025-09-01T12:00:00.000Z',
    opponent: 'Rivals FC',
    home_away: 'home',
    competition: 'League',
    venue: null,
    kickoff_time: '10:30:00',
    ddsfl_fixture_id: '100',
    status: 'completed',
    created_at: '2025-09-01T12:00:00.000Z',
    result: {
      id: 'r1',
      fixture_id: 'f1',
      goals_for: 2,
      goals_against: 0,
      notes: null,
      created_at: '2025-09-01T12:00:00.000Z',
    },
    events: [
      {
        id: 'e1',
        fixture_id: 'f1',
        player_id: 'fwd1',
        event_type: 'goal',
        minute: null,
        created_at: '2025-09-01T12:00:00.000Z',
      },
      {
        id: 'e2',
        fixture_id: 'f1',
        player_id: 'fwd1',
        event_type: 'assist',
        minute: null,
        created_at: '2025-09-01T12:00:00.000Z',
      },
    ],
  },
  {
    id: 'f2',
    match_date: '2025-09-08T12:00:00.000Z',
    opponent: 'Others FC',
    home_away: 'away',
    competition: 'League',
    venue: null,
    kickoff_time: '10:30:00',
    ddsfl_fixture_id: '101',
    status: 'completed',
    created_at: '2025-09-08T12:00:00.000Z',
    result: {
      id: 'r2',
      fixture_id: 'f2',
      goals_for: 1,
      goals_against: 2,
      notes: null,
      created_at: '2025-09-08T12:00:00.000Z',
    },
    events: [
      {
        id: 'e3',
        fixture_id: 'f2',
        player_id: 'fwd1',
        event_type: 'goal',
        minute: null,
        created_at: '2025-09-08T12:00:00.000Z',
      },
    ],
  },
]

describe('aggregatePlayerStats', () => {
  it('counts goals, assists, and appearances from match events', () => {
    const { stats } = aggregatePlayerStats(squad, fixtures)
    const fwd = stats.find((s) => s.player_id === 'fwd1')
    expect(fwd?.goals).toBe(2)
    expect(fwd?.assists).toBe(1)
    expect(fwd?.appearances).toBe(2)
  })

  it('requires goalkeeper source data before awarding clean sheets', () => {
    const { stats, cleanSheetMissingFixtureIds } = aggregatePlayerStats(squad, fixtures)
    const gk = stats.find((s) => s.player_id === 'gk1')
    expect(gk?.clean_sheets).toBe(0)
    expect(gk?.appearances).toBe(0)
    expect(cleanSheetMissingFixtureIds).toEqual(['f1'])
  })

  it('awards clean sheets when lineup goalkeeper is known', () => {
    const lineups = new Map<string, Lineup | null>([
      [
        'f1',
        {
          id: 'l1',
          fixture_id: 'f1',
          formation: '4-4-2',
          slots: [{ position: 'GK', player_id: 'gk1' }],
          substitutes: [],
          subs_confirmed_none: false,
          created_at: '2025-09-01T12:00:00.000Z',
          updated_at: '2025-09-01T12:00:00.000Z',
        },
      ],
    ])

    const { stats, cleanSheetMissingFixtureIds } = aggregatePlayerStats(squad, fixtures, {
      lineupsByFixtureId: lineups,
    })
    expect(stats.find((s) => s.player_id === 'gk1')?.clean_sheets).toBe(1)
    expect(stats.find((s) => s.player_id === 'gk1')?.appearances).toBe(1)
    expect(cleanSheetMissingFixtureIds).toEqual([])
  })

  it('counts appearances from a saved team sheet even with no match events', () => {
    const quietFixture: FixtureWithResult = {
      ...fixtures[1],
      id: 'f3',
      events: [],
      result: {
        id: 'r3',
        fixture_id: 'f3',
        goals_for: 0,
        goals_against: 1,
        notes: null,
        created_at: '2025-09-15T12:00:00.000Z',
      },
    }
    const lineups = new Map<string, Lineup | null>([
      [
        'f3',
        {
          id: 'l3',
          fixture_id: 'f3',
          formation: '4-4-2',
          slots: [
            { position: 'GK', player_id: 'gk1' },
            { position: 'ST1', player_id: 'fwd1' },
          ],
          substitutes: [],
          subs_confirmed_none: false,
          created_at: '2025-09-15T12:00:00.000Z',
          updated_at: '2025-09-15T12:00:00.000Z',
        },
      ],
    ])

    const { stats } = aggregatePlayerStats(squad, [...fixtures, quietFixture], {
      lineupsByFixtureId: lineups,
    })
    expect(stats.find((s) => s.player_id === 'gk1')?.appearances).toBe(1)
    // fwd already has 2 from events + 1 from lineup sheet
    expect(stats.find((s) => s.player_id === 'fwd1')?.appearances).toBe(3)
  })
})

describe('aggregatePlayerStats substitutions', () => {
  const squadWithSubs: SquadMember[] = [
    ...squad,
    {
      id: 's3',
      player_id: 'sub1',
      display_name: 'Ollie Sub',
      squad_number: null,
      position: 'Midfielder',
      joined_date: '2023-08-01',
      active: true,
    },
    {
      id: 's4',
      player_id: 'sub2',
      display_name: 'Bench Only',
      squad_number: null,
      position: 'Defender',
      joined_date: '2023-08-01',
      active: true,
    },
  ]

  const subFixture: FixtureWithResult = {
    id: 'f-sub',
    match_date: '2025-09-22T12:00:00.000Z',
    opponent: 'Bench FC',
    home_away: 'home',
    competition: 'League',
    venue: null,
    kickoff_time: '10:30:00',
    ddsfl_fixture_id: '102',
    status: 'completed',
    created_at: '2025-09-22T12:00:00.000Z',
    result: {
      id: 'r-sub',
      fixture_id: 'f-sub',
      goals_for: 1,
      goals_against: 0,
      notes: null,
      created_at: '2025-09-22T12:00:00.000Z',
    },
    events: [
      {
        id: 'e-sub',
        fixture_id: 'f-sub',
        player_id: 'fwd1',
        related_player_id: 'sub1',
        event_type: 'substitution',
        minute: 60,
        created_at: '2025-09-22T12:00:00.000Z',
      },
    ],
  }

  it('credits an appearance and a sub_appearance to the player brought on', () => {
    const { stats } = aggregatePlayerStats(squadWithSubs, [subFixture])
    const sub = stats.find((s) => s.player_id === 'sub1')
    expect(sub?.appearances).toBe(1)
    expect(sub?.sub_appearances).toBe(1)
  })

  it('does not credit an appearance just for being named on the bench in a saved lineup', () => {
    const lineups = new Map<string, Lineup | null>([
      [
        'f-sub',
        {
          id: 'l-sub',
          fixture_id: 'f-sub',
          formation: '4-4-2',
          slots: [{ position: 'GK', player_id: 'gk1' }],
          substitutes: ['sub2'],
          subs_confirmed_none: false,
          created_at: '2025-09-22T12:00:00.000Z',
          updated_at: '2025-09-22T12:00:00.000Z',
        },
      ],
    ])
    const { stats } = aggregatePlayerStats(squadWithSubs, [subFixture], { lineupsByFixtureId: lineups })
    const benchOnly = stats.find((s) => s.player_id === 'sub2')
    expect(benchOnly?.appearances).toBe(0)
    expect(benchOnly?.sub_appearances).toBe(0)
  })

  it('credits exactly one appearance and sub_appearance for a self-referential bench-toggle event', () => {
    // ResultEntryForm's tap-to-credit bench toggle logs player_id === related_player_id
    // (no specific "who went off" is known), rather than a real off/on pair.
    const toggleFixture: FixtureWithResult = {
      ...subFixture,
      id: 'f-toggle',
      events: [
        {
          id: 'e-toggle',
          fixture_id: 'f-toggle',
          player_id: 'sub2',
          related_player_id: 'sub2',
          event_type: 'substitution',
          minute: null,
          created_at: '2025-09-22T12:00:00.000Z',
        },
      ],
    }
    const { stats } = aggregatePlayerStats(squadWithSubs, [toggleFixture])
    const toggled = stats.find((s) => s.player_id === 'sub2')
    expect(toggled?.appearances).toBe(1)
    expect(toggled?.sub_appearances).toBe(1)
  })
})
