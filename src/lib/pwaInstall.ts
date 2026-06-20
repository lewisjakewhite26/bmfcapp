export const PWA_A2HS_DISMISS_KEY = 'bmfc_a2hs_prompt_dismissed_at'
export const PWA_A2HS_DISMISS_DAYS = 4

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isAddToHomePromptDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    const raw = localStorage.getItem(PWA_A2HS_DISMISS_KEY)
    if (!raw) return false
    const dismissedAt = Number(raw)
    if (!Number.isFinite(dismissedAt)) return false
    const elapsedMs = Date.now() - dismissedAt
    return elapsedMs < PWA_A2HS_DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function dismissAddToHomePrompt(): void {
  localStorage.setItem(PWA_A2HS_DISMISS_KEY, String(Date.now()))
}
