import type { Availability, CalendarItem } from '../../types'
import { FixtureCard } from './FixtureCard'
import { AvailabilityForm } from './AvailabilityForm'
import { formatMatchDate, formatMatchTime } from '../../lib/format'

interface CalendarListProps {
  items: CalendarItem[]
  availability: Availability[]
  onAvailabilityChange?: (
    target: { fixtureId?: string; trainingId?: string },
    status: Availability['status'],
    message?: string | null
  ) => void
  showAvailability?: boolean
  availabilityDisabled?: boolean
}

export function CalendarList({ items, availability, onAvailabilityChange, showAvailability, availabilityDisabled }: CalendarListProps) {
  if (items.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-gray-500">
        Nothing scheduled yet.
      </div>
    )
  }

  const getEntry = (fixtureId?: string, trainingId?: string) =>
    availability.find(
      (a) => (fixtureId && a.fixture_id === fixtureId) || (trainingId && a.training_id === trainingId)
    )

  return (
    <div className="space-y-4">
      {items.map((item) => {
        if (item.type === 'fixture') {
          const entry = getEntry(item.data.id)
          return (
            <FixtureCard
              key={`f-${item.data.id}`}
              fixture={item.data}
              availabilitySlot={
                showAvailability && onAvailabilityChange ? (
                  <AvailabilityForm
                    value={entry?.status ?? null}
                    message={entry?.message}
                    disabled={availabilityDisabled}
                    onSave={(status, message) =>
                      onAvailabilityChange({ fixtureId: item.data.id }, status, message)
                    }
                  />
                ) : undefined
              }
            />
          )
        }

        const training = item.data
        const entry = getEntry(undefined, training.id)
        return (
          <article key={`t-${training.id}`} className="glass-card p-4 sm:p-5 border-l-4 border-brand-gold">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold">Training</p>
            <p className="font-semibold text-brand-navy mt-1">
              {formatMatchDate(training.session_date)} · {formatMatchTime(training.session_date)}
            </p>
            {training.location && <p className="text-sm text-gray-500 mt-1">{training.location}</p>}
            {training.notes && <p className="text-sm text-gray-600 mt-2">{training.notes}</p>}
            {showAvailability && onAvailabilityChange && (
              <div className="mt-4 pt-3 border-t border-brand-blue/10">
                <AvailabilityForm
                  value={entry?.status ?? null}
                  message={entry?.message}
                  disabled={availabilityDisabled}
                  onSave={(status, message) =>
                    onAvailabilityChange({ trainingId: training.id }, status, message)
                  }
                />
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
