import { Link, useParams } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { PlayerProfileView } from '../components/club/PlayerProfileView'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { useAuth } from '../hooks/useAuth'
import { useCalendar } from '../hooks/useClubData'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { pageContainerClass } from '../lib/layout'
import { PlayerProfileSkeleton } from '../components/ui/Skeleton'

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>()
  const { user } = useAuth()
  const { profile, loading, notFound, error: profileError, reload: reloadProfile } = usePlayerProfile(playerId)
  const isOwnProfile = Boolean(user && playerId && user.id === playerId)

  const {
    calendarItems,
    availability,
    loading: calendarLoading,
    error: calendarError,
    reload: reloadCalendar,
    setAvailabilityFor,
    availabilitySaving,
  } = useCalendar(isOwnProfile ? playerId : undefined)

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass('max-w-6xl')}>
        <Link to="/stats" className="text-brand-blue text-sm font-medium">← Squad stats</Link>

        {profileError && (
          <DataErrorBanner message={profileError} onRetry={reloadProfile} />
        )}
        {isOwnProfile && calendarError && (
          <DataErrorBanner message={calendarError} onRetry={reloadCalendar} />
        )}

        {loading ? (
          <PlayerProfileSkeleton />
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
