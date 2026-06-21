import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import {
  fetchAvailablePlayersForFixture,
  fetchLineup,
  fetchSquad,
  fetchUpcomingFixtures,
  saveLineup,
} from '../lib/clubApi'
import { formatMatchDate, formatMatchTime } from '../lib/format'
import { FORMATION_IDS, FORMATION_SLOTS } from '../lib/lineupFormations'
import { LINEUP_EXTRA_BOTTOM, pageContainerClass } from '../lib/layout'
import type { AvailablePlayer, FixtureWithResult, FormationId } from '../types'

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 }

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function assignmentsFromSlots(slots: { position: string; player_id: string }[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const slot of slots) {
    map[slot.position] = slot.player_id
  }
  return map
}

function assignmentsToSlots(map: Record<string, string>): { position: string; player_id: string }[] {
  return Object.entries(map).map(([position, player_id]) => ({ position, player_id }))
}

function PitchMarkings() {
  const stroke = 'rgba(255,255,255,0.45)'
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 150"
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect x="5" y="5" width="90" height="140" fill="none" stroke={stroke} strokeWidth="0.8" />
      <line x1="5" y1="75" x2="95" y2="75" stroke={stroke} strokeWidth="0.6" />
      <circle cx="50" cy="75" r="11" fill="none" stroke={stroke} strokeWidth="0.6" />
      <circle cx="50" cy="75" r="1.2" fill={stroke} />
      <rect x="24" y="5" width="52" height="20" fill="none" stroke={stroke} strokeWidth="0.6" />
      <rect x="24" y="125" width="52" height="20" fill="none" stroke={stroke} strokeWidth="0.6" />
      <rect x="36" y="5" width="28" height="8" fill="none" stroke={stroke} strokeWidth="0.5" />
      <rect x="36" y="137" width="28" height="8" fill="none" stroke={stroke} strokeWidth="0.5" />
      <rect x="42" y="3" width="16" height="3" fill="none" stroke={stroke} strokeWidth="0.5" />
      <rect x="42" y="144" width="16" height="3" fill="none" stroke={stroke} strokeWidth="0.5" />
    </svg>
  )
}

interface LineupSlotButtonProps {
  label: string
  top: number
  left: number
  playerName: string | null
  isSelected: boolean
  isAssigned: boolean
  onTap: () => void
}

function LineupSlotButton({
  label,
  top,
  left,
  playerName,
  isSelected,
  isAssigned,
  onTap,
}: LineupSlotButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onTap}
      animate={{ top: `${top}%`, left: `${left}%` }}
      transition={SPRING}
      style={{ transform: 'translate(-50%, -50%)' }}
      className={`absolute z-20 flex flex-col items-center justify-center min-w-[4.25rem] max-w-[5.25rem] px-2 py-1.5 rounded-pill touch-manipulation select-none ${
        isSelected
          ? 'bg-brand-navy ring-2 ring-brand-gold shadow-md'
          : isAssigned
            ? 'bg-brand-blue text-white shadow-sm'
            : 'bg-brand-navy text-white shadow-sm'
      }`}
    >
      {isSelected && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-brand-navy bg-white px-2.5 py-1 rounded-pill border border-brand-gold shadow-sm pointer-events-none">
          Pick a player
        </span>
      )}
      <span className="text-[10px] font-bold uppercase tracking-wide text-brand-gold leading-none">
        {label}
      </span>
      <span className="text-[11px] font-semibold text-white leading-tight text-center truncate w-full mt-0.5">
        {playerName ? playerName.split(' ')[0] : 'Tap'}
      </span>
    </motion.button>
  )
}

interface PlayerPillProps {
  player: AvailablePlayer
  assigned: boolean
  highlight: boolean
  variant: 'available' | 'squad'
  onTap: () => void
}

function PlayerPill({ player, assigned, highlight, variant, onTap }: PlayerPillProps) {
  const base =
    variant === 'available'
      ? 'bg-brand-light text-brand-navy border-brand-blue/30'
      : 'bg-white/90 text-gray-600 border-brand-blue/15'

  return (
    <button
      type="button"
      onClick={onTap}
      className={`shrink-0 min-h-[40px] px-4 rounded-pill text-sm font-semibold touch-manipulation border transition-opacity ${
        highlight
          ? 'bg-brand-gold text-brand-navy border-brand-gold opacity-100'
          : assigned
            ? `${base} opacity-50`
            : `${base} opacity-100`
      }`}
    >
      {player.display_name}
    </button>
  )
}

