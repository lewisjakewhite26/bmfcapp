import { loadSession } from '../hooks/authContext'
import { DEV_ADMIN } from './devBypass'
import type { AdminAuditAction } from './adminAudit'
import type { AdminAuditEntry } from '../types'

const entries: AdminAuditEntry[] = [
  {
    id: 'audit-seed-1',
    action: 'user_approved',
    entity_type: 'profile',
    entity_id: 'mock-player-1',
    details: { display_name: 'Chris L' },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    actor_name: DEV_ADMIN.display_name,
    actor_login_name: DEV_ADMIN.username,
  },
  {
    id: 'audit-seed-2',
    action: 'match_result_submitted',
    entity_type: 'fixture',
    entity_id: 'fix-1',
    details: { opponent: 'Shildon AFC', goals_for: 3, goals_against: 1 },
    created_at: new Date(Date.now() - 86400000).toISOString(),
    actor_name: DEV_ADMIN.display_name,
    actor_login_name: DEV_ADMIN.username,
  },
  {
    id: 'audit-seed-3',
    action: 'sponsorship_created',
    entity_type: 'sponsorship',
    entity_id: 'sp1',
    details: { sponsor_name: 'Durham Building Supplies', amount: 500 },
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    actor_name: DEV_ADMIN.display_name,
    actor_login_name: DEV_ADMIN.username,
  },
]

function mockActor() {
  const session = loadSession()
  return {
    name: session?.display_name ?? DEV_ADMIN.display_name,
    login: session?.username ?? DEV_ADMIN.username,
  }
}

export function addMockAuditEntry(
  action: AdminAuditAction,
  options?: {
    entityType?: string
    entityId?: string
    details?: Record<string, unknown>
  },
): void {
  const actor = mockActor()
  entries.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    entity_type: options?.entityType ?? null,
    entity_id: options?.entityId ?? null,
    details: options?.details ?? null,
    created_at: new Date().toISOString(),
    actor_name: actor.name,
    actor_login_name: actor.login,
  })
}

export function getMockAuditLog(limit: number): AdminAuditEntry[] {
  return entries.slice(0, limit)
}
