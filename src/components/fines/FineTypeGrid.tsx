import { FINE_CATALOG, formatFineAmount } from '../../lib/fineCatalog'

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
            className={`min-h-[72px] rounded-card border px-3 py-3 text-left transition-all touch-manipulation ${
              active
                ? 'border-brand-blue bg-brand-blue/10 shadow-sm ring-2 ring-brand-blue/30'
                : 'border-brand-blue/10 bg-white/60 hover:bg-brand-light/50'
            } ${disabled ? 'opacity-60' : ''}`}
          >
            <span className="block font-semibold text-brand-navy text-sm leading-tight">{fine.label}</span>
            <span className={`block text-sm mt-1 tabular-nums ${active ? 'text-brand-blue font-semibold' : 'text-gray-500'}`}>
              {formatFineAmount(fine.amount)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
