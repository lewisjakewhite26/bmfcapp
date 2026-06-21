import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { NotificationToggle } from './NotificationToggle'
import { ChangePasscodeForm } from '../auth/ChangePasscodeForm'

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}

const tabs = [
  {
    path: '/dashboard',
    label: 'Home',
    match: (p: string) => p === '/dashboard',
    icon: (
      <NavIcon>
        <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
      </NavIcon>
    ),
  },
  {
    path: '/results',
    label: 'Matches',
    match: (p: string) => p === '/results',
    icon: (
      <NavIcon>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </NavIcon>
    ),
  },
  {
    path: '/table',
    label: 'Table',
    match: (p: string) => p === '/table',
    icon: (
      <NavIcon>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </NavIcon>
    ),
  },
  {
    path: '/calendar',
    label: 'Calendar',
    match: (p: string) => p === '/calendar',
    icon: (
      <NavIcon>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </NavIcon>
    ),
  },
  {
    path: '/stats',
    label: 'Stats',
    match: (p: string) => p === '/stats',
    icon: (
      <NavIcon>
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </NavIcon>
    ),
  },
]

const MOBILE_BOTTOM_NAV_HEIGHT_VAR = '--mobile-bottom-nav-height'
const MOBILE_NAV_DESKTOP_MQL = '(min-width: 768px)'

function syncMobileBottomNavHeight(nav: HTMLElement | null) {
  if (!nav || window.matchMedia(MOBILE_NAV_DESKTOP_MQL).matches) {
    document.documentElement.style.setProperty(MOBILE_BOTTOM_NAV_HEIGHT_VAR, '0px')
    return
  }
  document.documentElement.style.setProperty(
    MOBILE_BOTTOM_NAV_HEIGHT_VAR,
    `${nav.getBoundingClientRect().height}px`,
  )
}

export function MobileBottomNav() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [passcodeOpen, setPasscodeOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setMenuOpen(false)
    setPasscodeOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!user?.is_approved) {
      document.documentElement.style.setProperty(MOBILE_BOTTOM_NAV_HEIGHT_VAR, '0px')
      return
    }

    const nav = navRef.current
    if (!nav) return

    const update = () => syncMobileBottomNavHeight(nav)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(nav)
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      document.documentElement.style.setProperty(MOBILE_BOTTOM_NAV_HEIGHT_VAR, '0px')
    }
  }, [user?.is_approved])

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [menuOpen])

  if (!user?.is_approved) return null

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[100] bg-brand-navy/45 backdrop-blur-sm md:hidden"
          aria-label="Close account menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div
        className={`fixed inset-x-0 z-[101] md:hidden px-3 transition-all duration-200 ease-out ${
          menuOpen
            ? 'bottom-[var(--mobile-bottom-nav-height)] opacity-100 pointer-events-auto'
            : 'bottom-[var(--mobile-bottom-nav-height)] opacity-0 pointer-events-none translate-y-2'
        }`}
        role="dialog"
        aria-modal={menuOpen}
        aria-hidden={!menuOpen}
      >
        <div className="glass-card p-4 space-y-1 shadow-glass-hover border border-brand-blue/15">
          <div className="px-2 pb-3 mb-2 border-b border-brand-blue/10">
            <p className="font-semibold text-brand-navy">{user.display_name}</p>
            <p className="text-xs text-gray-500">@{user.username}</p>
          </div>
          <Link
            to={`/player/${user.id}`}
            onClick={() => setMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 rounded-xl text-brand-navy font-medium"
          >
            My profile
          </Link>
          {passcodeOpen ? (
            <ChangePasscodeForm onClose={() => setPasscodeOpen(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setPasscodeOpen(true)}
              className="w-full flex items-center min-h-[48px] px-3 rounded-xl text-brand-navy font-medium text-left"
            >
              Change passcode
            </button>
          )}
          <NotificationToggle playerId={user.id} />
          {(user.is_admin || user.is_committee) && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center min-h-[48px] px-3 rounded-xl text-brand-navy font-medium">
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => { setMenuOpen(false); logout() }}
            className="w-full flex items-center min-h-[48px] px-3 rounded-xl text-red-600 font-medium active:bg-red-50"
          >
            Log out
          </button>
        </div>
      </div>

      <nav
        ref={navRef}
        className="fixed inset-x-0 bottom-0 z-[90] md:hidden glass-nav border-t border-brand-blue/12 pb-[env(safe-area-inset-bottom)]"
        aria-label="Main navigation"
      >
        <div className="flex items-stretch justify-around px-1">
          {tabs.map((tab) => {
            const active = tab.match(location.pathname)
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 touch-manipulation transition-colors ${
                  active ? 'text-brand-blue' : 'text-gray-500 active:text-brand-blue'
                }`}
              >
                {tab.icon}
                <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-brand-blue' : ''}`}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 touch-manipulation transition-colors ${
              menuOpen ? 'text-brand-blue' : 'text-gray-500 active:text-brand-blue'
            }`}
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <NavIcon>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </NavIcon>
            <span className={`text-[10px] font-semibold tracking-wide ${menuOpen ? 'text-brand-blue' : ''}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
