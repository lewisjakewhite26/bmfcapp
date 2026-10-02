import { recordAdminAudit } from './adminAudit'
import { isMockDataMode } from './clubApi'
import { getClubSession } from './clubAuth'
import { opponentKey } from './graphics/data'
import { isSupabaseConfigured, supabase } from './supabase'

/**
 * Matchday graphics library: player cut-outs and opponent badges
 * (migration 053). Admin only. Mock data mode keeps everything in memory
 * with blob URLs, like the other mock upload flows.
 */

export const GRAPHICS_BUCKET = 'matchday-graphics'

export interface GraphicPlayerPhoto {
  id: string
  player_id: string
  cutout_path: string
  original_path: string | null
  is_default: boolean
  created_at: string
}

export interface OpponentBadge {
  id: string
  opponent_key: string
  opponent_name: string
  badge_path: string
  updated_at: string
}

export interface GraphicsLibrary {
  photos: GraphicPlayerPhoto[]
  badges: OpponentBadge[]
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || undefined

/** Public URL for a stored path (mock mode stores blob: URLs directly). */
export function resolveGraphicsUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^(https?:|blob:|data:)/.test(path)) return path
  if (!isSupabaseConfigured || !supabaseUrl) return null
  return `${supabaseUrl}/storage/v1/object/public/${GRAPHICS_BUCKET}/${path}`
}

// ---------------------------------------------------------------------------
// Mock store
// ---------------------------------------------------------------------------

const mockPhotos: GraphicPlayerPhoto[] = []
const mockBadges: OpponentBadge[] = []

/** Playwright: clear the in-memory library between tests. */
export function resetMockGraphicsForE2e(): void {
  mockPhotos.splice(0).forEach((p) => {
    revokeIfBlob(p.cutout_path)
    revokeIfBlob(p.original_path)
  })
  mockBadges.splice(0).forEach((b) => revokeIfBlob(b.badge_path))
}

function delay(ms = 120): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function revokeIfBlob(url: string | null | undefined) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireSession() {
  const session = getClubSession()
  if (!session) throw new Error('Not signed in')
  return session
}

async function removeFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(GRAPHICS_BUCKET).remove(paths)
  // The rows are already gone; a leftover file is harmless, so just log it.
  if (error) console.warn('[graphics] could not remove files', error.message)
}

async function uploadTo(path: string, blob: Blob, contentType: string): Promise<void> {
  const { error } = await supabase.storage.from(GRAPHICS_BUCKET).upload(path, blob, { contentType, upsert: false })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export async function fetchGraphicsLibrary(): Promise<GraphicsLibrary> {
  if (isMockDataMode()) {
    await delay(40)
    return { photos: [...mockPhotos], badges: [...mockBadges] }
  }
  const session = requireSession()
  const { data, error } = await supabase.rpc('admin_list_graphics_library', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  const lib = data as Partial<GraphicsLibrary> | null
  return { photos: lib?.photos ?? [], badges: lib?.badges ?? [] }
}

export async function uploadGraphicPlayerPhoto(
  playerId: string,
  cutoutPng: Blob,
  originalJpeg: Blob | null,
  makeDefault: boolean,
): Promise<GraphicPlayerPhoto> {
  if (isMockDataMode()) {
    await delay()
    const isFirst = !mockPhotos.some((p) => p.player_id === playerId)
    const isDefault = makeDefault || isFirst
    if (isDefault) mockPhotos.forEach((p) => p.player_id === playerId && (p.is_default = false))
    const photo: GraphicPlayerPhoto = {
      id: crypto.randomUUID(),
      player_id: playerId,
      cutout_path: URL.createObjectURL(cutoutPng),
      original_path: originalJpeg ? URL.createObjectURL(originalJpeg) : null,
      is_default: isDefault,
      created_at: new Date().toISOString(),
    }
    mockPhotos.unshift(photo)
    void recordAdminAudit('graphic_photo_added', { entityType: 'profile', entityId: playerId })
    return photo
  }

  const session = requireSession()
  const { data: prep, error: prepErr } = await supabase.rpc('admin_prepare_graphic_photo_upload', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
    p_include_original: Boolean(originalJpeg),
  })
  if (prepErr) throw prepErr
  const paths = prep as { cutout_path: string; original_path: string | null }

  await uploadTo(paths.cutout_path, cutoutPng, 'image/png')
  if (originalJpeg && paths.original_path) {
    await uploadTo(paths.original_path, originalJpeg, 'image/jpeg')
  }

  const { data, error } = await supabase.rpc('admin_confirm_graphic_photo', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
    p_cutout_path: paths.cutout_path,
    p_original_path: originalJpeg ? paths.original_path : null,
    p_make_default: makeDefault,
  })
  if (error) throw error
  void recordAdminAudit('graphic_photo_added', { entityType: 'profile', entityId: playerId })
  return data as GraphicPlayerPhoto
}

