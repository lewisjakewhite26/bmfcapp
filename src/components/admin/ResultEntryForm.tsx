import { useState } from 'react'
import toast from 'react-hot-toast'
import { submitMatchResult } from '../../lib/clubApi'
import type { FixtureWithResult, MatchEventType, SquadMember } from '../../types'

interface ResultEntryFormProps {
  fixture: FixtureWithResult
  squad: SquadMember[]
  onSaved: () => void
}

type EventRow = { player_id: string; event_type: MatchEventType; minute: string }

export function ResultEntryForm({ fixture, squad, onSaved }: ResultEntryFormProps) {
  const [goalsFor, setGoalsFor] = useState(fixture.result?.goals_for?.toString() ?? '')
  const [goalsAgainst, setGoalsAgainst] = useState(fixture.result?.goals_against?.toString() ?? '')
  const [notes, setNotes] = useState(fixture.result?.notes ?? '')
  const [events, setEvents] = useState<EventRow[]>(
    (fixture.events ?? []).map((e) => ({
      player_id: e.player_id,
      event_type: e.event_type,
      minute: e.minute?.toString() ?? '',
    }))
  )
  const [saving, setSaving] = useState(false)

  const addEvent = () => {
    setEvents((prev) => [...prev, { player_id: squad[0]?.player_id ?? '', event_type: 'goal', minute: '' }])
  }

  const handleSave = async () => {
    const gf = parseInt(goalsFor, 10)
    const ga = parseInt(goalsAgainst, 10)
    if (isNaN(gf) || isNaN(ga) || gf < 0 || ga < 0) {
      toast.error('Enter valid scores')
      return
    }

    setSaving(true)
    try {
      await submitMatchResult(
        fixture.id,
        gf,
        ga,
        notes || null,
        events
          .filter((e) => e.player_id)
          .map((e) => ({
            fixture_id: fixture.id,
            player_id: e.player_id,
            event_type: e.event_type,
            minute: e.minute ? parseInt(e.minute, 10) : null,
          }))
      )
      toast.success('Result saved')
      onSaved()
    } catch {
      toast.error("Couldn't save result")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-inner-card p-4 space-y-4">
      <h3 className="font-semibold text-brand-navy">
        {fixture.opponent} · {new Date(fixture.match_date).toLocaleDateString('en-GB')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Goals for</label>
          <input type="number" min={0} value={goalsFor} onChange={(e) => setGoalsFor(e.target.value)} className="input-field mt-1" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Goals against</label>
          <input type="number" min={0} value={goalsAgainst} onChange={(e) => setGoalsAgainst(e.target.value)} className="input-field mt-1" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">Notes</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field mt-1" placeholder="Optional" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-navy">Match events</p>
          <button type="button" onClick={addEvent} className="text-sm text-brand-blue font-medium">+ Add</button>
        </div>
        {events.map((ev, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_64px_auto] gap-2 items-center">
            <select
              value={ev.player_id}
              onChange={(e) => setEvents((prev) => prev.map((row, j) => (j === i ? { ...row, player_id: e.target.value } : row)))}
              className="input-field text-sm"
            >
              {squad.map((s) => (
                <option key={s.player_id} value={s.player_id}>{s.display_name}</option>
              ))}
            </select>
            <select
              value={ev.event_type}
              onChange={(e) => setEvents((prev) => prev.map((row, j) => (j === i ? { ...row, event_type: e.target.value as MatchEventType } : row)))}
              className="input-field text-sm"
            >
              <option value="goal">Goal</option>
              <option value="assist">Assist</option>
              <option value="motm">MOTM</option>
              <option value="yellow_card">Yellow</option>
              <option value="red_card">Red</option>
            </select>
            <input
              type="number"
              min={0}
              placeholder="Min"
              value={ev.minute}
              onChange={(e) => setEvents((prev) => prev.map((row, j) => (j === i ? { ...row, minute: e.target.value } : row)))}
              className="input-field text-sm"
            />
            <button
              type="button"
              onClick={() => setEvents((prev) => prev.filter((_, j) => j !== i))}
              className="text-red-500 text-sm px-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className="btn-primary w-full sm:w-auto">
        {saving ? 'Saving...' : 'Save result'}
      </button>
    </div>
  )
}
