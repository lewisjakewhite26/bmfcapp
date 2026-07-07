import {
  FINE_CATALOG,
  formatFineAmount,
  LATENESS_FINES,
  type LatenessState,
} from '../../lib/fineCatalog'

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

const LATENESS_CYCLE: LatenessState[] = ['off', 'late', 'late_10']

function nextLateness(state: LatenessState): LatenessState {
  const idx = LATENESS_CYCLE.indexOf(state)
  return LATENESS_CYCLE[(idx + 1) % LATENESS_CYCLE.length]
}

function latenessLabel(state: LatenessState): { title: string; amount: string; hint: string } {
  if (state === 'off') {
    return { title: 'Lateness', amount: 'Tap to cycle', hint: 'Off · tap for Late £1, Late 10+ £2' }
  }
  const fine = LATENESS_FINES.find((f) => f.key === state)!
  return {
    title: fine.label,
    amount: formatFineAmount(fine.amount),
    hint: 'Tap again to cycle or turn off',
  }
}

interface FineTypeGridProps {
  lateness: LatenessState
  activeKeys: Set<string>
  disabled?: boolean
  onLatenessChange: (state: LatenessState) => void
  onToggle: (key: string, label: string, amount: number, enabled: boolean) => void
}

export function FineTypeGrid({
  lateness,
  activeKeys,
  disabled,
  onLatenessChange,
  onToggle,
}: FineTypeGridProps) {
  const latenessUi = latenessLabel(lateness)
  const activeLateness = lateness !== 'off'

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onLatenessChange(nextLateness(lateness))}
        className={`relative col-span-2 flex min-h-[72px] flex-col justify-center rounded-card border px-3 py-3 text-left transition-colors touch-manipulation ${
          activeLateness
            ? 'border-brand-blue/30 bg-brand-blue/10 ring-2 ring-brand-blue/20'
            : 'border-brand-blue/10 bg-white/50 hover:bg-brand-light/50'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <span
          className={`absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
            activeLateness
              ? 'border-brand-blue bg-brand-blue text-white'
              : 'border-gray-300 bg-white text-transparent'
          }`}
          aria-hidden
        >
          <CheckIcon />
        </span>
        <span className="block pr-6 font-semibold text-sm leading-snug text-brand-navy">{latenessUi.title}</span>
        <span
          className={`block text-sm mt-1 tabular-nums ${activeLateness ? 'text-brand-blue font-semibold' : 'text-gray-500'}`}
        >
          {latenessUi.amount}
        </span>
        <span className="block text-xs text-gray-500 mt-1 pr-6">{latenessUi.hint}</span>
      </button>

      {FINE_CATALOG.map((fine, index) => {
        const active = activeKeys.has(fine.key)
        const fullWidth = index === FINE_CATALOG.length - 1 && FINE_CATALOG.length % 2 === 1
        return (
          <button
            key={fine.key}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(fine.key, fine.label, fine.amount, !active)}
            className={`relative flex min-h-[72px] flex-col justify-center rounded-card border px-3 py-3 text-left transition-colors touch-manipulation ${
              fullWidth ? 'col-span-2' : ''
            } ${
              active
                ? 'border-brand-blue/30 bg-brand-blue/10 ring-2 ring-brand-blue/20'
                : 'border-brand-blue/10 bg-white/50 hover:bg-brand-light/50'
            } ${disabled ? 'opacity-60' : ''}`}
          >
            <span
              className={`absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                active
                  ? 'border-brand-blue bg-brand-blue text-white'
                  : 'border-gray-300 bg-white text-transparent'
              }`}
              aria-hidden
            >
              <CheckIcon />
            </span>
            <span className="block pr-6 font-semibold text-sm leading-snug text-brand-navy">{fine.label}</span>
            <span
              className={`block text-sm mt-1 tabular-nums ${active ? 'text-brand-blue font-semibold' : 'text-gray-500'}`}
            >
              {formatFineAmount(fine.amount)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
