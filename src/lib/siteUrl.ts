/** Canonical site origin for QR codes and share links (current deployment). */
export function getSiteOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}
