import type { Availability, CalendarItem } from '../../types'
import { CLUB_EVENT_TYPE_LABELS } from '../../lib/clubEventTypes'
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

        if (item.type === 'training') {
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
        }

        if (item.type === 'event') {
          const event = item.data
          return (
            <article key={`e-${event.id}`} className="glass-card p-4 sm:p-5 border-l-4 border-violet-500">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                {CLUB_EVENT_TYPE_LABELS[event.event_type]}
              </p>
              <p className="font-semibold text-brand-navy mt-1">{event.title}</p>
              <p className="text-sm text-gray-500 mt-1">
                {formatMatchDate(event.event_date)} · {formatMatchTime(event.event_date)}
              </p>
              {event.location && <p className="text-sm text-gray-500 mt-1">{event.location}</p>}
              {event.notes && <p className="text-sm text-gray-600 mt-2">{event.notes}</p>}
            </article>
          )
        }

        const fundraiser = item.data
        return (
          <article key={`fr-${fundraiser.id}`} className="glass-card p-4 sm:p-5 border-l-4 border-emerald-500">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Fundraiser</p>
            <p className="font-semibold text-brand-navy mt-1">{fundraiser.name}</p>
            <p className="text-sm text-gray-500 mt-1">{formatMatchDate(`${fundraiser.date}T12:00:00`)}</p>
            {fundraiser.notes && <p className="text-sm text-gray-600 mt-2">{fundraiser.notes}</p>}
          </article>
        )
      })}
    </div>
  )
}
