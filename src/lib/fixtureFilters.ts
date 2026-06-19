/** Scheduled fixtures from today onwards (excludes stale rows left from prior seasons). */
export function isUpcomingScheduledFixture(
  fixture: { status: string; match_date: string },
  now = Date.now(),
): boolean {
  if (fixture.status !== 'scheduled') return false
  return new Date(fixture.match_date).getTime() >= startOfToday(now)
}

function startOfToday(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
