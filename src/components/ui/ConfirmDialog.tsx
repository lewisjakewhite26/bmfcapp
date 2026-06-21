import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,var(--mobile-bottom-nav-clearance,1rem))] touch-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={onCancel}
    >
      <div
        className="glass-card w-full max-w-sm p-5 shadow-xl touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-semibold text-brand-navy text-lg">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="text-sm text-gray-600 mt-2">
          {message}
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5">
          <button
            type="button"
            className="btn-secondary text-sm py-2.5 min-h-[44px] flex-1 touch-manipulation"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`text-sm py-2.5 min-h-[44px] flex-1 touch-manipulation ${
              destructive ? 'btn-danger' : 'btn-primary'
            }`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
