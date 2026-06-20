import { describe, expect, it } from 'vitest'
import {
  allocateUniqueDisplayName,
  allocateUniqueUsername,
  formatPlayerDisplayName,
  formatPlayerUsernameBase,
} from './playerNames'

describe('playerNames', () => {
  it('formats display name as FirstInitial', () => {
    expect(formatPlayerDisplayName('Chris', 'Lee')).toBe('ChrisL')
  })

  it('formats username as first initial + surname', () => {
    expect(formatPlayerUsernameBase('Chris', 'Lee')).toBe('clee')
  })

  it('resolves username collisions', () => {
    const taken = new Set(['clee'])
    expect(allocateUniqueUsername('clee', (c) => taken.has(c))).toBe('clee2')
  })

  it('resolves display name collisions', () => {
    const taken = new Set(['chrisl'])
    expect(
      allocateUniqueDisplayName('ChrisL', (c) => taken.has(c.toLowerCase())),
    ).toBe('ChrisL2')
  })
})
