import defaultProgrammeJson from '../data/raceNightDefault.json'

export interface Runner {
  id: string
  number: number
  horse: string
  owner: string
  jockey: string
  /** Finishing position (1, 2, 3…) once the race has run. */
  position: number | null
}

export interface Race {
  id: string
  sponsor: string
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

/** Tolerates old/partial data from the database so the page never crashes. */
export function normaliseProgramme(raw: unknown): Programme {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as { title?: unknown; races?: unknown }
  const races = Array.isArray(obj.races) ? obj.races : []
  return {
    title: str(obj.title) || 'Race Night',
    races: races.map((r, ri) => {
      const race = (r && typeof r === 'object' ? r : {}) as { id?: unknown; sponsor?: unknown; runners?: unknown }
      const runners = Array.isArray(race.runners) ? race.runners : []
      return {
        id: str(race.id) || `race-${ri + 1}`,
        sponsor: str(race.sponsor),
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
  return { id: newId(`${raceId}-runner`), number, horse: '', owner: '', jockey: '', position: null }
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
        runners: Array.from({ length: DEFAULT_RUNNERS_PER_RACE }, (_, i) => emptyRunner(id, i + 1)),
      },
    ],
  }
}

export function removeRace(p: Programme, raceId: string): Programme {
  return { ...p, races: p.races.filter((r) => r.id !== raceId) }
}

export function updateRace(p: Programme, raceId: string, patch: Partial<Pick<Race, 'sponsor'>>): Programme {
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
  patch: Partial<Pick<Runner, 'horse' | 'owner' | 'jockey'>>,
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
