import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import {
  createFundraiser,
  fetchFundraiserDetail,
  fetchFundraisers,
  saveFundraiserParticipation,
} from '../lib/clubApi'
import { formatMatchDate } from '../lib/format'
import { pageContainerClass } from '../lib/layout'
import type { Fundraiser, FundraiserParticipationRow } from '../types'

function formatFundraiserDate(date: string) {
  return formatMatchDate(`${date}T12:00:00`)
}

export default function AdminFundraisers() {
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

  const reloadList = useCallback(async () => {
    setLoadingList(true)
    try {
      setFundraisers(await fetchFundraisers())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load fundraisers')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    reloadList()
  }, [reloadList])

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
      toast.error(err instanceof Error ? err.message : 'Failed to load participation')
      setSelectedId(null)
      setParticipants([])
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const openFundraiser = (fundraiserId: string) => {
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
      toast.error(err instanceof Error ? err.message : 'Failed to create fundraiser')
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save participation')
    } finally {
      setSaving(false)
    }
  }

  const participatedCount = participants.filter((p) => p.participated).length

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">Fundraisers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track which squad members took part in club fundraising events
          </p>
        </div>

        <section className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-brand-navy">Add fundraiser</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field flex-1"
                placeholder="Event name, e.g. Bag pack"
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
          <h2 className="font-semibold text-brand-navy">Fundraising events</h2>
          {loadingList ? (
            <div className="glass-card h-32 animate-pulse" />
          ) : fundraisers.length === 0 ? (
            <div className="glass-card p-8 text-center text-gray-500">
              No fundraisers yet — add one above.
            </div>
          ) : (
            <div className="space-y-2">
              {fundraisers.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => openFundraiser(f.id)}
                  className={`glass-card w-full p-4 text-left transition-colors ${
                    selectedId === f.id ? 'ring-2 ring-brand-blue/40 bg-white/90' : 'hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">{f.name}</p>
                      <p className="text-sm text-gray-500">{formatFundraiserDate(f.date)}</p>
                      {f.notes && <p className="text-sm text-gray-600 mt-1">{f.notes}</p>}
                    </div>
                    <span className="text-xs text-brand-blue font-medium shrink-0">
                      {selectedId === f.id ? 'Selected' : 'View squad →'}
                    </span>
                  </div>
                </button>
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
      </div>
    </PageShell>
  )
}