export default function AdminLineup() {
  const [fixtures, setFixtures] = useState<FixtureWithResult[]>([])
  const [fixtureId, setFixtureId] = useState('')
  const [formation, setFormation] = useState<FormationId>('4-2-1-3')
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([])
  const [squadPlayers, setSquadPlayers] = useState<AvailablePlayer[]>([])
  const [loadingFixtures, setLoadingFixtures] = useState(true)
  const [loadingLineup, setLoadingLineup] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [saving, setSaving] = useState(false)

  const slotDefs = FORMATION_SLOTS[formation]

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of [...availablePlayers, ...squadPlayers]) {
      map.set(p.player_id, p.display_name)
    }
    return map
  }, [availablePlayers, squadPlayers])

  const assignedPlayerIds = useMemo(() => new Set(Object.values(assignments)), [assignments])

  const availableIds = useMemo(
    () => new Set(availablePlayers.map((p) => p.player_id)),
    [availablePlayers]
  )

  const squadOnlyPlayers = useMemo(
    () => squadPlayers.filter((p) => !availableIds.has(p.player_id)),
    [squadPlayers, availableIds]
  )

  const selectedFixture = fixtures.find((f) => f.id === fixtureId)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingFixtures(true)
      try {
        const rows = await fetchUpcomingFixtures()
        if (!cancelled) {
          setFixtures(rows)
          if (rows.length > 0) setFixtureId((prev) => prev || rows[0].id)
        }
      } catch {
        if (!cancelled) toast.error("Couldn't load fixtures")
      } finally {
        if (!cancelled) setLoadingFixtures(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const loadFixtureData = useCallback(async (id: string) => {
    if (!id) return
    setLoadingLineup(true)
    setLoadingPlayers(true)
    setSelectedSlot(null)
    try {
      const [lineup, available, squad] = await Promise.all([
        fetchLineup(id),
        fetchAvailablePlayersForFixture(id),
        fetchSquad(),
      ])
      setAvailablePlayers(available)
      setSquadPlayers(
        squad
          .map((m) => ({ player_id: m.player_id, display_name: m.display_name }))
          .sort((a, b) => a.display_name.localeCompare(b.display_name))
      )
      if (lineup && FORMATION_IDS.includes(lineup.formation)) {
        setFormation(lineup.formation)
        setAssignments(assignmentsFromSlots(lineup.slots))
      } else {
        setFormation('4-2-1-3')
        setAssignments({})
      }
    } catch {
      toast.error("Couldn't load lineup data")
      setAssignments({})
      setAvailablePlayers([])
      setSquadPlayers([])
    } finally {
      setLoadingLineup(false)
      setLoadingPlayers(false)
    }
  }, [])

  useEffect(() => {
    if (fixtureId) loadFixtureData(fixtureId)
  }, [fixtureId, loadFixtureData])

  const handleFormationChange = (next: FormationId) => {
    setFormation(next)
    setAssignments({})
    setSelectedSlot(null)
  }

  const handleSlotTap = (key: string) => {
    if (selectedSlot === key && assignments[key]) {
      setAssignments((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setSelectedSlot(null)
      return
    }
    setSelectedSlot(key)
  }

  const handlePlayerTap = (playerId: string) => {
    if (!selectedSlot) {
      toast.error('Pick a position on the pitch first')
      return
    }

    if (assignments[selectedSlot] === playerId) {
      setAssignments((prev) => {
        const next = { ...prev }
        delete next[selectedSlot]
        return next
      })
      return
    }

    setAssignments((prev) => {
      const next = { ...prev }
      for (const [key, id] of Object.entries(next)) {
        if (id === playerId) delete next[key]
      }
      next[selectedSlot] = playerId
      return next
    })
  }

  const handleClear = () => {
    setAssignments({})
    setSelectedSlot(null)
  }

  const handleSave = async () => {
    if (!fixtureId) return
    setSaving(true)
    try {
      const validKeys = new Set(slotDefs.map((s) => s.key))
      const slots = assignmentsToSlots(assignments).filter((s) => validKeys.has(s.position))
      await saveLineup(fixtureId, formation, slots)
      toast.success('Lineup saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save lineup")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass('max-w-4xl', LINEUP_EXTRA_BOTTOM)}>
        <FadeUp>
          <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        </FadeUp>

        <FadeUp delay={0.05}>
          <div>
            <h1 className="font-display text-2xl text-brand-navy">Pick a lineup</h1>
            <p className="text-sm text-gray-500 mt-1">Tap a position, then tap a player</p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="glass-card p-4 space-y-3">
            <label htmlFor="lineup-fixture" className="text-sm text-gray-500">Fixture</label>
            <select
              id="lineup-fixture"
              className="input-field"
              value={fixtureId}
              disabled={loadingFixtures || fixtures.length === 0}
              onChange={(e) => setFixtureId(e.target.value)}
            >
              {fixtures.length === 0 ? (
                <option value="">No upcoming matches</option>
              ) : (
                fixtures.map((f) => (
                  <option key={f.id} value={f.id}>
                    vs {f.opponent.replace(' FC', '')} · {formatMatchDate(f.match_date)}
                    {f.kickoff_time ? ` · ${formatMatchTime(f.match_date, f.kickoff_time)}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </FadeUp>

        <FadeUp delay={0.15}>
          <div className="glass-card p-4 space-y-3">
            <p className="text-sm text-gray-500">Formation</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FORMATION_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleFormationChange(id)}
                  className={`shrink-0 min-h-[40px] px-4 rounded-pill text-sm font-semibold touch-manipulation transition-colors ${
                    formation === id
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'bg-white/80 text-gray-600 border border-brand-blue/15'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="glass-card p-3 mx-auto w-full max-w-[360px]">
            <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '150%' }}>
              <div className="absolute inset-0 bg-gradient-to-b from-[#1a5c34] to-[#134428]">
                <PitchMarkings />

                {loadingLineup && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-30">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {slotDefs.map((slot) => {
                  const playerId = assignments[slot.key]
                  const name = playerId ? playerNameById.get(playerId) ?? null : null

                  return (
                    <LineupSlotButton
                      key={slot.key}
                      label={slot.label}
                      top={slot.top}
                      left={slot.left}
                      playerName={name}
                      isSelected={selectedSlot === slot.key}
                      isAssigned={Boolean(playerId)}
                      onTap={() => handleSlotTap(slot.key)}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.25}>
          <div className="glass-card p-4 space-y-3">
            <p className="text-sm text-gray-500">
              Squad pool
              {selectedFixture ? ` · vs ${selectedFixture.opponent.replace(' FC', '')}` : ''}
            </p>

            <div className="max-h-[min(42vh,300px)] overflow-y-auto space-y-4 pr-1">
              {loadingPlayers ? (
                <p className="text-sm text-gray-500">Loading players...</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-brand-navy uppercase tracking-wide">Available</span>
                    </div>
                    {availablePlayers.length === 0 ? (
                      <p className="text-sm text-gray-500">No one marked available yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {availablePlayers.map((player) => (
                          <PlayerPill
                            key={player.player_id}
                            player={player}
                            variant="available"
                            assigned={assignedPlayerIds.has(player.player_id)}
                            highlight={Boolean(
                              selectedSlot && assignments[selectedSlot] === player.player_id
                            )}
                            onTap={() => handlePlayerTap(player.player_id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full squad</span>
                    {squadOnlyPlayers.length === 0 ? (
                      <p className="text-sm text-gray-400">Everyone available is listed above.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {squadOnlyPlayers.map((player) => (
                          <PlayerPill
                            key={player.player_id}
                            player={player}
                            variant="squad"
                            assigned={assignedPlayerIds.has(player.player_id)}
                            highlight={Boolean(
                              selectedSlot && assignments[selectedSlot] === player.player_id
                            )}
                            onTap={() => handlePlayerTap(player.player_id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !fixtureId || loadingLineup}
              className="btn-primary flex-1"
            >
              {saving ? 'Saving...' : 'Save lineup'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={Object.keys(assignments).length === 0}
              className="btn-secondary flex-1"
            >
              Clear
            </button>
          </div>
        </FadeUp>
      </div>
    </PageShell>
  )
}
