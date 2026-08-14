import { describe, expect, it } from 'vitest'
import { eventImpact, getSeasonImpactTotal, matchImpactPoints } from './playerProfileStats'
import type { MatchEvent, PlayerMatchRecord } from '../types'

function event(event_type: MatchEvent['event_type'], overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    id: 'e1',
    fixture_id: 'f1',
    player_id: 'p1',
    event_type,
    minute: null,
    created_at: '2026-08-14T12:00:00.000Z',
    ...overrides,
  }
}

describe('eventImpact', () => {
  it('scores every event type per the published points table', () => {
    expect(eventImpact(event('goal'))).toBe(10)
    expect(eventImpact(event('assist'))).toBe(6)
    expect(eventImpact(event('motm'))).toBe(12)
    expect(eventImpact(event('appearance'))).toBe(4)
    expect(eventImpact(event('substitution'))).toBe(2)
    expect(eventImpact(event('clean_sheet_gk'))).toBe(6)
    expect(eventImpact(event('clean_sheet_def'))).toBe(4)
    expect(eventImpact(event('unused_sub'))).toBe(1)
    expect(eventImpact(event('yellow_card'))).toBe(-3)
    expect(eventImpact(event('red_card'))).toBe(-10)
  })
})

describe('matchImpactPoints', () => {
  it('sums points across every event in a single match', () => {
    const events = [event('goal'), event('assist'), event('yellow_card')]
    // 10 + 6 - 3
    expect(matchImpactPoints(events)).toBe(13)
  })

  it('returns 0 for a match with no events', () => {
    expect(matchImpactPoints([])).toBe(0)
  })

  it('a clean sheet keeper nets more than a plain appearance alone', () => {
    const keeperMatch = [event('appearance'), event('clean_sheet_gk')]
    const benchOnlyMatch = [event('unused_sub')]
    expect(matchImpactPoints(keeperMatch)).toBeGreaterThan(matchImpactPoints(benchOnlyMatch))
    expect(matchImpactPoints(keeperMatch)).toBe(10) // 4 + 6
  })

  it('a red card can outweigh a goal in the same match', () => {
    const events = [event('goal'), event('red_card')]
    // 10 - 10
    expect(matchImpactPoints(events)).toBe(0)
  })
})

describe('getSeasonImpactTotal', () => {
  it('sums match impact points across the whole season', () => {
    const history: PlayerMatchRecord[] = [
      {
        fixture: {
          id: 'f1',
          match_date: '2026-08-01T12:00:00.000Z',
          opponent: 'Rivals FC',
          home_away: 'home',
          competition: 'League',
          venue: null,
          kickoff_time: '10:30:00',
          ddsfl_fixture_id: '1',
          status: 'completed',
          created_at: '2026-08-01T12:00:00.000Z',
        },
        events: [event('goal', { fixture_id: 'f1' })],
      },
      {
        fixture: {
          id: 'f2',
          match_date: '2026-08-08T12:00:00.000Z',
          opponent: 'Others FC',
          home_away: 'away',
          competition: 'League',
          venue: null,
          kickoff_time: '10:30:00',
          ddsfl_fixture_id: '2',
          status: 'completed',
          created_at: '2026-08-08T12:00:00.000Z',
        },
        events: [event('appearance', { fixture_id: 'f2', id: 'e2' })],
      },
    ]
    // 10 (goal) + 4 (appearance)
    expect(getSeasonImpactTotal(history)).toBe(14)
  })
})
