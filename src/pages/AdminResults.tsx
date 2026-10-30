import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useSearchParams } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { ResultEntryForm } from '../components/admin/ResultEntryForm'
import {
  fetchCleanSheetAudit,
  fetchSquad,
  fetchUpcomingFixtures,
  fetchCompletedFixtures,
  fetchPostponedFixtures,
  setFixturePostponed,
} from '../lib/clubApi'
import { pageContainerClass } from '../lib/layout'
import type { CleanSheetAuditRow } from '../lib/cleanSheet'
import type { FixtureWithResult, SquadMember } from '../types'

export default function AdminResults() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<'pending' | 'completed' | 'postponed'>(() => {
    const t = searchParams.get('tab')
    return t === 'completed' || t === 'postponed' ? t : 'pending'
  })
  const [postponed, setPostponed] = useState<FixtureWithResult[]>([])
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [upcoming, setUpcoming] = useState<FixtureWithResult[]>([])
  const [completed, setCompleted] = useState<FixtureWithResult[]>([])
  const [squad, setSquad] = useState<SquadMember[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('fixture'))
  const [loading, setLoading] = useState(true)
  const [cleanSheetAudit, setCleanSheetAudit] = useState<CleanSheetAuditRow[]>([])

  const reload = async () => {
    setLoading(true)
    try {
      const [u, c, p, s, audit] = await Promise.all([
        fetchUpcomingFixtures(),
        fetchCompletedFixtures(),
        fetchPostponedFixtures(),
        fetchSquad(),
        fetchCleanSheetAudit(),
      ])
      setUpcoming(u)
      setCompleted(c)
      setPostponed(p)
      setSquad(s)
      setCleanSheetAudit(audit)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  useEffect(() => {
    const fixture = searchParams.get('fixture')
    const tabParam = searchParams.get('tab')
    if (fixture) setSelectedId(fixture)
    if (tabParam === 'completed' || tabParam === 'pending' || tabParam === 'postponed') setTab(tabParam)
  }, [searchParams])

  const list = tab === 'pending' ? upcoming : tab === 'completed' ? completed : postponed

  const restore = async (fixtureId: string) => {
    setRestoringId(fixtureId)
    try {
      await setFixturePostponed(fixtureId, false)
      toast.success('Back on the calendar')
      await reload()
    } catch {
      toast.error("Couldn't update fixture")
    } finally {
      setRestoringId(null)
    }
  }
  const selected = list.find((f) => f.id === selectedId) ?? list[0]
  const missingCleanSheetGoalkeepers = cleanSheetAudit.filter((row) => row.missingGoalkeeperData)

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        </div>
        <h1 className="font-display text-2xl text-brand-navy">Enter results</h1>

        {missingCleanSheetGoalkeepers.length > 0 && (
          <div className="glass-card border border-amber-300 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-900">
              {missingCleanSheetGoalkeepers.length} shutout
              {missingCleanSheetGoalkeepers.length === 1 ? '' : 's'} missing goalkeeper data
            </p>
            <p className="text-xs text-amber-800">
              Clean sheets are not counted until a live log, saved lineup, or manual goalkeeper is set.
            </p>
            <ul className="text-sm text-amber-900 space-y-1">
              {missingCleanSheetGoalkeepers.map((row) => (
                <li key={row.fixtureId}>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('completed')
                      setSelectedId(row.fixtureId)
                    }}
                    className="text-left underline font-medium"
                  >
                    {row.opponent} · {new Date(row.matchDate).toLocaleDateString('en-GB')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 p-1 glass-card">
          {(['pending', 'completed', 'postponed'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setSelectedId(null) }}
              className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold ${tab === t ? 'bg-brand-blue text-white' : 'text-gray-600'}`}
            >
              {t === 'pending' ? 'Needs result' : t === 'completed' ? 'Edit completed' : 'Postponed'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass-card h-40 animate-pulse" />
        ) : list.length === 0 ? (
          <div className="glass-card p-8 text-center text-gray-500">
            {tab === 'postponed' ? 'No postponed games.' : 'No fixtures in this list.'}
          </div>
        ) : tab === 'postponed' ? (
          <div className="space-y-3">
            {postponed.map((f) => (
              <div key={f.id} className="glass-card border-l-4 border-amber-400 p-4 space-y-3">
                <div>
                  <p className="font-semibold text-brand-navy">{f.opponent}</p>
                  <p className="text-sm text-gray-500">
                    Was {new Date(f.match_date).toLocaleDateString('en-GB')}
                    {f.postponed_reason ? ` · ${f.postponed_reason}` : ''}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Once it's rearranged, update the date{f.ddsfl_fixture_id ? ' (it comes through from DDSFL on the next sync)' : ' in Admin → Fixtures'}, then put it back on the calendar.
                </p>
                <button
                  type="button"
                  onClick={() => restore(f.id)}
                  disabled={restoringId === f.id}
                  className="btn-primary w-full sm:w-auto"
                >
                  {restoringId === f.id ? 'Saving...' : 'Put back on calendar'}
                </button>
              </div>
            ))}
          </div>
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
