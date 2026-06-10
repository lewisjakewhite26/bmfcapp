import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { SquadStatsView } from '../components/club/SquadStatsView'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { usePlayerStats } from '../hooks/useClubData'

export default function StatsPage() {
  const { stats, loading, error, reload } = usePlayerStats()

  return (
    <PageShell>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8 space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brand-navy">Squad stats</h1>
          <p className="text-sm text-gray-500 mt-1">Goals, assists, appearances & more</p>
        </div>
        {error && <DataErrorBanner message={error} onRetry={reload} />}
        <SquadStatsView stats={stats} loading={loading} />
      </div>
    </PageShell>
  )
}
