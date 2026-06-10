import { Link, useParams } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { PlayerProfileView } from '../components/club/PlayerProfileView'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { useAuth } from '../hooks/useAuth'
import { useCalendar } from '../hooks/useClubData'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import type { CalendarItem } from '../types'
import { useMemo } from 'react'

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>()
  const { user } = useAuth()
  const { profile, loading, notFound, error: profileError, reload: reloadProfile } = usePlayerProfile(playerId)
  const isOwnProfile = Boolean(user && playerId && user.id === playerId)

  const {
    items,
    availability,
    loading: calendarLoading,
    error: calendarError,
    reload: reloadCalendar,
    setAvailabilityFor,
    availabilitySaving,
  } = useCalendar(isOwnProfile ? playerId : undefined)

  const calendarItems: CalendarItem[] = useMemo(
    () =>
      [
        ...items.fixtures
          .filter((f) => f.status === 'scheduled')
          .map((data) => ({ type: 'fixture' as const, data })),
        ...items.training.map((data) => ({ type: 'training' as const, data })),
      ].sort((a, b) => {
        const dateA = a.type === 'fixture' ? a.data.match_date : a.data.session_date
        const dateB = b.type === 'fixture' ? b.data.match_date : b.data.session_date
        return new Date(dateA).getTime() - new Date(dateB).getTime()
      }),
    [items]
  )

  return (
    <PageShell>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-5 sm:py-8 space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8">
        <Link to="/stats" className="text-brand-blue text-sm font-medium">← Squad stats</Link>

        {profileError && (
          <DataErrorBanner message={profileError} onRetry={reloadProfile} />
        )}
        {isOwnProfile && calendarError && (
          <DataErrorBanner message={calendarError} onRetry={reloadCalendar} />
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="glass-card h-48 animate-pulse" />
            <div className="glass-card h-32 animate-pulse" />
          </div>
        ) : notFound || !profile ? (
          <div className="glass-card p-8 text-center text-gray-500">Player not found.</div>
        ) : (
          <PlayerProfileView
            profile={profile}
            isOwnProfile={isOwnProfile}
            calendarItems={isOwnProfile ? calendarItems : undefined}
            availability={isOwnProfile ? availability : undefined}
            onAvailabilityChange={isOwnProfile ? setAvailabilityFor : undefined}
            calendarLoading={isOwnProfile ? calendarLoading : false}
            availabilitySaving={isOwnProfile ? availabilitySaving : false}
          />
        )}
      </div>
    </PageShell>
  )
}
