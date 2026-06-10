import { supabase } from './supabase'
import { loadSession } from '../hooks/authContext'
import type { InvitePreview, User } from '../types'

export interface ClubSession {
  userId: string
  sessionToken: string
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

export async function rpcGetSessionUser(userId: string, sessionToken: string): Promise<User | null> {
  const { data, error } = await supabase.rpc('get_session_user', {
    p_user_id: userId,
    p_session_token: sessionToken,
  })
  if (error) return null
  return mapRpcUser(data as Record<string, unknown>)
}

export async function rpcGetInvitePreview(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc('get_invite_preview', { p_token: token })
  if (error) throw error
  return data as InvitePreview
}

export async function rpcCompleteInvite(token: string, passcode: string): Promise<User> {
  const { data, error } = await supabase.rpc('complete_invite', {
    p_token: token,
    p_passcode: passcode,
  })
  if (error) throw error
  return mapRpcUser(data as Record<string, unknown>)
}

export function inviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`
}
