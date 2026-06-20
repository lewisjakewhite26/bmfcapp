import { supabase } from './supabase'
import { isMockDataMode } from './clubApi'
import { getClubSession } from './clubAuth'
import { isStandalonePwa } from './pwaInstall'

export type PushPermission = NotificationPermission | 'unsupported'

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getPushPermission(): PushPermission {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function getVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim()
  return key || null
}

export const PWA_PUSH_PROMPT_DISMISS_KEY = 'bmfc_pwa_push_prompt_dismissed'

export function pushEnableFailureMessage(
  permission: PushPermission,
  reason?: string
): string {
  if (permission === 'denied') {
    return 'Notifications blocked. Turn them on in your browser settings.'
  }
  if (reason?.toLowerCase().includes('denied')) {
    return 'Notifications blocked. Turn them on in your browser settings.'
  }
  return reason ?? "Couldn't enable notifications"
}

export async function subscribeToPush(playerId: string): Promise<{ ok: boolean; reason?: string }> {
  const logCtx = { playerId, step: 'init' }
  try {
    if (!isPushSupported()) {
      console.error('[push] subscribe failed: unsupported', logCtx)
      return { ok: false, reason: 'Push notifications are not supported on this device or browser.' }
    }

    const vapidKey = getVapidPublicKey()
    if (!vapidKey) {
      console.error('[push] subscribe failed: missing VAPID public key', logCtx)
      return { ok: false, reason: 'Push is not configured yet (missing VAPID key).' }
    }
    console.error('[push] VAPID public key present', { ...logCtx, keyLength: vapidKey.length, keyPrefix: vapidKey.slice(0, 8) })

    if (isMockDataMode()) {
      console.error('[push] subscribe failed: mock data mode', logCtx)
      return { ok: false, reason: 'Connect Supabase and VAPID keys to enable push notifications.' }
    }

    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration
    const existingSubscription = await registration.pushManager.getSubscription()
    if (!isStandalonePwa() && !existingSubscription) {
      console.error('[push] subscribe blocked: not standalone PWA', logCtx)
      return { ok: false, reason: 'Install the app first to enable notifications.' }
    }

    const permissionBefore = Notification.permission
    console.error('[push] requesting notification permission', { ...logCtx, permissionBefore })

    const permission = await Notification.requestPermission()
    console.error('[push] notification permission result', { ...logCtx, permissionBefore, permission })

    if (permission !== 'granted') {
      console.error('[push] subscribe failed: permission not granted', { ...logCtx, permissionBefore, permission })
      return { ok: false, reason: 'Notification permission was denied.' }
    }

    console.error('[push] waiting for service worker', {
      ...logCtx,
      controller: Boolean(navigator.serviceWorker.controller),
      registrations: (await navigator.serviceWorker.getRegistrations()).length,
    })

    console.error('[push] service worker ready', {
      ...logCtx,
      scope: registration.scope,
      activeState: registration.active?.state,
    })

    let subscription = existingSubscription
    console.error('[push] existing push subscription', { ...logCtx, hasSubscription: Boolean(subscription) })

    if (!subscription) {
      console.error('[push] calling pushManager.subscribe', logCtx)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      console.error('[push] pushManager.subscribe succeeded', { ...logCtx, endpoint: subscription.endpoint })
    }

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      console.error('[push] subscribe failed: incomplete subscription JSON', { ...logCtx, json })
      return { ok: false, reason: 'Could not create a push subscription.' }
    }

    const session = getClubSession()
    if (!session || session.userId !== playerId) {
      console.error('[push] subscribe failed: session mismatch', {
        ...logCtx,
        hasSession: Boolean(session),
        sessionUserId: session?.userId,
      })
      return { ok: false, reason: 'Not signed in' }
    }

    const { error } = await supabase.rpc('upsert_push_subscription', {
      p_user_id: session.userId,
      p_session_token: session.sessionToken,
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_user_agent: navigator.userAgent,
    })

    if (error) {
      console.error('[push] subscribe failed: upsert_push_subscription RPC error', { ...logCtx, error })
      return { ok: false, reason: error.message }
    }

    console.error('[push] subscribe succeeded', logCtx)
    return { ok: true }
  } catch (err) {
    console.error('[push] subscribe threw unexpectedly', {
      ...logCtx,
      permission: Notification.permission,
      error: err,
      name: err instanceof Error ? err.name : undefined,
      message: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

export async function unsubscribeFromPush(playerId: string): Promise<void> {
  void playerId
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    if (!isMockDataMode()) {
      const session = getClubSession()
      if (session) {
        await supabase.rpc('delete_push_subscription', {
          p_user_id: session.userId,
          p_session_token: session.sessionToken,
          p_endpoint: endpoint,
        })
      }
    }
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    return sub !== null && Notification.permission === 'granted'
  } catch {
    return false
  }
}
