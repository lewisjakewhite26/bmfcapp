import type { FixtureWithResult } from '../../types'
import { formatMatchDate, formatMatchTime, formatScore, resultColor } from '../../lib/format'
import { CLUB_NAME } from '../../lib/mockData'

interface FixtureCardProps {
  fixture: FixtureWithResult
  showAvailability?: boolean
  availabilitySlot?: React.ReactNode
}

export function FixtureCard({ fixture, availabilitySlot }: FixtureCardProps) {
  const isHome = fixture.home_away === 'home'
  const us = CLUB_NAME.replace(' FC', '')
  const them = fixture.opponent.replace(' FC', '').replace(' Fc', '')
  const completed = fixture.status === 'completed' && fixture.result

  return (
    <article className="glass-card p-4 sm:p-5 border-l-4 border-brand-blue">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">{fixture.competition}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatMatchDate(fixture.match_date)} · {formatMatchTime(fixture.match_date, fixture.kickoff_time)}
          </p>
        </div>
        {completed && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-pill ${resultColor(fixture.result!.goals_for, fixture.result!.goals_against)}`}>
            {fixture.result!.goals_for > fixture.result!.goals_against ? 'Win' : fixture.result!.goals_for < fixture.result!.goals_against ? 'Loss' : 'Draw'}
          </span>
        )}
        {fixture.status === 'postponed' && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-pill bg-amber-100 text-amber-800">Postponed</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <p className={`font-semibold ${isHome ? 'text-brand-navy' : 'text-gray-600'}`}>{isHome ? us : them}</p>
        </div>
        <div className="shrink-0 text-center min-w-[72px]">
          {completed ? (
            <p className="font-display text-2xl font-bold text-brand-navy">
              {formatScore(fixture.result!.goals_for, fixture.result!.goals_against)}
            </p>
          ) : (
            <p className="font-display text-lg font-semibold text-gray-400">vs</p>
          )}
        </div>
        <div className="flex-1 text-left">
          <p className={`font-semibold ${!isHome ? 'text-brand-navy' : 'text-gray-600'}`}>{!isHome ? us : them}</p>
        </div>
      </div>

      {fixture.venue && (
        <p className="text-xs text-gray-500 mt-3 text-center">{fixture.venue}</p>
      )}

      {completed && fixture.events && fixture.events.length > 0 && (
        <div className="mt-4 pt-3 border-t border-brand-blue/10">
          <p className="text-xs font-semibold text-gray-500 mb-2">Scorers</p>
          <div className="flex flex-wrap gap-2">
            {fixture.events
              .filter((e) => e.event_type === 'goal')
              .map((e) => (
                <span key={e.id} className="text-xs bg-brand-light px-2 py-1 rounded-pill text-brand-navy">
                  {e.player_name ?? 'Player'}{e.minute != null ? ` ${e.minute}'` : ''}
                </span>
              ))}
          </div>
        </div>
      )}

      {availabilitySlot && <div className="mt-4 pt-3 border-t border-brand-blue/10">{availabilitySlot}</div>}
    </article>
  )
}
