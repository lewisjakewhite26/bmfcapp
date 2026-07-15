import { Link, Navigate } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { useAuth } from '../hooks/useAuth'
import { isFinesOnlyAdmin } from '../lib/roles'
import { pageContainerClass } from '../lib/layout'

const LINKS = [
  { to: '/admin/live', title: 'Live matchday', desc: 'Log goals, cards & subs during the game' },
  { to: '/admin/results', title: 'Enter results', desc: 'Scores, goalscorers, MOTM & cards' },
  { to: '/admin/lineup', title: 'Pick a lineup', desc: 'Upcoming XI or backfill past team sheets' },
  { to: '/admin/availability', title: 'Availability overview', desc: 'See who\'s in for upcoming events' },
  { to: '/admin/training', title: 'Training sessions', desc: 'Add, edit & remove training on the calendar' },
  { to: '/admin/notifications', title: 'Send notification', desc: 'Push to the whole squad or selected players' },
  { to: '/admin/fixtures', title: 'Matches & friendlies', desc: 'Add, edit & remove pre-season and cup games' },
  { to: '/admin/squad', title: 'Squad list', desc: 'Positions for stats and result entry' },
  { to: '/admin/events', title: 'Other events', desc: 'Socials, AGM, committee meetings & more' },
  { to: '/admin/fundraisers', title: 'Fundraisers', desc: 'Track squad participation in fundraising events' },
  { to: '/admin/fines', title: 'Fines', desc: 'Log squad fines and track payments', finesOk: true },
  { to: '/admin/finance', title: 'Finance', desc: 'Sponsorships, expenses and club balance' },
  { to: '/admin/users', title: 'Squad members', desc: 'Add players, invite links & passcodes', adminOnly: true },
]

export default function Admin() {
  const { user } = useAuth()

  if (isFinesOnlyAdmin(user)) {
    return <Navigate to="/admin/fines" replace />
  }

  const visibleLinks = LINKS.filter((link) => {
    if (link.adminOnly && !user?.is_admin) return false
    return true
  })

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brand-navy">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.is_admin ? 'Committee & admin tools' : 'Committee tools'}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {visibleLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="glass-card p-5 hover:bg-white/80 transition-colors block"
            >
              <h2 className="font-semibold text-brand-navy">{link.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
