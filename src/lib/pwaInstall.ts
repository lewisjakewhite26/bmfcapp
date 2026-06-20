export const PWA_A2HS_DISMISS_KEY = 'bmfc_a2hs_prompt_dismissed_at'
export const PWA_A2HS_DISMISS_DAYS = 4

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

/** True when the app is running as an installed PWA (not a browser tab). */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
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

let cachedInstallEvent: BeforeInstallPromptEvent | null = null
const installSubscribers = new Set<() => void>()
let captureInitialized = false

function notifyInstallSubscribers(): void {
  installSubscribers.forEach((listener) => listener())
}

/** Capture beforeinstallprompt as early as possible (call from main.tsx). */
export function initPwaInstallCapture(): void {
  if (typeof window === 'undefined' || captureInitialized) return
  captureInitialized = true

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    cachedInstallEvent = event as BeforeInstallPromptEvent
    notifyInstallSubscribers()
  })

  window.addEventListener('appinstalled', () => {
    cachedInstallEvent = null
    notifyInstallSubscribers()
  })
}

export function subscribePwaInstall(listener: () => void): () => void {
  installSubscribers.add(listener)
  return () => installSubscribers.delete(listener)
}

export function getPwaInstallEvent(): BeforeInstallPromptEvent | null {
  return cachedInstallEvent
}

export function canTriggerPwaInstall(): boolean {
  return cachedInstallEvent !== null
}

export async function triggerPwaInstall(): Promise<PwaInstallOutcome> {
  const event = cachedInstallEvent
  if (!event) return 'unavailable'

  await event.prompt()
  const { outcome } = await event.userChoice
  if (outcome === 'accepted') {
    cachedInstallEvent = null
    notifyInstallSubscribers()
  }
  return outcome
}

export function shouldShowPwaInstallUi(): boolean {
  return !isStandalonePwa()
}
