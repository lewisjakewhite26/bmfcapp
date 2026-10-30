import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { suggestPeople, type PaidField, type Programme, type Race, type Runner } from '../../../lib/raceNight'
import { PaidToggle } from './PaidToggle'

type Field = 'horse' | 'owner' | 'jockey'

interface RunnerSheetProps {
  programme: Programme
  race: Race
  raceIndex: number
  runner: Runner
  onChange: (patch: Partial<Pick<Runner, Field | PaidField>>) => void
  onPrev: (() => void) | null
  /** Called for "Next runner". At the last runner this closes the sheet. */
  onNext: () => void
  isLast: boolean
  onRemove: () => void
  onClose: () => void
}

/** Lifts the sheet above the on-screen keyboard (iOS keeps the layout viewport put). */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}

const LABELS: Record<Field, string> = { horse: 'Horse', owner: 'Owner', jockey: 'Jockey' }
const PAID_KEY: Record<Field, PaidField> = { horse: 'horsePaid', owner: 'ownerPaid', jockey: 'jockeyPaid' }

/** Bottom sheet for editing one runner. Enter moves horse → owner → jockey → next runner. */
export function RunnerSheet({
  programme,
  race,
  raceIndex,
  runner,
  onChange,
  onPrev,
  onNext,
  isLast,
  onRemove,
  onClose,
}: RunnerSheetProps) {
  const inset = useKeyboardInset()
  const [focused, setFocused] = useState<Field>('horse')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const refs = {
    horse: useRef<HTMLInputElement>(null),
    owner: useRef<HTMLInputElement>(null),
    jockey: useRef<HTMLInputElement>(null),
  }

  // New runner: start on the horse and reset the remove confirmation.
  useEffect(() => {
    setConfirmRemove(false)
    setFocused('horse')
    refs.horse.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const suggestions = useMemo(
    () => (focused === 'horse' ? [] : suggestPeople(programme, runner[focused])),
    [programme, focused, runner],
  )

  const onEnter = (field: Field) => {
    if (field === 'horse') refs.owner.current?.focus()
    else if (field === 'owner') refs.jockey.current?.focus()
    else onNext()
  }

  // Portalled to <body> so it can sit above the app's bottom nav (the page has its own stacking context).
  return createPortal(
    <div className="fixed inset-0 z-[95]" role="dialog" aria-label={`Race ${raceIndex + 1} runner ${runner.number}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        className="absolute left-0 right-0 bg-white rounded-t-3xl shadow-2xl px-4 pt-2 pb-4 max-h-[88dvh] overflow-y-auto"
        style={{ bottom: inset, paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-gray-300" />
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-brand-navy">
            Race {raceIndex + 1} · Runner {runner.number}
            <span className="text-xs text-gray-400 font-normal ml-2">
              {runner.number} of {race.runners.length}
            </span>
          </h2>
          <button type="button" onClick={onClose} className="text-brand-blue font-semibold text-sm min-h-[44px] px-2">
            Done
          </button>
        </div>

        {(['horse', 'owner', 'jockey'] as const).map((field) => (
          <div key={field} className="mt-1.5">
            <label className="text-xs text-gray-500 font-semibold" htmlFor={`rn-${field}`}>
              {LABELS[field]}
            </label>
            <div className="flex items-center gap-2 mt-0.5">
              <input
                id={`rn-${field}`}
                ref={refs[field]}
                type="text"
                value={runner[field]}
                onChange={(e) => onChange({ [field]: e.target.value })}
                onFocus={() => setFocused(field)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onEnter(field)
                  }
                }}
                enterKeyHint={field === 'jockey' ? (isLast ? 'done' : 'next') : 'next'}
                autoComplete="off"
                autoCapitalize="words"
                className="input-field flex-1 min-w-0"
              />
              <PaidToggle
                paid={runner[PAID_KEY[field]]}
                onChange={(paid) => onChange({ [PAID_KEY[field]]: paid })}
                label={`${LABELS[field]} ${runner.number}`}
                disabled={!runner[field].trim()}
              />
            </div>
          </div>
        ))}

        <div className="mt-2 flex flex-wrap gap-1.5 min-h-[32px]">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              // Keep the keyboard up and the field focused while picking a name.
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange({ [focused]: name })
                if (focused === 'owner') refs.jockey.current?.focus()
              }}
              className="text-xs font-semibold bg-brand-blue/10 text-brand-blue rounded-pill px-3 py-1.5"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onPrev ?? undefined}
            disabled={!onPrev}
            className="flex-1 min-h-[48px] rounded-pill border border-brand-blue/15 text-sm font-semibold text-gray-600 disabled:opacity-40"
          >
            ‹ Previous
          </button>
          <button type="button" onClick={onNext} className="btn-primary flex-[1.6] min-h-[48px]">
            {isLast ? 'Done' : 'Next runner ›'}
          </button>
        </div>

        <div className="mt-1 text-center">
          {confirmRemove ? (
            <span className="text-sm">
              <button type="button" onClick={onRemove} className="text-red-600 font-semibold min-h-[44px] px-3">
                Yes, remove runner {runner.number}
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)} className="text-gray-600 min-h-[44px] px-3">
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmRemove(true)} className="text-sm text-gray-500 min-h-[44px] px-3">
              Remove this runner
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
