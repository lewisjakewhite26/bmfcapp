import defaultProgrammeJson from '../data/raceNightDefault.json'

export interface Runner {
  id: string
  number: number
  horse: string
  owner: string
  jockey: string
  /** Finishing position (1, 2, 3…) once the race has run. */
  position: number | null
  /** Payment ticks: has the horse entry / owner / jockey paid? */
  horsePaid: boolean
  ownerPaid: boolean
  jockeyPaid: boolean
}

export type PaidField = 'horsePaid' | 'ownerPaid' | 'jockeyPaid'

export interface Race {
  id: string
  sponsor: string
  sponsorPaid: boolean
  runners: Runner[]
}

export interface Programme {
  title: string
  races: Race[]
}

export const DEFAULT_RUNNERS_PER_RACE = 8

export function defaultProgramme(): Programme {
  return normaliseProgramme(structuredClone(defaultProgrammeJson))
}

let idCounter = 0
export function newId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function bool(value: unknown): boolean {
  return value === true
}

/** Tolerates old/partial data from the database so the page never crashes. */
export function normaliseProgramme(raw: unknown): Programme {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as { title?: unknown; races?: unknown }
  const races = Array.isArray(obj.races) ? obj.races : []
  return {
    title: str(obj.title) || 'Race Night',
    races: races.map((r, ri) => {
      const race = (r && typeof r === 'object' ? r : {}) as { id?: unknown; sponsor?: unknown; sponsorPaid?: unknown; runners?: unknown }
      const runners = Array.isArray(race.runners) ? race.runners : []
      return {
        id: str(race.id) || `race-${ri + 1}`,
        sponsor: str(race.sponsor),
        sponsorPaid: bool(race.sponsorPaid),
        runners: runners.map((x, xi) => {
          const runner = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
          const position = typeof runner.position === 'number' && runner.position > 0 ? runner.position : null
          return {
            id: str(runner.id) || `${str(race.id) || `race-${ri + 1}`}-runner-${xi + 1}`,
            number: xi + 1,
            horse: str(runner.horse),
            owner: str(runner.owner),
            jockey: str(runner.jockey),
            position,
            horsePaid: bool(runner.horsePaid),
            ownerPaid: bool(runner.ownerPaid),
            jockeyPaid: bool(runner.jockeyPaid),
          }
        }),
      }
    }),
  }
}

export function isRunnerFilled(r: Runner): boolean {
  return Boolean(r.horse.trim() || r.owner.trim() || r.jockey.trim())
}

export interface ProgrammeTotals {
  races: number
  /** Runner slots across every race (the sheet's "Total runners"). */
  runners: number
  /** Runners that have a horse name. */
  horses: number
  /** Runners with at least an owner, horse or jockey filled in. */
  entered: number
  /** Races that have a sponsor. */
  sponsors: number
}

export function programmeTotals(p: Programme): ProgrammeTotals {
  const all = p.races.flatMap((r) => r.runners)
  return {
    races: p.races.length,
    runners: all.length,
    horses: all.filter((r) => r.horse.trim()).length,
    entered: all.filter(isRunnerFilled).length,
    sponsors: p.races.filter((r) => r.sponsor.trim()).length,
  }
}

function renumber(runners: Runner[]): Runner[] {
  return runners.map((r, i) => ({ ...r, number: i + 1 }))
}

function emptyRunner(raceId: string, number: number): Runner {
  return { id: newId(`${raceId}-runner`), number, horse: '', owner: '', jockey: '', position: null, horsePaid: false, ownerPaid: false, jockeyPaid: false }
}

export function addRace(p: Programme): Programme {
  const id = newId('race')
  return {
    ...p,
    races: [
      ...p.races,
      {
        id,
        sponsor: '',
        sponsorPaid: false,
        runners: Array.from({ length: DEFAULT_RUNNERS_PER_RACE }, (_, i) => emptyRunner(id, i + 1)),
      },
    ],
  }
}

export function removeRace(p: Programme, raceId: string): Programme {
  return { ...p, races: p.races.filter((r) => r.id !== raceId) }
}

export function updateRace(p: Programme, raceId: string, patch: Partial<Pick<Race, 'sponsor' | 'sponsorPaid'>>): Programme {
  return { ...p, races: p.races.map((r) => (r.id === raceId ? { ...r, ...patch } : r)) }
}

export function addRunner(p: Programme, raceId: string): Programme {
  return {
    ...p,
    races: p.races.map((r) =>
      r.id === raceId ? { ...r, runners: [...r.runners, emptyRunner(raceId, r.runners.length + 1)] } : r,
    ),
  }
}

export function removeRunner(p: Programme, raceId: string, runnerId: string): Programme {
  return {
    ...p,
    races: p.races.map((r) =>
      r.id === raceId ? { ...r, runners: renumber(r.runners.filter((x) => x.id !== runnerId)) } : r,
    ),
  }
}

export function updateRunner(
  p: Programme,
  raceId: string,
  runnerId: string,
  patch: Partial<Pick<Runner, 'horse' | 'owner' | 'jockey' | PaidField>>,
): Programme {
  return {
    ...p,
    races: p.races.map((r) =>
      r.id === raceId ? { ...r, runners: r.runners.map((x) => (x.id === runnerId ? { ...x, ...patch } : x)) } : r,
    ),
  }
}

/**
 * Give a runner a finishing position. A position can only belong to one
 * runner per race, so it moves if it's already taken; choosing the same
 * position again clears it.
 */
