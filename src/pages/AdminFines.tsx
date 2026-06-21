import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { FinePickerModal, type FinePickerSavePayload } from '../components/fines/FinePickerModal'
import { FinePaymentCard } from '../components/fines/FinePaymentCard'
import { FINE_CATALOG, formatFineAmount, isCatalogFineKey, newOneOffFineKey } from '../lib/fineCatalog'
import { formatMatchDate } from '../lib/format'
import { pageContainerClass } from '../lib/layout'
import {
  createFineSession,
  deleteFineSession,
  fetchFineSessionDetail,
  fetchFineSessions,
  fetchFinesOverview,
  setFineEntry,
  setFinePaid,
} from '../lib/clubApi'
import type { FineEntry, FineSession, FineSessionDetail } from '../types'

type Tab = 'sessions' | 'payments'
type PayFilter = 'unpaid' | 'paid' | 'all'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function sessionDateLabel(date: string) {
  return formatMatchDate(`${date}T12:00:00`)
}

function preserveScrollPosition(action: () => void) {
  const scrollY = window.scrollY
  action()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - scrollY) > 2) {
        window.scrollTo(0, scrollY)
      }
    })
  })
}

function blurActiveElement() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

export default function AdminFines() {
  const [tab, setTab] = useState<Tab>('sessions')
  const [sessions, setSessions] = useState<FineSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<FineSessionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [savingPlayerFines, setSavingPlayerFines] = useState(false)

  const [sessionDate, setSessionDate] = useState(todayIso())
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  const [payFilter, setPayFilter] = useState<PayFilter>('unpaid')
  const [payEntries, setPayEntries] = useState<FineEntry[]>([])
  const [payOutstanding, setPayOutstanding] = useState(0)
  const [payPlayersOwing, setPayPlayersOwing] = useState(0)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [togglingPaidId, setTogglingPaidId] = useState<string | null>(null)
  const [paySuccessId, setPaySuccessId] = useState<string | null>(null)
  const [payExitingId, setPayExitingId] = useState<string | null>(null)
  const paymentsListRef = useRef<HTMLUListElement>(null)

  const reloadSessions = useCallback(async () => {
    setLoadingSessions(true)
    try {
      setSessions(await fetchFineSessions())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load events")
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  const refreshSessionsQuiet = useCallback(async () => {
    try {
      setSessions(await fetchFineSessions())
    } catch {
      // Background refresh only — don't disturb the payments list.
    }
  }, [])

  const loadDetail = useCallback(async (sessionId: string) => {
    setLoadingDetail(true)
    try {
      setDetail(await fetchFineSessionDetail(sessionId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load event")
      setSelectedId(null)
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const reloadPayments = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoadingPayments(true)
    try {
      const overview = await fetchFinesOverview(payFilter)
      preserveScrollPosition(() => {
        setPayEntries(overview.entries)
        setPayOutstanding(overview.total_outstanding)
        setPayPlayersOwing(overview.players_owing)
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load fines")
    } finally {
      if (!options?.silent) setLoadingPayments(false)
    }
  }, [payFilter])

  useEffect(() => {
    void reloadSessions()
  }, [reloadSessions])

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId)
    else setDetail(null)
  }, [selectedId, loadDetail])

  useEffect(() => {
    if (tab === 'payments') void reloadPayments()
  }, [tab, reloadPayments])

  useEffect(() => {
    setPaySuccessId(null)
    setPayExitingId(null)
  }, [payFilter])

  const editingPlayer = useMemo(
    () => detail?.squad.find((s) => s.profile_id === editingPlayerId) ?? null,
    [detail, editingPlayerId],
  )

  const editingPlayerPresetKeys = useMemo(() => {
    if (!detail || !editingPlayerId) return new Set<string>()
    return new Set(
      detail.entries
        .filter((e) => e.profile_id === editingPlayerId && isCatalogFineKey(e.fine_key))
        .map((e) => e.fine_key),
    )
  }, [detail, editingPlayerId])

  const editingPlayerOneOff = useMemo(() => {
    if (!detail || !editingPlayerId) return null
    const entry = detail.entries.find(
      (e) => e.profile_id === editingPlayerId && !isCatalogFineKey(e.fine_key),
    )
    if (!entry) return null
    return { key: entry.fine_key, label: entry.label, amount: entry.amount }
  }, [detail, editingPlayerId])

  const openSession = (id: string) => {
    setTab('sessions')
    setSelectedId(id)
    setEditingPlayerId(null)
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionTitle.trim().length < 2) {
      toast.error('Enter an event title (e.g. Saturday training)')
      return
    }
    setCreating(true)
    try {
      const created = await createFineSession({
        session_date: sessionDate,
        title: sessionTitle.trim(),
        notes: sessionNotes.trim() || null,
      })
      toast.success(`Event created for ${sessionDateLabel(created.session_date)}`)
      setSessionTitle('')
      setSessionNotes('')
      await reloadSessions()
      openSession(created.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create event")
    } finally {
      setCreating(false)
    }
  }

  const handleSavePlayerFines = async ({ presetKeys, oneOff }: FinePickerSavePayload) => {
    if (!selectedId || !detail || !editingPlayerId) return

    const serverEntries = detail.entries.filter((e) => e.profile_id === editingPlayerId)
    const serverPresetKeys = new Set(
      serverEntries.filter((e) => isCatalogFineKey(e.fine_key)).map((e) => e.fine_key),
    )
    const serverOneOffEntries = serverEntries.filter((e) => !isCatalogFineKey(e.fine_key))

    type FineUpdate = {
      key: string
      label: string
      amount: number
      enabled: boolean
    }

    const updates: FineUpdate[] = []

    for (const fine of FINE_CATALOG) {
      const inDraft = presetKeys.has(fine.key)
      const onServer = serverPresetKeys.has(fine.key)
      if (inDraft !== onServer) {
        updates.push({
          key: fine.key,
          label: fine.label,
          amount: fine.amount,
          enabled: inDraft,
        })
      }
    }

    for (const entry of serverOneOffEntries) {
      if (!oneOff || entry.fine_key !== oneOff.key) {
        updates.push({
          key: entry.fine_key,
          label: entry.label,
          amount: entry.amount,
          enabled: false,
        })
      }
    }

    if (oneOff) {
      const existing = oneOff.key
        ? serverOneOffEntries.find((e) => e.fine_key === oneOff.key)
        : null
      const key = existing?.fine_key ?? newOneOffFineKey()
      if (
        !existing ||
        existing.label !== oneOff.label ||
        existing.amount !== oneOff.amount
      ) {
        updates.push({
          key,
          label: oneOff.label,
          amount: oneOff.amount,
          enabled: true,
        })
      }
    }

    setSavingPlayerFines(true)
    try {
      await Promise.all(
        updates.map((fine) =>
          setFineEntry(
            selectedId,
            editingPlayerId,
            fine.key,
            fine.label,
            fine.amount,
            fine.enabled,
          ),
        ),
      )

      await loadDetail(selectedId)
      await reloadSessions()
      setEditingPlayerId(null)
      toast.success('Fines saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save fines")
    } finally {
      setSavingPlayerFines(false)
    }
  }

  const handleDeleteSession = async () => {
    if (!selectedId || !detail) return

    const entryCount = detail.entries.length
    const message =
      entryCount > 0
        ? `Delete "${detail.session.title}" and all ${entryCount} fine${entryCount === 1 ? '' : 's'} logged? This can't be undone.`
        : `Delete "${detail.session.title}"? This can't be undone.`

    if (!window.confirm(message)) return

    setDeletingSessionId(selectedId)
    try {
      await deleteFineSession(selectedId)
      toast.success('Event deleted')
      setSelectedId(null)
      setDetail(null)
      setEditingPlayerId(null)
      await reloadSessions()
      if (tab === 'payments') void reloadPayments({ silent: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete event")
    } finally {
      setDeletingSessionId(null)
    }
  }

  const handlePaidToggle = async (entry: FineEntry) => {
    if (togglingPaidId) return

    const prevPaid = entry.paid
    const next = !prevPaid
    setTogglingPaidId(entry.id)

    setPayEntries((prev) => {
      const updated = prev.map((e) => (e.id === entry.id ? { ...e, paid: next } : e))
      if (!prevPaid && next) {
        setPayOutstanding((total) => Math.max(0, total - entry.amount))
        const stillOwing = updated.some(
          (e) => e.id !== entry.id && e.profile_id === entry.profile_id && !e.paid,
        )
        if (!stillOwing) setPayPlayersOwing((count) => Math.max(0, count - 1))
      } else if (prevPaid && !next) {
        setPayOutstanding((total) => total + entry.amount)
        const hadOther = prev.some(
          (e) => e.id !== entry.id && e.profile_id === entry.profile_id && !e.paid,
        )
        if (!hadOther) setPayPlayersOwing((count) => count + 1)
      }
      return updated
    })

    preserveScrollPosition(() => {
      if (next) setPaySuccessId(entry.id)
    })

    try {
      const updated = await setFinePaid(entry.id, next)
      preserveScrollPosition(() => {
        setPayEntries((prev) => prev.map((e) => (e.id === entry.id ? updated : e)))
      })

      const leavesFilter =
        (payFilter === 'unpaid' && next) || (payFilter === 'paid' && !next)

      if (leavesFilter) {
        setPayExitingId(entry.id)
        window.setTimeout(() => {
          blurActiveElement()
          const scrollY = window.scrollY
          paymentsListRef.current?.focus({ preventScroll: true })
          setPayEntries((prev) => prev.filter((e) => e.id !== entry.id))
          setPayExitingId(null)
          setPaySuccessId(null)
          requestAnimationFrame(() => {
            window.scrollTo(0, scrollY)
          })
        }, 380)
      } else {
        window.setTimeout(() => setPaySuccessId(null), 600)
      }

      void refreshSessionsQuiet()
    } catch (err) {
      setPaySuccessId(null)
      setPayExitingId(null)
      toast.error(err instanceof Error ? err.message : "Couldn't update payment")
      void reloadPayments({ silent: true })
    } finally {
      setTogglingPaidId(null)
    }
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">Fines</h1>
          <p className="text-sm text-gray-500 mt-1">
            Log squad fines and mark when they&apos;ve been paid.
          </p>
        </div>

        <div className="flex gap-2 p-1 glass-card w-fit">
          {(['sessions', 'payments'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`text-sm font-semibold px-4 py-2 rounded-pill capitalize ${
                tab === t ? 'bg-brand-blue text-white' : 'text-brand-navy'
              }`}
            >
              {t === 'sessions' ? 'Log fines' : 'Payments'}
            </button>
          ))}
        </div>

        {tab === 'sessions' && (
          <div className="space-y-4">
            <form onSubmit={(e) => void handleCreateSession(e)} className="glass-card p-4 space-y-3">
              <h2 className="font-semibold text-brand-navy">Log fines for an event</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-500">Date</span>
                  <input
                    type="date"
                    className="input-field mt-1"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                  />
                </label>
                <label className="block sm:col-span-1">
                  <span className="text-sm text-gray-500">Title</span>
                  <input
                    type="text"
                    className="input-field mt-1"
                    placeholder="e.g. Saturday training"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm text-gray-500">Notes (optional)</span>
                <input
                  type="text"
                  className="input-field mt-1"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                />
              </label>
              <button type="submit" className="btn-primary text-sm" disabled={creating}>
                {creating ? 'Creating…' : 'Create event'}
              </button>
            </form>

            <div className="grid lg:grid-cols-[minmax(0,280px)_1fr] gap-4 items-start">
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-brand-blue/10">
                  <h2 className="font-semibold text-brand-navy">Events</h2>
                </div>
                {loadingSessions ? (
                  <p className="p-4 text-sm text-gray-500">Loading…</p>
                ) : sessions.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">Nothing logged yet.</p>
                ) : (
                  <ul className="divide-y divide-brand-blue/10 max-h-[420px] overflow-y-auto">
                    {sessions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => openSession(s.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-brand-light/40 transition-colors ${
                            selectedId === s.id ? 'bg-brand-blue/8' : ''
                          }`}
                        >
                          <p className="font-medium text-brand-navy">{s.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{sessionDateLabel(s.session_date)}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFineAmount(s.session_total ?? 0)} total
                            {(s.unpaid_total ?? 0) > 0 && (
                              <span className="text-amber-700"> · {formatFineAmount(s.unpaid_total ?? 0)} unpaid</span>
                            )}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-4 min-w-0">
                {!selectedId ? (
                  <div className="glass-card p-6 text-sm text-gray-500 text-center">
                    Select an event or create one.
                  </div>
                ) : loadingDetail || !detail ? (
                  <div className="glass-card p-6 animate-pulse bg-brand-light/40 h-48 rounded-card" />
                ) : (
                  <>
                    <div className="glass-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-semibold text-brand-navy">{detail.session.title}</h2>
                          <p className="text-sm text-gray-500">{sessionDateLabel(detail.session.session_date)}</p>
                          {detail.session.notes && (
                            <p className="text-sm text-gray-600 mt-2">{detail.session.notes}</p>
                          )}
                          <p className="text-sm font-medium text-brand-navy mt-3">
                            Event total: {formatFineAmount(detail.session.session_total ?? 0)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={deletingSessionId === selectedId}
                          onClick={() => void handleDeleteSession()}
                          className="btn-danger text-xs px-3 py-2 min-h-0 shrink-0"
                        >
                          {deletingSessionId === selectedId ? 'Deleting…' : 'Delete event'}
                        </button>
                      </div>
                    </div>

                    <div className="glass-card p-4 space-y-3">
                      <h3 className="font-semibold text-brand-navy">Pick a player</h3>
                      <ul className="grid grid-cols-2 gap-2">
                        {detail.squad.map((member) => {
                          const memberTotal = detail.entries
                            .filter((e) => e.profile_id === member.profile_id)
                            .reduce((sum, e) => sum + e.amount, 0)
                          return (
                            <li key={member.profile_id}>
                              <button
                                type="button"
                                onClick={() => setEditingPlayerId(member.profile_id)}
                                className="w-full flex items-center justify-between gap-2 px-3 py-3 min-h-[52px] rounded-card border border-brand-blue/10 hover:bg-brand-light/50 text-left transition-colors touch-manipulation"
                              >
                                <span className="font-medium text-brand-navy truncate">{member.display_name}</span>
                                {memberTotal > 0 && (
                                  <span className="text-sm font-semibold text-brand-blue tabular-nums shrink-0">
                                    {formatFineAmount(memberTotal)}
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    <FinePickerModal
                      open={Boolean(editingPlayer)}
                      playerName={editingPlayer?.display_name ?? ''}
                      initialPresetKeys={editingPlayerPresetKeys}
                      initialOneOff={editingPlayerOneOff}
                      saving={savingPlayerFines}
                      onClose={() => setEditingPlayerId(null)}
                      onSave={(payload) => void handleSavePlayerFines(payload)}
                    />

                    <div className="glass-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-brand-blue/10">
                        <h3 className="font-semibold text-brand-navy">Player fines</h3>
                      </div>
                      {detail.entries.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">No fines logged yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 border-b border-brand-blue/10">
                                <th className="px-4 py-2 font-medium">Player</th>
                                <th className="px-4 py-2 font-medium">Fine</th>
                                <th className="px-4 py-2 font-medium text-right">Amount</th>
                                <th className="px-4 py-2 font-medium">Paid</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-blue/8">
                              {detail.entries.map((entry) => (
                                <tr key={entry.id}>
                                  <td className="px-4 py-2.5 font-medium text-brand-navy">{entry.display_name}</td>
                                  <td className="px-4 py-2.5 text-gray-700">{entry.label}</td>
                                  <td className="px-4 py-2.5 text-right tabular-nums">{formatFineAmount(entry.amount)}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-pill ${
                                      entry.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {entry.paid ? 'Paid' : 'Owed'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Total outstanding</p>
                <p className="font-display text-3xl font-bold text-brand-navy tabular-nums mt-1">
                  {formatFineAmount(payOutstanding)}
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Players owing</p>
                <p className="font-display text-3xl font-bold text-brand-navy tabular-nums mt-1">
                  {payPlayersOwing}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['unpaid', 'paid', 'all'] as PayFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setPayFilter(f)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-pill capitalize ${
                    payFilter === f ? 'bg-brand-blue text-white' : 'bg-brand-light text-brand-navy'
                  }`}
                >
                  {f === 'unpaid' ? 'Still owed' : f}
                </button>
              ))}
            </div>

            <div className="glass-card overflow-hidden">
              {loadingPayments && payEntries.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-[88px] animate-pulse rounded-card bg-brand-light/50" />
                  ))}
                </div>
              ) : payEntries.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">
                  {payFilter === 'unpaid' ? 'No outstanding fines — everyone\'s square.' : 'Nothing here.'}
                </p>
              ) : (
                <ul
                  ref={paymentsListRef}
                  tabIndex={-1}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 outline-none"
                >
                  {payEntries.map((entry) => (
                    <FinePaymentCard
                      key={entry.id}
                      entry={entry}
                      busy={togglingPaidId === entry.id}
                      success={paySuccessId === entry.id}
                      exiting={payExitingId === entry.id}
                      onMarkPaid={() => void handlePaidToggle(entry)}
                      onUndoPaid={() => void handlePaidToggle(entry)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
