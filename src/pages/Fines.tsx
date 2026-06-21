import { useCallback, useEffect, useState } from 'react'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { FineAlertBanner } from '../components/fines/FineAlertBanner'
import { formatFineAmount } from '../lib/fineCatalog'
import { fineAlertClasses, getFineAlertLevel } from '../lib/fineAlerts'
import { formatMatchDate } from '../lib/format'
import { pageContainerClass } from '../lib/layout'
import { fetchMyUnpaidFines, fetchOutstandingFinesSummary } from '../lib/clubApi'
import { useAuth } from '../hooks/useAuth'
import type { FineEntry, PlayerFinesSummaryRow } from '../types'

function sessionDateLabel(date: string) {
  return formatMatchDate(`${date}T12:00:00`)
}

export default function Fines() {
  const { user } = useAuth()
  const [rows, setRows] = useState<PlayerFinesSummaryRow[]>([])
  const [myFines, setMyFines] = useState<FineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summary, mine] = await Promise.all([
        fetchOutstandingFinesSummary(),
        fetchMyUnpaidFines(),
      ])
      setRows(summary)
      setMyFines(mine)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load fines")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brand-navy">Fines</h1>
          <p className="text-sm text-gray-500 mt-1">Outstanding match-day fines across the squad.</p>
        </div>

        {error && <DataErrorBanner message={error} onRetry={load} />}

        {!loading && myFines.length > 0 && user && (
          <FineAlertBanner entries={myFines} />
        )}

        {loading ? (
          <div className="glass-card p-8 animate-pulse bg-brand-light/40 h-40 rounded-card" />
        ) : rows.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="font-semibold text-brand-navy">All clear</p>
            <p className="text-sm text-gray-500 mt-1">Nobody has outstanding fines right now.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rows.map((row) => {
              const level = getFineAlertLevel(row.outstanding_total, row.oldest_unpaid_days)
              const expanded = expandedId === row.profile_id
              const isMe = user?.id === row.profile_id
              return (
                <li key={row.profile_id}>
                  <div
                    className={`glass-card overflow-hidden border ${fineAlertClasses(level)} ${
                      level === 'critical' ? 'fine-alert-pulse' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : row.profile_id)}
                      className="w-full flex items-center gap-3 px-4 py-4 text-left touch-manipulation"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-brand-navy">
                          {row.display_name}
                          {isMe && (
                            <span className="ml-2 text-xs font-normal text-brand-blue">(you)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {row.unpaid_count} fine{row.unpaid_count === 1 ? '' : 's'}
                          {row.oldest_unpaid_days > 0 && (
                            <span> · oldest {row.oldest_unpaid_days} day{row.oldest_unpaid_days === 1 ? '' : 's'}</span>
                          )}
                        </p>
                      </div>
                      <span className={`font-display text-xl font-bold tabular-nums shrink-0 ${
                        level === 'critical' ? 'text-red-700' : level === 'warning' ? 'text-amber-800' : 'text-brand-navy'
                      }`}>
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
                                  {entry.session_title} · {sessionDateLabel(entry.session_date)}
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
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
