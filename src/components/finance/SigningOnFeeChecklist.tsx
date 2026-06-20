import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { fetchSigningOnFees, setSigningOnPaid } from '../../lib/clubApi'
import { DDSFL_ACTIVE_SEASON, DDSFL_SEASONS } from '../../lib/ddsflConstants'
import type { SigningOnFeeRow } from '../../types'

const CURRENT_SEASON = DDSFL_SEASONS[DDSFL_ACTIVE_SEASON].appSeason

type FeeFilter = 'all' | 'paid' | 'unpaid'

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function SigningOnFeeChecklist() {
  const [members, setMembers] = useState<SigningOnFeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FeeFilter>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const summary = await fetchSigningOnFees(CURRENT_SEASON)
      setMembers(summary.members)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load signing-on fees")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const paidCount = useMemo(() => members.filter((m) => m.paid).length, [members])
  const totalCount = members.length
  const progress = totalCount > 0 ? paidCount / totalCount : 0

  const filtered = useMemo(() => {
    if (filter === 'paid') return members.filter((m) => m.paid)
    if (filter === 'unpaid') return members.filter((m) => !m.paid)
    return members
  }, [members, filter])

  const handleToggle = async (row: SigningOnFeeRow) => {
    const nextPaid = !row.paid
    setMembers((prev) =>
      prev.map((m) => (m.profile_id === row.profile_id ? { ...m, paid: nextPaid } : m)),
    )
    setTogglingId(row.profile_id)
    try {
      const updated = await setSigningOnPaid(row.profile_id, CURRENT_SEASON, nextPaid)
      setMembers((prev) =>
        prev.map((m) => (m.profile_id === row.profile_id ? { ...m, ...updated } : m)),
      )
    } catch (err) {
      setMembers((prev) =>
        prev.map((m) => (m.profile_id === row.profile_id ? { ...m, paid: row.paid } : m)),
      )
      toast.error(err instanceof Error ? err.message : "Couldn't update")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <section className="glass-card p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-brand-navy">Signing-on fees</h2>
          <p className="text-sm text-gray-500 mt-1">
            {CURRENT_SEASON} — tap a name when their fee is in.
          </p>
        </div>
        {!loading && totalCount > 0 && (
          <p className="font-display text-2xl font-bold text-brand-navy tabular-nums">
            {paidCount}<span className="text-gray-400 font-normal text-lg">/{totalCount}</span>
            <span className="text-sm font-normal text-gray-500 ml-2">paid</span>
          </p>
        )}
      </div>

      {!loading && totalCount > 0 && (
        <div className="h-2 rounded-full bg-brand-light overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'paid', 'unpaid'] as FeeFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-pill ${
              filter === f ? 'bg-brand-blue text-white' : 'bg-brand-light text-brand-navy'
            }`}
          >
            {f === 'all' ? 'All' : f === 'paid' ? 'Paid' : 'Still owed'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-card bg-brand-light/50" />
      ) : totalCount === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          No squad members yet. Add players in Admin → Squad list first.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          {filter === 'paid' ? 'Nobody marked paid yet.' : 'Everyone has paid — nice one.'}
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-2">
          {filtered.map((row) => {
            const busy = togglingId === row.profile_id
            return (
              <li key={row.profile_id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleToggle(row)}
                  className={`w-full flex items-center gap-3 px-4 py-3 min-h-[56px] rounded-card border text-left transition-colors ${
                    row.paid
                      ? 'border-emerald-200 bg-emerald-50/90 hover:bg-emerald-50'
                      : 'border-brand-blue/10 bg-white/50 hover:bg-brand-light/50'
                  } ${busy ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      row.paid
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-gray-300 bg-white text-transparent'
                    }`}
                    aria-hidden
                  >
                    <CheckIcon />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-brand-navy truncate">{row.display_name}</span>
                    {row.paid && row.marked_at && (
                      <span className="block text-xs text-emerald-700 mt-0.5">
                        Paid · {new Date(row.marked_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
