export type InAppBrowserKind = 'whatsapp' | 'instagram' | 'facebook'

const IN_APP_UA: { kind: InAppBrowserKind; test: RegExp }[] = [
  { kind: 'whatsapp', test: /WhatsApp/i },
  { kind: 'instagram', test: /Instagram/i },
  { kind: 'facebook', test: /FBAN|FBAV|FB_IAB|FBIOS|Facebook/i },
]

export const IN_APP_BANNER_DISMISS_KEY = 'bmfc_in_app_banner_dismissed'

/** True when opened inside WhatsApp, Instagram, or Facebook in-app browsers. */
export function detectInAppBrowser(): InAppBrowserKind | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  for (const { kind, test } of IN_APP_UA) {
    if (test.test(ua)) return kind
  }
  return null
}

export function inAppBrowserLabel(kind: InAppBrowserKind): string {
  switch (kind) {
    case 'whatsapp':
      return 'WhatsApp'
    case 'instagram':
      return 'Instagram'
    case 'facebook':
      return 'Facebook'
  }
}

export function preferredExternalBrowserName(): 'Safari' | 'Chrome' {
  if (typeof navigator === 'undefined') return 'Chrome'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'Safari'
  }
  return 'Chrome'
}

export function isInAppBannerDismissed(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  try {
    return sessionStorage.getItem(IN_APP_BANNER_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissInAppBanner(): void {
  sessionStorage.setItem(IN_APP_BANNER_DISMISS_KEY, '1')
}
