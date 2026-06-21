import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FINE_CATALOG, formatFineAmount } from '../../lib/fineCatalog'
import { FineTypeGrid } from './FineTypeGrid'

interface FinePickerModalProps {
  open: boolean
  playerName: string
  initialActiveKeys: Set<string>
  saving?: boolean
  onClose: () => void
  onSave: (activeKeys: Set<string>) => void
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function FinePickerModal({
  open,
  playerName,
  initialActiveKeys,
  saving,
  onClose,
  onSave,
}: FinePickerModalProps) {
  const [draftKeys, setDraftKeys] = useState<Set<string>>(() => new Set(initialActiveKeys))

  useEffect(() => {
    if (open) setDraftKeys(new Set(initialActiveKeys))
  }, [open, initialActiveKeys])

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

  const draftTotal = useMemo(
    () => FINE_CATALOG.filter((f) => draftKeys.has(f.key)).reduce((s, f) => s + f.amount, 0),
    [draftKeys],
  )

  const selectedCount = draftKeys.size

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-0 sm:pb-[max(1rem,var(--mobile-bottom-nav-clearance,1rem))] touch-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fine-picker-title"
      onClick={onClose}
    >
      <div
        className="fine-modal-panel glass-card flex w-full max-w-lg flex-col max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] sm:max-h-[min(85dvh,calc(100dvh-2rem))] overflow-hidden rounded-t-[1.25rem] sm:rounded-[20px] border-b-0 sm:border-b touch-auto !p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex shrink-0 justify-center pt-3 pb-1" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-brand-blue/15" />
        </div>

        <header className="shrink-0 border-b border-brand-blue/10 px-4 pb-3 pt-1 sm:pt-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="fine-picker-title" className="font-semibold text-brand-navy text-lg">
                {playerName}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {selectedCount === 0
                  ? 'Tap fines to toggle, then save'
                  : `${selectedCount} fine${selectedCount === 1 ? '' : 's'} · ${formatFineAmount(draftTotal)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-brand-light/60 hover:text-brand-navy transition-colors touch-manipulation"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <FineTypeGrid
            activeKeys={draftKeys}
            disabled={saving}
            onToggle={(key, _label, _amount, enabled) => {
              setDraftKeys((prev) => {
                const next = new Set(prev)
                if (enabled) next.add(key)
                else next.delete(key)
                return next
              })
            }}
          />
        </div>

        <footer className="shrink-0 border-t border-brand-blue/10 px-4 py-4 sm:px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              className="btn-secondary text-sm py-2.5 min-h-[44px] flex-1 touch-manipulation"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary text-sm py-2.5 min-h-[44px] flex-1 touch-manipulation"
              disabled={saving}
              onClick={() => onSave(draftKeys)}
            >
              {saving ? 'Saving…' : selectedCount > 0 ? `Save · ${formatFineAmount(draftTotal)}` : 'Save fines'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
