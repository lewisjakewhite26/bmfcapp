import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { ADMIN_AUDIT_ACTIONS, auditActionLabel, formatAuditDetails } from '../lib/adminAudit'
import { fetchAuditLog } from '../lib/clubApi'
import { pageContainerClass } from '../lib/layout'
import type { AdminAuditEntry } from '../types'

type ActionFilter = 'all' | (typeof ADMIN_AUDIT_ACTIONS)[number]

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEntries(await fetchAuditLog(200))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load audit log")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (actionFilter === 'all') return entries
    return entries.filter((e) => e.action === actionFilter)
  }, [entries, actionFilter])

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">Audit log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Recent admin and committee actions. Passcodes are never logged.
          </p>
        </div>

        {error && <DataErrorBanner message={error} onRetry={load} />}

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-500" htmlFor="audit-filter">
            Filter
          </label>
          <select
            id="audit-filter"
            className="input-field max-w-xs"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
          >
            <option value="all">All actions</option>
            {ADMIN_AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {auditActionLabel(action)}
              </option>
            ))}
          </select>
          <button type="button" className="btn-secondary text-sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No entries yet.</p>
          ) : (
            <ul className="divide-y divide-brand-blue/10">
              {filtered.map((entry) => {
                const detail = formatAuditDetails(entry)
                return (
                  <li key={entry.id} className="px-4 py-3 sm:px-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                      <div>
                        <p className="font-medium text-brand-navy">{auditActionLabel(entry.action)}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {entry.actor_name}
                          {entry.actor_login_name ? ` (${entry.actor_login_name})` : ''}
                        </p>
                        {detail && <p className="text-sm text-gray-500 mt-0.5">{detail}</p>}
                      </div>
                      <time className="text-xs text-gray-400 shrink-0" dateTime={entry.created_at}>
                        {formatWhen(entry.created_at)}
                      </time>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  )
}
