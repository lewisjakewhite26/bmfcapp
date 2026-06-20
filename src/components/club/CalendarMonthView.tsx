import { useMemo, useState } from 'react'
import type { Availability, CalendarItem } from '../../types'
import {
  addMonths,
  buildMonthGrid,
  formatMonthYear,
  isSameDay,
  itemsOnDay,
  startOfMonth,
} from '../../lib/calendar'
import { formatMatchDate, formatMatchTime, formatScore, fixtureResultBorderClass, fixtureResultDotClass } from '../../lib/format'
import { CLUB_EVENT_TYPE_LABELS } from '../../lib/clubEventTypes'
import { isUpcomingScheduledFixture } from '../../lib/fixtureFilters'
import { AvailabilityForm } from './AvailabilityForm'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface CalendarMonthViewProps {
  items: CalendarItem[]
  availability: Availability[]
  onAvailabilityChange?: (
    target: { fixtureId?: string; trainingId?: string },
    status: Availability['status'],
    message?: string | null
  ) => void
  availabilityDisabled?: boolean
}

export function CalendarMonthView({ items, availability, onAvailabilityChange, availabilityDisabled }: CalendarMonthViewProps) {
  const today = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(() => startOfMonth(today))
  const [selectedDay, setSelectedDay] = useState<Date | null>(today)

  const weeks = useMemo(() => buildMonthGrid(month), [month])
  const selectedItems = selectedDay ? itemsOnDay(items, selectedDay) : []

  const getEntry = (fixtureId?: string, trainingId?: string) =>
    availability.find(
      (a) => (fixtureId && a.fixture_id === fixtureId) || (trainingId && a.training_id === trainingId)
    )

  const availColor = (fixtureId?: string, trainingId?: string) => {
    const status = getEntry(fixtureId, trainingId)?.status
    if (status === 'yes') return 'bg-emerald-500'
    if (status === 'maybe') return 'bg-amber-400'
    if (status === 'no') return 'bg-red-500'
    return null
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="min-h-[44px] min-w-[44px] rounded-full text-brand-blue font-semibold hover:bg-brand-blue/5"
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="font-display text-lg text-brand-navy">{formatMonthYear(month)}</h2>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="min-h-[44px] min-w-[44px] rounded-full text-brand-blue font-semibold hover:bg-brand-blue/5"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day, di) => {
                if (!day) {
                  return <div key={di} className="aspect-square" />
                }

                const dayItems = itemsOnDay(items, day)
                const isToday = isSameDay(day, today)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                const fixtureItems = dayItems.filter((i) => i.type === 'fixture')
                const hasUpcomingMatch = fixtureItems.some((i) => isUpcomingScheduledFixture(i.data))
                const hasWin = fixtureItems.some(
                  (i) => i.data.status === 'completed' && i.data.result && i.data.result.goals_for > i.data.result.goals_against,
                )
                const hasDraw = fixtureItems.some(
                  (i) => i.data.status === 'completed' && i.data.result && i.data.result.goals_for === i.data.result.goals_against,
                )
                const hasLoss = fixtureItems.some(
                  (i) => i.data.status === 'completed' && i.data.result && i.data.result.goals_for < i.data.result.goals_against,
                )
                const hasTraining = dayItems.some((i) => i.type === 'training')
                const hasEvent = dayItems.some((i) => i.type === 'event')
                const hasFundraiser = dayItems.some((i) => i.type === 'fundraiser')

                return (
                  <button
                    key={di}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 touch-manipulation transition-colors relative ${
                      isSelected
                        ? 'bg-brand-blue text-white shadow-sm'
                        : isToday
                          ? 'bg-brand-blue/10 text-brand-navy ring-1 ring-brand-blue/30'
                          : dayItems.length > 0
                            ? 'bg-white/80 text-brand-navy hover:bg-white'
                            : 'text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : ''}`}>
                      {day.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap justify-center max-w-[2rem]">
                        {hasUpcomingMatch && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-blue'}`}
                          />
                        )}
                        {hasWin && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-teal-200' : 'bg-teal-600'}`}
                          />
                        )}
                        {hasDraw && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-500'}`}
                          />
                        )}
                        {hasLoss && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-red-200' : 'bg-red-500'}`}
                          />
                        )}
                        {hasTraining && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-brand-gold' : 'bg-brand-gold'}`}
                          />
                        )}
                        {hasEvent && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-violet-200' : 'bg-violet-500'}`}
                          />
                        )}
                        {hasFundraiser && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-200' : 'bg-emerald-500'}`}
                          />
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {selectedDay && (
        <div className="glass-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">
            {selectedDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>

          {selectedItems.length === 0 ? (
            <p className="text-sm text-gray-500">No events on this day.</p>
          ) : (
            <div className="space-y-4">
              {selectedItems.map((item) => {
                if (item.type === 'fixture') {
                  const f = item.data
                  const entry = getEntry(f.id)
                  const dot = availColor(f.id)
                  const completed = f.status === 'completed' && f.result
                  return (
                    <article key={f.id} className={`border-t border-brand-blue/10 pt-4 first:border-t-0 first:pt-0 border-l-4 pl-3 ${fixtureResultBorderClass(f)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase text-brand-blue">Match</p>
                          <p className="font-semibold text-brand-navy mt-0.5">
                            {f.home_away === 'home' ? 'vs' : '@'} {f.opponent.replace(' FC', '')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatMatchTime(f.match_date, f.kickoff_time)}
                            {f.venue ? ` · ${f.venue}` : ''}
                          </p>
                          {completed && (
                            <p className="text-sm font-semibold text-brand-navy mt-1">
                              {formatScore(f.result!.goals_for, f.result!.goals_against)}
                            </p>
                          )}
                        </div>
                        {dot ? (
                          <span className={`w-3 h-3 rounded-full shrink-0 mt-1 ${dot}`} title={entry?.status} />
                        ) : completed ? (
                          <span className={`w-3 h-3 rounded-full shrink-0 mt-1 ${fixtureResultDotClass(f)}`} />
                        ) : null}
                      </div>
                      {!completed && onAvailabilityChange && (
                        <div className="mt-3">
                          <AvailabilityForm
                            value={entry?.status ?? null}
                            message={entry?.message}
                            disabled={availabilityDisabled}
                            onSave={(status, message) =>
                              onAvailabilityChange({ fixtureId: f.id }, status, message)
                            }
                          />
                        </div>
                      )}
                    </article>
                  )
                }

                if (item.type === 'training') {
                  const t = item.data
                  const entry = getEntry(undefined, t.id)
                  const dot = availColor(undefined, t.id)
                  return (
                    <article key={t.id} className="border-t border-brand-blue/10 pt-4 first:border-t-0 first:pt-0 border-l-4 border-brand-gold pl-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase text-brand-gold">Training</p>
                          <p className="font-semibold text-brand-navy mt-0.5">{formatMatchTime(t.session_date)}</p>
                          {t.location && <p className="text-sm text-gray-500">{t.location}</p>}
                          {t.notes && <p className="text-sm text-gray-600 mt-1">{t.notes}</p>}
                        </div>
                        {dot && <span className={`w-3 h-3 rounded-full shrink-0 mt-1 ${dot}`} />}
                      </div>
                      {onAvailabilityChange && (
                        <div className="mt-3">
                          <AvailabilityForm
                            value={entry?.status ?? null}
                            message={entry?.message}
                            disabled={availabilityDisabled}
                            onSave={(status, message) =>
                              onAvailabilityChange({ trainingId: t.id }, status, message)
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
                    <article key={event.id} className="border-t border-brand-blue/10 pt-4 first:border-t-0 first:pt-0 border-l-4 border-violet-500 pl-3">
                      <p className="text-xs font-semibold uppercase text-violet-600">
                        {CLUB_EVENT_TYPE_LABELS[event.event_type]}
                      </p>
                      <p className="font-semibold text-brand-navy mt-0.5">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {formatMatchTime(event.event_date)}
                        {event.location ? ` · ${event.location}` : ''}
                      </p>
                      {event.notes && <p className="text-sm text-gray-600 mt-1">{event.notes}</p>}
                    </article>
                  )
                }

                const fundraiser = item.data
                return (
                  <article key={fundraiser.id} className="border-t border-brand-blue/10 pt-4 first:border-t-0 first:pt-0 border-l-4 border-emerald-500 pl-3">
                    <p className="text-xs font-semibold uppercase text-emerald-600">Fundraiser</p>
                    <p className="font-semibold text-brand-navy mt-0.5">{fundraiser.name}</p>
                    <p className="text-sm text-gray-500">{formatMatchDate(`${fundraiser.date}T12:00:00`)}</p>
                    {fundraiser.notes && <p className="text-sm text-gray-600 mt-1">{fundraiser.notes}</p>}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
