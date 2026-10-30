interface PaidToggleProps {
  paid: boolean
  onChange: (paid: boolean) => void
  /** e.g. "Race 1 owner" – for screen readers. */
  label: string
  disabled?: boolean
}

/** Big tap target: "Paid" ticks green, "Unpaid" stays amber. */
export function PaidToggle({ paid, onChange, label, disabled }: PaidToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={paid}
      aria-label={`${label} paid`}
      disabled={disabled}
      onClick={() => onChange(!paid)}
      className={`shrink-0 min-h-[44px] min-w-[84px] rounded-pill px-3 text-sm font-semibold border transition-colors disabled:opacity-40 ${
        paid ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-amber-300 text-amber-800'
      }`}
    >
      {paid ? '✓ Paid' : 'Unpaid'}
    </button>
  )
}
