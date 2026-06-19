import type { FixtureWithResult } from '../types'

/** Estimate elapsed match minutes from kickoff (manual entry still allowed). */
export function estimateMatchMinute(fixture: FixtureWithResult, now = Date.now()): number {
  const kickoff = new Date(fixture.match_date)
  if (fixture.kickoff_time) {
    const parts = fixture.kickoff_time.split(':').map((p) => parseInt(p, 10))
    kickoff.setHours(parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, 0)
  }
  const minutes = Math.floor((now - kickoff.getTime()) / 60000)
  return Math.max(0, Math.min(200, minutes))
}
