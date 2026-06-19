import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { createFixture, deleteFixture, fetchManualFixtures, updateFixture } from '../lib/clubApi'
import {
  COMPETITION_PRESETS,
  guessCompetitionPreset,
  resolveCompetitionName,
  type CompetitionPreset,
} from '../lib/fixtureCompetitions'
import { formatMatchDate, formatMatchTime } from '../lib/format'
import { pageContainerClass } from '../lib/layout'
import type { FixtureWithResult, HomeAway } from '../types'

const DEFAULT_HOME_VENUE = 'Bishop Middleham Recreation Ground'
const DEFAULT_TIME = '10:30'

function formatOpponentName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (/\bFC\b/i.test(trimmed)) return trimmed
  return `${trimmed} FC`
}

function stripFc(name: string): string {
  return name.replace(/ FC$/i, '').trim()
}

function fixtureToForm(fixture: FixtureWithResult) {
  const d = new Date(fixture.match_date)
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
  const time = fixture.kickoff_time
    ? fixture.kickoff_time.slice(0, 5)
    : [
        String(d.getHours()).padStart(2, '0'),
        String(d.getMinutes()).padStart(2, '0'),
      ].join(':')
  const { preset, custom } = guessCompetitionPreset(fixture.competition)

  return {
    date,
    time,
    opponent: stripFc(fixture.opponent),
    homeAway: fixture.home_away,
    venue: fixture.venue ?? (fixture.home_away === 'home' ? DEFAULT_HOME_VENUE : ''),
    competitionPreset: preset,
    competitionCustom: custom,
  }
}

function emptyForm() {
  return {
    date: '',
    time: DEFAULT_TIME,
    opponent: '',
    homeAway: 'home' as HomeAway,
    venue: DEFAULT_HOME_VENUE,
    competitionPreset: 'friendly' as CompetitionPreset,
    competitionCustom: '',
  }
}

