import { describe, expect, it } from 'vitest'
import { isUpcomingScheduledFixture } from './fixtureFilters'

describe('upcoming fixtures', () => {
  const now = new Date('2026-10-03T11:00:00').getTime()
  const at = (status: string, match_date = '2026-10-04T09:30:00Z') => isUpcomingScheduledFixture({ status, match_date }, now)

  it('keeps a match being logged live, so availability still shows it', () => {
    expect(at('scheduled')).toBe(true)
    expect(at('in_progress')).toBe(true)
  })

  it('drops finished, called-off and old fixtures', () => {
    expect(at('completed')).toBe(false)
    expect(at('postponed')).toBe(false)
    expect(at('scheduled', '2026-09-27T09:30:00Z')).toBe(false)
  })
})
