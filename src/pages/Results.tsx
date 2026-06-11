import { useState } from 'react'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { FixtureCard } from '../components/club/FixtureCard'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { useFixtures } from '../hooks/useClubData'
import { pageContainerClass } from '../lib/layout'

export default function ResultsPage() {
  const { upcoming, completed, loading, error, reload } = useFixtures()
  const [tab, setTab] = useState<'upcoming' | 'results'>('upcoming')

  const list = tab === 'upcoming' ? upcoming : completed

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brand-navy">Fixtures & results</h1>
          <p className="text-sm text-gray-500 mt-1">Bishop Middleham FC</p>
        </div>

        {error && <DataErrorBanner message={error} onRetry={reload} />}

        <div className="flex gap-2 p-1 glass-card">
          {(['upcoming', 'results'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold transition-colors ${
                tab === t ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-white/60'
              }`}
            >
              {t === 'upcoming' ? 'Upcoming' : 'Results'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card h-32 animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="glass-card p-8 text-center text-gray-500">No {tab === 'upcoming' ? 'upcoming fixtures' : 'results'} yet.</div>
        ) : (
          <div className="space-y-4">
            {list.map((f) => (
              <FixtureCard key={f.id} fixture={f} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
