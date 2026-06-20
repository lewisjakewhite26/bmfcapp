import { createClient } from '@supabase/supabase-js'

/** Valid placeholder so createClient never throws when env vars are missing or malformed. */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key'

function trimEnv(value: string | undefined): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const supabaseUrl = trimEnv(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = trimEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && isValidSupabaseUrl(supabaseUrl),
)

/** Shown on ConfigRequired — reflects what was baked in at build time (no secrets). */
export function getSupabaseConfigDiagnostic() {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const url = trimEnv(rawUrl)
  const key = trimEnv(rawKey)

  let urlStatus: string
  if (!url) urlStatus = rawUrl ? 'empty or whitespace only' : 'not set in this build'
  else if (!isValidSupabaseUrl(url)) urlStatus = 'invalid (must be https://your-project.supabase.co)'
  else urlStatus = 'ok'

  let keyStatus: string
  if (!key) keyStatus = rawKey ? 'empty or whitespace only' : 'not set in this build'
  else keyStatus = 'ok'

  return {
    dataSource: import.meta.env.VITE_CLUB_DATA_SOURCE ?? '(not set)',
    urlStatus,
    keyStatus,
  }
}

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured. Set VITE_SUPABASE_URL (full https://… URL) and VITE_SUPABASE_ANON_KEY, then redeploy on Vercel.',
  )
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : PLACEHOLDER_URL,
  isSupabaseConfigured ? supabaseAnonKey! : PLACEHOLDER_KEY,
)
