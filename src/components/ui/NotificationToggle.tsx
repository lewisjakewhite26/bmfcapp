import toast from 'react-hot-toast'
import { usePushNotifications } from '../../hooks/usePushNotifications'

interface NotificationToggleProps {
  playerId?: string
}

export function NotificationToggle({ playerId }: NotificationToggleProps) {
  const { supported, permission, subscribed, loading, enable, disable } = usePushNotifications(playerId)

  if (!supported) {
    return (
      <p className="px-3 py-2 text-sm text-gray-500">Notifications not supported on this device.</p>
    )
  }

  if (permission === 'denied') {
    return (
      <p className="px-3 py-2 text-sm text-gray-500">
        Notifications blocked. Turn them on in your browser settings.
      </p>
    )
  }

  return (
    <button
      type="button"
      disabled={loading || !playerId}
      onClick={async () => {
        if (subscribed) {
          await disable()
          toast.success('Notifications turned off')
        } else {
          const result = await enable()
          if (result.ok) toast.success('Notifications turned on')
          else toast.error(result.reason ?? 'Could not enable notifications')
        }
      }}
      className="w-full flex items-center justify-between min-h-[48px] px-3 rounded-xl text-brand-navy font-medium active:bg-brand-blue/5"
    >
      <span>Push notifications</span>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-pill ${subscribed ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
        {loading ? '...' : subscribed ? 'On' : 'Off'}
      </span>
    </button>
  )
}
