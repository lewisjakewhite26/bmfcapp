import { recordAdminAudit } from './adminAudit'
import { isMockDataMode } from './clubApi'
import { getClubSession } from './clubAuth'
import { deleteMockSponsorLogo, saveMockSponsorName, uploadMockSponsorLogo } from './mockData'
import { sponsorLogoFileExt, validateSponsorLogoFile, SPONSOR_NAME_MAX_LENGTH } from './sponsorLogo'
import { supabase } from './supabase'

/**
 * Admin sponsor management (migration 054). Players can still manage their
 * own sponsor from their profile; this lets an admin do it for anyone.
 */

function requireSession() {
  const session = getClubSession()
  if (!session) throw new Error('Not signed in')
  return session
}

function delay(ms = 120): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function adminSetPlayerSponsorName(playerId: string, name: string | null): Promise<string | null> {
  const trimmed = name?.trim() || null
  if (trimmed && trimmed.length > SPONSOR_NAME_MAX_LENGTH) {
    throw new Error(`Sponsor name must be ${SPONSOR_NAME_MAX_LENGTH} characters or fewer`)
  }
  if (isMockDataMode()) {
    await delay(60)
    return saveMockSponsorName(playerId, trimmed ?? '')
  }
  const session = requireSession()
  const { data, error } = await supabase.rpc('admin_set_player_sponsor_name', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
    p_sponsor_name: trimmed,
  })
  if (error) throw error
  void recordAdminAudit('player_sponsor_updated', { entityType: 'profile', entityId: playerId })
  return (data as { sponsor_name: string | null }).sponsor_name
}

export async function adminUploadPlayerSponsorLogo(playerId: string, file: File): Promise<string> {
  validateSponsorLogoFile(file)
  if (isMockDataMode()) {
    await delay()
    return uploadMockSponsorLogo(playerId, file)
  }
  const session = requireSession()
  const { data: prep, error: prepErr } = await supabase.rpc('admin_prepare_player_sponsor_logo_upload', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
    p_file_ext: sponsorLogoFileExt(file),
  })
  if (prepErr) throw prepErr
  const path = (prep as { path: string }).path

  const { error: uploadErr } = await supabase.storage
    .from('sponsor-logos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadErr) throw uploadErr

  const { data, error } = await supabase.rpc('admin_confirm_player_sponsor_logo', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
    p_storage_path: path,
  })
  if (error) throw error
  void recordAdminAudit('player_sponsor_updated', { entityType: 'profile', entityId: playerId })
  return (data as { sponsor_logo_url: string }).sponsor_logo_url
}

export async function adminClearPlayerSponsorLogo(playerId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay(60)
    deleteMockSponsorLogo(playerId)
    return
  }
  const session = requireSession()
  const { error } = await supabase.rpc('admin_clear_player_sponsor_logo', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
  })
  if (error) throw error
  void recordAdminAudit('player_sponsor_updated', { entityType: 'profile', entityId: playerId })
}