export default function AdminFixtures() {
  const [date, setDate] = useState('')
  const [time, setTime] = useState(DEFAULT_TIME)
  const [opponent, setOpponent] = useState('')
  const [homeAway, setHomeAway] = useState<HomeAway>('home')
  const [venue, setVenue] = useState(DEFAULT_HOME_VENUE)
  const [competitionPreset, setCompetitionPreset] = useState<CompetitionPreset>('friendly')
  const [competitionCustom, setCompetitionCustom] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [manualFixtures, setManualFixtures] = useState<FixtureWithResult[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const reloadList = useCallback(async () => {
    setLoadingList(true)
    try {
      setManualFixtures(await fetchManualFixtures())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load fixtures")
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
    setOpponent(blank.opponent)
    setHomeAway(blank.homeAway)
    setVenue(blank.venue)
    setCompetitionPreset(blank.competitionPreset)
    setCompetitionCustom(blank.competitionCustom)
  }

  const startEdit = (fixture: FixtureWithResult) => {
    const form = fixtureToForm(fixture)
    setEditingId(fixture.id)
    setDate(form.date)
    setTime(form.time)
    setOpponent(form.opponent)
    setHomeAway(form.homeAway)
    setVenue(form.venue)
    setCompetitionPreset(form.competitionPreset)
    setCompetitionCustom(form.competitionCustom)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleHomeAwayChange = (value: HomeAway) => {
    setHomeAway(value)
    if (value === 'home') {
      setVenue((current) => current || DEFAULT_HOME_VENUE)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !opponent.trim()) {
      toast.error('Date and opponent are required')
      return
    }

    let competition: string
    try {
      competition = resolveCompetitionName(competitionPreset, competitionCustom)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Competition name is required')
      return
    }

    const matchDate = new Date(`${date}T${time}:00`)
    const payload = {
      match_date: matchDate.toISOString(),
      opponent: formatOpponentName(opponent),
      home_away: homeAway,
      competition,
      venue: venue.trim() || null,
      kickoff_time: `${time}:00`,
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateFixture(editingId, payload)
        toast.success('Match updated')
      } else {
        await createFixture(payload)
        toast.success('Match added')
      }
      resetForm()
      await reloadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save match")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (fixture: FixtureWithResult) => {
    const label = `${fixture.competition} vs ${fixture.opponent}`
    if (!window.confirm(`Remove "${label}"? This cannot be undone.`)) return

    setDeletingId(fixture.id)
    try {
      await deleteFixture(fixture.id)
      if (editingId === fixture.id) resetForm()
      toast.success('Match removed')
      await reloadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove match")
    } finally {
      setDeletingId(null)
    }
  }

  const presetMeta = COMPETITION_PRESETS[competitionPreset]
  const upcomingManual = manualFixtures.filter((f) => f.status === 'scheduled')
  const pastManual = manualFixtures.filter((f) => f.status !== 'scheduled')

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass('max-w-lg')}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">
            {editingId ? 'Edit match' : 'Add match'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Friendlies, cups and other games. League fixtures come from DDSFL automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-500">Match type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(Object.keys(COMPETITION_PRESETS) as CompetitionPreset[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCompetitionPreset(key)}
                  className={`min-h-[44px] rounded-pill text-sm font-semibold ${
                    competitionPreset === key
                      ? 'bg-brand-blue text-white'
                      : 'bg-brand-light text-brand-navy'
                  }`}
                >
                  {COMPETITION_PRESETS[key].label}
                </button>
              ))}
            </div>
          </div>

          {presetMeta.needsCustomName && (
            <div>
              <label className="text-sm text-gray-500">Competition name</label>
              <input
                type="text"
                value={competitionCustom}
                onChange={(e) => setCompetitionCustom(e.target.value)}
                className="input-field mt-1"
                placeholder={presetMeta.placeholder}
                required
              />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-500">Opponent</label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="input-field mt-1"
              placeholder="e.g. Shildon Town"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <label className="text-sm text-gray-500">Kick-off</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input-field mt-1"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Home or away</label>
            <div className="flex gap-2 mt-1">
              {(['home', 'away'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleHomeAwayChange(v)}
                  className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold capitalize ${
                    homeAway === v ? 'bg-brand-blue text-white' : 'bg-brand-light text-brand-navy'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500">
              {homeAway === 'home' ? 'Venue' : 'Venue (opponent ground)'}
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="input-field mt-1"
              placeholder={homeAway === 'home' ? DEFAULT_HOME_VENUE : 'e.g. Willington Recreation Ground'}
            />
          </div>

          <div className="flex gap-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add match'}
            </button>
          </div>
        </form>

        <section className="space-y-3">
          <div>
            <h2 className="font-semibold text-brand-navy">Manual matches</h2>
            <p className="text-xs text-gray-500 mt-1">
              Only matches added here can be edited or removed. DDSFL league games are read-only.
            </p>
          </div>

          {loadingList ? (
            <div className="glass-card h-24 animate-pulse" />
          ) : manualFixtures.length === 0 ? (
            <div className="glass-card p-6 text-center text-sm text-gray-500">
              No manual matches yet. Add a friendly or cup game above.
            </div>
          ) : (
            <>
              {upcomingManual.length > 0 && (
                <ul className="space-y-2">
                  {upcomingManual.map((fixture) => (
                    <ManualFixtureRow
                      key={fixture.id}
                      fixture={fixture}
                      editingId={editingId}
                      deletingId={deletingId}
                      onEdit={startEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              )}

              {pastManual.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Played</p>
                  <ul className="space-y-2">
                    {pastManual.map((fixture) => (
                      <ManualFixtureRow
                        key={fixture.id}
                        fixture={fixture}
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

function ManualFixtureRow({
  fixture,
  editingId,
  deletingId,
  onEdit,
  onDelete,
  muted = false,
}: {
  fixture: FixtureWithResult
  editingId: string | null
  deletingId: string | null
  onEdit: (fixture: FixtureWithResult) => void
  onDelete: (fixture: FixtureWithResult) => void
  muted?: boolean
}) {
  const isEditing = editingId === fixture.id

  return (
    <li
      className={`glass-card p-4 flex items-start justify-between gap-3 ${
        muted ? 'opacity-80' : ''
      } ${isEditing ? 'ring-2 ring-brand-blue' : ''}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
          {fixture.competition}
        </p>
        <p className="font-semibold text-brand-navy mt-0.5">
          {fixture.home_away === 'home' ? 'vs' : '@'} {fixture.opponent.replace(/ FC$/, '')}
          {fixture.result ? ` · ${fixture.result.goals_for}-${fixture.result.goals_against}` : ''}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">
          {formatMatchDate(fixture.match_date)} · {formatMatchTime(fixture.match_date, fixture.kickoff_time)}
          {fixture.venue ? ` · ${fixture.venue}` : ''}
        </p>
        {fixture.result && (
          <p className="text-xs text-gray-500 mt-1">
            <Link to="/admin/results" className="text-brand-blue">Edit result</Link>
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={() => onEdit(fixture)}
          className="text-xs font-semibold text-brand-blue hover:text-brand-navy px-2 py-1"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(fixture)}
          disabled={deletingId === fixture.id}
          className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1"
        >
          {deletingId === fixture.id ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </li>
  )
}
