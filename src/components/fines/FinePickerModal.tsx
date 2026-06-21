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

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,var(--mobile-bottom-nav-clearance,1rem))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fine-picker-title"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-md p-4 shadow-xl max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p id="fine-picker-title" className="font-semibold text-brand-navy text-lg">
              {playerName}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">Tap fines to toggle, then save.</p>
          </div>
          {draftTotal > 0 && (
            <p className="font-display text-xl font-bold text-brand-blue tabular-nums shrink-0">
              {formatFineAmount(draftTotal)}
            </p>
          )}
        </div>

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

        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5 pt-4 border-t border-brand-blue/10">
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
            {saving ? 'Saving…' : 'Save fines'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
