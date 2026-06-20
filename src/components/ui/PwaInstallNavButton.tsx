import { useState } from 'react'
import toast from 'react-hot-toast'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { PwaIosInstallInstructions } from './PwaIosInstallInstructions'
import { triggerPwaInstall } from '../../lib/pwaInstall'

function InstallIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

export function PwaInstallNavButton() {
  const { ios, standalone, canPrompt } = usePwaInstall()
  const [iosOpen, setIosOpen] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (standalone) return null

  const handleClick = async () => {
    if (ios) {
      setIosOpen(true)
      return
    }

    if (!canPrompt) {
      toast(
        'Install will appear here once your browser is ready. Try again after browsing a bit, or use the browser menu.',
        { duration: 5000 },
      )
      return
    }

    setInstalling(true)
    try {
      await triggerPwaInstall()
    } finally {
      setInstalling(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={installing}
        className="flex items-center gap-1 text-xs sm:text-sm text-brand-blue hover:text-brand-navy transition-colors min-h-[44px] px-1.5 sm:px-2 shrink-0 touch-manipulation"
        aria-label="Install BMFC Club Hub app"
      >
        <InstallIcon />
        <span>{installing ? '…' : 'Install'}</span>
      </button>

      {iosOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-ios-install-title"
          onClick={() => setIosOpen(false)}
        >
          <div
            className="glass-card w-full max-w-sm p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="pwa-ios-install-title" className="font-semibold text-brand-navy">
              Add BMFC Club Hub to your home screen
            </p>
            <PwaIosInstallInstructions />
            <button
              type="button"
              onClick={() => setIosOpen(false)}
              className="btn-primary text-sm py-2 px-4 min-h-0 mt-4 w-full sm:w-auto"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
