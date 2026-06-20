import { Link } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { FixtureCard } from '../components/club/FixtureCard'
import { AvailabilityForm } from '../components/club/AvailabilityForm'
import { useAuth } from '../hooks/useAuth'
import { useCalendar, useDashboard } from '../hooks/useClubData'
import { getTimeGreeting } from '../lib/greeting'
import { formatMatchDate, formatMatchTime, formatScore } from '../lib/format'
import { CLUB_NAME, LEAGUE_NAME } from '../lib/mockData'
import { PushRequiresInstallPrompt } from '../components/ui/PushRequiresInstallPrompt'
import { PwaInstallNotificationPrompt } from '../components/ui/PwaInstallNotificationPrompt'
import { PwaAddToHomePrompt } from '../components/ui/PwaAddToHomePrompt'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { AvailabilityNudge } from '../components/club/AvailabilityNudge'
import { pageContainerClass } from '../lib/layout'
import { DashboardSkeleton } from '../components/ui/Skeleton'

export default function Dashboard() {
  const { user } = useAuth()
  const { standalone } = usePwaInstall()
  const { summary, loading, error: dashboardError, reload: reloadDashboard } = useDashboard()
  const {
    availability,
    setAvailabilityFor,
    error: calendarError,
    reload: reloadCalendar,
    availabilitySaving,
  } = useCalendar(user?.id)

  const nextAvailEntry = summary?.nextFixture
    ? availability.find((a) => a.fixture_id === summary.nextFixture?.id)
    : undefined

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        {user?.is_approved && <PwaAddToHomePrompt />}

        {standalone ? (
          <PwaInstallNotificationPrompt playerId={user?.id} />
        ) : (
          <PushRequiresInstallPrompt playerId={user?.id} />
        )}

        {dashboardError && (
          <DataErrorBanner message={dashboardError} onRetry={reloadDashboard} />
        )}
        {calendarError && (
          <DataErrorBanner message={calendarError} onRetry={reloadCalendar} />
        )}

        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brand-navy">
            {getTimeGreeting()}, {user?.display_name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{CLUB_NAME} · {LEAGUE_NAME}</p>
        </div>

        {!loading && summary && (
          <AvailabilityNudge summary={summary} availability={availability} />
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-card p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">League position</p>
              <p className="font-display text-3xl font-bold text-brand-blue mt-1">
                {summary?.leaguePosition ?? '-'}
              </p>
              <p className="text-sm text-gray-500">{summary?.leaguePoints ?? 0} pts</p>
            </div>
            <div className="glass-card p-4 text-center sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">Next match</p>
              {summary?.nextFixture ? (
                <>
                  <p className="font-semibold text-brand-navy mt-1">
                    {summary.nextFixture.home_away === 'home' ? 'vs' : '@'} {summary.nextFixture.opponent.replace(' FC', '')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatMatchDate(summary.nextFixture.match_date)} · {formatMatchTime(summary.nextFixture.match_date, summary.nextFixture.kickoff_time)}
                  </p>
                </>
              ) : (
                <p className="text-gray-500 mt-2">No upcoming fixtures</p>
              )}
            </div>
          </div>
        )}

        {summary?.nextFixture && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-brand-navy">Mark availability</h2>
              <Link to="/calendar" className="text-sm text-brand-blue font-medium">Calendar →</Link>
            </div>
            <FixtureCard
              fixture={summary.nextFixture}
              availabilitySlot={
                <AvailabilityForm
                  value={nextAvailEntry?.status ?? null}
                  message={nextAvailEntry?.message}
                  disabled={availabilitySaving}
                  onSave={(status, message) =>
                    setAvailabilityFor({ fixtureId: summary.nextFixture!.id }, status, message)
                  }
                />
              }
            />
          </section>
        )}

        {summary?.lastResult?.result && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-brand-navy">Last result</h2>
              <Link to="/results" className="text-sm text-brand-blue font-medium">All results →</Link>
            </div>
            <div className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{formatMatchDate(summary.lastResult.match_date)}</p>
                <p className="font-semibold text-brand-navy">
                  {summary.lastResult.home_away === 'home' ? 'vs' : '@'} {summary.lastResult.opponent.replace(' FC', '')}
                </p>
              </div>
              <p className="font-display text-2xl font-bold text-brand-navy">
                {formatScore(summary.lastResult.result.goals_for, summary.lastResult.result.goals_against)}
              </p>
            </div>
          </section>
        )}

        {summary?.upcomingTraining && (
          <section className="glass-card p-4 border-l-4 border-brand-gold">
            <p className="text-xs font-semibold uppercase text-brand-gold">Next training</p>
            <p className="font-semibold text-brand-navy mt-1">
              {formatMatchDate(summary.upcomingTraining.session_date)} · {formatMatchTime(summary.upcomingTraining.session_date)}
            </p>
            {summary.upcomingTraining.location && (
              <p className="text-sm text-gray-500 mt-1">{summary.upcomingTraining.location}</p>
            )}
          </section>
        )}
      </div>
    </PageShell>
  )
}
