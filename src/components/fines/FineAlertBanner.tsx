import { Link } from 'react-router-dom'
import {
  earliestDueDate,
  fineAlertClasses,
  formatFineDueSummary,
  getFineAlertLevel,
  summarizeFineAlert,
  unpaidTotal,
  daysUntilDue,
} from '../../lib/fineAlerts'
import { FINE_BANNER } from '../../lib/finePlayerCopy'
import type { FineEntry } from '../../types'

interface FineAlertBannerProps {
  entries: FineEntry[]
  compact?: boolean
}

export function FineAlertBanner({ entries, compact }: FineAlertBannerProps) {
  const total = unpaidTotal(entries)
  if (total <= 0) return null

  const due = earliestDueDate(entries)
  const days = due ? daysUntilDue(due) : 0
  const level = getFineAlertLevel(total, days)
  const message = summarizeFineAlert(total, days)
  const dueSummary = formatFineDueSummary(due)

  return (
    <Link
      to="/fines"
      className={`block rounded-card border p-4 transition-colors touch-manipulation ${fineAlertClasses(level)} ${
        level === 'critical' ? 'fine-alert-pulse' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500">{FINE_BANNER.label}</p>
          <p className={`font-semibold mt-1 ${level === 'critical' ? 'text-red-800' : level === 'warning' ? 'text-amber-900' : 'text-brand-navy'}`}>
            {message}
          </p>
          {dueSummary && <p className="text-sm text-gray-600 mt-1">{dueSummary}</p>}
          {!compact ? (
            <p className="text-sm text-gray-600 mt-1">{FINE_BANNER.fullHint}</p>
          ) : (
            <p className="text-sm text-gray-600 mt-1">{FINE_BANNER.viewHint}</p>
          )}
        </div>
        <span className="font-display text-2xl font-bold tabular-nums text-brand-navy shrink-0">
          £{total.toFixed(total % 1 === 0 ? 0 : 2)}
        </span>
      </div>
    </Link>
  )
}
