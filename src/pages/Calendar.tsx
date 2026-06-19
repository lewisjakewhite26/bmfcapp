import { useState } from 'react'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { CalendarList } from '../components/club/CalendarList'
import { CalendarMonthView } from '../components/club/CalendarMonthView'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { useAuth } from '../hooks/useAuth'
import { useCalendar } from '../hooks/useClubData'
import { pageContainerClass } from '../lib/layout'
import { CalendarSkeleton } from '../components/ui/Skeleton'

type ViewMode = 'list' | 'calendar'

export default function CalendarPage() {
  const { user } = useAuth()
  const { calendarItems, availability, loading, error, reload, setAvailabilityFor, availabilitySaving } = useCalendar(user?.id)
  const [view, setView] = useState<ViewMode>('list')

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brand-navy">Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Matches, training, events & availability</p>
        </div>

        {error && <DataErrorBanner message={error} onRetry={reload} />}

        <div className="flex gap-2 p-1 glass-card">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold transition-colors ${
              view === 'list' ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold transition-colors ${
              view === 'calendar' ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            Calendar
          </button>
        </div>

        {loading ? (
          <CalendarSkeleton mode={view} />
        ) : view === 'list' ? (
          <CalendarList
            items={calendarItems}
            availability={availability}
            showAvailability
            availabilityDisabled={availabilitySaving}
            onAvailabilityChange={setAvailabilityFor}
          />
        ) : (
          <CalendarMonthView
            items={calendarItems}
            availability={availability}
            availabilityDisabled={availabilitySaving}
            onAvailabilityChange={setAvailabilityFor}
          />
        )}
      </div>
    </PageShell>
  )
}
