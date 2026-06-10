import { useState } from 'react'
import toast from 'react-hot-toast'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { getVapidPublicKey } from '../../lib/pushNotifications'

const DISMISS_KEY = 'bmfc_push_prompt_dismissed'

interface PushNotificationPromptProps {
  playerId?: string
}

export function PushNotificationPrompt({ playerId }: PushNotificationPromptProps) {
  const { supported, permission, subscribed, loading, enable } = usePushNotifications(playerId)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  if (dismissed || !playerId || !supported || subscribed || permission === 'denied') {
    return null
  }

  const configured = Boolean(getVapidPublicKey())

  return (
    <div className="glass-card p-4 border-l-4 border-brand-blue flex gap-3 items-start">
      <span className="text-2xl shrink-0" aria-hidden>🔔</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-brand-navy">Turn on notifications</p>
        <p className="text-sm text-gray-500 mt-1">
          Get match and training reminders straight to your phone — no app needed.
          {!configured && (
            <span className="block mt-1 text-xs text-amber-700">
              Requires HTTPS and server setup (VAPID keys).
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              const result = await enable()
              if (result.ok) toast.success('Notifications enabled')
              else toast.error(result.reason ?? 'Could not enable notifications')
            }}
            className="btn-primary text-sm py-2 px-4 min-h-0"
          >
            {loading ? 'Enabling...' : 'Enable'}
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, '1')
              setDismissed(true)
            }}
            className="text-sm text-gray-500 hover:text-brand-navy px-2 py-2"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
