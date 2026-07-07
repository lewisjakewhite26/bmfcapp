/** Preset match-day fines — amounts in GBP. */
import { formatMatchDate } from './format'

export const LATENESS_FINES = [
  { key: 'late', label: 'Late', amount: 1 },
  { key: 'late_10', label: 'Late 10+ mins', amount: 2 },
] as const

export type LatenessFineKey = (typeof LATENESS_FINES)[number]['key']
export type LatenessState = 'off' | LatenessFineKey

export const FINE_CATALOG = [
  { key: 'no_show', label: 'No show', amount: 5 },
  { key: 'sin_bin', label: 'Sin bin', amount: 5 },
  { key: 'no_vote', label: 'No vote', amount: 1 },
  { key: 'non_club_attire', label: 'Non-club attire', amount: 1 },
] as const

export type FineCatalogKey = (typeof FINE_CATALOG)[number]['key']

export const LATE_FINE_KEYS = new Set<string>(LATENESS_FINES.map((f) => f.key))

export const ALL_PRESET_FINE_KEYS = new Set<string>([
  ...LATENESS_FINES.map((f) => f.key),
  ...FINE_CATALOG.map((f) => f.key),
])

export const ONE_OFF_FINE_KEY_PREFIX = 'oneoff:'

const CATALOG_KEYS = new Set<string>(FINE_CATALOG.map((f) => f.key))

export function isCatalogFineKey(key: string): boolean {
  return CATALOG_KEYS.has(key) || LATE_FINE_KEYS.has(key)
}

export function isOneOffFineKey(key: string): boolean {
  return key.startsWith(ONE_OFF_FINE_KEY_PREFIX)
}

export function isLatenessFineKey(key: string): boolean {
  return LATE_FINE_KEYS.has(key)
}

export function latenessStateFromKeys(keys: Set<string>): LatenessState {
  if (keys.has('late_10')) return 'late_10'
  if (keys.has('late')) return 'late'
  return 'off'
}

export function newOneOffFineKey(): string {
  return `${ONE_OFF_FINE_KEY_PREFIX}${crypto.randomUUID()}`
}

export function getFinePreset(key: string) {
  return LATENESS_FINES.find((f) => f.key === key) ?? FINE_CATALOG.find((f) => f.key === key)
}

export function formatFineAmount(amount: number): string {
  return `£${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`
}

export function fineEventDateLabel(sessionDate: string): string {
  return formatMatchDate(`${sessionDate}T12:00:00`)
}

export function autoFineEventTitle(sessionDate: string): string {
  return fineEventDateLabel(sessionDate)
}

/** Primary label for a fines event — date by default, legacy custom titles kept. */
export function fineEventPrimaryLabel(title: string, sessionDate: string): string {
  const dateLabel = fineEventDateLabel(sessionDate)
  const trimmed = title.trim()
  if (!trimmed || trimmed === dateLabel) return dateLabel
  return trimmed
}

/** Subtitle under the primary label — date when title is custom, plus optional notes. */
export function fineEventSubtitle(
  title: string,
  sessionDate: string,
  notes?: string | null,
): string | null {
  const dateLabel = fineEventDateLabel(sessionDate)
  const trimmed = title.trim()
  const parts: string[] = []
  if (trimmed && trimmed !== dateLabel) parts.push(dateLabel)
  if (notes?.trim()) parts.push(notes.trim())
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Single-line label for fine entry rows (payments, player list). */
export function fineEventDisplayLabel(title: string, sessionDate: string): string {
  const dateLabel = fineEventDateLabel(sessionDate)
  const trimmed = title.trim()
  if (!trimmed || trimmed === dateLabel) return dateLabel
  return `${trimmed} · ${dateLabel}`
}
