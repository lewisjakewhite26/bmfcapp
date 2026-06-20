import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import {
  createClubEvent,
  deleteClubEvent,
  fetchClubEvents,
  setClubEventArchived,
  updateClubEvent,
} from '../lib/clubApi'
import { CLUB_EVENT_TYPES } from '../lib/clubEventTypes'
import { formatMatchDate, formatMatchTime } from '../lib/format'
import type { ClubEvent, ClubEventType } from '../types'
import { pageContainerClass } from '../lib/layout'

const DEFAULT_TIME = '19:00'

function eventToForm(event: ClubEvent) {
  const d = new Date(event.event_date)
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
    title: event.title,
    eventType: event.event_type,
    date,
    time,
    location: event.location ?? '',
    notes: event.notes ?? '',
  }
}

function emptyForm() {
  return {
    title: '',
    eventType: 'social' as ClubEventType,
    date: '',
    time: DEFAULT_TIME,
    location: '',
    notes: '',
  }
}

export default function AdminEvents() {
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<ClubEventType>('social')
  const [date, setDate] = useState('')
  const [time, setTime] = useState(DEFAULT_TIME)
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [listFilter, setListFilter] = useState<'active' | 'archived'>('active')

  const reloadList = useCallback(async () => {
    setLoadingList(true)
    try {
      setEvents(await fetchClubEvents({ includeArchived: true }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load events")
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
    setTitle(blank.title)
    setEventType(blank.eventType)
    setDate(blank.date)
    setTime(blank.time)
    setLocation(blank.location)
    setNotes(blank.notes)
  }

  const startEdit = (event: ClubEvent) => {
    const form = eventToForm(event)
    setEditingId(event.id)
    setTitle(form.title)
    setEventType(form.eventType)
    setDate(form.date)
    setTime(form.time)
    setLocation(form.location)
    setNotes(form.notes)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !title.trim()) {
      toast.error('Title and date are required')
      return
    }

    const eventDate = new Date(`${date}T${time}:00`)
    const payload = {
      title: title.trim(),
      event_type: eventType,
      event_date: eventDate.toISOString(),
      location: location.trim() || null,
      notes: notes.trim() || null,
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateClubEvent(editingId, payload)
        toast.success('Event updated')
      } else {
        await createClubEvent(payload)
        toast.success('Event added to calendar')
      }
      resetForm()
      await reloadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save event")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (event: ClubEvent) => {
    if (!window.confirm(`Permanently delete "${event.title}"? This cannot be undone.`)) return

    setDeletingId(event.id)
    try {
      await deleteClubEvent(event.id)
      if (editingId === event.id) resetForm()
      toast.success('Event deleted')
      await reloadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete event")
    } finally {
      setDeletingId(null)
    }
  }

  const handleArchive = async (event: ClubEvent, archived: boolean) => {
    setArchivingId(event.id)
    try {
      await setClubEventArchived(event.id, archived)
      if (editingId === event.id && archived) resetForm()
      toast.success(archived ? 'Event archived' : 'Event restored')
      await reloadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update event")
    } finally {
      setArchivingId(null)
    }
  }

  const now = Date.now()
  const filteredEvents = events.filter((e) => (listFilter === 'archived' ? e.archived : !e.archived))
  const upcoming = filteredEvents.filter((e) => new Date(e.event_date).getTime() >= now)
  const past = filteredEvents.filter((e) => new Date(e.event_date).getTime() < now).reverse()

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass('max-w-lg')}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">
            {editingId ? 'Edit event' : 'Other calendar events'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Socials, AGM, committee meetings and more. Fundraisers added under Admin → Fundraisers appear on the calendar automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-500">Event type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as ClubEventType)}
              className="input-field mt-1"
            >
              {CLUB_EVENT_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field mt-1"
              placeholder="e.g. end of season social"
              required
            />
          </div>
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
              placeholder="Optional"
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-semibold text-brand-navy">Scheduled events</h2>
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
            <div className="glass-card h-24 animate-pulse" />
          ) : filteredEvents.length === 0 ? (
            <div className="glass-card p-6 text-center text-sm text-gray-500">
              {listFilter === 'archived' ? 'No archived events.' : 'No other events yet.'}
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <ul className="space-y-2">
                  {upcoming.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      editingId={editingId}
                      deletingId={deletingId}
                      archivingId={archivingId}
                      onEdit={startEdit}
                      onDelete={handleDelete}
                      onArchive={handleArchive}
                      archivedView={listFilter === 'archived'}
                    />
                  ))}
                </ul>
              )}

              {past.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Past</p>
                  <ul className="space-y-2">
                    {past.map((event) => (
                      <EventRow
                        key={event.id}
                        event={event}
                        editingId={editingId}
                        deletingId={deletingId}
                        archivingId={archivingId}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                        onArchive={handleArchive}
                        archivedView={listFilter === 'archived'}
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

function EventRow({
  event,
  editingId,
  deletingId,
  archivingId,
  onEdit,
  onDelete,
  onArchive,
  archivedView = false,
  muted = false,
}: {
  event: ClubEvent
  editingId: string | null
  deletingId: string | null
  archivingId: string | null
  onEdit: (event: ClubEvent) => void
  onDelete: (event: ClubEvent) => void
  onArchive: (event: ClubEvent, archived: boolean) => void
  archivedView?: boolean
  muted?: boolean
}) {
  const isEditing = editingId === event.id
  const typeLabel = CLUB_EVENT_TYPES.find((t) => t.value === event.event_type)?.label ?? event.event_type

  return (
    <li className={`glass-card p-4 flex items-start justify-between gap-3 ${muted ? 'opacity-80' : ''} ${isEditing ? 'ring-2 ring-brand-blue' : ''}`}>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{typeLabel}</p>
        <p className="font-semibold text-brand-navy mt-0.5">{event.title}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {formatMatchDate(event.event_date)} · {formatMatchTime(event.event_date)}
        </p>
        {event.location && (
          <p className="text-sm text-gray-500 mt-0.5">{event.location}</p>
        )}
        {event.notes && (
          <p className="text-sm text-gray-600 mt-1">{event.notes}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {!archivedView && (
          <button
            type="button"
            onClick={() => onEdit(event)}
            className="text-xs font-semibold text-brand-blue hover:text-brand-navy px-2 py-1"
          >
            Edit
          </button>
        )}
        {archivedView ? (
          <button
            type="button"
            onClick={() => onArchive(event, false)}
            disabled={archivingId === event.id}
            className="text-xs font-semibold text-brand-blue hover:text-brand-navy px-2 py-1"
          >
            {archivingId === event.id ? 'Restoring…' : 'Restore'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onArchive(event, true)}
            disabled={archivingId === event.id}
            className="text-xs font-semibold text-gray-600 hover:text-brand-navy px-2 py-1"
          >
            {archivingId === event.id ? 'Archiving…' : 'Archive'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(event)}
          disabled={deletingId === event.id}
          className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1"
        >
          {deletingId === event.id ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </li>
  )
}
