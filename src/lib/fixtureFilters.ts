/** Scheduled fixtures from today onwards (excludes stale rows left from prior seasons). */
export function isUpcomingScheduledFixture(
  fixture: { status: string; match_date: string },
  now = Date.now(),
): boolean {
  if (fixture.status !== 'scheduled') return false
  return new Date(fixture.match_date).getTime() >= startOfToday(now)
}

/** Postponed games stay visible (future ones, and recent ones awaiting a new date)
 * so players see "Postponed" rather than the game silently vanishing. Older
 * leftovers drop off after this many days. */
export const POSTPONED_VISIBLE_DAYS = 60

export function isVisiblePostponedFixture(
  fixture: { status: string; match_date: string },
  now = Date.now(),
): boolean {
  if (fixture.status !== 'postponed') return false
  return new Date(fixture.match_date).getTime() >= startOfToday(now) - POSTPONED_VISIBLE_DAYS * 86400000
}

function startOfToday(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
