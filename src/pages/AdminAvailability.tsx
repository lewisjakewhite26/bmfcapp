import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { useAdminAvailability, useFixtures } from '../hooks/useClubData'
import { fetchSquad, fetchTrainingSessions } from '../lib/clubApi'
import { formatMatchDate, formatMatchTime } from '../lib/format'
import { pageContainerClass } from '../lib/layout'
import type { Availability, SquadMember, TrainingSession } from '../types'

type EventOption =
  | { kind: 'fixture'; id: string; label: string; date: string }
  | { kind: 'training'; id: string; label: string; date: string }

interface PlayerAvailability {
  player_id: string
  display_name: string
  status: Availability['status'] | 'unanswered'
  message: string | null
}

/** Players mark match availability on the dashboard; default admin view to the next match. */
function defaultEventKey(events: EventOption[]): string {
  const nextMatch = events.find((e) => e.kind === 'fixture')
  const event = nextMatch ?? events[0]
  return `${event.kind}:${event.id}`
}

export default function AdminAvailability() {
  const { rows, loading, error: availabilityError, reload } = useAdminAvailability()
  const { upcoming, error: fixturesError, reload: reloadFixtures } = useFixtures()
  const [squad, setSquad] = useState<SquadMember[]>([])
  const [training, setTraining] = useState<TrainingSession[]>([])
  const [selectedKey, setSelectedKey] = useState('')

  const loadSquadAndTraining = useCallback(async () => {
    const [squadRows, trainingRows] = await Promise.all([fetchSquad(), fetchTrainingSessions()])
    setSquad(squadRows)
    setTraining(trainingRows)
  }, [])

  useEffect(() => {
    void loadSquadAndTraining()
  }, [loadSquadAndTraining])

  const refreshAll = useCallback(async () => {
    await Promise.all([reload(), reloadFixtures(), loadSquadAndTraining()])
  }, [reload, reloadFixtures, loadSquadAndTraining])

  const events: EventOption[] = useMemo(() => {
    const now = Date.now()
    const fixtures = upcoming.map((f) => ({
      kind: 'fixture' as const,
      id: f.id,
      label: `Match vs ${f.opponent.replace(' FC', '')}`,
      date: f.match_date,
    }))
    const sessions = training
      .filter((t) => new Date(t.session_date).getTime() > now - 86400000)
      .map((t) => ({
        kind: 'training' as const,
        id: t.id,
        label: 'Training',
        date: t.session_date,
      }))
    return [...fixtures, ...sessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [upcoming, training])

  useEffect(() => {
    if (events.length === 0) return

    const keys = new Set(events.map((e) => `${e.kind}:${e.id}`))
    if (!selectedKey || !keys.has(selectedKey)) {
      setSelectedKey(defaultEventKey(events))
    }
  }, [events, selectedKey])

  const selected = events.find((e) => `${e.kind}:${e.id}` === selectedKey)

  const players = useMemo((): PlayerAvailability[] => {
    if (!selected) return []

    const forEvent = rows.filter((a) =>
      selected.kind === 'fixture'
        ? a.fixture_id === selected.id
        : a.training_id === selected.id
    )

    return squad.map((member) => {
      const entry = forEvent.find((a) => a.player_id === member.player_id)
      return {
        player_id: member.player_id,
        display_name: member.display_name,
        status: entry?.status ?? 'unanswered',
        message: entry?.message ?? null,
      }
    })
  }, [rows, selected, squad])

  const groups = useMemo(() => ({
    yes: players.filter((p) => p.status === 'yes'),
    maybe: players.filter((p) => p.status === 'maybe'),
    no: players.filter((p) => p.status === 'no'),
    unanswered: players.filter((p) => p.status === 'unanswered'),
  }), [players])

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">Availability</h1>
          <p className="text-sm text-gray-500 mt-1">
            See who&apos;s in, out, or hasn&apos;t responded. Match and training are separate — check both if needed.
          </p>
        </div>

        {availabilityError && (
          <DataErrorBanner message={availabilityError} onRetry={refreshAll} />
        )}
        {fixturesError && (
          <DataErrorBanner message={fixturesError} onRetry={refreshAll} />
        )}

        {loading ? (
          <div className="glass-card h-48 animate-pulse" />
        ) : events.length === 0 ? (
          <div className="glass-card p-8 text-center text-gray-500">No upcoming matches or training sessions.</div>
        ) : (
          <>
            <div className="glass-card p-4 space-y-2">
              <label htmlFor="event-select" className="text-xs uppercase tracking-wide text-gray-500">
                Select event
              </label>
              <select
                id="event-select"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="input-field"
              >
                {events.map((e) => (
                  <option key={`${e.kind}:${e.id}`} value={`${e.kind}:${e.id}`}>
                    {e.label} · {formatMatchDate(e.date)}
                    {e.kind === 'fixture' ? ` · ${formatMatchTime(e.date)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <SummaryPill label="In" count={groups.yes.length} color="bg-emerald-100 text-emerald-800" />
              <SummaryPill label="Maybe" count={groups.maybe.length} color="bg-amber-100 text-amber-800" />
              <SummaryPill label="Out" count={groups.no.length} color="bg-red-100 text-red-800" />
              <SummaryPill label="No reply" count={groups.unanswered.length} color="bg-gray-100 text-gray-600" />
            </div>

            <AvailabilityGroup label="In" players={groups.yes} color="text-emerald-700" />
            <AvailabilityGroup label="Maybe" players={groups.maybe} color="text-amber-700" showMessages />
            <AvailabilityGroup label="Out" players={groups.no} color="text-red-700" showMessages />
            <AvailabilityGroup label="No response" players={groups.unanswered} color="text-gray-500" />
          </>
        )}

        <button type="button" onClick={() => void refreshAll()} className="text-sm text-brand-blue font-medium">
          Refresh
        </button>
      </div>
    </PageShell>
  )
}

function SummaryPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-card px-2 py-3 text-center ${color}`}>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
    </div>
  )
}

function AvailabilityGroup({
  label,
  players,
  color,
  showMessages = false,
}: {
  label: string
  players: PlayerAvailability[]
  color: string
  showMessages?: boolean
}) {
  return (
    <div className="glass-card p-4">
      <p className={`text-sm font-semibold ${color}`}>{label} ({players.length})</p>
      {players.length === 0 ? (
        <p className="text-sm text-gray-400 mt-2">Nobody</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {players.map((p) => (
            <li
              key={p.player_id}
              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 py-2 border-t border-brand-blue/8 first:border-t-0 first:pt-0"
            >
              <span className="text-sm font-medium text-brand-navy">{p.display_name}</span>
              {showMessages && p.message && (
                <span className="text-sm text-gray-500 sm:text-right sm:max-w-[55%] italic">
                  &ldquo;{p.message}&rdquo;
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
