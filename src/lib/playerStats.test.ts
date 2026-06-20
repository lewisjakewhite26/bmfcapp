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
          created_at: '2025-09-01T12:00:00.000Z',
          updated_at: '2025-09-01T12:00:00.000Z',
        },
      ],
    ])

    const { stats, cleanSheetMissingFixtureIds } = aggregatePlayerStats(squad, fixtures, {
      lineupsByFixtureId: lineups,
    })
    expect(stats.find((s) => s.player_id === 'gk1')?.clean_sheets).toBe(1)
    expect(cleanSheetMissingFixtureIds).toEqual([])
  })
})
