import { describe, expect, it } from 'vitest'
import {
  allocateUniqueDisplayName,
  allocateUniqueLoginName,
  allocateUniqueUsername,
  formatPlayerDisplayName,
  formatPlayerLoginName,
  formatPlayerUsernameBase,
} from './playerNames'

describe('playerNames', () => {
  it('formats spaced display name as First Initial', () => {
    expect(formatPlayerDisplayName('Chris', 'Lee')).toBe('Chris L')
    expect(formatPlayerDisplayName('Lewis', 'White')).toBe('Lewis W')
  })

  it('formats login name without space', () => {
    expect(formatPlayerLoginName('Chris', 'Lee')).toBe('ChrisL')
    expect(formatPlayerLoginName('Lewis', 'White')).toBe('LewisW')
  })

  it('formats username as first initial + surname', () => {
    expect(formatPlayerUsernameBase('Chris', 'Lee')).toBe('clee')
  })

  it('resolves username collisions', () => {
    const taken = new Set(['clee'])
    expect(allocateUniqueUsername('clee', (c) => taken.has(c))).toBe('clee2')
  })

  it('resolves display name collisions with space before suffix', () => {
    const taken = new Set(['chris l'])
    expect(
      allocateUniqueDisplayName('Chris L', (c) => taken.has(c.toLowerCase())),
    ).toBe('Chris L2')
  })

  it('resolves login name collisions without space', () => {
    const taken = new Set(['chrisl'])
    expect(
      allocateUniqueLoginName('ChrisL', (c) => taken.has(c.toLowerCase())),
    ).toBe('ChrisL2')
  })
})
