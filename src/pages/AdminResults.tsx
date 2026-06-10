import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { ResultEntryForm } from '../components/admin/ResultEntryForm'
import { fetchSquad, fetchUpcomingFixtures, fetchCompletedFixtures } from '../lib/clubApi'
import type { FixtureWithResult, SquadMember } from '../types'

export default function AdminResults() {
  const [tab, setTab] = useState<'pending' | 'completed'>('pending')
  const [upcoming, setUpcoming] = useState<FixtureWithResult[]>([])
  const [completed, setCompleted] = useState<FixtureWithResult[]>([])
  const [squad, setSquad] = useState<SquadMember[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    try {
      const [u, c, s] = await Promise.all([fetchUpcomingFixtures(), fetchCompletedFixtures(), fetchSquad()])
      setUpcoming(u)
      setCompleted(c)
      setSquad(s)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  const list = tab === 'pending' ? upcoming : completed
  const selected = list.find((f) => f.id === selectedId) ?? list[0]

  return (
    <PageShell>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8 space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        </div>
        <h1 className="font-display text-2xl text-brand-navy">Enter results</h1>

        <div className="flex gap-2 p-1 glass-card">
          {(['pending', 'completed'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setSelectedId(null) }}
              className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold ${tab === t ? 'bg-brand-blue text-white' : 'text-gray-600'}`}
            >
              {t === 'pending' ? 'Needs result' : 'Edit completed'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass-card h-40 animate-pulse" />
        ) : list.length === 0 ? (
          <div className="glass-card p-8 text-center text-gray-500">No fixtures in this list.</div>
        ) : (
          <div className="space-y-4">
            <select
              value={selected?.id ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input-field w-full"
            >
              {list.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.opponent} · {new Date(f.match_date).toLocaleDateString('en-GB')}
                </option>
              ))}
            </select>
            {selected && (
              <ResultEntryForm fixture={selected} squad={squad} onSaved={reload} />
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}
