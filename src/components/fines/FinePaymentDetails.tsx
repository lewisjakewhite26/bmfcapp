import { useState } from 'react'
import toast from 'react-hot-toast'
import { FINE_BANK } from '../../lib/finePlayerCopy'

function copyText(label: string, value: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error("Couldn't copy"),
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide font-semibold text-gray-500">{label}</p>
        <p className={`text-sm font-medium text-brand-navy mt-0.5 ${mono ? 'font-mono tabular-nums' : ''}`}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => copyText(label, value)}
        className="shrink-0 text-sm font-medium text-brand-blue min-h-[44px] px-2"
      >
        Copy
      </button>
    </div>
  )
}

export function FinePaymentDetails() {
  const [open, setOpen] = useState(true)

  return (
    <section className="glass-card overflow-hidden" aria-labelledby="fine-pay-heading">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left touch-manipulation"
        aria-expanded={open}
      >
        <div>
          <h2 id="fine-pay-heading" className="font-semibold text-brand-navy">
            {FINE_BANK.heading}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{FINE_BANK.hint}</p>
        </div>
        <span className="text-brand-blue text-sm font-medium shrink-0">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-brand-blue/10 divide-y divide-brand-blue/8">
          <DetailRow label="Account name" value={FINE_BANK.accountName} />
          <DetailRow label="Sort code" value={FINE_BANK.sortCode} mono />
          <DetailRow label="Account number" value={FINE_BANK.accountNumber} mono />
        </div>
      )}
    </section>
  )
}
