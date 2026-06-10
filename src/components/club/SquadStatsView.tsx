import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PlayerStats } from '../../types'
import { playerInitials } from '../../lib/format'

type StatFilter = 'all' | 'goals' | 'assists' | 'discipline'

interface SquadStatsViewProps {
  stats: PlayerStats[]
  loading?: boolean
}

const POSITION_ORDER = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper']

function StatChip({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  if (value === 0 && !highlight) return null
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-semibold ${
        highlight ? 'bg-brand-blue text-white' : 'bg-brand-light text-brand-navy border border-brand-blue/10'
      }`}
    >
      <span className="text-[10px] uppercase tracking-wide opacity-80">{label}</span>
      {value}
    </span>
  )
}

function TopScorerCard({
  player,
  rank,
  maxGoals,
}: {
  player: PlayerStats
  rank: 1 | 2 | 3
  maxGoals: number
}) {
  const styles = {
    1: 'ring-2 ring-brand-gold/60 bg-gradient-to-b from-brand-gold/15 to-white/70',
    2: 'bg-white/80',
    3: 'bg-white/70',
  }
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const barPct = maxGoals > 0 ? (player.goals / maxGoals) * 100 : 0

  return (
    <Link
      to={`/player/${player.player_id}`}
      className={`glass-card p-4 text-center block hover:shadow-glass-hover transition-shadow ${styles[rank]} ${rank === 1 ? 'sm:-mt-2' : ''}`}
    >
      <span className="text-2xl" aria-hidden>{medals[rank]}</span>
      <div className="w-12 h-12 mx-auto mt-2 rounded-full bg-brand-blue text-white font-bold flex items-center justify-center text-sm">
        {playerInitials(player.display_name)}
      </div>
      <p className="font-semibold text-brand-navy mt-2">{player.display_name}</p>
      <p className="text-xs text-gray-500">{player.position}</p>
      <p className="font-display text-3xl font-bold text-brand-blue mt-2">{player.goals}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">goals</p>
      <div className="mt-3 h-1.5 rounded-full bg-brand-blue/10 overflow-hidden">
        <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${barPct}%` }} />
      </div>
      {player.assists > 0 && (
        <p className="text-xs text-gray-500 mt-2">{player.assists} assist{player.assists !== 1 ? 's' : ''}</p>
      )}
    </Link>
  )
}

