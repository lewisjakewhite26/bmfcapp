import { describe, expect, it } from 'vitest'
import {
  findManualFixtureMatch,
  normalizeOpponentKey,
  opponentsLikelySame,
} from './ddsflSync'

describe('ddsflSync matching', () => {
  it('normalizes noisy club names', () => {
    expect(normalizeOpponentKey('Ferryhill The Ivorson FC')).toBe('ferryhill ivorson')
    expect(normalizeOpponentKey('Ferryhill Ivorson FC')).toBe('ferryhill ivorson')
  })

  it('matches short admin names to longer DDSFL names', () => {
    expect(opponentsLikelySame('Iron Horse FC', 'Newton Aycliffe Iron horse')).toBe(true)
    expect(opponentsLikelySame('Durham Rangers FC', 'Durham Rangers')).toBe(true)
    expect(opponentsLikelySame('Duke of Wellington FC', 'Kirk Merrington FC')).toBe(false)
  })

  it('links a manual fixture on the same day/home-away/opponent', () => {
    const match = findManualFixtureMatch(
      {
        match_date: '2026-08-09T12:00:00.000Z',
        opponent: 'Ferryhill The Ivorson FC',
        home_away: 'home',
      },
      [
        {
          id: 'manual-1',
          match_date: '2026-08-09T10:30:00.000Z',
          opponent: 'Ferryhill Ivorson FC',
          home_away: 'home',
          ddsfl_fixture_id: null,
        },
        {
          id: 'other',
          match_date: '2026-08-09T10:30:00.000Z',
          opponent: 'Drunken Duck FC',
          home_away: 'home',
          ddsfl_fixture_id: null,
        },
      ],
    )
    expect(match?.id).toBe('manual-1')
  })

  it('ignores fixtures already linked to DDSFL', () => {
    const match = findManualFixtureMatch(
      {
        match_date: '2026-08-09T12:00:00.000Z',
        opponent: 'Ferryhill The Ivorson FC',
        home_away: 'home',
      },
      [
        {
          id: 'already-linked',
          match_date: '2026-08-09T10:30:00.000Z',
          opponent: 'Ferryhill Ivorson FC',
          home_away: 'home',
          ddsfl_fixture_id: '5679',
        },
      ],
    )
    expect(match).toBeNull()
  })
})
