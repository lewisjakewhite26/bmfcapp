import type { User } from '../types'

export const DEV_BYPASS_TOKEN = 'dev-bypass-token'

export const DEV_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'clee',
  display_name: 'Chris L',
  is_admin: false,
  is_committee: false,
  is_approved: true,
  session_token: DEV_BYPASS_TOKEN,
}

export const DEV_ADMIN: User = {
  id: '00000000-0000-0000-0000-000000000002',
  username: 'preview_admin',
  display_name: 'Preview Admin',
  is_admin: true,
  is_committee: true,
  is_approved: true,
  session_token: DEV_BYPASS_TOKEN,
}

export const DEV_PENDING: User = {
  id: '00000000-0000-0000-0000-000000000003',
  username: 'pending_user',
  display_name: 'Pending Player',
  is_admin: false,
  is_committee: false,
  is_approved: false,
  session_token: DEV_BYPASS_TOKEN,
}

export function isDevBypassEnabled(): boolean {
  return import.meta.env.DEV
}

export function isDevBypassSession(user: User | null | undefined): boolean {
  return user?.session_token === DEV_BYPASS_TOKEN
}