function PlayerStatCard({ player, maxGoals, filter }: { player: PlayerStats; maxGoals: number; filter: StatFilter }) {
  const barPct = maxGoals > 0 ? (player.goals / maxGoals) * 100 : 0
  const hasDiscipline = player.yellow_cards > 0 || player.red_cards > 0

  if (filter === 'goals' && player.goals === 0) return null
  if (filter === 'assists' && player.assists === 0) return null
  if (filter === 'discipline' && !hasDiscipline) return null

  return (
    <Link to={`/player/${player.player_id}`} className="glass-card p-4 flex gap-3 hover:shadow-glass-hover transition-shadow">
      <div className="shrink-0 w-11 h-11 rounded-full bg-brand-blue/10 text-brand-blue font-bold flex items-center justify-center text-sm">
        {playerInitials(player.display_name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-brand-navy">{player.display_name}</p>
            {player.position && <p className="text-xs text-gray-500">{player.position}</p>}
          </div>
          {player.motm > 0 && (
            <span className="text-xs font-semibold text-brand-gold shrink-0">⭐ {player.motm}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          <StatChip label="G" value={player.goals} highlight={player.goals > 0} />
          <StatChip label="A" value={player.assists} />
          <StatChip label="Apps" value={player.appearances} />
          {player.clean_sheets > 0 && <StatChip label="CS" value={player.clean_sheets} />}
          {player.yellow_cards > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-semibold bg-amber-100 text-amber-800">
              🟨 {player.yellow_cards}
            </span>
          )}
          {player.red_cards > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-semibold bg-red-100 text-red-800">
              🟥 {player.red_cards}
            </span>
          )}
        </div>

        {player.goals > 0 && filter !== 'discipline' && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-brand-blue/10 overflow-hidden">
              <div className="h-full rounded-full bg-brand-blue" style={{ width: `${barPct}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}

export function SquadStatsView({ stats, loading }: SquadStatsViewProps) {
  const [filter, setFilter] = useState<StatFilter>('all')

  const totals = useMemo(
    () => ({
      goals: stats.reduce((s, p) => s + p.goals, 0),
      assists: stats.reduce((s, p) => s + p.assists, 0),
      appearances: stats.reduce((s, p) => s + p.appearances, 0),
      motm: stats.reduce((s, p) => s + p.motm, 0),
    }),
    [stats]
  )

  const topScorers = useMemo(
    () => [...stats].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 3),
    [stats]
  )

  const maxGoals = topScorers[0]?.goals ?? 1

  const grouped = useMemo(() => {
    const sorted = [...stats].sort((a, b) => {
      const posA = POSITION_ORDER.indexOf(a.position ?? '')
      const posB = POSITION_ORDER.indexOf(b.position ?? '')
      if (posA !== posB) return (posA === -1 ? 99 : posA) - (posB === -1 ? 99 : posB)
      return a.display_name.localeCompare(b.display_name)
    })

    const groups = new Map<string, PlayerStats[]>()
    for (const p of sorted) {
      const key = p.position ?? 'Squad'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }
    return groups
  }, [stats])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card h-20 animate-pulse" />
          ))}
        </div>
        <div className="glass-card h-48 animate-pulse" />
      </div>
    )
  }

  if (stats.length === 0) {
    return <div className="glass-card p-8 text-center text-gray-500">No stats recorded yet.</div>
  }

  const filters: { id: StatFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'goals', label: 'Goals' },
    { id: 'assists', label: 'Assists' },
    { id: 'discipline', label: 'Cards' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Team goals', value: totals.goals, color: 'text-brand-blue' },
          { label: 'Assists', value: totals.assists, color: 'text-brand-navy' },
          { label: 'Appearances', value: totals.appearances, color: 'text-brand-navy' },
          { label: 'MOTM', value: totals.motm, color: 'text-brand-gold' },
        ].map((t) => (
          <div key={t.label} className="glass-card p-4 text-center">
            <p className={`font-display text-2xl font-bold ${t.color}`}>{t.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      {topScorers.some((p) => p.goals > 0) && filter !== 'discipline' && (
        <section>
          <h2 className="font-display text-lg text-brand-navy mb-3">Top scorers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-end">
            {topScorers[0] && (
              <div className="order-1 sm:order-2">
                <TopScorerCard player={topScorers[0]} rank={1} maxGoals={maxGoals} />
              </div>
            )}
            {topScorers[1] && (
              <div className="order-2 sm:order-1">
                <TopScorerCard player={topScorers[1]} rank={2} maxGoals={maxGoals} />
              </div>
            )}
            {topScorers[2] && (
              <div className="order-3">
                <TopScorerCard player={topScorers[2]} rank={3} maxGoals={maxGoals} />
              </div>
            )}
          </div>
        </section>
      )}

      <div className="flex gap-2 p-1 glass-card overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`flex-1 min-w-[72px] min-h-[40px] rounded-pill text-sm font-semibold whitespace-nowrap transition-colors ${
              filter === f.id ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {Array.from(grouped.entries()).map(([position, players]) => {
        const visible = players.filter((p) => {
          if (filter === 'goals') return p.goals > 0
          if (filter === 'assists') return p.assists > 0
          if (filter === 'discipline') return p.yellow_cards > 0 || p.red_cards > 0
          return true
        })
        if (visible.length === 0) return null

        return (
          <section key={position}>
            <h2 className="font-display text-base text-brand-navy mb-3">{position}s</h2>
            <div className="space-y-3">
              {visible.map((p) => (
                <PlayerStatCard key={p.player_id} player={p} maxGoals={maxGoals} filter={filter} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
