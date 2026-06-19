import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function Navbar() {
  const location = useLocation()
  let authUser = null
  let logout = () => {}

  try {
    const auth = useAuth()
    authUser = auth.user
    logout = auth.logout
  } catch {
    // Not in AuthProvider context
  }

  const isActive = (path: string) => location.pathname === path
  const isAdminActive = location.pathname.startsWith('/admin')

  return (
    <nav className="sticky top-0 z-50 glass-nav pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        <Link to={authUser?.is_approved ? '/dashboard' : '/'} className="flex items-center gap-2.5 shrink-0 touch-manipulation">
          <img
            src="/logo.png"
            alt="BMFC"
            className="h-10 w-10 sm:h-11 sm:w-11 object-contain drop-shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg' }}
          />
          <span className="font-display text-sm sm:text-lg text-brand-navy hidden sm:block tracking-tight">
            BMFC Club Hub
          </span>
        </Link>

        {authUser?.is_approved ? (
          <>
            <div className="hidden md:flex items-center gap-5">
              <Link to="/table" className={`nav-link ${isActive('/table') ? 'nav-link-active' : ''}`}>Table</Link>
              <Link to="/results" className={`nav-link ${isActive('/results') ? 'nav-link-active' : ''}`}>Results</Link>
              <Link to="/stats" className={`nav-link ${isActive('/stats') ? 'nav-link-active' : ''}`}>Stats</Link>
              <Link to="/calendar" className={`nav-link ${isActive('/calendar') ? 'nav-link-active' : ''}`}>Calendar</Link>
              <Link to={`/player/${authUser.id}`} className="text-sm text-gray-600 hover:text-brand-blue transition-colors">
                {authUser.display_name}
              </Link>
              {(authUser.is_admin || authUser.is_committee) && (
                <Link to="/admin" className={`nav-link ${isAdminActive ? 'nav-link-active' : ''}`}>Admin</Link>
              )}
              <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition-colors min-h-[44px] px-2">
                Logout
              </button>
            </div>
            <div className="md:hidden text-sm font-medium text-brand-navy truncate max-w-[120px]">
              {authUser.display_name.split(' ')[0]}
            </div>
          </>
        ) : authUser && !authUser.is_approved ? (
          <button onClick={logout} className="text-sm text-gray-500 min-h-[44px] px-2">Logout</button>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="btn-primary text-sm py-2.5 px-5 min-h-[44px]">Log in</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
