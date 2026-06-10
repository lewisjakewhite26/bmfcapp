import type { LeagueTableRow } from '../../types'
import { isClubTeam } from '../../lib/clubTeams'

interface LeagueTableViewProps {
  rows: LeagueTableRow[]
  loading?: boolean
}

export function LeagueTableView({ rows, loading }: LeagueTableViewProps) {
  if (loading) {
    return (
      <div className="glass-card overflow-hidden animate-pulse">
        <div className="h-10 bg-brand-blue/5" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-12 border-t border-brand-blue/5 bg-white/40" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-gray-500 space-y-1">
        <p>No table data yet.</p>
        <p className="text-sm">Run a DDSFL sync or check back after the league publishes standings.</p>
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
        Source: DDSFL · Updated {rows[0] ? new Date(rows[0].last_scraped_at).toLocaleString('en-GB') : '—'}
      </p>
    </div>
  )
}
