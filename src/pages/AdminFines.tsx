import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FinePickerModal, type FinePickerSavePayload } from '../components/fines/FinePickerModal'
import {
  FinePlayerPaymentCard,
} from '../components/fines/FinePlayerPaymentCard'
import { groupFineEntriesByPlayer } from '../lib/finePaymentGroups'
import { sendFinePushNotification } from '../lib/finePush'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { FINE_CATALOG, fineEventPrimaryLabel, fineEventSubtitle, formatFineAmount, isCatalogFineKey, LATENESS_FINES, latenessStateFromKeys, LATE_FINE_KEYS, newOneOffFineKey } from '../lib/fineCatalog'
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
  setPlayerPause,
} from '../lib/clubApi'
import type { FineEntry, FineSession, FineSessionDetail } from '../types'

type Tab = 'sessions' | 'payments'
type PayFilter = 'unpaid' | 'paid' | 'all'

const PAY_FILTER_LABELS: Record<PayFilter, string> = {
  unpaid: 'Still owed',
  paid: 'Paid',
  all: 'All fines',
}

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

function EventCheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
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
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [sessionDate, setSessionDate] = useState(todayIso())
  const [sessionNotes, setSessionNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const [payFilter, setPayFilter] = useState<PayFilter>('unpaid')
  const [payEntries, setPayEntries] = useState<FineEntry[]>([])
  const [payOutstanding, setPayOutstanding] = useState(0)
  const [payPlayersOwing, setPayPlayersOwing] = useState(0)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [togglingPlayerId, setTogglingPlayerId] = useState<string | null>(null)
  const [paySuccessPlayerId, setPaySuccessPlayerId] = useState<string | null>(null)
  const [payExitingPlayerId, setPayExitingPlayerId] = useState<string | null>(null)
  const paymentsListRef = useRef<HTMLUListElement>(null)

  const payGroups = useMemo(() => groupFineEntriesByPlayer(payEntries), [payEntries])

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
      // Background refresh only.
    }
  }, [])

  const loadDetail = useCallback(async (sessionId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoadingDetail(true)
    try {
      const next = await fetchFineSessionDetail(sessionId)
      preserveScrollPosition(() => {
        setDetail(next)
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load event")
      if (!options?.silent) {
        setSelectedId(null)
        setDetail(null)
      }
    } finally {
      if (!options?.silent) setLoadingDetail(false)
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
    setPaySuccessPlayerId(null)
    setPayExitingPlayerId(null)
  }, [payFilter])

  const editingPlayer = useMemo(
    () => detail?.squad.find((s) => s.profile_id === editingPlayerId) ?? null,
    [detail, editingPlayerId],
  )

  const editingPlayerAllPresetKeys = useMemo(() => {
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

  const detailSubtitle = useMemo(() => {
    if (!detail) return null
    return fineEventSubtitle(detail.session.title, detail.session.session_date, detail.session.notes)
  }, [detail])

  const deleteConfirmMessage = useMemo(() => {
    if (!detail) return ''
    const label = fineEventPrimaryLabel(detail.session.title, detail.session.session_date)
    const entryCount = detail.entries.length
    return entryCount > 0
      ? `Delete fines for ${label} and all ${entryCount} fine${entryCount === 1 ? '' : 's'} logged? This can't be undone.`
      : `Delete fines for ${label}? This can't be undone.`
  }, [detail])

  const openSession = (id: string) => {
    setTab('sessions')
    setSelectedId(id)
    setEditingPlayerId(null)
    setShowCreateForm(false)
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const created = await createFineSession({
        session_date: sessionDate,
        notes: sessionNotes.trim() || null,
      })
      toast.success(`Fines opened for ${sessionDateLabel(created.session_date)}`)
      setSessionNotes('')
      setShowCreateForm(false)
      await reloadSessions()
      openSession(created.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create event")
    } finally {
      setCreating(false)
    }
  }

  const handleSavePlayerFines = async ({ lateness, presetKeys, oneOff }: FinePickerSavePayload) => {
    if (!selectedId || !detail || !editingPlayerId) return

    const serverEntries = detail.entries.filter((e) => e.profile_id === editingPlayerId)
    const serverPresetKeys = new Set(
      serverEntries.filter((e) => isCatalogFineKey(e.fine_key)).map((e) => e.fine_key),
    )
    const serverLateness = latenessStateFromKeys(serverPresetKeys)
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

    if (lateness !== serverLateness) {
      if (lateness !== 'off') {
        const fine = LATENESS_FINES.find((f) => f.key === lateness)!
        updates.push({
          key: fine.key,
          label: fine.label,
          amount: fine.amount,
          enabled: true,
        })
      }
      for (const key of LATE_FINE_KEYS) {
        if (serverPresetKeys.has(key) && key !== lateness) {
          const fine = LATENESS_FINES.find((f) => f.key === key)!
          updates.push({
            key: fine.key,
            label: fine.label,
            amount: fine.amount,
            enabled: false,
          })
        }
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

    const playerId = editingPlayerId
    const newFineLabels = updates.filter((u) => u.enabled).map((u) => u.label)

    const remainingUnpaid = new Map<string, number>()
    for (const entry of serverEntries) {
      if (!entry.paid) remainingUnpaid.set(entry.fine_key, entry.amount)
    }
    for (const update of updates) {
      if (update.enabled) remainingUnpaid.set(update.key, update.amount)
      else remainingUnpaid.delete(update.key)
    }
    const owedTotal = [...remainingUnpaid.values()].reduce((sum, n) => sum + n, 0)

    setSavingPlayerFines(true)
    const scrollY = window.scrollY
    try {
      await (async () => {
        for (const fine of updates) {
          await setFineEntry(
            selectedId,
            playerId,
            fine.key,
            fine.label,
            fine.amount,
            fine.enabled,
          )
        }
      })()

      setEditingPlayerId(null)
      await loadDetail(selectedId, { silent: true })
      await refreshSessionsQuiet()
      toast.success('Fines saved')
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY)
      })
      void sendFinePushNotification(playerId, newFineLabels, owedTotal)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save fines")
    } finally {
      setSavingPlayerFines(false)
    }
  }

  const handleTogglePause = async (member: FineSessionDetail['squad'][number]) => {
    const nextPaused = !member.paused
    try {
      await setPlayerPause(member.profile_id, nextPaused, member.paused_reason)
      if (selectedId) await loadDetail(selectedId, { silent: true })
      toast.success(nextPaused ? `${member.display_name} paused` : `${member.display_name} unpaused`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update pause")
    }
  }

  const handleDeleteSession = async () => {
    if (!selectedId) return

    setDeleteConfirmOpen(false)
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

  const applyPlayerPaymentOptimistic = (
    profileId: string,
    markPaid: boolean,
    targets: FineEntry[],
  ) => {
    const targetIds = new Set(targets.map((e) => e.id))
    const delta = targets.reduce((sum, e) => sum + e.amount, 0)

    setPayEntries((prev) => {
      const updated = prev.map((e) =>
        targetIds.has(e.id) ? { ...e, paid: markPaid } : e,
      )

      if (markPaid) {
        setPayOutstanding((total) => Math.max(0, total - delta))
        const stillOwing = updated.some(
          (e) => e.profile_id === profileId && !e.paid,
        )
        if (!stillOwing) {
          setPayPlayersOwing((count) => Math.max(0, count - 1))
        }
      } else {
        setPayOutstanding((total) => total + delta)
        const hadOther = prev.some(
          (e) => e.profile_id === profileId && !e.paid && !targetIds.has(e.id),
        )
        if (!hadOther) {
          setPayPlayersOwing((count) => count + 1)
        }
      }

      return updated
    })

    if (markPaid) {
      preserveScrollPosition(() => {
        setPaySuccessPlayerId(profileId)
      })
    }
  }

  const handlePlayerPaidToggle = async (profileId: string, markPaid: boolean) => {
    if (togglingPlayerId) return

    const targets = payEntries.filter(
      (e) => e.profile_id === profileId && e.paid !== markPaid,
    )
    if (targets.length === 0) return

    setTogglingPlayerId(profileId)
    applyPlayerPaymentOptimistic(profileId, markPaid, targets)

    try {
      const updatedEntries = await Promise.all(
        targets.map((entry) => setFinePaid(entry.id, markPaid)),
      )
      const updatedById = new Map(updatedEntries.map((entry) => [entry.id, entry]))

      preserveScrollPosition(() => {
        setPayEntries((prev) =>
          prev.map((e) => updatedById.get(e.id) ?? e),
        )
      })

      const leavesFilter =
        (payFilter === 'unpaid' && markPaid) || (payFilter === 'paid' && !markPaid)

      if (leavesFilter) {
        setPayExitingPlayerId(profileId)
        window.setTimeout(() => {
          blurActiveElement()
          const scrollY = window.scrollY
          paymentsListRef.current?.focus({ preventScroll: true })
          setPayEntries((prev) => prev.filter((e) => e.profile_id !== profileId))
          setPayExitingPlayerId(null)
          setPaySuccessPlayerId(null)
          requestAnimationFrame(() => {
            window.scrollTo(0, scrollY)
          })
        }, 380)
      } else if (markPaid) {
        window.setTimeout(() => setPaySuccessPlayerId(null), 600)
      }

      void refreshSessionsQuiet()
    } catch (err) {
      setPaySuccessPlayerId(null)
      setPayExitingPlayerId(null)
      toast.error(err instanceof Error ? err.message : "Couldn't update payment")
      void reloadPayments({ silent: true })
    } finally {
      setTogglingPlayerId(null)
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
              className={`text-sm font-semibold px-4 py-2 rounded-pill ${
                tab === t ? 'bg-brand-blue text-white' : 'text-brand-navy'
              }`}
            >
              {t === 'sessions' ? 'Log fines' : 'Payments'}
            </button>
          ))}
        </div>

        {tab === 'sessions' && (
          <div className="space-y-4">
            {showCreateForm ? (
              <form onSubmit={(e) => void handleCreateSession(e)} className="glass-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-brand-navy">Log fines for a date</h2>
                  <button
                    type="button"
                    className="text-sm text-gray-500 hover:text-brand-navy shrink-0"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </button>
                </div>
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
                  {creating ? 'Creating…' : 'Open fines'}
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="btn-secondary text-sm min-h-[44px] touch-manipulation"
                onClick={() => setShowCreateForm(true)}
              >
                + New date
              </button>
            )}

            <div className="grid lg:grid-cols-[minmax(0,280px)_1fr] gap-4 items-start">
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-brand-blue/10">
                  <h2 className="font-semibold text-brand-navy">Events</h2>
                </div>
                {loadingSessions && sessions.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">Loading…</p>
                ) : sessions.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">Nothing logged yet.</p>
                ) : (
                  <ul className="divide-y divide-brand-blue/10 max-h-[420px] overflow-y-auto">
                    {sessions.map((s) => {
                      const selected = selectedId === s.id
                      const primary = fineEventPrimaryLabel(s.title, s.session_date)
                      const subtitle = fineEventSubtitle(s.title, s.session_date, s.notes)
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => openSession(s.id)}
                            className={`w-full text-left py-3 pr-4 pl-3 border-l-4 transition-colors ${
                              selected
                                ? 'border-brand-blue bg-brand-blue/10'
                                : 'border-transparent hover:bg-brand-light/40'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {selected && <EventCheckIcon />}
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-brand-navy">{primary}</p>
                                {subtitle && (
                                  <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatFineAmount(s.session_total ?? 0)} total
                                  {(s.unpaid_total ?? 0) > 0 && (
                                    <span className="text-amber-700"> · {formatFineAmount(s.unpaid_total ?? 0)} unpaid</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-4 min-w-0">
                {!selectedId ? (
                  <div className="glass-card p-6 text-sm text-gray-500 text-center">
                    Select a date or open a new one.
                  </div>
                ) : !detail && loadingDetail ? (
                  <div className="glass-card p-6 animate-pulse bg-brand-light/40 h-48 rounded-card" />
                ) : !detail ? null : (
                  <>
                    <div className="glass-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-semibold text-brand-navy">
                            {fineEventPrimaryLabel(detail.session.title, detail.session.session_date)}
                          </h2>
                          {detailSubtitle && (
                            <p className="text-sm text-gray-500 mt-1">{detailSubtitle}</p>
                          )}
                          <p className="text-sm font-medium text-brand-navy mt-3">
                            Event total: {formatFineAmount(detail.session.session_total ?? 0)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={deletingSessionId === selectedId}
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="btn-danger text-xs px-3 py-2 min-h-0 shrink-0"
                        >
                          {deletingSessionId === selectedId ? 'Deleting…' : 'Delete event'}
                        </button>
                      </div>
                    </div>

                    <div className="glass-card p-4 space-y-3">
                      <h3 className="font-semibold text-brand-navy">Squad</h3>
                      <p className="text-xs text-gray-500 -mt-1">Tap a player to log or edit their fines.</p>
                      <ul className="grid grid-cols-2 gap-2">
                        {detail.squad.map((member) => {
                          const fineCount = detail.entries.filter(
                            (e) => e.profile_id === member.profile_id,
                          ).length
                          const isActive = editingPlayerId === member.profile_id
                          const hasFines = fineCount > 0
                          return (
                            <li key={member.profile_id} className="flex gap-1">
                              <button
                                type="button"
                                aria-pressed={hasFines}
                                data-testid={`fine-squad-player-${member.profile_id}`}
                                onClick={() => setEditingPlayerId(member.profile_id)}
                                className={`relative flex-1 flex items-center justify-between gap-2 px-3 py-3 min-h-[52px] rounded-card border text-left transition-colors touch-manipulation ${
                                  isActive
                                    ? 'border-brand-blue bg-white ring-2 ring-brand-blue/25 shadow-sm'
                                    : hasFines
                                      ? 'border-brand-blue/20 bg-white hover:bg-brand-light/80 hover:border-brand-blue/30'
                                      : 'border-brand-blue/10 bg-white hover:bg-brand-light/80 hover:border-brand-blue/20'
                                }`}
                              >
                                <span className="font-medium text-brand-navy truncate pr-1">
                                  {member.display_name}
                                  {member.paused && (
                                    <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                      Paused
                                    </span>
                                  )}
                                </span>
                                {fineCount > 0 && (
                                  <span
                                    className="flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-brand-blue px-1.5 text-xs font-bold tabular-nums text-white"
                                    aria-label={`${fineCount} fine${fineCount === 1 ? '' : 's'}`}
                                  >
                                    {fineCount}
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                title={member.paused ? 'Unpause automation' : 'Pause automation'}
                                onClick={() => void handleTogglePause(member)}
                                className={`shrink-0 px-2 min-h-[52px] rounded-card border text-xs font-semibold touch-manipulation ${
                                  member.paused
                                    ? 'border-amber-400/50 bg-amber-50 text-amber-900'
                                    : 'border-brand-blue/10 bg-white text-gray-500 hover:bg-brand-light/80 hover:border-brand-blue/20'
                                }`}
                              >
                                {member.paused ? '▶' : '⏸'}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    <FinePickerModal
                      open={Boolean(editingPlayer)}
                      playerName={editingPlayer?.display_name ?? ''}
                      initialPresetKeys={editingPlayerAllPresetKeys}
                      initialOneOff={editingPlayerOneOff}
                      saving={savingPlayerFines}
                      onClose={() => setEditingPlayerId(null)}
                      onSave={(payload) => void handleSavePlayerFines(payload)}
                    />
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
                  className={`text-xs font-semibold px-3 py-1.5 rounded-pill ${
                    payFilter === f ? 'bg-brand-blue text-white' : 'bg-brand-light text-brand-navy'
                  }`}
                >
                  {PAY_FILTER_LABELS[f]}
                </button>
              ))}
            </div>

            <div className="glass-card overflow-hidden">
              {loadingPayments && payGroups.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-[88px] animate-pulse rounded-card bg-brand-light/50" />
                  ))}
                </div>
              ) : payGroups.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">
                  {payFilter === 'unpaid' ? "No outstanding fines. Everyone's square." : 'Nothing here.'}
                </p>
              ) : (
                <ul
                  ref={paymentsListRef}
                  tabIndex={-1}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 outline-none"
                >
                  {payGroups.map((group) => (
                    <FinePlayerPaymentCard
                      key={group.profileId}
                      group={group}
                      busy={togglingPlayerId === group.profileId}
                      success={paySuccessPlayerId === group.profileId}
                      exiting={payExitingPlayerId === group.profileId}
                      showPulse={!group.allPaid}
                      onMarkAllPaid={() => void handlePlayerPaidToggle(group.profileId, true)}
                      onUndoAllPaid={() => void handlePlayerPaidToggle(group.profileId, false)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete event?"
        message={deleteConfirmMessage}
        confirmLabel="Delete event"
        cancelLabel="Keep event"
        destructive
        busy={Boolean(deletingSessionId)}
        onConfirm={() => void handleDeleteSession()}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </PageShell>
  )
}
