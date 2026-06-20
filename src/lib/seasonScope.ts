import type { FixtureWithResult } from '../types'

/** First day of 2026/27 pre-season activity (training & friendlies). */
export const PRE_SEASON_START = '2026-06-14'

/** League season start — fixtures from this date count as 2026/27 season stats. */
export const SEASON_START = '2026-08-09'

export type StatsScope = 'pre_season' | 'season'

function scopeStartDate(scope: StatsScope): string {
  return scope === 'pre_season' ? PRE_SEASON_START : SEASON_START
}

function scopeEndDate(scope: StatsScope): string | null {
  return scope === 'pre_season' ? SEASON_START : null
}

/** Fixtures that count toward the selected stats scope (completed games only). */
export function filterFixturesForStatsScope(
  fixtures: FixtureWithResult[],
  scope: StatsScope,
): FixtureWithResult[] {
  const start = new Date(`${scopeStartDate(scope)}T00:00:00`).getTime()
  const end = scopeEndDate(scope)
    ? new Date(`${scopeEndDate(scope)!}T00:00:00`).getTime()
    : null

  return fixtures.filter((f) => {
    if (f.status !== 'completed' || !f.result) return false
    const t = new Date(f.match_date).getTime()
    if (t < start) return false
    if (end != null && t >= end) return false
    return true
  })
}

export function defaultStatsScope(now = new Date()): StatsScope {
  const seasonStart = new Date(`${SEASON_START}T00:00:00`).getTime()
  return now.getTime() >= seasonStart ? 'season' : 'pre_season'
}

export function statsScopeLabel(scope: StatsScope): string {
  return scope === 'pre_season' ? 'Pre-season' : '2026/27 Season'
}
