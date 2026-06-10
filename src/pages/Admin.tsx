import { Link } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { useAuth } from '../hooks/useAuth'

const LINKS = [
  { to: '/admin/users', title: 'Squad members', desc: 'Create accounts, invite links & passcodes', adminOnly: true },
  { to: '/admin/squad', title: 'Squad list', desc: 'Positions for stats and result entry' },
  { to: '/admin/fixtures', title: 'Add match', desc: 'Friendlies, cups & pre-season games' },
  { to: '/admin/results', title: 'Enter results', desc: 'Scores, goalscorers, MOTM & cards' },
  { to: '/admin/training', title: 'Training sessions', desc: 'Add, edit & remove training on the calendar' },
  { to: '/admin/availability', title: 'Availability overview', desc: 'See who\'s in for upcoming events' },
  { to: '/admin/notifications', title: 'Send notification', desc: 'Push reminder to subscribed players' },
]

export default function Admin() {
  const { user } = useAuth()
  const visibleLinks = LINKS.filter((link) => !link.adminOnly || user?.is_admin)

  return (
    <PageShell>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8 space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8">
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
