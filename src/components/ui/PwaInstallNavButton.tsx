import { useState } from 'react'
import toast from 'react-hot-toast'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { PwaIosInstallDialog } from './PwaIosInstallDialog'
import { triggerPwaInstall } from '../../lib/pwaInstall'

function InstallIcon({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg
      className={className}
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
        'Download will appear here once your browser is ready. Try again after browsing a bit, or use the browser menu.',
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

  const label = installing ? '…' : 'Download'

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={installing}
        className="flex min-h-[44px] shrink-0 items-center gap-1 px-1.5 text-xs text-brand-blue transition-colors touch-manipulation hover:text-brand-navy disabled:opacity-50 sm:px-2 sm:text-sm"
        aria-label="Download BMFC Club Hub app"
      >
        <InstallIcon />
        <span>{label}</span>
      </button>

      {iosOpen && <PwaIosInstallDialog onClose={() => setIosOpen(false)} titleId="pwa-ios-install-title" />}
    </>
  )
}
