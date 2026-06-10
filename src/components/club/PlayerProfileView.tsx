import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { PlayerProfile } from '../../types'
import { formatMatchDate, playerInitials, resultColor, resultLabel } from '../../lib/format'
import {
  getDetailedStatRows,
  getMatchPerformances,
  getRadarAxes,
  getSeasonImpactTotal,
} from '../../lib/playerProfileStats'
import { CalendarList } from './CalendarList'
import { PlayerPerformanceChart, PlayerFormTimeline } from './PlayerPerformanceChart'
import { PlayerRadarChart } from './PlayerRadarChart'
import type { CalendarItem } from '../../types'
import type { Availability } from '../../types'

const EVENT_LABELS: Record<string, string> = {
  goal: '⚽ Goal',
  assist: '🅰️ Assist',
  motm: '⭐ MOTM',
  yellow_card: '🟨 Yellow',
  red_card: '🟥 Red',
}

interface PlayerProfileViewProps {
  profile: PlayerProfile
  isOwnProfile: boolean
  calendarItems?: CalendarItem[]
  availability?: Availability[]
  onAvailabilityChange?: (
    target: { fixtureId?: string; trainingId?: string },
    status: Availability['status'],
    message?: string | null
  ) => void
  calendarLoading?: boolean
  availabilitySaving?: boolean
}

