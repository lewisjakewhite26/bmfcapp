import type { LiveLogEntry, LiveMatchDraft } from './liveMatchEvents'

const STORAGE_PREFIX = 'bmfc_live_draft_'

function storageKey(fixtureId: string): string {
  return `${STORAGE_PREFIX}${fixtureId}`
}

export function readLocalLiveDraft(fixtureId: string): LiveMatchDraft | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(fixtureId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as LiveMatchDraft
    if (parsed.fixture_id !== fixtureId || !Array.isArray(parsed.entries)) return null
    return parsed
  } catch {
    return null
  }
}

export function writeLocalLiveDraft(draft: LiveMatchDraft): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(storageKey(draft.fixture_id), JSON.stringify(draft))
}

export function clearLocalLiveDraft(fixtureId: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(storageKey(fixtureId))
}

export function parseLiveDraftEntries(raw: unknown): LiveLogEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is LiveLogEntry =>
      typeof e === 'object' &&
      e != null &&
      typeof (e as LiveLogEntry).id === 'string' &&
      typeof (e as LiveLogEntry).kind === 'string' &&
      typeof (e as LiveLogEntry).minute === 'number',
  )
}
