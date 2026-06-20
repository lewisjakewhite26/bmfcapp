import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/AuthProvider'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import InvitePage from './pages/Invite'
import JoinPage from './pages/Join'
import Dashboard from './pages/Dashboard'
import LeagueTablePage from './pages/LeagueTable'
import ResultsPage from './pages/Results'
import StatsPage from './pages/Stats'
import CalendarPage from './pages/Calendar'
import PlayerProfilePage from './pages/PlayerProfile'
import PendingApproval from './pages/PendingApproval'
import { PageBackground } from './components/ui/PageBackground'
import { MobileBottomNav } from './components/ui/MobileBottomNav'
import { isSupabaseConfigured } from './lib/supabase'
import ConfigRequired from './pages/ConfigRequired'
import NotFound from './pages/NotFound'

const Landing = lazy(() => import('./pages/Landing'))
const Admin = lazy(() => import('./pages/Admin'))
const AdminResults = lazy(() => import('./pages/AdminResults'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminSquad = lazy(() => import('./pages/AdminSquad'))
const AdminFixtures = lazy(() => import('./pages/AdminFixtures'))
const AdminTraining = lazy(() => import('./pages/AdminTraining'))
const AdminEvents = lazy(() => import('./pages/AdminEvents'))
const AdminAvailability = lazy(() => import('./pages/AdminAvailability'))
const AdminNotifications = lazy(() => import('./pages/AdminNotifications'))
const AdminLineup = lazy(() => import('./pages/AdminLineup'))
const AdminFundraisers = lazy(() => import('./pages/AdminFundraisers'))
const AdminFinance = lazy(() => import('./pages/AdminFinance'))
const AdminLive = lazy(() => import('./pages/AdminLive'))

const wantsSupabase = import.meta.env.VITE_CLUB_DATA_SOURCE === 'supabase'

function RouteFallback() {
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <PageBackground />
      <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <RouteFallback />
  }

  if (user?.is_approved) return <Navigate to="/dashboard" replace />
  if (user && !user.is_approved) return <Navigate to="/pending" replace />

  return <>{children}</>
}

function ProtectedRoute({
  children,
  adminOnly = false,
  requireAdmin = false,
  allowPending = false,
}: {
  children: React.ReactNode
  adminOnly?: boolean
  /** Admin-only routes (committee cannot access). */
  requireAdmin?: boolean
  allowPending?: boolean
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return <RouteFallback />
  }

  if (!user) return <Navigate to="/login" replace />

  if (!allowPending && !user.is_approved) {
    return <Navigate to="/pending" replace />
  }

  if (requireAdmin && !user.is_admin) {
    return <Navigate to="/admin" replace />
  }

  if (adminOnly && !user.is_admin && !user.is_committee) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/join/:token" element={<JoinPage />} />
      {/* Legacy World Cup predictor URLs — keep for old bookmarks */}
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/leaderboard" element={<Navigate to="/table" replace />} />
      <Route path="/history" element={<Navigate to="/results" replace />} />
      <Route path="/predictions" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin/ops" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/technical" element={<Navigate to="/admin" replace />} />
      <Route
        path="/pending"
        element={
          <ProtectedRoute allowPending>
            <PendingApproval />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/table"
        element={
          <ProtectedRoute>
            <LeagueTablePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stats"
        element={
          <ProtectedRoute>
            <StatsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/player/:playerId"
        element={
          <ProtectedRoute>
            <PlayerProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/results"
        element={
          <ProtectedRoute adminOnly>
            <AdminResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly requireAdmin>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/squad"
        element={
          <ProtectedRoute adminOnly>
            <AdminSquad />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/fixtures"
        element={
          <ProtectedRoute adminOnly>
            <AdminFixtures />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/training"
        element={
          <ProtectedRoute adminOnly>
            <AdminTraining />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events"
        element={
          <ProtectedRoute adminOnly>
            <AdminEvents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/availability"
        element={
          <ProtectedRoute adminOnly>
            <AdminAvailability />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute adminOnly>
            <AdminNotifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/lineup"
        element={
          <ProtectedRoute adminOnly>
            <AdminLineup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/live/:fixtureId"
        element={
          <ProtectedRoute adminOnly>
            <AdminLive />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/live"
        element={
          <ProtectedRoute adminOnly>
            <AdminLive />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/fundraisers"
        element={
          <ProtectedRoute adminOnly>
            <AdminFundraisers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/finance"
        element={
          <ProtectedRoute adminOnly>
            <AdminFinance />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  if (wantsSupabase && !isSupabaseConfigured) {
    return <ConfigRequired />
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <MobileBottomNav />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.92)',
              color: '#0D1B4B',
              border: '1px solid rgba(43, 95, 192, 0.15)',
              backdropFilter: 'blur(12px)',
              borderRadius: '50px',
              padding: '10px 20px',
              boxShadow: '0 8px 32px rgba(13, 27, 75, 0.08)',
            },
            success: { iconTheme: { primary: '#2B5FC0', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#DC2626', secondary: '#FFFFFF' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
