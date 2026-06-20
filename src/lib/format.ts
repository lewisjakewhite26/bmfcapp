export function playerInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function formatMatchDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMatchTime(iso: string, kickoffTime?: string | null): string {
  if (kickoffTime === null) return ''
  if (kickoffTime) {
    const [h, m] = kickoffTime.split(':')
    return `${h}:${m}`
  }
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** Date plus kick-off when known; date only when kickoff_time is explicitly null (TBC). */
export function formatFixtureSchedule(iso: string, kickoffTime?: string | null): string {
  const date = formatMatchDate(iso)
  const time = formatMatchTime(iso, kickoffTime)
  return time ? `${date} · ${time}` : date
}

/** Time and venue line for calendar detail — omits time when kick-off is TBC. */
export function formatFixtureTimeDetail(
  iso: string,
  kickoffTime: string | null | undefined,
  venue?: string | null,
): string {
  return [formatMatchTime(iso, kickoffTime), venue].filter(Boolean).join(' · ')
}

export function formatScore(goalsFor: number, goalsAgainst: number): string {
  return `${goalsFor}–${goalsAgainst}`
}

export function resultLabel(goalsFor: number, goalsAgainst: number): 'W' | 'D' | 'L' {
  if (goalsFor > goalsAgainst) return 'W'
  if (goalsFor < goalsAgainst) return 'L'
  return 'D'
}

export function resultColor(goalsFor: number, goalsAgainst: number): string {
  const label = resultLabel(goalsFor, goalsAgainst)
  if (label === 'W') return 'bg-emerald-100 text-emerald-800'
  if (label === 'L') return 'bg-red-100 text-red-800'
  return 'bg-amber-100 text-amber-800'
}

export function fixtureResultBorderClass(fixture: { status: string; result?: { goals_for: number; goals_against: number } }): string {
  if (fixture.status !== 'completed' || !fixture.result) return 'border-brand-blue'
  const { goals_for, goals_against } = fixture.result
  if (goals_for > goals_against) return 'border-teal-600'
  if (goals_for < goals_against) return 'border-red-500'
  return 'border-amber-500'
}

export function fixtureResultDotClass(fixture: { status: string; result?: { goals_for: number; goals_against: number } }): string {
  if (fixture.status !== 'completed' || !fixture.result) return 'bg-brand-blue'
  const { goals_for, goals_against } = fixture.result
  if (goals_for > goals_against) return 'bg-teal-600'
  if (goals_for < goals_against) return 'bg-red-500'
  return 'bg-amber-500'
}
