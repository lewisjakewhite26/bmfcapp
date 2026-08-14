import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { fetchLineup, setLineupSubsConfirmedNone, submitMatchResult } from '../../lib/clubApi'
import type { FixtureWithResult, Lineup, MatchEventType, SquadMember } from '../../types'

interface ResultEntryFormProps {
  fixture: FixtureWithResult
  squad: SquadMember[]
  onSaved: () => void
}

type EventRow = {
  player_id: string
  event_type: MatchEventType
  minute: string
  related_player_id?: string
}

/** A bench-toggle credit is stored as a self-referential substitution row
 * (player_id === related_player_id) so it can be told apart from a manually
 * logged real off/on pair without a schema change. */
function isBenchToggleEvent(e: { event_type: MatchEventType; player_id: string; related_player_id?: string | null }) {
  return e.event_type === 'substitution' && e.related_player_id === e.player_id
}

const SCORING_TYPES: MatchEventType[] = ['goal', 'assist', 'motm', 'yellow_card', 'red_card']

/** Prefill "Starting XI" from whatever's already saved: explicit appearance
 * rows, plus anyone with a goal/assist/motm/card (they obviously played),
 * minus anyone already credited as a sub — fully editable afterwards, this
 * is just a starting point so old fixtures aren't blank. */
function seedStartedOn(fixture: FixtureWithResult): Set<string> {
  const events = fixture.events ?? []
  const subIds = new Set(events.filter(isBenchToggleEvent).map((e) => e.related_player_id!))
  const started = new Set<string>()
  for (const e of events) {
    if (subIds.has(e.player_id)) continue
    if (e.event_type === 'appearance' || SCORING_TYPES.includes(e.event_type)) {
      started.add(e.player_id)
    }
  }
  return started
}

