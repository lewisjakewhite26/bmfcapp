import { PwaIosInstallInstructions } from './PwaIosInstallInstructions'

interface PwaIosInstallDialogProps {
  onClose: () => void
  titleId?: string
}

/** iOS add-to-home-screen steps — sized for short in-app browser viewports (e.g. WhatsApp). */
export function PwaIosInstallDialog({ onClose, titleId = 'pwa-ios-install-title' }: PwaIosInstallDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-sm p-4 shadow-xl max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] overflow-y-auto overscroll-contain"
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
    </div>
  )
}
