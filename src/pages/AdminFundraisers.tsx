import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import {
  createFundraiser,
  deleteFundraiser,
  fetchFundraiserDetail,
  fetchFundraiserParticipationSummary,
  fetchFundraisers,
  saveFundraiserParticipation,
  setFundraiserArchived,
} from '../lib/clubApi'
import { formatMatchDate } from '../lib/format'
import { pageContainerClass } from '../lib/layout'
import type {
  Fundraiser,
  FundraiserParticipationRow,
  FundraiserParticipationSummary,
} from '../types'

type Tab = 'events' | 'overview'

function formatFundraiserDate(date: string) {
  return formatMatchDate(`${date}T12:00:00`)
}

function participationBadgeClass(participated: number, total: number) {
  if (total === 0) return 'bg-gray-100 text-gray-600'
  const ratio = participated / total
  if (ratio === 0) return 'bg-red-100 text-red-800'
  if (ratio < 0.5) return 'bg-amber-100 text-amber-800'
  if (ratio < 1) return 'bg-sky-100 text-sky-800'
  return 'bg-emerald-100 text-emerald-800'
}

export default function AdminFundraisers() {
  const [tab, setTab] = useState<Tab>('events')
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [participants, setParticipants] = useState<FundraiserParticipationRow[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<FundraiserParticipationSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [listFilter, setListFilter] = useState<'active' | 'archived'>('active')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const reloadList = useCallback(async () => {
    setLoadingList(true)
    try {
      setFundraisers(await fetchFundraisers({ includeArchived: true }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load fundraisers")
    } finally {
      setLoadingList(false)
    }
  }, [])

  const reloadSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      setSummary(await fetchFundraiserParticipationSummary())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load participation overview")
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  useEffect(() => {
    reloadList()
  }, [reloadList])

  useEffect(() => {
    if (tab === 'overview') reloadSummary()
  }, [tab, reloadSummary])

  const selected = useMemo(
    () => fundraisers.find((f) => f.id === selectedId) ?? null,
    [fundraisers, selectedId],
  )

  const loadDetail = useCallback(async (fundraiserId: string) => {
    setLoadingDetail(true)
    try {
      const detail = await fetchFundraiserDetail(fundraiserId)
      setParticipants(detail.participants)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load participation")
      setSelectedId(null)
      setParticipants([])
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const openFundraiser = (fundraiserId: string) => {
    setTab('events')
    setSelectedId(fundraiserId)
    loadDetail(fundraiserId)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) {
      toast.error('Enter a fundraiser name')
      return
    }
    if (!date) {
      toast.error('Pick a date')
      return
    }

    setCreating(true)
    try {
      const created = await createFundraiser({
        name: name.trim(),
        date,
        notes: notes.trim() || null,
      })
      toast.success(`Added ${created.name}`)
      setName('')
      setDate('')
      setNotes('')
      await reloadList()
      openFundraiser(created.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create fundraiser")
    } finally {
      setCreating(false)
    }
  }

  const toggleParticipant = (profileId: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.profile_id === profileId ? { ...p, participated: !p.participated } : p,
      ),
    )
  }

  const handleSaveParticipation = async () => {
    if (!selectedId) return

    setSaving(true)
    try {
      await saveFundraiserParticipation(
        selectedId,
        participants.map((p) => ({
          profile_id: p.profile_id,
          participated: p.participated,
        })),
      )
      toast.success('Participation saved')
      if (tab === 'overview') await reloadSummary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save participation")
    } finally {
      setSaving(false)
    }
  }

  const participatedCount = participants.filter((p) => p.participated).length
  const totalFundraisers = summary?.total_fundraisers ?? fundraisers.filter((f) => !f.archived).length
  const visibleFundraisers = fundraisers.filter((f) => (listFilter === 'archived' ? f.archived : !f.archived))

  const handleArchive = async (fundraiser: Fundraiser, archived: boolean) => {
    setArchivingId(fundraiser.id)
    try {
      await setFundraiserArchived(fundraiser.id, archived)
      if (selectedId === fundraiser.id && archived) {
        setSelectedId(null)
        setParticipants([])
      }
      toast.success(archived ? 'Fundraiser archived' : 'Fundraiser restored')
      await reloadList()
      if (tab === 'overview') await reloadSummary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update fundraiser")
    } finally {
      setArchivingId(null)
    }
  }

  const handleDelete = async (fundraiser: Fundraiser) => {
    if (!window.confirm(`Permanently delete "${fundraiser.name}"? This cannot be undone.`)) return

    setDeletingId(fundraiser.id)
    try {
      await deleteFundraiser(fundraiser.id)
      if (selectedId === fundraiser.id) {
        setSelectedId(null)
        setParticipants([])
      }
      toast.success('Fundraiser deleted')
      await reloadList()
      if (tab === 'overview') await reloadSummary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete fundraiser")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">Fundraisers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track squad participation in club fundraising events
          </p>
        </div>

        <div className="flex gap-2 p-1 glass-card">
          {([
            ['events', 'Events'],
            ['overview', 'Participation overview'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold transition-colors ${
                tab === value ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-white/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'events' ? (
          <>
            <section className="glass-card p-5 space-y-4">
              <h2 className="font-semibold text-brand-navy">Add fundraiser</h2>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field flex-1"
                    placeholder="e.g. Last Man Standing"
                    required
                  />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-field sm:w-44"
                    required
                  />
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field min-h-[80px]"
                  placeholder="Optional notes"
                />
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Adding...' : 'Add fundraiser'}
                </button>
              </form>
            </section>

            <section className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="font-semibold text-brand-navy">Fundraising events</h2>
                <div className="flex gap-2 p-1 glass-card shrink-0">
                  {(['active', 'archived'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setListFilter(value)}
                      className={`min-h-[36px] px-3 rounded-pill text-xs font-semibold transition-colors ${
                        listFilter === value ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-white/60'
                      }`}
                    >
                      {value === 'active' ? 'Active' : 'Archived'}
                    </button>
                  ))}
                </div>
              </div>
              {loadingList ? (
                <div className="glass-card h-32 animate-pulse" />
              ) : visibleFundraisers.length === 0 ? (
                <div className="glass-card p-8 text-center text-gray-500">
                  {listFilter === 'archived' ? 'No archived fundraisers.' : 'No fundraisers yet. Add one above.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleFundraisers.map((f) => (
                    <div
                      key={f.id}
                      className={`glass-card p-4 ${
                        selectedId === f.id ? 'ring-2 ring-brand-blue/40 bg-white/90' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => openFundraiser(f.id)}
                          className="min-w-0 flex-1 text-left hover:opacity-90"
                        >
                          <p className="font-semibold text-brand-navy">{f.name}</p>
                          <p className="text-sm text-gray-500">{formatFundraiserDate(f.date)}</p>
                          {f.notes && <p className="text-sm text-gray-600 mt-1">{f.notes}</p>}
                        </button>
                        <div className="flex shrink-0 flex-col gap-1 items-end">
                          {listFilter === 'archived' ? (
                            <button
                              type="button"
                              onClick={() => handleArchive(f, false)}
                              disabled={archivingId === f.id}
                              className="text-xs font-semibold text-brand-blue hover:text-brand-navy px-2 py-1"
                            >
                              {archivingId === f.id ? 'Restoring…' : 'Restore'}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openFundraiser(f.id)}
                                className="text-xs font-semibold text-brand-blue hover:text-brand-navy px-2 py-1"
                              >
                                {selectedId === f.id ? 'Selected' : 'View squad →'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchive(f, true)}
                                disabled={archivingId === f.id}
                                className="text-xs font-semibold text-gray-600 hover:text-brand-navy px-2 py-1"
                              >
                                {archivingId === f.id ? 'Archiving…' : 'Archive'}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(f)}
                            disabled={deletingId === f.id}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1"
                          >
                            {deletingId === f.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {selected && (
              <section className="glass-card p-5 space-y-4 border border-brand-blue/15">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-brand-navy">{selected.name}</h2>
                    <p className="text-sm text-gray-500">
                      {formatFundraiserDate(selected.date)}
                      {participants.length > 0 && ` · ${participatedCount} of ${participants.length} took part`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedId(null); setParticipants([]) }}
                    className="text-sm text-gray-500 hover:text-brand-navy"
                  >
                    Close
                  </button>
                </div>

                {loadingDetail ? (
                  <div className="h-48 animate-pulse rounded-card bg-brand-light/50" />
                ) : participants.length === 0 ? (
                  <p className="text-sm text-gray-500">No active squad members to track.</p>
                ) : (
                  <ul className="divide-y divide-brand-blue/8 rounded-card border border-brand-blue/10 overflow-hidden">
                    {participants.map((p) => (
                      <li key={p.profile_id}>
                        <label className="flex items-center gap-3 px-4 py-3 min-h-[52px] cursor-pointer hover:bg-brand-light/40">
                          <input
                            type="checkbox"
                            checked={p.participated}
                            onChange={() => toggleParticipant(p.profile_id)}
                            className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                          />
                          <span className="font-medium text-brand-navy">{p.display_name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={handleSaveParticipation}
                  disabled={saving || loadingDetail || participants.length === 0}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : 'Save participation'}
                </button>
              </section>
            )}
          </>
        ) : (
          <section className="space-y-3">
            <div>
              <h2 className="font-semibold text-brand-navy">Squad participation</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sorted by fewest events attended. Spot who may need a nudge.
                {totalFundraisers > 0 && ` · ${totalFundraisers} fundraiser${totalFundraisers === 1 ? '' : 's'} recorded`}
              </p>
            </div>

            {loadingSummary ? (
              <div className="glass-card h-48 animate-pulse" />
            ) : !summary || summary.members.length === 0 ? (
              <div className="glass-card p-8 text-center text-gray-500">
                {totalFundraisers === 0
                  ? 'No fundraisers yet. Add events on the Events tab first.'
                  : 'No active squad members to show.'}
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-brand-blue/5 text-left text-xs uppercase text-gray-500">
                      <th className="px-4 py-3">Player</th>
                      <th className="px-4 py-3 text-right">Participation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.members.map((member) => (
                      <tr key={member.profile_id} className="border-t border-brand-blue/8">
                        <td className="px-4 py-3 font-medium text-brand-navy">
                          {member.display_name}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-pill ${participationBadgeClass(
                              member.participated_count,
                              member.total_fundraisers,
                            )}`}
                          >
                            {member.participated_count}/{member.total_fundraisers}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button type="button" onClick={() => reloadSummary()} className="text-sm text-brand-blue font-medium">
              Refresh
            </button>
          </section>
        )}
      </div>
    </PageShell>
  )
}
