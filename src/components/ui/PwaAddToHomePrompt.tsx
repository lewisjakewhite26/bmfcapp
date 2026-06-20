import { useEffect, useState } from 'react'
import {
  BeforeInstallPromptEvent,
  dismissAddToHomePrompt,
  isAddToHomePromptDismissed,
  isIosDevice,
} from '../../lib/pwaInstall'
import { isStandalonePwa } from '../../lib/pushNotifications'

function ShareIcon() {
  return (
    <svg
      className="w-4 h-4 inline-block align-text-bottom mx-0.5 text-brand-blue"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v13" />
      <path d="m16 7-4-4-4 4" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    </svg>
  )
}

export function PwaAddToHomePrompt() {
  const [dismissed, setDismissed] = useState(isAddToHomePromptDismissed)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)

  const ios = isIosDevice()
  const standalone = isStandalonePwa()

  useEffect(() => {
    if (standalone || dismissed) return

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setInstallEvent(null)
      setDismissed(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [standalone, dismissed])

  if (standalone || dismissed) return null
  if (!ios && !installEvent) return null

  const handleDismiss = () => {
    dismissAddToHomePrompt()
    setDismissed(true)
  }

  const handleInstall = async () => {
    if (!installEvent) return
    setInstalling(true)
    try {
      await installEvent.prompt()
      const { outcome } = await installEvent.userChoice
      if (outcome === 'accepted') {
        setInstallEvent(null)
        setDismissed(true)
        return
      }
      handleDismiss()
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className="glass-card p-4 border-l-4 border-brand-blue flex gap-3 items-start">
      <span className="text-2xl shrink-0" aria-hidden>📲</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-brand-navy">Add BMFC Club Hub to your home screen</p>
        {ios ? (
          <p className="text-sm text-gray-500 mt-1">
            Tap <ShareIcon /> Share, then &ldquo;Add to Home Screen&rdquo; for quick access like an app.
          </p>
        ) : (
          <p className="text-sm text-gray-500 mt-1">
            Install for quick access, full-screen view, and match reminders on your phone.
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {!ios && installEvent && (
            <button
              type="button"
              disabled={installing}
              onClick={handleInstall}
              className="btn-primary text-sm py-2 px-4 min-h-0"
            >
              {installing ? 'Installing…' : 'Install'}
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm text-gray-500 hover:text-brand-navy px-2 py-2"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