export async function setDefaultGraphicPhoto(photoId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay(40)
    const photo = mockPhotos.find((p) => p.id === photoId)
    if (!photo) throw new Error('Photo not found')
    mockPhotos.forEach((p) => p.player_id === photo.player_id && (p.is_default = p.id === photoId))
    return
  }
  const session = requireSession()
  const { error } = await supabase.rpc('admin_set_default_graphic_photo', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_photo_id: photoId,
  })
  if (error) throw error
}

export async function deleteGraphicPhoto(photoId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    const index = mockPhotos.findIndex((p) => p.id === photoId)
    if (index < 0) throw new Error('Photo not found')
    const [removed] = mockPhotos.splice(index, 1)
    revokeIfBlob(removed.cutout_path)
    revokeIfBlob(removed.original_path)
    if (removed.is_default) {
      const next = mockPhotos.find((p) => p.player_id === removed.player_id)
      if (next) next.is_default = true
    }
    void recordAdminAudit('graphic_photo_deleted', { entityType: 'profile', entityId: removed.player_id })
    return
  }
  const session = requireSession()
  const { data, error } = await supabase.rpc('admin_delete_graphic_photo', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_photo_id: photoId,
  })
  if (error) throw error
  await removeFiles((data as { paths: string[] }).paths ?? [])
  void recordAdminAudit('graphic_photo_deleted', { entityType: 'graphic_photo', entityId: photoId })
}

const BADGE_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

export async function uploadOpponentBadge(opponentName: string, file: Blob): Promise<OpponentBadge> {
  const ext = BADGE_TYPES[file.type]
  if (!ext) throw new Error('Use a PNG, JPEG or WebP image')
  if (file.size > 10 * 1024 * 1024) throw new Error('Badge must be 10MB or smaller')
  const name = opponentName.trim()
  if (!name) throw new Error('Opponent name is required')

  if (isMockDataMode()) {
    await delay()
    const key = opponentKey(name)
    const existing = mockBadges.find((b) => b.opponent_key === key)
    const badge: OpponentBadge = {
      id: existing?.id ?? crypto.randomUUID(),
      opponent_key: key,
      opponent_name: name,
      badge_path: URL.createObjectURL(file),
      updated_at: new Date().toISOString(),
    }
    if (existing) {
      revokeIfBlob(existing.badge_path)
      Object.assign(existing, badge)
    } else {
      mockBadges.push(badge)
    }
    void recordAdminAudit('opponent_badge_saved', { entityType: 'opponent_badge', details: { opponent: name } })
    return badge
  }

  const session = requireSession()
  const { data: prep, error: prepErr } = await supabase.rpc('admin_prepare_opponent_badge_upload', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_file_ext: ext,
  })
  if (prepErr) throw prepErr
  const path = (prep as { path: string }).path
  await uploadTo(path, file, file.type)

  const { data, error } = await supabase.rpc('admin_confirm_opponent_badge', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_opponent_name: name,
    p_badge_path: path,
  })
  if (error) throw error
  const result = data as { badge: OpponentBadge; replaced_path: string | null }
  if (result.replaced_path) await removeFiles([result.replaced_path])
  void recordAdminAudit('opponent_badge_saved', { entityType: 'opponent_badge', entityId: result.badge.id, details: { opponent: name } })
  return result.badge
}

export async function deleteOpponentBadge(badgeId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    const index = mockBadges.findIndex((b) => b.id === badgeId)
    if (index < 0) throw new Error('Badge not found')
    const [removed] = mockBadges.splice(index, 1)
    revokeIfBlob(removed.badge_path)
    void recordAdminAudit('opponent_badge_deleted', { entityType: 'opponent_badge', entityId: badgeId })
    return
  }
  const session = requireSession()
  const { data, error } = await supabase.rpc('admin_delete_opponent_badge', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_badge_id: badgeId,
  })
  if (error) throw error
  await removeFiles((data as { paths: string[] }).paths ?? [])
  void recordAdminAudit('opponent_badge_deleted', { entityType: 'opponent_badge', entityId: badgeId })
}

/** Badge for a fixture's opponent, matched on the normalised name. */
export function badgeForOpponent(badges: OpponentBadge[], opponent: string): OpponentBadge | null {
  const key = opponentKey(opponent)
  return badges.find((b) => b.opponent_key === key) ?? null
}

/** A player's photos, default first then newest. */
export function photosForPlayer(photos: GraphicPlayerPhoto[], playerId: string): GraphicPlayerPhoto[] {
  return photos
    .filter((p) => p.player_id === playerId)
    .sort((a, b) => Number(b.is_default) - Number(a.is_default) || b.created_at.localeCompare(a.created_at))
}

/**
 * Bulk upload matching: "jack-marley-2.jpg" → "jack marley". Compared with
 * player names and opponent names the same way.
 */
export function fileNameKey(fileName: string): string {
  const stem = fileName.replace(/\.[a-z0-9]+$/i, '')
  return nameKey(stem).replace(/\s+\d+$/, '')
}

export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
