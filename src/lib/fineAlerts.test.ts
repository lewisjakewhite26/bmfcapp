import { describe, expect, it } from 'vitest'
import {
  daysUntilDue,
  getDeadlineProximityScore,
  getFineAlertLevel,
  londonCalendarDateYmd,
} from './fineAlerts'

describe('londonCalendarDateYmd', () => {
  it('derives the UK calendar date during BST', () => {
    expect(londonCalendarDateYmd(new Date('2026-07-02T23:00:00.000Z'))).toBe('2026-07-03')
  })
})

describe('daysUntilDue', () => {
  it('diffs due dates against Europe/London today', () => {
    const now = new Date('2026-07-02T23:00:00.000Z')
    expect(daysUntilDue('2026-07-05', now)).toBe(2)
    expect(daysUntilDue('2026-07-03', now)).toBe(0)
    expect(daysUntilDue('2026-07-02', now)).toBe(-1)
  })
})

describe('getDeadlineProximityScore', () => {
  it('scores band edges from spec section 9', () => {
    expect(getDeadlineProximityScore(-1)).toBe(3)
    expect(getDeadlineProximityScore(0)).toBe(2)
    expect(getDeadlineProximityScore(3)).toBe(2)
    expect(getDeadlineProximityScore(4)).toBe(1)
    expect(getDeadlineProximityScore(7)).toBe(1)
    expect(getDeadlineProximityScore(8)).toBe(0)
  })
})

describe('getFineAlertLevel', () => {
  it('matches acceptance check 8 table', () => {
    expect(getFineAlertLevel(4, 10)).toBe('normal')
    expect(getFineAlertLevel(4, 1)).toBe('warning')
    expect(getFineAlertLevel(4, -1)).toBe('critical')
    expect(getFineAlertLevel(2, -1)).toBe('warning')
  })
})