export function PlayerProfileView({
  profile,
  isOwnProfile,
  calendarItems,
  availability,
  onAvailabilityChange,
  calendarLoading,
  availabilitySaving,
}: PlayerProfileViewProps) {
  const { stats, matchHistory } = profile

  const performances = useMemo(() => getMatchPerformances(matchHistory), [matchHistory])
  const seasonPoints = useMemo(() => getSeasonImpactTotal(matchHistory), [matchHistory])
  const radarAxes = useMemo(() => getRadarAxes(stats), [stats])
  const statRows = useMemo(() => getDetailedStatRows(stats), [stats])

  const avgPoints =
    performances.length > 0
      ? (performances.reduce((s, p) => s + p.points, 0) / performances.length).toFixed(1)
      : '—'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Profile hero */}
        <div className="lg:col-span-4 glass-card overflow-hidden">
          <div className="bg-gradient-to-br from-brand-navy via-brand-navy to-brand-blue px-6 pt-8 pb-6 text-white relative">
            <div className="absolute top-4 right-4 text-right">
              <p className="font-display text-3xl font-bold text-brand-gold">{seasonPoints}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/60">season pts</p>
            </div>
            <div className="w-24 h-24 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center font-display font-bold text-3xl text-white shadow-lg">
              {playerInitials(profile.display_name)}
            </div>
            <h1 className="font-display text-2xl font-bold mt-5 text-white">{profile.display_name}</h1>
            {profile.position && (
              <p className="text-brand-gold font-semibold mt-1">{profile.position}</p>
            )}
            <div className="flex items-center gap-2 mt-3 text-sm text-white/70">
              <img src="/logo.png" alt="" className="w-5 h-5 object-contain opacity-80" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              <span>Bishop Middleham FC</span>
            </div>
            {isOwnProfile && (
              <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-widest bg-brand-gold/20 text-brand-gold px-2.5 py-1 rounded-pill border border-brand-gold/30">
                Your profile
              </span>
            )}
          </div>

          <div className="p-5 space-y-3">
            {profile.joined_date && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Joined</span>
                <span className="font-semibold text-brand-navy">
                  {new Date(profile.joined_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Matches</span>
              <span className="font-semibold text-brand-navy">{stats.appearances}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Goals</span>
              <span className="font-display text-lg font-bold text-brand-blue">{stats.goals}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Assists</span>
              <span className="font-semibold text-brand-navy">{stats.assists}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Avg impact</span>
              <span className="font-semibold text-brand-gold">{avgPoints} pts</span>
            </div>
          </div>
        </div>

        {/* Performance chart */}
        <div className="lg:col-span-8 glass-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display text-lg text-brand-navy">Performance</h2>
              <p className="text-sm text-gray-500 mt-0.5">Match-by-match impact score</p>
            </div>
            {stats.motm > 0 && (
              <span className="shrink-0 text-xs font-bold bg-brand-gold/15 text-brand-gold px-3 py-1.5 rounded-pill border border-brand-gold/25">
                ⭐ {stats.motm} MOTM
              </span>
            )}
          </div>
          <PlayerPerformanceChart performances={performances} />
          <PlayerFormTimeline performances={performances} />
        </div>
      </div>

      {/* Radar + detailed stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5 sm:p-6">
          <h2 className="font-display text-lg text-brand-navy mb-1">Player profile</h2>
          <p className="text-sm text-gray-500 mb-4">Season attributes (0–100 scale)</p>
          <PlayerRadarChart axes={radarAxes} />
        </div>

        <div className="glass-card p-5 sm:p-6">
          <h2 className="font-display text-lg text-brand-navy mb-4">Statistics</h2>
          <ul className="space-y-1">
            {statRows.map((row) => (
              <li
                key={row.label}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl ${
                  row.highlight ? 'bg-brand-blue/5 border border-brand-blue/10' : 'hover:bg-brand-light/50'
                }`}
              >
                <span className="text-lg w-8 text-center shrink-0" aria-hidden>{row.icon}</span>
                <span className="flex-1 text-sm text-gray-600">{row.label}</span>
                <span className={`font-display text-lg font-bold ${row.highlight ? 'text-brand-blue' : 'text-brand-navy'}`}>
                  {row.value}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 pt-4 border-t border-brand-blue/10 grid grid-cols-3 gap-2">
            {[
              { label: 'Goals', value: stats.goals, color: 'text-brand-blue' },
              { label: 'Assists', value: stats.assists, color: 'text-brand-navy' },
              { label: 'MOTM', value: stats.motm, color: 'text-brand-gold' },
            ].map((s) => (
              <div key={s.label} className="text-center bg-brand-light/60 rounded-xl py-3">
                <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Match record */}
      <section>
        <h2 className="font-display text-lg text-brand-navy mb-3">Match record</h2>
        {matchHistory.length === 0 ? (
          <div className="glass-card p-6 text-center text-gray-500 text-sm">No match contributions yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matchHistory.map(({ fixture, events }) => {
              const gf = fixture.result?.goals_for
              const ga = fixture.result?.goals_against
              const hasResult = gf != null && ga != null

              return (
                <article
                  key={fixture.id}
                  className="glass-card p-4 border-l-4 border-brand-blue hover:shadow-glass-hover transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500">{formatMatchDate(fixture.match_date)}</p>
                      <p className="font-semibold text-brand-navy mt-0.5">
                        {fixture.home_away === 'home' ? 'vs' : '@'} {fixture.opponent.replace(' FC', '')}
                      </p>
                    </div>
                    {hasResult && (
                      <div className="text-right shrink-0">
                        <p className="font-display text-lg font-bold text-brand-navy">
                          {gf}–{ga}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${resultColor(gf, ga)}`}>
                          {resultLabel(gf, ga)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {events.map((e) => (
                      <span
                        key={e.id}
                        className="text-xs bg-brand-light px-2.5 py-1 rounded-pill text-brand-navy font-medium"
                      >
                        {EVENT_LABELS[e.event_type] ?? e.event_type}
                        {e.minute != null ? ` ${e.minute}'` : ''}
                      </span>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {isOwnProfile && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-brand-navy">My calendar</h2>
            <Link to="/calendar" className="text-sm text-brand-blue font-medium">Full calendar →</Link>
          </div>
          <p className="text-sm text-gray-500 mb-4">Mark in, out or maybe for upcoming games and training.</p>
          {calendarLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="glass-card h-28 animate-pulse" />
              ))}
            </div>
          ) : (
            <CalendarList
              items={calendarItems ?? []}
              availability={availability ?? []}
              showAvailability
              availabilityDisabled={availabilitySaving}
              onAvailabilityChange={onAvailabilityChange}
            />
          )}
        </section>
      )}
    </div>
  )
}
