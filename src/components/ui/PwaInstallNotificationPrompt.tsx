import { useState } from 'react'
import toast from 'react-hot-toast'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import {
  getPushPermission,
  isStandalonePwa,
  PWA_PUSH_PROMPT_DISMISS_KEY,
  pushEnableFailureMessage,
} from '../../lib/pushNotifications'

interface PwaInstallNotificationPromptProps {
  playerId?: string
}

export function PwaInstallNotificationPrompt({ playerId }: PwaInstallNotificationPromptProps) {
  const { supported, permission, subscribed, loading, enable } = usePushNotifications(playerId)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(PWA_PUSH_PROMPT_DISMISS_KEY) === '1'
  )
  const [blockedHint, setBlockedHint] = useState(false)

  if (
    dismissed ||
    !isStandalonePwa() ||
    !playerId ||
    !supported ||
    subscribed
  ) {
    return null
  }

  if (permission === 'denied' || blockedHint) {
    return (
      <div className="glass-card p-4 border-l-4 border-brand-blue flex gap-3 items-start">
        <span className="text-2xl shrink-0" aria-hidden>🔔</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brand-navy">Turn on notifications</p>
          <p className="text-sm text-gray-500 mt-1">
            Notifications blocked. Turn them on in your browser settings.
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(PWA_PUSH_PROMPT_DISMISS_KEY, '1')
              setDismissed(true)
            }}
            className="text-sm text-gray-500 hover:text-brand-navy px-2 py-2 mt-3"
          >
            Not now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-4 border-l-4 border-brand-blue flex gap-3 items-start">
      <span className="text-2xl shrink-0" aria-hidden>🔔</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-brand-navy">Turn on notifications</p>
        <p className="text-sm text-gray-500 mt-1">
          Turn on notifications for game and training reminders.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              const result = await enable()
              if (result.ok) {
                localStorage.setItem(PWA_PUSH_PROMPT_DISMISS_KEY, '1')
                setDismissed(true)
                toast.success('Notifications turned on')
                return
              }

              const message = pushEnableFailureMessage(getPushPermission(), result.reason)
              if (message.startsWith('Notifications blocked')) {
                setBlockedHint(true)
              } else {
                toast.error(message)
              }
            }}
            className="btn-primary text-sm py-2 px-4 min-h-0"
          >
            {loading ? 'Enabling...' : 'Enable'}
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(PWA_PUSH_PROMPT_DISMISS_KEY, '1')
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
