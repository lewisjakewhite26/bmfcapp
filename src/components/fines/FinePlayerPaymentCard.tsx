import { formatFineAmount } from '../../lib/fineCatalog'
import type { PlayerFineGroup } from '../../lib/finePaymentGroups'

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

type FinePlayerPaymentCardProps = {
  group: PlayerFineGroup
  busy: boolean
  success: boolean
  exiting: boolean
  showPulse: boolean
  onMarkAllPaid: () => void
  onUndoAllPaid: () => void
}

export function FinePlayerPaymentCard({
  group,
  busy,
  success,
  exiting,
  showPulse,
  onMarkAllPaid,
  onUndoAllPaid,
}: FinePlayerPaymentCardProps) {
  const fineCount = group.entries.length
  const fineLabels = group.entries.map((e) => e.label).join(', ')
  const amount = group.allPaid
    ? group.entries.reduce((sum, e) => sum + e.amount, 0)
    : group.unpaidTotal

  return (
    <li
      className={`rounded-card border overflow-hidden transition-[opacity,transform] duration-300 ${
        group.allPaid
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-brand-blue/15 bg-white/70'
      } ${exiting ? 'fine-paid-exit pointer-events-none' : ''} ${success ? 'fine-paid-card-success' : ''}`}
    >
      <div className="p-4 space-y-3">
        <div className="min-w-0">
          <p className="font-semibold text-brand-navy truncate">{group.displayName}</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {fineCount} fine{fineCount === 1 ? '' : 's'}
            {group.allPaid ? ' · paid' : ` · ${formatFineAmount(group.unpaidTotal)} owed`}
          </p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{fineLabels}</p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="font-display text-2xl font-bold tabular-nums text-brand-navy">
            {formatFineAmount(amount)}
          </p>

          {group.allPaid ? (
            <button
              type="button"
              disabled={busy || exiting}
              onClick={onUndoAllPaid}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-pill text-sm font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 transition-colors touch-manipulation shrink-0 ${
                success ? 'fine-paid-check-pop' : ''
              } ${busy ? 'opacity-70' : 'hover:bg-emerald-200'}`}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"
                aria-hidden
              >
                <CheckIcon className="h-3 w-3" />
              </span>
              Paid
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || exiting}
              onClick={onMarkAllPaid}
              className={`btn-primary text-sm px-5 py-2.5 min-h-[44px] shrink-0 gap-2 fine-mark-paid-btn ${
                busy || !showPulse ? '' : 'fine-mark-paid-pulse'
              }`}
            >
              {busy ? (
                'Saving…'
              ) : (
                <>
                  <CheckIcon />
                  Mark all paid
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
