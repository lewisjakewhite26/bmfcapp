import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PwaIosInstallInstructions } from './PwaIosInstallInstructions'

interface PwaIosInstallDialogProps {
  onClose: () => void
  titleId?: string
}

/** iOS add-to-home-screen steps — portaled above nav bars so Safari/WebKit never clips it. */
export function PwaIosInstallDialog({ onClose, titleId = 'pwa-ios-install-title' }: PwaIosInstallDialogProps) {
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,var(--mobile-bottom-nav-clearance,1rem))] touch-none overscroll-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="dialog-panel w-full max-w-sm p-4 shadow-xl max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] overflow-y-auto overscroll-contain touch-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <p id={titleId} className="font-semibold text-brand-navy">
          Add BMFC Club Hub to your home screen
        </p>
        <PwaIosInstallInstructions />
        <button
          type="button"
          onClick={onClose}
          className="btn-primary text-sm py-2 px-4 min-h-[44px] mt-4 w-full sm:w-auto touch-manipulation"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body,
  )
}
