import { isSupabaseConfigured } from './supabase'

function trimEnv(value: string | undefined): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const supabaseUrl = trimEnv(import.meta.env.VITE_SUPABASE_URL)

/** Resolve stored sponsor logo path or mock blob URL for display. */
export function resolveSponsorLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null
  if (
    logoUrl.startsWith('http://') ||
    logoUrl.startsWith('https://') ||
    logoUrl.startsWith('blob:') ||
    logoUrl.startsWith('data:')
  ) {
    return logoUrl
  }
  if (!isSupabaseConfigured || !supabaseUrl) return null
  return `${supabaseUrl}/storage/v1/object/public/sponsor-logos/${logoUrl}`
}
