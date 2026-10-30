import { describe, expect, it } from 'vitest'
import {
  addRace,
  addRunner,
  clearRaceResults,
  defaultProgramme,
  knownPeople,
  normaliseProgramme,
  ordinal,
  paymentTotals,
  placedRunners,
  programmeTotals,
  removeRunner,
  raceSummary,
  setRunnerPosition,
  suggestPeople,
  tapResult,
  updateRace,
  updateRunner,
} from './raceNight'

describe('default programme (from the Google Sheet)', () => {
  it('matches the sheet totals', () => {
    const totals = programmeTotals(defaultProgramme())
    expect(totals.races).toBe(6)
    expect(totals.runners).toBe(48)
    expect(totals.horses).toBe(12)
    expect(totals.sponsors).toBe(6)
  })
})

describe('editing', () => {
  it('adds a race with 8 empty runners and updates totals', () => {
    const p = addRace(defaultProgramme())
    expect(p.races).toHaveLength(7)
    expect(p.races[6].runners).toHaveLength(8)
    expect(programmeTotals(p).runners).toBe(56)
  })

  it('renumbers runners after one is removed', () => {
    const p = defaultProgramme()
    const race = p.races[0]
    const next = removeRunner(p, race.id, race.runners[1].id)
    expect(next.races[0].runners.map((r) => r.number)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('adds a runner at the end', () => {
    const p = defaultProgramme()
    const next = addRunner(p, p.races[0].id)
    expect(next.races[0].runners).toHaveLength(9)
    expect(next.races[0].runners[8].number).toBe(9)
  })

  it('updates one runner field without touching others', () => {
    const p = defaultProgramme()
    const race = p.races[5]
    const next = updateRunner(p, race.id, race.runners[0].id, { horse: 'Fast Eddie' })
    expect(next.races[5].runners[0].horse).toBe('Fast Eddie')
    expect(next.races[5].runners[1].horse).toBe('')
    expect(programmeTotals(next).horses).toBe(13)
  })

  it('lists known owners and jockeys once, alphabetically', () => {
    const people = knownPeople(defaultProgramme())
    expect(people).toContain('Carrie Mekins')
    expect(people.filter((n) => n === 'Carrie Mekins')).toHaveLength(1)
    expect([...people].sort((a, b) => a.localeCompare(b, 'en-GB'))).toEqual(people)
  })
})

describe('results', () => {
  it('moves a position that is already taken', () => {
    let p = defaultProgramme()
    const race = p.races[0]
    p = setRunnerPosition(p, race.id, race.runners[0].id, 1)
    p = setRunnerPosition(p, race.id, race.runners[2].id, 1)
    const placed = placedRunners(p.races[0])
    expect(placed).toHaveLength(1)
    expect(placed[0].id).toBe(race.runners[2].id)
  })

  it('clears a position when the same one is chosen again', () => {
    let p = defaultProgramme()
    const race = p.races[0]
    p = setRunnerPosition(p, race.id, race.runners[0].id, 2)
    p = setRunnerPosition(p, race.id, race.runners[0].id, 2)
    expect(placedRunners(p.races[0])).toHaveLength(0)
  })

  it('orders placed runners and can clear a race', () => {
    let p = defaultProgramme()
    const race = p.races[1]
    p = setRunnerPosition(p, race.id, race.runners[4].id, 2)
    p = setRunnerPosition(p, race.id, race.runners[1].id, 1)
    expect(placedRunners(p.races[1]).map((r) => r.number)).toEqual([2, 5])
    p = clearRaceResults(p, race.id)
    expect(placedRunners(p.races[1])).toHaveLength(0)
  })
})

describe('helpers', () => {
  it('formats ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd',
    ])
  })

  it('normalises junk safely', () => {
    expect(normaliseProgramme(null).races).toEqual([])
    const p = normaliseProgramme({ races: [{ runners: [{ horse: 5, position: -1 }] }] })
    expect(p.title).toBe('Race Night')
    expect(p.races[0].runners[0]).toMatchObject({ horse: '', position: null, number: 1 })
  })
})

