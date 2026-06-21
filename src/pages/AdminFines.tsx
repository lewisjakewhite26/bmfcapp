import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { FinePickerModal } from '../components/fines/FinePickerModal'
import { FINE_CATALOG, formatFineAmount } from '../lib/fineCatalog'
import { formatMatchDate } from '../lib/format'
import { pageContainerClass } from '../lib/layout'
import {
  createFineSession,
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

  const [payFilter, setPayFilter] = useState<PayFilter>('unpaid')
  const [payEntries, setPayEntries] = useState<FineEntry[]>([])
  const [payOutstanding, setPayOutstanding] = useState(0)
  const [payPlayersOwing, setPayPlayersOwing] = useState(0)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [togglingPaidId, setTogglingPaidId] = useState<string | null>(null)

  const reloadSessions = useCallback(async () => {
    setLoadingSessions(true)
    try {
      setSessions(await fetchFineSessions())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load fines sessions")
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  const loadDetail = useCallback(async (sessionId: string) => {
    setLoadingDetail(true)
    try {
      setDetail(await fetchFineSessionDetail(sessionId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load session")
      setSelectedId(null)
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const reloadPayments = useCallback(async () => {
    setLoadingPayments(true)
    try {
      const overview = await fetchFinesOverview(payFilter)
      setPayEntries(overview.entries)
      setPayOutstanding(overview.total_outstanding)
      setPayPlayersOwing(overview.players_owing)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load fines")
    } finally {
      setLoadingPayments(false)
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

  const editingPlayer = useMemo(
    () => detail?.squad.find((s) => s.profile_id === editingPlayerId) ?? null,
    [detail, editingPlayerId],
  )

  const editingPlayerKeys = useMemo(() => {
    if (!detail || !editingPlayerId) return new Set<string>()
    return new Set(
      detail.entries
        .filter((e) => e.profile_id === editingPlayerId)
        .map((e) => e.fine_key),
    )
  }, [detail, editingPlayerId])

  const openSession = (id: string) => {
    setTab('sessions')
    setSelectedId(id)
    setEditingPlayerId(null)
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionTitle.trim().length < 2) {
      toast.error('Enter a session title (e.g. Saturday training)')
      return
    }
    setCreating(true)
    try {
      const created = await createFineSession({
        session_date: sessionDate,
        title: sessionTitle.trim(),
        notes: sessionNotes.trim() || null,
      })
      toast.success(`Started fines for ${sessionDateLabel(created.session_date)}`)
      setSessionTitle('')
      setSessionNotes('')
      await reloadSessions()
      openSession(created.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create session")
    } finally {
      setCreating(false)
    }
  }

  const handleSavePlayerFines = async (draftKeys: Set<string>) => {
    if (!selectedId || !detail || !editingPlayerId) return

    const serverKeys = new Set(
      detail.entries
        .filter((e) => e.profile_id === editingPlayerId)
        .map((e) => e.fine_key),
    )

    setSavingPlayerFines(true)
    try {
      const updates = FINE_CATALOG.filter((fine) => {
        const inDraft = draftKeys.has(fine.key)
        const onServer = serverKeys.has(fine.key)
        return inDraft !== onServer
      })

      await Promise.all(
        updates.map((fine) =>
          setFineEntry(
            selectedId,
            editingPlayerId,
            fine.key,
            fine.label,
            fine.amount,
            draftKeys.has(fine.key),
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

  const handlePaidToggle = async (entry: FineEntry) => {
    setTogglingPaidId(entry.id)
    const next = !entry.paid
    setPayEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, paid: next } : e)),
    )
    try {
      await setFinePaid(entry.id, next)
      await reloadPayments()
      if (selectedId) await loadDetail(selectedId)
      await reloadSessions()
    } catch (err) {
      setPayEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, paid: entry.paid } : e)),
      )
      toast.error(err instanceof Error ? err.message : "Couldn't update payment")
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
            Log match-day fines and mark when they&apos;ve been paid.
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
              {t === 'sessions' ? 'Sessions' : 'Payments'}
            </button>
          ))}
        </div>

        {tab === 'sessions' && (
          <div className="space-y-4">
            <form onSubmit={(e) => void handleCreateSession(e)} className="glass-card p-4 space-y-3">
              <h2 className="font-semibold text-brand-navy">Start a fines session</h2>
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
                {creating ? 'Starting…' : 'Start session'}
              </button>
            </form>

            <div className="grid lg:grid-cols-[minmax(0,280px)_1fr] gap-4 items-start">
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-brand-blue/10">
                  <h2 className="font-semibold text-brand-navy">Sessions</h2>
                </div>
                {loadingSessions ? (
                  <p className="p-4 text-sm text-gray-500">Loading…</p>
                ) : sessions.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No sessions yet.</p>
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
                    Select a session or start a new one.
                  </div>
                ) : loadingDetail || !detail ? (
                  <div className="glass-card p-6 animate-pulse bg-brand-light/40 h-48 rounded-card" />
                ) : (
                  <>
                    <div className="glass-card p-4">
                      <h2 className="font-semibold text-brand-navy">{detail.session.title}</h2>
                      <p className="text-sm text-gray-500">{sessionDateLabel(detail.session.session_date)}</p>
                      {detail.session.notes && (
                        <p className="text-sm text-gray-600 mt-2">{detail.session.notes}</p>
                      )}
                      <p className="text-sm font-medium text-brand-navy mt-3">
                        Session total: {formatFineAmount(detail.session.session_total ?? 0)}
                      </p>
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
                      initialActiveKeys={editingPlayerKeys}
                      saving={savingPlayerFines}
                      onClose={() => setEditingPlayerId(null)}
                      onSave={(keys) => void handleSavePlayerFines(keys)}
                    />

                    <div className="glass-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-brand-blue/10">
                        <h3 className="font-semibold text-brand-navy">Session sheet</h3>
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
              {loadingPayments ? (
                <p className="p-6 text-sm text-gray-500">Loading…</p>
              ) : payEntries.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">
                  {payFilter === 'unpaid' ? 'No outstanding fines — everyone\'s square.' : 'Nothing here.'}
                </p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                  {payEntries.map((entry) => {
                    const busy = togglingPaidId === entry.id
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handlePaidToggle(entry)}
                          className={`w-full h-full flex flex-col gap-2 px-4 py-3 text-left min-h-[88px] rounded-card border transition-colors touch-manipulation ${
                            entry.paid
                              ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                              : 'border-brand-blue/10 hover:bg-brand-light/40'
                          } ${busy ? 'opacity-60' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-brand-navy">
                              {entry.display_name}
                              <span className="text-gray-500 font-normal"> · {entry.label}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {entry.session_title} · {sessionDateLabel(entry.session_date)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-auto">
                            <span className="font-semibold tabular-nums text-brand-navy">
                              {formatFineAmount(entry.amount)}
                            </span>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-pill ${
                              entry.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {entry.paid ? 'Paid ✓' : 'Mark paid'}
                            </span>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
