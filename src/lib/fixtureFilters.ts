/** Scheduled fixtures from today onwards (excludes stale rows left from prior seasons). */
export function isUpcomingScheduledFixture(
  fixture: { status: string; match_date: string },
  now = Date.now(),
): boolean {
  if (fixture.status !== 'scheduled') return false
  return new Date(fixture.match_date).getTime() >= startOfToday(now)
}

/** Postponed games always stay visible until they're rearranged (DDSFL moves
 * the date, or an admin puts them back), so players never lose track of them. */
export function isVisiblePostponedFixture(fixture: { status: string }): boolean {
  return fixture.status === 'postponed'
}

/** A postponed game whose original date has passed sits with the results
 * (as P–P); one still to come sits with the upcoming fixtures. */
export function hasOriginalDatePassed(fixture: { match_date: string }, now = Date.now()): boolean {
  return new Date(fixture.match_date).getTime() < now
}

function startOfToday(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
