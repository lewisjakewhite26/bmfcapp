import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FINE_CATALOG,
  formatFineAmount,
  isLatenessFineKey,
  LATENESS_FINES,
  latenessStateFromKeys,
  type LatenessState,
} from '../../lib/fineCatalog'
import { FineOneOffSection } from './FineOneOffSection'
import { FineTypeGrid } from './FineTypeGrid'

export type OneOffFineDraft = {
  key: string | null
  label: string
  amount: number
}

export type FinePickerSavePayload = {
  lateness: LatenessState
  presetKeys: Set<string>
  oneOff: OneOffFineDraft | null
}

interface FinePickerModalProps {
  open: boolean
  playerName: string
  initialPresetKeys: Set<string>
  initialOneOff: OneOffFineDraft | null
  saving?: boolean
  onClose: () => void
  onSave: (payload: FinePickerSavePayload) => void
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function parseOneOff(label: string, amount: string): OneOffFineDraft | null {
  const trimmed = label.trim()
  const parsed = Number.parseFloat(amount)
  if (trimmed.length < 2 || !Number.isFinite(parsed) || parsed <= 0) return null
  return { key: null, label: trimmed, amount: parsed }
}

/** Preset keys excluding lateness — lateness is edited via the cycling tile only. */
function nonLatenessPresetKeys(keys: Set<string>): Set<string> {
  return new Set([...keys].filter((key) => !isLatenessFineKey(key)))
}

export function FinePickerModal({
  open,
  playerName,
  initialPresetKeys,
  initialOneOff,
  saving,
  onClose,
  onSave,
}: FinePickerModalProps) {
  const [draftPresetKeys, setDraftPresetKeys] = useState<Set<string>>(() =>
    nonLatenessPresetKeys(initialPresetKeys),
  )
  const [lateness, setLateness] = useState<LatenessState>(() => latenessStateFromKeys(initialPresetKeys))
  const [oneOffLabel, setOneOffLabel] = useState(initialOneOff?.label ?? '')
  const [oneOffAmount, setOneOffAmount] = useState(
    initialOneOff ? String(initialOneOff.amount) : '',
  )
  const [oneOffKey, setOneOffKey] = useState<string | null>(initialOneOff?.key ?? null)

  useEffect(() => {
    if (open) {
      setDraftPresetKeys(nonLatenessPresetKeys(initialPresetKeys))
      setLateness(latenessStateFromKeys(initialPresetKeys))
      setOneOffLabel(initialOneOff?.label ?? '')
      setOneOffAmount(initialOneOff ? String(initialOneOff.amount) : '')
      setOneOffKey(initialOneOff?.key ?? null)
    }
  }, [open, initialPresetKeys, initialOneOff])

  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY)
      })
    }
  }, [open])

  const draftOneOff = useMemo(
    () => parseOneOff(oneOffLabel, oneOffAmount),
    [oneOffLabel, oneOffAmount],
  )

  const draftTotal = useMemo(() => {
    const presetTotal = FINE_CATALOG
      .filter((f) => draftPresetKeys.has(f.key))
      .reduce((s, f) => s + f.amount, 0)
    const latenessTotal =
      lateness === 'off' ? 0 : (LATENESS_FINES.find((f) => f.key === lateness)?.amount ?? 0)
    return presetTotal + latenessTotal + (draftOneOff?.amount ?? 0)
  }, [draftPresetKeys, draftOneOff, lateness])

  const selectedCount =
    draftPresetKeys.size + (draftOneOff ? 1 : 0) + (lateness === 'off' ? 0 : 1)

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,var(--mobile-bottom-nav-clearance,1rem))] touch-none overscroll-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fine-picker-title"
      onClick={onClose}
    >
      <div
        className="fine-modal-panel dialog-panel flex w-full max-w-lg flex-col max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] overflow-hidden shadow-xl touch-auto !p-0"
        data-testid="fine-picker"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-brand-blue/10 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="fine-picker-title" className="font-semibold text-brand-navy text-lg">
                {playerName}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5" data-testid="fine-picker-summary">
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 space-y-4">
          <FineTypeGrid
            lateness={lateness}
            activeKeys={draftPresetKeys}
            disabled={saving}
            onLatenessChange={setLateness}
            onToggle={(key, _label, _amount, enabled) => {
              setDraftPresetKeys((prev) => {
                const next = new Set(prev)
                if (enabled) next.add(key)
                else next.delete(key)
                return next
              })
            }}
          />
          <FineOneOffSection
            label={oneOffLabel}
            amount={oneOffAmount}
            disabled={saving}
            onLabelChange={setOneOffLabel}
            onAmountChange={setOneOffAmount}
          />
        </div>

        <footer className="shrink-0 border-t border-brand-blue/10 px-4 py-4 sm:px-5">
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
              data-testid="fine-picker-save"
              disabled={saving}
              onClick={() =>
                onSave({
                  lateness,
                  presetKeys: draftPresetKeys,
                  oneOff: draftOneOff ? { ...draftOneOff, key: oneOffKey } : null,
                })
              }
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