describe('tap-to-place results', () => {
  it('places runners 1st, 2nd, 3rd in tap order and ignores a fourth', () => {
    let p = defaultProgramme()
    const race = p.races[0]
    const [a, b, c, d] = race.runners
    p = tapResult(p, race.id, b.id)
    p = tapResult(p, race.id, d.id)
    p = tapResult(p, race.id, a.id)
    p = tapResult(p, race.id, c.id)
    expect(placedRunners(p.races[0]).map((r) => [r.id, r.position])).toEqual([
      [b.id, 1],
      [d.id, 2],
      [a.id, 3],
    ])
  })

  it('removing a place frees it for the next tap', () => {
    let p = defaultProgramme()
    const race = p.races[0]
    const [a, b, c] = race.runners
    p = tapResult(p, race.id, a.id)
    p = tapResult(p, race.id, b.id)
    p = tapResult(p, race.id, a.id) // un-place 1st
    p = tapResult(p, race.id, c.id) // takes the free 1st
    expect(placedRunners(p.races[0]).map((r) => [r.id, r.position])).toEqual([
      [c.id, 1],
      [b.id, 2],
    ])
  })
})

describe('race summary', () => {
  it('reports completeness for races from the sheet', () => {
    const p = defaultProgramme()
    expect(raceSummary(p.races[0])).toMatchObject({ total: 8, filled: 8, free: 0, horses: 2, state: 'complete' })
    expect(raceSummary(p.races[4])).toMatchObject({ filled: 6, free: 2, horses: 0, state: 'partial' })
    expect(raceSummary(p.races[5])).toMatchObject({ filled: 0, state: 'empty' })
  })
})

describe('name suggestions', () => {
  it('offers matching names, most used first, without the exact match', () => {
    const p = defaultProgramme()
    const names = suggestPeople(p, 'car')
    expect(names[0]).toBe('Carrie Mekins')
    expect(suggestPeople(p, 'Carrie Mekins')).not.toContain('Carrie Mekins')
    expect(suggestPeople(p, '', 3)).toHaveLength(3)
  })
})

describe('payments', () => {
  it('starts with nothing paid and only expects money for named entries', () => {
    const p = defaultProgramme()
    // 6 sponsors + 12 horses + 43 owners + 21 jockeys would be wrong to hard-code; derive instead.
    const named = p.races.flatMap((r) => r.runners)
    const expected =
      p.races.filter((r) => r.sponsor.trim()).length +
      named.filter((r) => r.horse.trim()).length +
      named.filter((r) => r.owner.trim()).length +
      named.filter((r) => r.jockey.trim()).length
    expect(paymentTotals(p)).toEqual({ dueCount: expected, unpaid: expected, paid: 0 })
    expect(raceSummary(p.races[5])).toMatchObject({ dueCount: 1, unpaid: 1 })
  })

  it('counts ticks as paid and ignores blank names', () => {
    let p = defaultProgramme()
    const race = p.races[0]
    const runner = race.runners[0]
    const before = paymentTotals(p)
    p = updateRace(p, race.id, { sponsorPaid: true })
    p = updateRunner(p, race.id, runner.id, { ownerPaid: true, jockeyPaid: true })
    expect(paymentTotals(p).paid).toBe(3)
    expect(paymentTotals(p).unpaid).toBe(before.unpaid - 3)
    // Ticking a horse with no name doesn't create a payment due.
    p = updateRunner(p, race.id, runner.id, { horsePaid: true })
    expect(paymentTotals(p).dueCount).toBe(before.dueCount)
  })

  it('reads old saved data without payment fields as unpaid', () => {
    const p = normaliseProgramme({ races: [{ id: 'r', sponsor: 'X', runners: [{ id: 'a', owner: 'Y' }] }] })
    expect(p.races[0].sponsorPaid).toBe(false)
    expect(p.races[0].runners[0]).toMatchObject({ horsePaid: false, ownerPaid: false, jockeyPaid: false })
  })
})
