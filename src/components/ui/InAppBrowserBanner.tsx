import { useEffect, useState } from 'react'
import {
  detectInAppBrowser,
  dismissInAppBanner,
  inAppBrowserLabel,
  isInAppBannerDismissed,
  preferredExternalBrowserName,
  type InAppBrowserKind,
} from '../../lib/inAppBrowser'

/**
 * Shown inside WhatsApp / Instagram / Facebook webviews.
 * Fixed to the bottom so message + dismiss stay in the visible viewport
 * (top chrome in these browsers often hides fixed-top banners).
 */
export function InAppBrowserBanner() {
  const [kind, setKind] = useState<InAppBrowserKind | null>(null)
  const [browserName, setBrowserName] = useState<'Safari' | 'Chrome'>('Chrome')
  const [dismissed, setDismissed] = useState(isInAppBannerDismissed)

  useEffect(() => {
    setKind(detectInAppBrowser())
    setBrowserName(preferredExternalBrowserName())
  }, [])

  if (!kind || dismissed) return null

  const appName = inAppBrowserLabel(kind)

  const handleDismiss = () => {
    dismissInAppBanner()
    setDismissed(true)
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto mx-auto max-w-lg rounded-card border border-brand-gold/30 bg-brand-navy text-[#F4F1E8] shadow-glass-hover p-4">
        <p className="font-semibold text-sm leading-snug">
          Open in {browserName} to install the app
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#C5CAD6]">
          {appName}&apos;s browser can&apos;t install apps. Tap the menu (⋯) and choose &ldquo;Open in {browserName}&rdquo;.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="btn-primary text-sm py-2 px-4 min-h-[44px] mt-3 w-full sm:w-auto touch-manipulation"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
