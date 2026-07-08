import { supabase } from './supabase'
import { loadSession } from '../hooks/authContext'
import type { InvitePreview, User } from '../types'

export interface ClubSession {
  userId: string
  sessionToken: string
}

export type SessionLookupResult =
  | { status: 'ok'; user: User }
  | { status: 'invalid' }
  | { status: 'unavailable' }

function isInvalidSessionError(error: { message?: string; code?: string }): boolean {
  const message = (error.message ?? '').toLowerCase()
  return (
    message.includes('invalid session') ||
    message.includes('unauthorized') ||
    error.code === 'P0001'
  )
}

export function getClubSession(): ClubSession | null {
  const user = loadSession()
  if (!user?.id || !user?.session_token) return null
  return { userId: user.id, sessionToken: user.session_token }
}

function mapRpcUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    display_name: row.display_name as string,
    is_admin: Boolean(row.is_admin),
    is_committee: Boolean(row.is_committee),
    is_fines_admin: Boolean(row.is_fines_admin),
    is_approved: Boolean(row.is_approved),
    session_token: row.session_token as string | undefined,
  }
}

export async function rpcLogin(displayName: string, passcode: string): Promise<User> {
  const { data, error } = await supabase.rpc('login_user', {
    p_display_name: displayName,
    p_passcode: passcode,
  })
  if (error) throw error
  return mapRpcUser(data as Record<string, unknown>)
}

export async function rpcGetSessionUser(
  userId: string,
  sessionToken: string,
): Promise<SessionLookupResult> {
  const { data, error } = await supabase.rpc('get_session_user', {
    p_user_id: userId,
    p_session_token: sessionToken,
  })
  if (error) {
    if (isInvalidSessionError(error)) return { status: 'invalid' }
    return { status: 'unavailable' }
  }
  return { status: 'ok', user: mapRpcUser(data as Record<string, unknown>) }
}

export async function rpcGetInvitePreview(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc('get_invite_preview', { p_token: token })
  if (error) throw error
  return data as InvitePreview
}

export async function rpcCompleteInvite(
  token: string,
  firstName: string,
  lastName: string,
  passcode: string,
): Promise<User> {
  const { data, error } = await supabase.rpc('complete_invite', {
    p_token: token,
    p_first_name: firstName.trim(),
    p_last_name: lastName.trim(),
    p_passcode: passcode,
  })
  if (error) throw error
  return mapRpcUser(data as Record<string, unknown>)
}

export async function rpcChangePasscode(
  userId: string,
  sessionToken: string,
  currentPasscode: string,
  newPasscode: string,
): Promise<void> {
  const { error } = await supabase.rpc('change_player_passcode', {
    p_user_id: userId,
    p_session_token: sessionToken,
    p_current_passcode: currentPasscode,
    p_new_passcode: newPasscode,
  })
  if (error) throw error
}

export function inviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`
}

export function teamInviteUrl(token: string): string {
  return `${window.location.origin}/join/${token}`
}

export async function rpcGetTeamInvitePreview(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc('get_team_invite_preview', { p_token: token })
  if (error) throw error
  return data as InvitePreview
}

export async function rpcCompleteTeamInvite(
  token: string,
  firstName: string,
  lastName: string,
  passcode: string,
): Promise<User> {
  const { data, error } = await supabase.rpc('complete_team_invite', {
    p_token: token,
    p_first_name: firstName.trim(),
    p_last_name: lastName.trim(),
    p_passcode: passcode,
  })
  if (error) throw error
  return mapRpcUser(data as Record<string, unknown>)
}
