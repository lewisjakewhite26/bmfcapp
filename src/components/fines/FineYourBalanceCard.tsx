import { fineEventDisplayLabel, formatFineAmount } from '../../lib/fineCatalog'
import {
  earliestDueDate,
  fineAlertClasses,
  formatFineDueSummary,
  getFineAlertLevel,
  unpaidTotal,
  daysUntilDue,
} from '../../lib/fineAlerts'
import { FINE_YOUR_BALANCE } from '../../lib/finePlayerCopy'
import type { FineEntry } from '../../types'

type FineYourBalanceCardProps = {
  entries: FineEntry[]
}

export function FineYourBalanceCard({ entries }: FineYourBalanceCardProps) {
  const total = unpaidTotal(entries)
  if (total <= 0) return null

  const due = earliestDueDate(entries)
  const days = due ? daysUntilDue(due) : 0
  const level = getFineAlertLevel(total, days)
  const dueSummary = formatFineDueSummary(due)

  return (
    <section
      className={`glass-card overflow-hidden border ${fineAlertClasses(level)} ${
        level === 'critical' ? 'fine-alert-pulse' : ''
      }`}
      aria-labelledby="fine-your-balance-heading"
    >
      <div className="px-4 py-4 border-b border-brand-blue/10 bg-white/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="fine-your-balance-heading" className="text-xs uppercase tracking-wide font-semibold text-gray-500">
              {FINE_YOUR_BALANCE.heading}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{FINE_YOUR_BALANCE.count(entries.length)}</p>
            {dueSummary && <p className="text-sm font-medium text-brand-navy mt-1">{dueSummary}</p>}
          </div>
          <p
            className={`font-display text-3xl font-bold tabular-nums shrink-0 ${
              level === 'critical' ? 'text-red-700' : level === 'warning' ? 'text-amber-800' : 'text-brand-navy'
            }`}
          >
            {formatFineAmount(total)}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-brand-blue/8">
        {entries.map((entry) => (
          <li key={entry.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-medium text-brand-navy">{entry.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fineEventDisplayLabel(entry.session_title, entry.session_date)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatFineDueSummary(entry.due_date)}
                </p>
              </div>
              <span className="font-semibold tabular-nums text-brand-navy">
                {formatFineAmount(entry.amount)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
