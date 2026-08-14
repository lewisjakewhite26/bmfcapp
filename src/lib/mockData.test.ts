import { beforeEach, describe, expect, it } from 'vitest'
import {
  getMockAdminUsers,
  getMockSquad,
  removeMockUser,
  resetMockData,
  upsertMockSquad,
} from './mockData'

const NON_ADMIN_ID = '00000000-0000-0000-0000-000000000001' // Chris L

describe('removeMockUser', () => {
  beforeEach(() => {
    resetMockData()
  })

  it('removes the player from the admin users list', () => {
    expect(getMockAdminUsers().some((u) => u.id === NON_ADMIN_ID)).toBe(true)
    removeMockUser(NON_ADMIN_ID)
    expect(getMockAdminUsers().some((u) => u.id === NON_ADMIN_ID)).toBe(false)
  })

  it('also removes their squad row, if they had one', () => {
    upsertMockSquad(NON_ADMIN_ID, 'Chris L', 'Midfielder')
    expect(getMockSquad().some((s) => s.player_id === NON_ADMIN_ID)).toBe(true)

    removeMockUser(NON_ADMIN_ID)
    expect(getMockSquad().some((s) => s.player_id === NON_ADMIN_ID)).toBe(false)
  })

  it('throws "Player not found" for an unknown id', () => {
    expect(() => removeMockUser('does-not-exist')).toThrow('Player not found')
  })

  it('throws for an already-removed player rather than silently no-op-ing', () => {
    removeMockUser(NON_ADMIN_ID)
    expect(() => removeMockUser(NON_ADMIN_ID)).toThrow('Player not found')
  })
})
