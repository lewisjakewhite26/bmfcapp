import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import {
  createTrainingSession,
  deleteTrainingSession,
  fetchTrainingSessions,
  updateTrainingSession,
} from '../lib/clubApi'
import { formatMatchDate, formatMatchTime } from '../lib/format'
import type { TrainingSession } from '../types'
import { pageContainerClass } from '../lib/layout'

const DEFAULT_LOCATION = 'Bishop Middleham Park'
const DEFAULT_TIME = '19:00'

function sessionToForm(session: TrainingSession) {
  const d = new Date(session.session_date)
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
  const time = [
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
  ].join(':')
  return {
    date,
    time,
    location: session.location ?? DEFAULT_LOCATION,
    notes: session.notes ?? '',
  }
}

function emptyForm() {
  return { date: '', time: DEFAULT_TIME, location: DEFAULT_LOCATION, notes: '' }
}

export default function AdminTraining() {
  const [date, setDate] = useState('')
  const [time, setTime] = useState(DEFAULT_TIME)
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const reloadList = useCallback(async () => {
    setLoadingList(true)
    try {
      setSessions(await fetchTrainingSessions())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load sessions")
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    reloadList()
  }, [reloadList])

  const resetForm = () => {
    const blank = emptyForm()
    setEditingId(null)
    setDate(blank.date)
    setTime(blank.time)
    setLocation(blank.location)
    setNotes(blank.notes)
  }

  const startEdit = (session: TrainingSession) => {
    const form = sessionToForm(session)
    setEditingId(session.id)
    setDate(form.date)
    setTime(form.time)
    setLocation(form.location)
    setNotes(form.notes)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) {
      toast.error('Pick a date')
      return
    }

    const sessionDate = new Date(`${date}T${time}:00`)
    const payload = {
      session_date: sessionDate.toISOString(),
      location: location.trim() || null,
      notes: notes.trim() || null,
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateTrainingSession(editingId, payload)
        toast.success('Training session updated')
      } else {
        await createTrainingSession(payload)
        toast.success('Training session added')
      }
      resetForm()
      await reloadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save session")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (session: TrainingSession) => {
    const label = formatMatchDate(session.session_date)
    if (!window.confirm(`Remove training on ${label}? Player availability for this session will also be deleted.`)) {
      return
    }

    setDeletingId(session.id)
    try {
      await deleteTrainingSession(session.id)
      if (editingId === session.id) resetForm()
      toast.success('Training session removed')
      await reloadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove session")
    } finally {
      setDeletingId(null)
    }
  }

  const now = Date.now()
  const upcoming = sessions.filter((s) => new Date(s.session_date).getTime() >= now)
  const past = sessions.filter((s) => new Date(s.session_date).getTime() < now).reverse()

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass('max-w-lg')}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">
            {editingId ? 'Edit training' : 'Training sessions'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Add, edit or remove sessions on the squad calendar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input-field mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field mt-1"
              placeholder="Optional"
            />
          </div>
          <div className="flex gap-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add to calendar'}
            </button>
          </div>
        </form>

        <section className="space-y-3">
          <h2 className="font-semibold text-brand-navy">Scheduled sessions</h2>

          {loadingList ? (
            <div className="glass-card h-24 animate-pulse" />
          ) : sessions.length === 0 ? (
            <div className="glass-card p-6 text-center text-sm text-gray-500">
              No training sessions yet.
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <ul className="space-y-2">
                  {upcoming.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      editingId={editingId}
                      deletingId={deletingId}
                      onEdit={startEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              )}

              {past.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Past</p>
                  <ul className="space-y-2">
                    {past.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        editingId={editingId}
                        deletingId={deletingId}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                        muted
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </PageShell>
  )
}

function SessionRow({
  session,
  editingId,
  deletingId,
  onEdit,
  onDelete,
  muted = false,
}: {
  session: TrainingSession
  editingId: string | null
  deletingId: string | null
  onEdit: (session: TrainingSession) => void
  onDelete: (session: TrainingSession) => void
  muted?: boolean
}) {
  const isEditing = editingId === session.id

  return (
    <li className={`glass-card p-4 flex items-start justify-between gap-3 ${muted ? 'opacity-80' : ''} ${isEditing ? 'ring-2 ring-brand-blue' : ''}`}>
      <div className="min-w-0">
        <p className="font-semibold text-brand-navy">
          {formatMatchDate(session.session_date)} · {formatMatchTime(session.session_date)}
        </p>
        {session.location && (
          <p className="text-sm text-gray-500 mt-0.5">{session.location}</p>
        )}
        {session.notes && (
          <p className="text-sm text-gray-600 mt-1">{session.notes}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={() => onEdit(session)}
          className="text-xs font-semibold text-brand-blue hover:text-brand-navy px-2 py-1"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(session)}
          disabled={deletingId === session.id}
          className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1"
        >
          {deletingId === session.id ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </li>
  )
}
