import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { LeagueTableView } from '../components/club/LeagueTableView'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { useLeagueTable } from '../hooks/useClubData'
import { CURRENT_SEASON, LEAGUE_NAME } from '../lib/mockData'
import { pageContainerClass } from '../lib/layout'

export default function LeagueTablePage() {
  const { rows, loading, error, reload } = useLeagueTable()

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brand-navy">League table</h1>
          <p className="text-sm text-gray-500 mt-1">{LEAGUE_NAME} · {CURRENT_SEASON}</p>
        </div>
        {error && <DataErrorBanner message={error} onRetry={reload} />}
        <LeagueTableView rows={rows} loading={loading} />
      </div>
    </PageShell>
  )
}
