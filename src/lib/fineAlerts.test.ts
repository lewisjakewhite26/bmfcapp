import { describe, expect, it } from 'vitest'
import {
  getDeadlineProximityScore,
  getFineAlertLevel,
} from './fineAlerts'

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
