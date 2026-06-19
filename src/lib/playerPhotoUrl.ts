import { isSupabaseConfigured } from './supabase'

function trimEnv(value: string | undefined): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const supabaseUrl = trimEnv(import.meta.env.VITE_SUPABASE_URL)

/** Resolve stored photo path or mock blob URL for display. */
export function resolvePlayerPhotoUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null
  if (
    photoUrl.startsWith('http://') ||
    photoUrl.startsWith('https://') ||
    photoUrl.startsWith('blob:') ||
    photoUrl.startsWith('data:')
  ) {
    return photoUrl
  }
  if (!isSupabaseConfigured || !supabaseUrl) return null
  return `${supabaseUrl}/storage/v1/object/public/player-photos/${photoUrl}`
}
