import { describe, expect, it } from 'vitest'
import type { FixtureWithResult, MatchEvent } from '../../types'
import {
  buildMatchdayData,
  buildResultData,
  goalsDetail,
  graphicFileName,
  kickoffLabel,
  motmPlayerId,
  opponentKey,
  scorersForFixture,
  seasonLabelFor,
  shortDateLabel,
  teamInitials,
} from './data'

function event(type: MatchEvent['event_type'], playerId: string, name: string): MatchEvent {
  return { id: `${type}-${playerId}-${Math.random()}`, fixture_id: 'f1', player_id: playerId, player_name: name, event_type: type, minute: null, created_at: '' }
}

function fixture(overrides: Partial<FixtureWithResult> = {}): FixtureWithResult {
  return {
    id: 'f1',
    match_date: '2026-09-20T10:30:00Z',
    opponent: 'Ferryhill Ivorson',
    home_away: 'home',
    competition: 'Swinburne Maddison Second Division',
    venue: 'Bishop Middleham Park',
    kickoff_time: '10:30:00',
    ddsfl_fixture_id: null,
    status: 'completed',
    created_at: '',
    result: { id: 'r1', fixture_id: 'f1', goals_for: 3, goals_against: 1, notes: null, created_at: '' },
    events: [
      event('goal', 'jack', 'Jack Marley'),
      event('goal', 'sam', 'Sam Marshall'),
      event('goal', 'jack', 'Jack Marley'),
      event('motm', 'sam', 'Sam Marshall'),
      event('assist', 'sam', 'Sam Marshall'),
    ],
    ...overrides,
  }
}

const player = { display_name: 'Jack Marley', sponsor_name: 'L Brown Installations', sponsorLogoUrl: 'https://x/logo.png' }

describe('graphics data', () => {
  it('counts goals per scorer, most first', () => {
    expect(scorersForFixture(fixture())).toEqual([
      { playerId: 'jack', name: 'Jack Marley', goals: 2 },
      { playerId: 'sam', name: 'Sam Marshall', goals: 1 },
    ])
  })

  it('finds the MOTM', () => {
    expect(motmPlayerId(fixture())).toBe('sam')
    expect(motmPlayerId(fixture({ events: [] }))).toBeNull()
  })

  it('labels goal counts', () => {
    expect(goalsDetail(1)).toBe('1 goal')
    expect(goalsDetail(2)).toBe('2 goals')
    expect(goalsDetail(3)).toBe('Hat-trick')
    expect(goalsDetail(4)).toBe('4 goals')
  })

  it('formats season, kick-off and date', () => {
    expect(seasonLabelFor('2026-09-20T10:30:00Z')).toBe('2026/27')
    expect(seasonLabelFor('2027-03-01T10:30:00Z')).toBe('2026/27')
    expect(seasonLabelFor('2027-08-15T10:30:00Z')).toBe('2027/28')
    expect(kickoffLabel('10:30:00')).toBe('10:30')
    expect(kickoffLabel(null)).toBe('TBC')
    expect(shortDateLabel('2026-09-20T10:30:00Z')).toBe('20 Sep')
  })

  it('puts the home team on the left with scores in home–away order', () => {
    const home = buildResultData(fixture(), { kind: 'goalscorer', goals: 2, player, opponentBadgeUrl: null, playerImageUrl: null })
    expect(home.home.isClub).toBe(true)
    expect([home.homeScore, home.awayScore]).toEqual([3, 1])
    expect(home.detail).toBe('2 goals')

    const away = buildResultData(fixture({ home_away: 'away' }), { kind: 'goalscorer', goals: 2, player, opponentBadgeUrl: 'b.png', playerImageUrl: null })
    expect(away.home).toEqual({ name: 'Ferryhill Ivorson', isClub: false, badgeUrl: 'b.png' })
    expect(away.away.isClub).toBe(true)
    expect([away.homeScore, away.awayScore]).toEqual([1, 3])
  })

  it('uses the opponent for the MOTM detail line and keeps the player sponsor', () => {
    const motm = buildResultData(fixture(), { kind: 'motm', player, opponentBadgeUrl: null, playerImageUrl: null })
    expect(motm.detail).toBe('vs Ferryhill Ivorson')
    expect(motm.sponsor).toEqual({ name: 'L Brown Installations', logoUrl: 'https://x/logo.png' })
  })

  it('leaves the sponsor off when the player has none', () => {
    const data = buildResultData(fixture(), {
      kind: 'motm',
      player: { display_name: 'Sam', sponsor_name: '  ', sponsorLogoUrl: null },
      opponentBadgeUrl: null,
      playerImageUrl: null,
    })
    expect(data.sponsor).toBeNull()
  })

  it('refuses result posts for matches without a result', () => {
    expect(() =>
      buildResultData(fixture({ result: undefined }), { kind: 'motm', player, opponentBadgeUrl: null, playerImageUrl: null }),
    ).toThrow(/no result/)
  })

  it('builds matchday info with the home ground postcode', () => {
    const data = buildMatchdayData(fixture({ status: 'scheduled', result: undefined }), { opponentBadgeUrl: null, playerImageUrl: null })
    expect(data).toMatchObject({
      kind: 'matchday',
      dayLabel: 'Sunday',
      dateLabel: '20 Sep',
      kickoffLabel: '10:30',
      fixtureLabel: 'Home',
      venueName: 'Bishop Middleham Park',
      venueDetail: 'DL17 9AH',
    })
  })

  it('falls back sensibly for away games without a venue', () => {
    const data = buildMatchdayData(fixture({ home_away: 'away', venue: null, kickoff_time: null }), { opponentBadgeUrl: null, playerImageUrl: null })
    expect(data.fixtureLabel).toBe('Away')
    expect(data.kickoffLabel).toBe('TBC')
    expect(data.venueName).toBe('Ferryhill Ivorson')
    expect(data.venueDetail).toBe('Away')
  })

  it('makes initials and keys for opponents', () => {
    expect(teamInitials('Ferryhill Ivorson')).toBe('FI')
    expect(teamInitials('The Drunken Duck FC')).toBe('DD')
    expect(teamInitials('Coxhoe')).toBe('CO')
    expect(opponentKey('  Ferryhill   Ivorson ')).toBe('ferryhill ivorson')
  })

  it('names downloads clearly', () => {
    expect(graphicFileName('goalscorer', fixture(), 'Jack Marley')).toBe('goalscorer-jack-marley-2026-09-20.png')
    expect(graphicFileName('matchday', fixture())).toBe('matchday-ferryhill-ivorson-2026-09-20.png')
  })
})
