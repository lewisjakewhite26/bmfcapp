import { Link, useLocation } from 'react-router-dom'
import { PageShell } from '../components/ui/PageBackground'
import { useAuth } from '../hooks/useAuth'

export default function NotFound() {
  const location = useLocation()
  const { user } = useAuth()

  const homeTo = user?.is_approved ? '/dashboard' : '/'
  const homeLabel = user?.is_approved ? 'Back to dashboard' : 'Back to home'

  return (
    <PageShell>
      <div className="min-h-screen flex items-center justify-center px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-8">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
          <p className="font-display text-6xl text-brand-blue leading-none">404</p>
          <h1 className="font-display text-2xl text-brand-navy">Page not found</h1>
          <p className="text-gray-600 text-sm">
            That link doesn&apos;t go anywhere. Check the URL or head back to the app.
          </p>
          {location.pathname !== '/' && (
            <p className="text-xs text-gray-400 font-mono break-all">{location.pathname}</p>
          )}
          <Link to={homeTo} className="btn-primary w-full inline-block text-center">
            {homeLabel}
          </Link>
        </div>
      </div>
    </PageShell>
  )
}
