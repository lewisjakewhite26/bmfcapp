/**
 * Scheduled fixtures from today onwards (excludes stale rows left from prior seasons).
 * A match being logged live still counts, so it stays on availability, line-ups and the calendar.
 */
export function isUpcomingScheduledFixture(
  fixture: { status: string; match_date: string },
  now = Date.now(),
): boolean {
  if (fixture.status !== 'scheduled' && fixture.status !== 'in_progress') return false
  return new Date(fixture.match_date).getTime() >= startOfToday(now)
}

function startOfToday(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
