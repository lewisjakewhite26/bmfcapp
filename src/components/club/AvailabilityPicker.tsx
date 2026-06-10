import type { AvailabilityStatus } from '../../types'

const OPTIONS: { value: AvailabilityStatus; label: string; color: string }[] = [
  { value: 'yes', label: 'In', color: 'bg-emerald-500 text-white' },
  { value: 'maybe', label: 'Maybe', color: 'bg-amber-400 text-brand-navy' },
  { value: 'no', label: 'Out', color: 'bg-red-500 text-white' },
]

interface AvailabilityPickerProps {
  value: AvailabilityStatus | null
  onChange: (status: AvailabilityStatus) => void
  disabled?: boolean
  compact?: boolean
}

export function AvailabilityPicker({ value, onChange, disabled, compact }: AvailabilityPickerProps) {
  return (
    <div className={`flex gap-2 ${compact ? '' : 'justify-center'}`}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`flex-1 min-h-[40px] rounded-pill text-sm font-semibold transition-all touch-manipulation disabled:opacity-50 ${
              active ? opt.color + ' shadow-sm scale-[1.02]' : 'bg-white/80 text-gray-600 border border-brand-blue/15 hover:border-brand-blue/30'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
