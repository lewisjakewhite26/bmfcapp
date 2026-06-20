import type { LeagueTableRow } from '../../types'
import { isClubTeam } from '../../lib/clubTeams'
import { LeagueTableSkeleton } from '../ui/Skeleton'

interface LeagueTableViewProps {
  rows: LeagueTableRow[]
  loading?: boolean
}

export function LeagueTableView({ rows, loading }: LeagueTableViewProps) {
  if (loading) {
    return <LeagueTableSkeleton />
  }

  if (rows.length === 0) {
    return (
      <div className="glass-card p-8 text-center space-y-3 border-t-2 border-brand-gold/40">
        <p className="font-display text-xl text-brand-navy">No league table yet</p>
        <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
          Table data comes from DDSFL. If it&apos;s mid-season and this looks wrong, ask admin to run a sync.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-blue/5 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-3 py-3 w-10">#</th>
              <th className="px-3 py-3 min-w-[140px]">Team</th>
              <th className="px-2 py-3 text-center w-8">P</th>
              <th className="px-2 py-3 text-center w-8">W</th>
              <th className="px-2 py-3 text-center w-8">D</th>
              <th className="px-2 py-3 text-center w-8">L</th>
              <th className="px-2 py-3 text-center w-10 hidden sm:table-cell">GF</th>
              <th className="px-2 py-3 text-center w-10 hidden sm:table-cell">GA</th>
              <th className="px-2 py-3 text-center w-10 hidden sm:table-cell">GD</th>
              <th className="px-3 py-3 text-center w-10 font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isUs = isClubTeam(row.team_name)
              return (
                <tr
                  key={row.id}
                  className={`border-t border-brand-blue/8 ${isUs ? 'bg-brand-blue/8 font-semibold' : 'hover:bg-white/50'}`}
                >
                  <td className="px-3 py-3 text-gray-500">{row.position}</td>
                  <td className="px-3 py-3 text-brand-navy">
                    {isUs && <span className="mr-1.5" aria-hidden>★</span>}
                    {row.team_name.replace(' FC', '').replace(' Fc', '')}
                  </td>
                  <td className="px-2 py-3 text-center">{row.played}</td>
                  <td className="px-2 py-3 text-center">{row.won}</td>
                  <td className="px-2 py-3 text-center">{row.drawn}</td>
                  <td className="px-2 py-3 text-center">{row.lost}</td>
                  <td className="px-2 py-3 text-center hidden sm:table-cell">{row.goals_for}</td>
                  <td className="px-2 py-3 text-center hidden sm:table-cell">{row.goals_against}</td>
                  <td className="px-2 py-3 text-center hidden sm:table-cell">{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</td>
                  <td className="px-3 py-3 text-center font-bold text-brand-blue">{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 px-4 py-3 border-t border-brand-blue/8">
        Source: DDSFL · Updated {rows[0] ? new Date(rows[0].last_scraped_at).toLocaleString('en-GB') : 'unknown'}
      </p>
    </div>
  )
}
