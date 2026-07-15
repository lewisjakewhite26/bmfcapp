import { getClubSession } from './clubAuth'
import { addMockAuditEntry, getMockAuditLog } from './mockAuditLog'
import { isSupabaseConfigured, supabase } from './supabase'
import type { AdminAuditEntry } from '../types'

function isMockDataMode(): boolean {
  if (import.meta.env.VITE_E2E === 'true') return true
  return import.meta.env.VITE_CLUB_DATA_SOURCE !== 'supabase' || !isSupabaseConfigured
}

export const ADMIN_AUDIT_ACTIONS = [
  'invite_created',
  'player_created',
  'invite_regenerated',
  'team_invite_generated',
  'team_invite_regenerated',
  'team_invite_enabled',
  'team_invite_disabled',
  'user_approved',
  'user_unapproved',
  'user_names_updated',
  'user_roles_updated',
  'passcode_reset',
  'squad_upserted',
  'squad_removed',
  'fixture_created',
  'fixture_updated',
  'fixture_deleted',
  'live_match_started',
  'match_result_submitted',
  'live_draft_cleared',
  'training_created',
  'training_updated',
  'training_deleted',
  'club_event_created',
  'club_event_updated',
  'club_event_deleted',
  'club_event_archived',
  'club_event_unarchived',
  'lineup_saved',
  'fundraiser_created',
  'fundraiser_archived',
  'fundraiser_unarchived',
  'fundraiser_deleted',
  'fundraiser_participation_saved',
  'photo_uploaded',
  'photo_deleted',
  'sponsorship_created',
  'sponsorship_updated',
  'sponsorship_deleted',
  'expense_created',
  'expense_updated',
  'expense_deleted',
  'signing_on_fee_updated',
  'push_sent',
] as const

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number]

const ACTION_LABELS: Record<AdminAuditAction, string> = {
  invite_created: 'Invite created',
  player_created: 'Player created',
  invite_regenerated: 'Invite link regenerated',
  team_invite_generated: 'Team invite link generated',
  team_invite_regenerated: 'Team invite link regenerated',
  team_invite_enabled: 'Team invite link enabled',
  team_invite_disabled: 'Team invite link disabled',
  user_approved: 'Player approved',
  user_unapproved: 'Player unapproved',
  user_names_updated: 'Player names updated',
  user_roles_updated: 'Committee role updated',
  passcode_reset: 'Passcode reset',
  squad_upserted: 'Squad member updated',
  squad_removed: 'Squad member removed',
  fixture_created: 'Fixture added',
  fixture_updated: 'Fixture updated',
  fixture_deleted: 'Fixture deleted',
  live_match_started: 'Live matchday started',
  match_result_submitted: 'Match result submitted',
  live_draft_cleared: 'Live match draft cleared',
  training_created: 'Training session added',
  training_updated: 'Training session updated',
  training_deleted: 'Training session deleted',
  club_event_created: 'Event added',
  club_event_updated: 'Event updated',
  club_event_deleted: 'Event deleted',
  club_event_archived: 'Event archived',
  club_event_unarchived: 'Event restored',
  lineup_saved: 'Lineup saved',
  fundraiser_created: 'Fundraiser added',
  fundraiser_archived: 'Fundraiser archived',
  fundraiser_unarchived: 'Fundraiser restored',
  fundraiser_deleted: 'Fundraiser deleted',
  fundraiser_participation_saved: 'Fundraiser participation updated',
  photo_uploaded: 'Player photo uploaded',
  photo_deleted: 'Player photo removed',
  sponsorship_created: 'Sponsorship added',
  sponsorship_updated: 'Sponsorship updated',
  sponsorship_deleted: 'Sponsorship deleted',
  expense_created: 'Expense added',
  expense_updated: 'Expense updated',
  expense_deleted: 'Expense deleted',
  signing_on_fee_updated: 'Signing-on fee updated',
  push_sent: 'Push notification sent',
}

export function auditActionLabel(action: AdminAuditAction | string): string {
  return ACTION_LABELS[action as AdminAuditAction] ?? action.replace(/_/g, ' ')
}

export function formatAuditDetails(entry: AdminAuditEntry): string | null {
  const d = entry.details
  if (!d || typeof d !== 'object') return null

  const parts: string[] = []
  if (typeof d.display_name === 'string') parts.push(d.display_name)
  if (typeof d.opponent === 'string') parts.push(`vs ${d.opponent}`)
  if (typeof d.title === 'string') parts.push(d.title)
  if (typeof d.sponsor_name === 'string') parts.push(d.sponsor_name)
  if (typeof d.description === 'string') parts.push(d.description)
  if (typeof d.event_title === 'string') parts.push(d.event_title)
  if (typeof d.recipient_count === 'number') parts.push(`${d.recipient_count} device(s)`)

  return parts.length > 0 ? parts.join(' · ') : null
}

export async function recordAdminAudit(
  action: AdminAuditAction,
  options?: {
    entityType?: string
    entityId?: string
    details?: Record<string, unknown>
  },
): Promise<void> {
  try {
    if (isMockDataMode()) {
      addMockAuditEntry(action, options)
      return
    }

    const session = getClubSession()
    if (!session) return

    const { error } = await supabase.rpc('admin_record_audit', {
      p_actor_id: session.userId,
      p_session_token: session.sessionToken,
      p_action: action,
      p_entity_type: options?.entityType ?? null,
      p_entity_id: options?.entityId ?? null,
      p_details: options?.details ?? null,
    })
    if (error) console.error('[audit]', error.message)
  } catch (err) {
    console.error('[audit]', err)
  }
}

export async function fetchAuditLog(limit = 100): Promise<AdminAuditEntry[]> {
  if (isMockDataMode()) {
    return getMockAuditLog(limit)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_list_audit_log', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_limit: limit,
  })
  if (error) throw error

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    action: row.action as AdminAuditAction,
    entity_type: (row.entity_type as string | null) ?? null,
    entity_id: (row.entity_id as string | null) ?? null,
    details: (row.details as Record<string, unknown> | null) ?? null,
    created_at: row.created_at as string,
    actor_name: row.actor_name as string,
    actor_login_name: (row.actor_login_name as string | null) ?? null,
  }))
}
