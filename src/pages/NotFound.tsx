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
        <div className="glass-card p-8 max-w-md w-full text-center space-y-5 border-t-2 border-brand-gold">
          <div className="space-y-1">
            <p className="font-display text-7xl text-brand-blue leading-none tracking-tight">404</p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">Page not found</p>
          </div>
          <h1 className="font-display text-2xl text-brand-navy">That link doesn&apos;t go anywhere</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Check the URL or head back to the app.
          </p>
          <p className="text-xs text-gray-400 font-mono break-all rounded-xl bg-brand-light/60 border border-brand-blue/10 px-3 py-2">
            {location.pathname}
          </p>
          <div className="flex flex-col gap-3 pt-1">
            <Link to={homeTo} className="btn-primary w-full text-center">
              {homeLabel}
            </Link>
            {!user && (
              <Link to="/login" className="btn-secondary w-full text-center">
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
