import { FINE_CATALOG, formatFineAmount } from '../../lib/fineCatalog'

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

interface FineTypeGridProps {
  activeKeys: Set<string>
  disabled?: boolean
  onToggle: (key: string, label: string, amount: number, enabled: boolean) => void
}

export function FineTypeGrid({ activeKeys, disabled, onToggle }: FineTypeGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {FINE_CATALOG.map((fine) => {
        const active = activeKeys.has(fine.key)
        return (
          <button
            key={fine.key}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(fine.key, fine.label, fine.amount, !active)}
            className={`relative flex min-h-[72px] flex-col justify-center rounded-card border px-3 py-3 text-left transition-colors touch-manipulation ${
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
