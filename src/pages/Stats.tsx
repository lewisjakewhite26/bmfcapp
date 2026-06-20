import { Navbar } from '../components/ui/Navbar'
import { useState } from 'react'
import { PageShell } from '../components/ui/PageBackground'
import { SquadStatsView } from '../components/club/SquadStatsView'
import { StatsScopeToggle } from '../components/club/StatsScopeToggle'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { usePlayerStats } from '../hooks/useClubData'
import { defaultStatsScope, type StatsScope } from '../lib/seasonScope'
import { pageContainerClass } from '../lib/layout'

export default function StatsPage() {
  const [scope, setScope] = useState<StatsScope>(() => defaultStatsScope())
  const { stats, loading, error, reload } = usePlayerStats(scope)

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brand-navy">Squad stats</h1>
          <p className="text-sm text-gray-500 mt-1">Goals, assists, appearances & more</p>
        </div>
        {error && <DataErrorBanner message={error} onRetry={reload} />}
        <StatsScopeToggle value={scope} onChange={setScope} />
        <SquadStatsView stats={stats} loading={loading} />
      </div>
    </PageShell>
  )
}
