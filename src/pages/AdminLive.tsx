import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import {
  fetchLiveMatchFixtures,
  fetchSquad,
  startLiveMatch,
  submitMatchResult,
} from '../lib/clubApi'
import { estimateMatchMinute } from '../lib/matchMinute'
import {
  describeLiveEntry,
  liveEntriesToMatchEvents,
  type LiveLogEntry,
} from '../lib/liveMatchEvents'
import { sendGoalPushNotification } from '../lib/liveMatchPush'
import { formatSquadPlayerLabel, squadMemberById } from '../lib/squadLabels'
import { pageContainerClass } from '../lib/layout'
import type { FixtureWithResult, SquadMember } from '../types'

type LogTab = 'goal' | 'card' | 'substitution'

function FixturePicker({
  fixtures,
  onSelect,
}: {
  fixtures: FixtureWithResult[]
  onSelect: (id: string) => void
}) {
  if (fixtures.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-gray-500">
        No matches ready for live logging. Add a match under Admin → Add match first.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {fixtures.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onSelect(f.id)}
          className="glass-card p-4 w-full text-left hover:bg-white/80 transition-colors"
        >
          <p className="font-semibold text-brand-navy">
            {f.home_away === 'home' ? 'vs' : '@'} {f.opponent}
          </p>
          <p className="text-sm text-gray-500">
            {new Date(f.match_date).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
            {f.competition ? ` · ${f.competition}` : ''}
          </p>
          {f.status === 'in_progress' && (
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest text-brand-gold">
              In progress
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function LiveMatchLogger({
  fixture,
  squad,
}: {
  fixture: FixtureWithResult
  squad: SquadMember[]
}) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<LogTab>('goal')
  const [entries, setEntries] = useState<LiveLogEntry[]>([])
  const [minute, setMinute] = useState(() => estimateMatchMinute(fixture).toString())
  const [goalsFor, setGoalsFor] = useState('0')
  const [goalsAgainst, setGoalsAgainst] = useState('0')
  const [scorerId, setScorerId] = useState(squad[0]?.player_id ?? '')
  const [assistId, setAssistId] = useState('')
  const [cardPlayerId, setCardPlayerId] = useState(squad[0]?.player_id ?? '')
  const [cardType, setCardType] = useState<'yellow_card' | 'red_card'>('yellow_card')
  const [playerOffId, setPlayerOffId] = useState(squad[0]?.player_id ?? '')
  const [playerOnId, setPlayerOnId] = useState(squad[1]?.player_id ?? squad[0]?.player_id ?? '')
  const [ending, setEnding] = useState(false)

  const nameFor = useCallback(
    (playerId: string) => formatSquadPlayerLabel(squadMemberById(squad, playerId) ?? { display_name: 'Unknown', squad_number: null }),
    [squad],
  )

  const parsedMinute = parseInt(minute, 10)

  const addGoal = () => {
    if (!scorerId) {
      toast.error('Pick a scorer')
      return
    }
    if (isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 200) {
      toast.error('Enter a valid minute (0–200)')
      return
    }
    setEntries((prev) => [
      {
        id: crypto.randomUUID(),
        kind: 'goal',
        minute: parsedMinute,
        scorer_id: scorerId,
        assist_id: assistId || null,
      },
      ...prev,
    ])
    const gf = parseInt(goalsFor, 10) + 1
    setGoalsFor(String(gf))
    const ga = parseInt(goalsAgainst, 10) || 0
    void sendGoalPushNotification(nameFor(scorerId), gf, ga)
    toast.success('Goal logged')
  }

  const addCard = () => {
    if (!cardPlayerId) {
      toast.error('Pick a player')
      return
    }
    if (isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 200) {
      toast.error('Enter a valid minute (0–200)')
      return
    }
    setEntries((prev) => [
      {
        id: crypto.randomUUID(),
        kind: 'card',
        minute: parsedMinute,
        player_id: cardPlayerId,
        card_type: cardType,
      },
      ...prev,
    ])
    toast.success('Card logged')
  }

  const addSubstitution = () => {
    if (!playerOffId || !playerOnId) {
      toast.error('Pick both players')
      return
    }
    if (playerOffId === playerOnId) {
      toast.error('Pick different players')
      return
    }
    if (isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 200) {
      toast.error('Enter a valid minute (0–200)')
      return
    }
    setEntries((prev) => [
      {
        id: crypto.randomUUID(),
        kind: 'substitution',
        minute: parsedMinute,
        player_off_id: playerOffId,
        player_on_id: playerOnId,
      },
      ...prev,
    ])
    toast.success('Substitution logged')
  }

  const removeEntry = (id: string) => {
    const entry = entries.find((e) => e.id === id)
    if (entry?.kind === 'goal') {
      const gf = parseInt(goalsFor, 10)
      if (!isNaN(gf) && gf > 0) setGoalsFor(String(gf - 1))
    }
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const handleEndMatch = async () => {
    const gf = parseInt(goalsFor, 10)
    const ga = parseInt(goalsAgainst, 10)
    if (isNaN(gf) || isNaN(ga) || gf < 0 || ga < 0) {
      toast.error('Enter valid final scores')
      return
    }
    if (!confirm('End match and save all logged events?')) return

    setEnding(true)
    try {
      const events = liveEntriesToMatchEvents(fixture.id, [...entries].reverse())
      await submitMatchResult(fixture.id, gf, ga, null, events)
      toast.success('Match saved')
      navigate(`/admin/results?fixture=${fixture.id}&tab=completed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save match")
    } finally {
      setEnding(false)
    }
  }

  const playerOptions = useMemo(
    () =>
      squad.map((s) => (
        <option key={s.player_id} value={s.player_id}>
          {formatSquadPlayerLabel(s)}
        </option>
      )),
    [squad],
  )

  return (
    <div className="space-y-5">
      <div className="glass-card p-4">
        <p className="font-display text-xl font-bold text-brand-navy">
          {fixture.home_away === 'home' ? 'vs' : '@'} {fixture.opponent}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {new Date(fixture.match_date).toLocaleDateString('en-GB')}
          {fixture.competition ? ` · ${fixture.competition}` : ''}
        </p>
        <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest text-red-600 animate-pulse">
          Live
        </span>
      </div>

      <div className="glass-card p-4 space-y-3">
        <label className="text-xs text-gray-500">Minute</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            max={200}
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={() => setMinute(String(estimateMatchMinute(fixture)))}
            className="text-sm text-brand-blue font-medium shrink-0 px-2"
          >
            Now
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 glass-card">
        {(['goal', 'card', 'substitution'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold capitalize ${
              tab === t ? 'bg-brand-blue text-white' : 'text-gray-600'
            }`}
          >
            {t === 'substitution' ? 'Sub' : t}
          </button>
        ))}
      </div>

      <div className="glass-card p-4 space-y-3">
        {tab === 'goal' && (
          <>
            <div>
              <label className="text-xs text-gray-500">Scorer</label>
              <select value={scorerId} onChange={(e) => setScorerId(e.target.value)} className="input-field mt-1 w-full">
                {playerOptions}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Assist (optional)</label>
              <select value={assistId} onChange={(e) => setAssistId(e.target.value)} className="input-field mt-1 w-full">
                <option value="">None</option>
                {playerOptions}
              </select>
            </div>
            <button type="button" onClick={addGoal} className="btn-primary w-full">
              Log goal
            </button>
          </>
        )}

        {tab === 'card' && (
          <>
            <div>
              <label className="text-xs text-gray-500">Player</label>
              <select value={cardPlayerId} onChange={(e) => setCardPlayerId(e.target.value)} className="input-field mt-1 w-full">
                {playerOptions}
              </select>
            </div>
            <div className="flex gap-2">
              {(['yellow_card', 'red_card'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCardType(c)}
                  className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold ${
                    cardType === c ? 'bg-brand-navy text-white' : 'bg-brand-light text-brand-navy'
                  }`}
                >
                  {c === 'yellow_card' ? 'Yellow' : 'Red'}
                </button>
              ))}
            </div>
            <button type="button" onClick={addCard} className="btn-primary w-full">
              Log card
            </button>
          </>
        )}

        {tab === 'substitution' && (
          <>
            <div>
              <label className="text-xs text-gray-500">Off</label>
              <select value={playerOffId} onChange={(e) => setPlayerOffId(e.target.value)} className="input-field mt-1 w-full">
                {playerOptions}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">On</label>
              <select value={playerOnId} onChange={(e) => setPlayerOnId(e.target.value)} className="input-field mt-1 w-full">
                {playerOptions}
              </select>
            </div>
            <button type="button" onClick={addSubstitution} className="btn-primary w-full">
              Log substitution
            </button>
          </>
        )}
      </div>

      <div className="glass-card p-4 space-y-2">
        <h2 className="font-semibold text-brand-navy">Event log</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No events logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-brand-navy">{describeLiveEntry(entry, nameFor)}</span>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="text-red-600 font-medium shrink-0"
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-card p-4 space-y-4">
        <h2 className="font-semibold text-brand-navy">Final score</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">BMFC</label>
            <input type="number" min={0} value={goalsFor} onChange={(e) => setGoalsFor(e.target.value)} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Opponent</label>
            <input type="number" min={0} value={goalsAgainst} onChange={(e) => setGoalsAgainst(e.target.value)} className="input-field mt-1" />
          </div>
        </div>
        <button type="button" onClick={() => void handleEndMatch()} disabled={ending} className="btn-primary w-full">
          {ending ? 'Saving…' : 'End match'}
        </button>
      </div>
    </div>
  )
}

export default function AdminLive() {
  const { fixtureId } = useParams<{ fixtureId?: string }>()
  const navigate = useNavigate()
  const [fixtures, setFixtures] = useState<FixtureWithResult[]>([])
  const [squad, setSquad] = useState<SquadMember[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      const [f, s] = await Promise.all([fetchLiveMatchFixtures(), fetchSquad()])
      setFixtures(f)
      setSquad(s)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [fixtureId])

  const fixture = fixtureId ? fixtures.find((f) => f.id === fixtureId) : undefined

  const goLive = async (id: string) => {
    setStarting(true)
    try {
      await startLiveMatch(id)
      navigate(`/admin/live/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start live match")
    } finally {
      setStarting(false)
    }
  }

  const handleSelect = (id: string) => {
    const picked = fixtures.find((f) => f.id === id)
    if (picked?.status === 'in_progress') {
      navigate(`/admin/live/${id}`)
      return
    }
    void goLive(id)
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <h1 className="font-display text-2xl text-brand-navy">Live matchday</h1>
        <p className="text-sm text-gray-500">
          Log goals, cards and subs during the game. Events save when you end the match.
        </p>

        {loading ? (
          <div className="glass-card h-40 animate-pulse" />
        ) : fixtureId && fixture ? (
          <LiveMatchLogger fixture={fixture} squad={squad} />
        ) : fixtureId && !loading ? (
          <div className="glass-card p-8 text-center text-gray-500">
            Match not found or not available for live logging.
            <Link to="/admin/live" className="block mt-2 text-brand-blue text-sm font-medium">Pick another match</Link>
          </div>
        ) : (
          <>
            {starting && <p className="text-sm text-gray-500">Starting…</p>}
            <FixturePicker fixtures={fixtures} onSelect={handleSelect} />
          </>
        )}
      </div>
    </PageShell>
  )
}
