import { useState } from 'react'
import {
  dismissAddToHomePrompt,
  isAddToHomePromptDismissed,
  triggerPwaInstall,
} from '../../lib/pwaInstall'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { PwaIosInstallInstructions } from './PwaIosInstallInstructions'

export function PwaAddToHomePrompt() {
  const [dismissed, setDismissed] = useState(isAddToHomePromptDismissed)
  const [installing, setInstalling] = useState(false)
  const { ios, standalone, canPrompt } = usePwaInstall()

  if (standalone || dismissed) return null

  const handleDismiss = () => {
    dismissAddToHomePrompt()
    setDismissed(true)
  }

  const handleInstall = async () => {
    if (!canPrompt) return
    setInstalling(true)
    try {
      const outcome = await triggerPwaInstall()
      if (outcome === 'accepted') {
        setDismissed(true)
        return
      }
      if (outcome === 'dismissed') {
        handleDismiss()
      }
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
          <PwaIosInstallInstructions />
        ) : canPrompt ? (
          <p className="text-sm text-gray-500 mt-1">
            Install for quick access, full-screen view, and match reminders on your phone.
          </p>
        ) : (
          <p className="text-sm text-gray-500 mt-1">
            Install for quick access, full-screen view, and match reminders on your phone.
            If the Install button is not shown yet, your browser may need a little more browsing
            first — use the Install link in the top bar when it becomes ready.
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {!ios && canPrompt && (
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
