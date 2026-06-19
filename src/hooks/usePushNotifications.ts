import { useCallback, useEffect, useState } from 'react'
import {
  getPushPermission,
  isPushSubscribed,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushNotifications'

export function usePushNotifications(playerId?: string) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState(getPushPermission())
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setSupported(isPushSupported())
    setPermission(getPushPermission())
    setSubscribed(await isPushSubscribed())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, playerId])

  const enable = useCallback(async () => {
    if (!playerId) return { ok: false, reason: 'Not signed in' }
    setLoading(true)
    try {
      const result = await subscribeToPush(playerId)
      await refresh()
      return result
    } catch (err) {
      console.error('[push] enable() caught error from subscribeToPush', {
        playerId,
        permission: typeof Notification !== 'undefined' ? Notification.permission : 'n/a',
        error: err,
      })
      await refresh()
      return { ok: false, reason: err instanceof Error ? err.message : "Couldn't enable notifications" }
    } finally {
      setLoading(false)
    }
  }, [playerId, refresh])

  const disable = useCallback(async () => {
    if (!playerId) return
    setLoading(true)
    try {
      await unsubscribeFromPush(playerId)
      await refresh()
    } finally {
      setLoading(false)
    }
  }, [playerId, refresh])

  return { supported, permission, subscribed, loading, enable, disable, refresh }
}
