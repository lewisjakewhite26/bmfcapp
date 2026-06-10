import { useMemo } from 'react'
import { formatMatchDate, resultLabel } from '../../lib/format'
import type { MatchPerformance } from '../../lib/playerProfileStats'
import { opponentShort } from '../../lib/playerProfileStats'

interface PlayerPerformanceChartProps {
  performances: MatchPerformance[]
}

function barColor(index: number, points: number): string {
  if (points >= 15) return 'bg-brand-gold'
  return index % 2 === 0 ? 'bg-brand-blue' : 'bg-brand-blue/70'
}

export function PlayerPerformanceChart({ performances }: PlayerPerformanceChartProps) {
  const maxPoints = useMemo(
    () => Math.max(15, ...performances.map((p) => p.points)),
    [performances]
  )

  if (performances.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-500">
        No match data yet.
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-2 h-52 px-1">
        {performances.map((perf, i) => {
          const heightPct = maxPoints > 0 ? (perf.points / maxPoints) * 100 : 0
          const result =
            perf.goalsFor != null && perf.goalsAgainst != null
              ? resultLabel(perf.goalsFor, perf.goalsAgainst)
              : null

          return (
            <div key={perf.fixtureId} className="flex-1 flex flex-col items-center min-w-0 group">
              <div className="relative flex-1 w-full flex items-end justify-center">
                <div
                  className={`w-full max-w-[40px] rounded-t-lg transition-all ${barColor(i, perf.points)} group-hover:opacity-90`}
                  style={{ height: `${Math.max(heightPct, perf.points > 0 ? 12 : 4)}%` }}
                  title={`${perf.points} pts`}
                />
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-navy text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10">
                  {perf.points} pts
                </div>
              </div>
              {result && (
                <span
                  className={`mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    result === 'W'
                      ? 'bg-emerald-100 text-emerald-700'
                      : result === 'L'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {result}
                </span>
              )}
              <p className="text-[10px] font-bold text-brand-navy mt-1 truncate w-full text-center">
                {opponentShort(perf.opponent)}
              </p>
              <p className="text-[9px] text-gray-400 truncate w-full text-center">
                {new Date(perf.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-brand-blue/10 text-xs text-gray-500">
        <span>Match impact (pts)</span>
        <span>Goals +10 · Assist +6 · MOTM +15</span>
      </div>
    </div>
  )
}

interface PlayerFormTimelineProps {
  performances: MatchPerformance[]
}

export function PlayerFormTimeline({ performances }: PlayerFormTimelineProps) {
  const recent = [...performances].reverse().slice(0, 5).reverse()

  if (recent.length === 0) return null

  return (
    <div className="mt-4 pt-4 border-t border-brand-blue/10">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent form</p>
      <div className="flex items-center gap-1">
        {recent.map((perf, i) => {
          const rating = perf.points
          const color =
            rating >= 15 ? 'bg-brand-gold text-brand-navy' : rating >= 8 ? 'bg-brand-blue text-white' : 'bg-brand-light text-brand-navy border border-brand-blue/20'

          return (
            <div key={perf.fixtureId} className="flex items-center flex-1 min-w-0">
              {i > 0 && <div className="h-px flex-1 bg-brand-blue/15 min-w-[8px]" />}
              <div className="flex flex-col items-center shrink-0" title={`${perf.opponent} · ${formatMatchDate(perf.date)}`}>
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${color}`}>
                  {rating}
                </span>
                <span className="text-[9px] text-gray-400 mt-1 truncate max-w-[48px]">
                  {opponentShort(perf.opponent)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        Avg last {recent.length}: {(recent.reduce((s, p) => s + p.points, 0) / recent.length).toFixed(1)} pts
      </p>
    </div>
  )
}
