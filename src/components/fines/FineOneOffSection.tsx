import { FINE_DISCRETIONAL } from '../../lib/finePlayerCopy'

interface FineOneOffSectionProps {
  label: string
  amount: string
  disabled?: boolean
  onLabelChange: (value: string) => void
  onAmountChange: (value: string) => void
}

export function FineOneOffSection({
  label,
  amount,
  disabled,
  onLabelChange,
  onAmountChange,
}: FineOneOffSectionProps) {
  return (
    <div className="rounded-card border border-brand-blue/10 bg-white p-3 space-y-3 shadow-sm">
      <h3 className="text-sm font-semibold text-brand-navy">{FINE_DISCRETIONAL.heading}</h3>
      <p className="text-xs text-gray-500 -mt-1">{FINE_DISCRETIONAL.hint}</p>
      <label className="block">
        <span className="text-xs text-gray-500">What for?</span>
        <input
          type="text"
          className="input-field mt-1"
          placeholder="e.g. Lost ball"
          value={label}
          disabled={disabled}
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">Amount (£)</span>
        <input
          type="number"
          className="input-field mt-1"
          placeholder="0"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={amount}
          disabled={disabled}
          onChange={(e) => onAmountChange(e.target.value)}
        />
      </label>
    </div>
  )
}