export function ResultEntryForm({ fixture, squad, onSaved }: ResultEntryFormProps) {
  const [goalsFor, setGoalsFor] = useState(fixture.result?.goals_for?.toString() ?? '')
  const [goalsAgainst, setGoalsAgainst] = useState(fixture.result?.goals_against?.toString() ?? '')
  const [notes, setNotes] = useState(fixture.result?.notes ?? '')
  const [goalkeeperPlayerId, setGoalkeeperPlayerId] = useState(
    fixture.result?.goalkeeper_player_id ?? '',
  )
  const [events, setEvents] = useState<EventRow[]>(
    (fixture.events ?? [])
      .filter((e) => !isBenchToggleEvent(e))
      .map((e) => ({
        player_id: e.player_id,
        event_type: e.event_type,
        minute: e.minute?.toString() ?? '',
        related_player_id: e.related_player_id ?? undefined,
      }))
  )
  const [subsOn, setSubsOn] = useState<Set<string>>(
    () =>
      new Set(
        (fixture.events ?? [])
          .filter(isBenchToggleEvent)
          .map((e) => e.related_player_id!)
      ),
  )
  const [lineup, setLineup] = useState<Lineup | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmingNoSubs, setConfirmingNoSubs] = useState(false)
  const [startedOn, setStartedOn] = useState<Set<string>>(() => seedStartedOn(fixture))
  const [unusedSubsOn, setUnusedSubsOn] = useState<Set<string>>(
    () => new Set((fixture.events ?? []).filter((e) => e.event_type === 'unused_sub').map((e) => e.player_id)),
  )
  const [defendersForCleanSheet, setDefendersForCleanSheet] = useState<Set<string>>(
    () => new Set((fixture.events ?? []).filter((e) => e.event_type === 'clean_sheet_def').map((e) => e.player_id)),
  )
  // Once true, stop auto-filling defenders/keeper from Starting XI — admin
  // has made a deliberate edit (or a previous save already has real data).
  const [cleanSheetCreditTouched, setCleanSheetCreditTouched] = useState(
    () => (fixture.events ?? []).some((e) => e.event_type === 'clean_sheet_def' || e.event_type === 'clean_sheet_gk'),
  )

  const goalkeepers = squad.filter((s) => s.position === 'Goalkeeper')
  const goalsAgainstNum = parseInt(goalsAgainst, 10)
  const isShutout = !isNaN(goalsAgainstNum) && goalsAgainstNum === 0

  useEffect(() => {
    setGoalsFor(fixture.result?.goals_for?.toString() ?? '')
    setGoalsAgainst(fixture.result?.goals_against?.toString() ?? '')
    setNotes(fixture.result?.notes ?? '')
    setGoalkeeperPlayerId(fixture.result?.goalkeeper_player_id ?? '')
    setEvents(
      (fixture.events ?? [])
        .filter((e) => !isBenchToggleEvent(e))
        .map((e) => ({
          player_id: e.player_id,
          event_type: e.event_type,
          minute: e.minute?.toString() ?? '',
          related_player_id: e.related_player_id ?? undefined,
        })),
    )
    setSubsOn(
      new Set(
        (fixture.events ?? [])
          .filter(isBenchToggleEvent)
          .map((e) => e.related_player_id!)
      ),
    )
    setStartedOn(seedStartedOn(fixture))
    setUnusedSubsOn(
      new Set((fixture.events ?? []).filter((e) => e.event_type === 'unused_sub').map((e) => e.player_id)),
    )
    setDefendersForCleanSheet(
      new Set((fixture.events ?? []).filter((e) => e.event_type === 'clean_sheet_def').map((e) => e.player_id)),
    )
    setCleanSheetCreditTouched(
      (fixture.events ?? []).some((e) => e.event_type === 'clean_sheet_def' || e.event_type === 'clean_sheet_gk'),
    )
  }, [fixture.id, fixture.result, fixture.events])

  useEffect(() => {
    let cancelled = false
    setLineup(null)
    fetchLineup(fixture.id)
      .then((l) => { if (!cancelled) setLineup(l) })
      .catch(() => { if (!cancelled) setLineup(null) })
    return () => { cancelled = true }
  }, [fixture.id])

  const startingXIIds = useMemo(() => new Set(lineup?.slots.map((s) => s.player_id) ?? []), [lineup])
  const benchIds = useMemo(() => new Set(lineup?.substitutes ?? []), [lineup])
  const startingXIPlayers = useMemo(
    () => (startingXIIds.size > 0 ? squad.filter((s) => startingXIIds.has(s.player_id)) : squad),
    [squad, startingXIIds],
  )
  const benchPlayers = useMemo(
    () => (benchIds.size > 0 ? squad.filter((s) => benchIds.has(s.player_id)) : squad),
    [squad, benchIds],
  )

  const manualBenchCreditIds = useMemo(
    () =>
      new Set(
        events
          .filter((e) => e.event_type === 'substitution' && e.related_player_id && benchIds.has(e.related_player_id))
          .map((e) => e.related_player_id!),
      ),
    [events, benchIds],
  )
  const noSubsCredited = subsOn.size === 0 && manualBenchCreditIds.size === 0
  const confirmedNoSubs = noSubsCredited && lineup?.subs_confirmed_none === true
  const showMissingCreditNudge = squad.length > 0 && noSubsCredited && !confirmedNoSubs

  const toggleSubOn = (playerId: string) => {
    setSubsOn((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const toggleInSet = (setter: (updater: (prev: Set<string>) => Set<string>) => void) => (playerId: string) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }
  const toggleStarted = toggleInSet(setStartedOn)
  const toggleUnusedSub = toggleInSet(setUnusedSubsOn)
  const toggleDefenderCleanSheet = (playerId: string) => {
    setCleanSheetCreditTouched(true)
    toggleInSet(setDefendersForCleanSheet)(playerId)
  }
  const handleGoalkeeperChange = (playerId: string) => {
    setCleanSheetCreditTouched(true)
    setGoalkeeperPlayerId(playerId)
  }
  const resetCleanSheetCreditToAuto = () => {
    setCleanSheetCreditTouched(false)
    setDefendersForCleanSheet(new Set(autoDefenderIds))
    setGoalkeeperPlayerId(autoKeeperId)
  }

  // Subs section shouldn't offer anyone already ticked as a starter; unused
  // subs shouldn't offer anyone already a starter OR already came on.
  const subCandidates = useMemo(() => squad.filter((s) => !startedOn.has(s.player_id)), [squad, startedOn])
  const unusedSubCandidates = useMemo(
    () => squad.filter((s) => !startedOn.has(s.player_id) && !subsOn.has(s.player_id)),
    [squad, startedOn, subsOn],
  )
  // Clean-sheet credit is inferred straight from Starting XI/Subs + each
  // player's stored position — no separate "who was in defense" question.
  // Stays live-synced until the admin makes a manual edit (touched flag).
  const startedOrSubbed = useMemo(() => new Set([...startedOn, ...subsOn]), [startedOn, subsOn])
  const autoDefenderIds = useMemo(
    () => new Set(squad.filter((s) => s.position === 'Defender' && startedOrSubbed.has(s.player_id)).map((s) => s.player_id)),
    [squad, startedOrSubbed],
  )
  const autoKeeperId = useMemo(() => {
    const onPitchKeepers = squad.filter((s) => s.position === 'Goalkeeper' && startedOrSubbed.has(s.player_id))
    return onPitchKeepers.length === 1 ? onPitchKeepers[0].player_id : ''
  }, [squad, startedOrSubbed])

  useEffect(() => {
    if (cleanSheetCreditTouched) return
    setDefendersForCleanSheet(new Set(autoDefenderIds))
    if (autoKeeperId) setGoalkeeperPlayerId(autoKeeperId)
  }, [autoDefenderIds, autoKeeperId, cleanSheetCreditTouched])

  const setConfirmedNoSubs = async (confirmed: boolean) => {
    setConfirmingNoSubs(true)
    try {
      const updated = await setLineupSubsConfirmedNone(fixture.id, confirmed)
      setLineup(updated)
    } catch {
      toast.error("Couldn't update")
    } finally {
      setConfirmingNoSubs(false)
    }
  }

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

    const benchToggleEvents = Array.from(subsOn)
      .filter((playerId) => !manualBenchCreditIds.has(playerId))
      .map((playerId) => ({
        fixture_id: fixture.id,
        player_id: playerId,
        event_type: 'substitution' as MatchEventType,
        minute: null,
        related_player_id: playerId,
      }))

    // Anyone with a real goal/assist/motm/card already implies they played —
    // no need for a separate flat appearance credit on top.
    const scoredPlayerIds = new Set(
      events.filter((e) => e.player_id && SCORING_TYPES.includes(e.event_type)).map((e) => e.player_id),
    )
    const appearanceEvents = Array.from(startedOn)
      .filter((playerId) => !scoredPlayerIds.has(playerId))
      .map((playerId) => ({
        fixture_id: fixture.id,
        player_id: playerId,
        event_type: 'appearance' as MatchEventType,
        minute: null,
      }))
    const unusedSubEvents = Array.from(unusedSubsOn).map((playerId) => ({
      fixture_id: fixture.id,
      player_id: playerId,
      event_type: 'unused_sub' as MatchEventType,
      minute: null,
    }))
    const cleanSheetEvents = isShutout
      ? [
          ...(goalkeeperPlayerId
            ? [{ fixture_id: fixture.id, player_id: goalkeeperPlayerId, event_type: 'clean_sheet_gk' as MatchEventType, minute: null }]
            : []),
          ...Array.from(defendersForCleanSheet).map((playerId) => ({
            fixture_id: fixture.id,
            player_id: playerId,
            event_type: 'clean_sheet_def' as MatchEventType,
            minute: null,
          })),
        ]
      : []

    setSaving(true)
    try {
      await submitMatchResult(
        fixture.id,
        gf,
        ga,
        notes || null,
        [
          ...events
            .filter((e) => e.player_id)
            .map((e) => ({
              fixture_id: fixture.id,
              player_id: e.player_id,
              event_type: e.event_type,
              minute: e.minute ? parseInt(e.minute, 10) : null,
              ...(e.related_player_id ? { related_player_id: e.related_player_id } : {}),
            })),
          ...benchToggleEvents,
          ...appearanceEvents,
          ...unusedSubEvents,
          ...cleanSheetEvents,
        ],
        goalkeeperPlayerId || null,
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

      <div>
        <label className="text-xs text-gray-500">Goalkeeper (optional)</label>
        <select
          value={goalkeeperPlayerId}
          onChange={(e) => handleGoalkeeperChange(e.target.value)}
          className="input-field mt-1 w-full"
        >
          <option value="">Not set</option>
          {goalkeepers.map((g) => (
            <option key={g.player_id} value={g.player_id}>
              {g.display_name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Auto-fills once you tick a goalkeeper in Starting XI below (only pick manually if two keepers played, or nobody's ticked yet). Also used as a fallback for clean-sheet stats when the match wasn't logged live and no lineup was saved.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-brand-navy">Starting XI · who started?</p>
        <div className="flex flex-wrap gap-2">
          {squad.map((player) => {
            const isOn = startedOn.has(player.player_id)
            return (
              <button
                key={player.player_id}
                type="button"
                onClick={() => toggleStarted(player.player_id)}
                className={`min-h-[40px] px-4 rounded-pill text-sm font-semibold border transition-colors ${
                  isOn
                    ? 'bg-brand-gold text-brand-navy border-brand-gold'
                    : 'bg-white/80 text-gray-600 border-brand-blue/15'
                }`}
              >
                {player.display_name}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-500">
          Required for accurate appearance points — tap everyone who started, whether or not they scored.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-brand-navy">
          Substitutes · who came on?
        </p>
        {showMissingCreditNudge && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-card px-3 py-2 space-y-1.5">
            <p>None marked as coming on yet — tap anyone who came off the bench.</p>
            <button
              type="button"
              onClick={() => setConfirmedNoSubs(true)}
              disabled={confirmingNoSubs}
              className="font-semibold underline underline-offset-2"
            >
              No subs came on
            </button>
          </div>
        )}
        {confirmedNoSubs && (
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-card px-3 py-2 flex items-center justify-between gap-2">
            <span>No subs came on this game — confirmed.</span>
            <button
              type="button"
              onClick={() => setConfirmedNoSubs(false)}
              disabled={confirmingNoSubs}
              className="font-semibold underline underline-offset-2 shrink-0"
            >
              Undo
            </button>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {subCandidates.map((player) => {
            const isOn = subsOn.has(player.player_id)
            return (
              <button
                key={player.player_id}
                type="button"
                onClick={() => toggleSubOn(player.player_id)}
                className={`min-h-[40px] px-4 rounded-pill text-sm font-semibold border transition-colors ${
                  isOn
                    ? 'bg-brand-gold text-brand-navy border-brand-gold'
                    : 'bg-white/80 text-gray-600 border-brand-blue/15'
                }`}
              >
                {player.display_name}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-500">
          Untapped players stay uncredited. Already logged via Match events below? They won't be double-counted.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-brand-navy">Unused substitutes · on the bench, didn't play</p>
        <div className="flex flex-wrap gap-2">
          {unusedSubCandidates.map((player) => {
            const isOn = unusedSubsOn.has(player.player_id)
            return (
              <button
                key={player.player_id}
                type="button"
                onClick={() => toggleUnusedSub(player.player_id)}
                className={`min-h-[40px] px-4 rounded-pill text-sm font-semibold border transition-colors ${
                  isOn
                    ? 'bg-brand-gold text-brand-navy border-brand-gold'
                    : 'bg-white/80 text-gray-600 border-brand-blue/15'
                }`}
              >
                {player.display_name}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-500">Named on the bench but didn't come on — still gets a small credit for being there.</p>
      </div>

      {isShutout && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-brand-navy">Defenders · clean sheet credit</p>
            {cleanSheetCreditTouched && (
              <button
                type="button"
                onClick={resetCleanSheetCreditToAuto}
                className="text-xs text-brand-blue font-medium"
              >
                Reset to Starting XI
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {squad.map((player) => {
              const isOn = defendersForCleanSheet.has(player.player_id)
              return (
                <button
                  key={player.player_id}
                  type="button"
                  onClick={() => toggleDefenderCleanSheet(player.player_id)}
                  className={`min-h-[40px] px-4 rounded-pill text-sm font-semibold border transition-colors ${
                    isOn
                      ? 'bg-brand-gold text-brand-navy border-brand-gold'
                      : 'bg-white/80 text-gray-600 border-brand-blue/15'
                  }`}
                >
                  {player.display_name}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500">
            Auto-filled from anyone in Starting XI/Subs marked "Defender" — edit here only if someone played out of position.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-brand-navy">Match events</p>
          <button type="button" onClick={addEvent} className="text-sm text-brand-blue font-medium min-h-[44px] px-2">
            + Add
          </button>
        </div>
        {events.map((ev, i) => (
          <div
            key={i}
            className="rounded-card border border-brand-blue/15 bg-brand-light/40 p-3 space-y-2"
          >
            <div className="flex gap-2 items-start">
              <select
                value={ev.player_id}
                onChange={(e) =>
                  setEvents((prev) =>
                    prev.map((row, j) => (j === i ? { ...row, player_id: e.target.value } : row)),
                  )
                }
                className="input-field text-sm flex-1 min-w-0"
                aria-label="Player"
              >
                {(ev.event_type === 'substitution' ? startingXIPlayers : squad).map((s) => (
                  <option key={s.player_id} value={s.player_id}>
                    {s.display_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setEvents((prev) => prev.filter((_, j) => j !== i))}
                className="shrink-0 min-h-[44px] min-w-[44px] text-red-500 text-sm font-semibold"
                aria-label="Remove event"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
              <select
                value={ev.event_type}
                onChange={(e) =>
                  setEvents((prev) =>
                    prev.map((row, j) =>
                      j === i ? { ...row, event_type: e.target.value as MatchEventType } : row,
                    ),
                  )
                }
                className="input-field text-sm min-w-0 w-full"
                aria-label="Event type"
              >
                <option value="goal">Goal</option>
                <option value="assist">Assist</option>
                <option value="motm">MOTM</option>
                <option value="yellow_card">Yellow card</option>
                <option value="red_card">Red card</option>
                <option value="substitution">Sub off</option>
              </select>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Min"
                value={ev.minute}
                onChange={(e) =>
                  setEvents((prev) =>
                    prev.map((row, j) => (j === i ? { ...row, minute: e.target.value } : row)),
                  )
                }
                className="input-field text-sm w-full"
                aria-label="Minute"
              />
            </div>

            {ev.event_type === 'substitution' && (
              <select
                value={ev.related_player_id ?? ''}
                onChange={(e) =>
                  setEvents((prev) =>
                    prev.map((row, j) =>
                      j === i ? { ...row, related_player_id: e.target.value } : row,
                    ),
                  )
                }
                className="input-field text-sm w-full min-w-0"
                aria-label="Player coming on"
              >
                <option value="">Player on…</option>
                {benchPlayers.map((s) => (
                  <option key={s.player_id} value={s.player_id}>
                    {s.display_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className="btn-primary w-full sm:w-auto">
        {saving ? 'Saving...' : 'Save result'}
      </button>
    </div>
  )
}
