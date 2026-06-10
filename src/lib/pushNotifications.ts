import { supabase } from './supabase'
import { isMockDataMode } from './clubApi'
import { getClubSession } from './clubAuth'

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

export async function subscribeToPush(playerId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'Push notifications are not supported on this device or browser.' }
  }

  const vapidKey = getVapidPublicKey()
  if (!vapidKey) {
    return { ok: false, reason: 'Push is not configured yet (missing VAPID key).' }
  }

  if (isMockDataMode()) {
    return { ok: false, reason: 'Connect Supabase and VAPID keys to enable push notifications.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: 'Notification permission was denied.' }
  }

  const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'Could not create a push subscription.' }
  }

  const session = getClubSession()
  if (!session || session.userId !== playerId) {
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
    return { ok: false, reason: error.message }
  }

  return { ok: true }
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
