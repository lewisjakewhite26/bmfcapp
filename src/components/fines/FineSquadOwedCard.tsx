import { fineEventDisplayLabel, formatFineAmount } from '../../lib/fineCatalog'
import {
  daysUntilDue,
  fineAlertClasses,
  getFineAlertLevel,
} from '../../lib/fineAlerts'
import { FINE_SQUAD, fineCardSummary } from '../../lib/finePlayerCopy'
import type { PlayerFinesSummaryRow } from '../../types'

type FineSquadOwedCardProps = {
  row: PlayerFinesSummaryRow
  expanded: boolean
  isMe: boolean
  onToggle: () => void
}

export function FineSquadOwedCard({ row, expanded, isMe, onToggle }: FineSquadOwedCardProps) {
  const days = row.earliest_due_date ? daysUntilDue(row.earliest_due_date) : 0
  const level = getFineAlertLevel(row.outstanding_total, days)

  return (
    <div
      className={`glass-card overflow-hidden border ${fineAlertClasses(level)} ${
        level === 'critical' ? 'fine-alert-pulse' : ''
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-4 text-left touch-manipulation"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brand-navy">
            {row.display_name}
            {isMe && (
              <span className="ml-2 text-xs font-normal text-brand-blue">({FINE_SQUAD.youTag})</span>
            )}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {fineCardSummary(row.unpaid_count, row.earliest_due_date)}
          </p>
        </div>
        <span
          className={`font-display text-xl font-bold tabular-nums shrink-0 ${
            level === 'critical' ? 'text-red-700' : level === 'warning' ? 'text-amber-800' : 'text-brand-navy'
          }`}
        >
          {formatFineAmount(row.outstanding_total)}
        </span>
        <span className="text-gray-400 text-sm shrink-0" aria-hidden>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <ul className="border-t border-brand-blue/10 divide-y divide-brand-blue/8 bg-white/40">
          {row.entries.map((entry) => (
            <li key={entry.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-medium text-brand-navy">{entry.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {fineEventDisplayLabel(entry.session_title, entry.session_date)}
                  </p>
                </div>
                <span className="font-semibold tabular-nums text-brand-navy">
                  {formatFineAmount(entry.amount)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
