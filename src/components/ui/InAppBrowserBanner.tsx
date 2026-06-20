import { useEffect, useState } from 'react'
import {
  detectInAppBrowser,
  inAppBrowserLabel,
  preferredExternalBrowserName,
  type InAppBrowserKind,
} from '../../lib/inAppBrowser'

export function InAppBrowserBanner() {
  const [kind, setKind] = useState<InAppBrowserKind | null>(null)
  const [browserName, setBrowserName] = useState<'Safari' | 'Chrome'>('Chrome')

  useEffect(() => {
    setKind(detectInAppBrowser())
    setBrowserName(preferredExternalBrowserName())
  }, [])

  if (!kind) return null

  const appName = inAppBrowserLabel(kind)

  return (
    <div
      className="relative z-20 w-full px-4 py-3 text-center text-sm leading-snug"
      style={{ background: 'rgba(212, 175, 55, 0.15)', color: '#F4F1E8', borderBottom: '1px solid rgba(212, 175, 55, 0.25)' }}
      role="status"
    >
      <p className="font-semibold">Open in {browserName} to install</p>
      <p className="mt-1 text-[#C5CAD6]">
        {appName}&apos;s browser can&apos;t install apps. Tap the menu (⋯) and choose &ldquo;Open in {browserName}&rdquo;.
      </p>
    </div>
  )
}
