import { Link } from 'react-router-dom'
import { fineAlertClasses, getFineAlertLevel, summarizeFineAlert, unpaidTotal, oldestUnpaidDays } from '../../lib/fineAlerts'
import type { FineEntry } from '../../types'

interface FineAlertBannerProps {
  entries: FineEntry[]
  compact?: boolean
}

export function FineAlertBanner({ entries, compact }: FineAlertBannerProps) {
  const total = unpaidTotal(entries)
  if (total <= 0) return null

  const oldest = oldestUnpaidDays(entries)
  const level = getFineAlertLevel(total, oldest)
  const message = summarizeFineAlert(total, oldest)

  return (
    <Link
      to="/fines"
      className={`block rounded-card border p-4 transition-colors touch-manipulation ${fineAlertClasses(level)} ${
        level === 'critical' ? 'fine-alert-pulse' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500">Outstanding fines</p>
          <p className={`font-semibold mt-1 ${level === 'critical' ? 'text-red-800' : level === 'warning' ? 'text-amber-900' : 'text-brand-navy'}`}>
            {message}
          </p>
          {!compact && (
            <p className="text-sm text-gray-600 mt-1">Tap to see the full fines list</p>
          )}
        </div>
        <span className="font-display text-2xl font-bold tabular-nums text-brand-navy shrink-0">
          £{total.toFixed(total % 1 === 0 ? 0 : 2)}
        </span>
      </div>
    </Link>
  )
}