export function setRunnerPosition(
  p: Programme,
  raceId: string,
  runnerId: string,
  position: number | null,
): Programme {
  return {
    ...p,
    races: p.races.map((r) => {
      if (r.id !== raceId) return r
      const current = r.runners.find((x) => x.id === runnerId)
      const next = current?.position === position ? null : position
      return {
        ...r,
        runners: r.runners.map((x) => {
          if (x.id === runnerId) return { ...x, position: next }
          if (next !== null && x.position === next) return { ...x, position: null }
          return x
        }),
      }
    }),
  }
}

export function clearRaceResults(p: Programme, raceId: string): Programme {
  return {
    ...p,
    races: p.races.map((r) =>
      r.id === raceId ? { ...r, runners: r.runners.map((x) => ({ ...x, position: null })) } : r,
    ),
  }
}

/** Runners that have been placed, in finishing order. */
export function placedRunners(race: Race): Runner[] {
  return race.runners
    .filter((r) => r.position !== null)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

/** Best label for a runner: the horse, else the owner, else a placeholder. */
export function runnerTitle(r: Runner): string {
  return r.horse.trim() || r.owner.trim() || `Runner ${r.number}`
}

export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** Every owner/jockey name already used, for quick autocomplete while typing. */
export function knownPeople(p: Programme): string[] {
  const names = new Set<string>()
  for (const race of p.races) {
    for (const r of race.runners) {
      if (r.owner.trim()) names.add(r.owner.trim())
      if (r.jockey.trim()) names.add(r.jockey.trim())
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'en-GB'))
}

export const MAX_PLACES = 3

/**
 * Result entry by tapping runners in finishing order: the first tap is 1st,
 * the next is 2nd, and so on. Tapping a placed runner removes their place.
 * Ignored once every place is taken.
 */
export function tapResult(p: Programme, raceId: string, runnerId: string): Programme {
  return {
    ...p,
    races: p.races.map((r) => {
      if (r.id !== raceId) return r
      const tapped = r.runners.find((x) => x.id === runnerId)
      if (!tapped) return r
      if (tapped.position !== null) {
        return { ...r, runners: r.runners.map((x) => (x.id === runnerId ? { ...x, position: null } : x)) }
      }
      const used = new Set(r.runners.map((x) => x.position).filter((n): n is number => n !== null))
      let next = 1
      while (used.has(next)) next += 1
      if (next > MAX_PLACES) return r
      return { ...r, runners: r.runners.map((x) => (x.id === runnerId ? { ...x, position: next } : x)) }
    }),
  }
}

export interface RaceSummary {
  /** Runner slots in the race. */
  total: number
  /** Slots with an owner, horse or jockey. */
  filled: number
  /** Slots still empty. */
  free: number
  /** Runners with a horse name. */
  horses: number
  /** Runners with no jockey yet (only counted for filled slots). */
  missingJockey: number
  placed: number
  /** Payments still to collect in this race (sponsor, horses, owners, jockeys). */
  unpaid: number
  /** Payments expected in this race. */
  dueCount: number
  state: 'complete' | 'partial' | 'empty'
}

export function raceSummary(race: Race): RaceSummary {
  const filledRunners = race.runners.filter(isRunnerFilled)
  const filled = filledRunners.length
  const total = race.runners.length
  return {
    total,
    filled,
    free: total - filled,
    horses: race.runners.filter((r) => r.horse.trim()).length,
    missingJockey: filledRunners.filter((r) => !r.jockey.trim()).length,
    placed: race.runners.filter((r) => r.position !== null).length,
    ...racePayments(race),
    state: filled === 0 ? 'empty' : filled === total ? 'complete' : 'partial',
  }
}

/** Owner/jockey names that match what's being typed, most-used first. */
export function suggestPeople(p: Programme, query: string, limit = 6): string[] {
  const counts = new Map<string, number>()
  for (const race of p.races) {
    for (const r of race.runners) {
      for (const name of [r.owner.trim(), r.jockey.trim()]) {
        if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
      }
    }
  }
  const q = query.trim().toLowerCase()
  return [...counts.entries()]
    .filter(([name]) => name.toLowerCase() !== q && (q === '' || name.toLowerCase().includes(q)))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en-GB'))
    .slice(0, limit)
    .map(([name]) => name)
}

export interface PaymentCount {
  /** Things that have a name against them, so money is expected. */
  dueCount: number
  unpaid: number
}

/** A payment is only expected once the sponsor/horse/owner/jockey has a name. */
export function racePayments(race: Race): PaymentCount {
  let dueCount = 0
  let unpaid = 0
  const count = (named: string, paid: boolean) => {
    if (!named.trim()) return
    dueCount += 1
    if (!paid) unpaid += 1
  }
  count(race.sponsor, race.sponsorPaid)
  for (const r of race.runners) {
    count(r.horse, r.horsePaid)
    count(r.owner, r.ownerPaid)
    count(r.jockey, r.jockeyPaid)
  }
  return { dueCount, unpaid }
}

export interface PaymentTotals extends PaymentCount {
  paid: number
}

export function paymentTotals(p: Programme): PaymentTotals {
  const all = p.races.map(racePayments)
  const dueCount = all.reduce((n, x) => n + x.dueCount, 0)
  const unpaid = all.reduce((n, x) => n + x.unpaid, 0)
  return { dueCount, unpaid, paid: dueCount - unpaid }
}
