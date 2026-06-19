import { isUpcomingScheduledFixture } from './fixtureFilters'

import type {
  CalendarItem,
  ClubEvent,
  FixtureWithResult,
  Fundraiser,
  TrainingSession,
} from '../types'

export function getCalendarItemDate(item: CalendarItem): Date {
  switch (item.type) {
    case 'fixture':
      return new Date(item.data.match_date)
    case 'training':
      return new Date(item.data.session_date)
    case 'event':
      return new Date(item.data.event_date)
    case 'fundraiser':
      return new Date(`${item.data.date}T12:00:00`)
  }
}

export function buildCalendarItems(input: {
  fixtures: FixtureWithResult[]
  training: TrainingSession[]
  events?: ClubEvent[]
  fundraisers?: Fundraiser[]
  includePastFundraisers?: boolean
}): CalendarItem[] {
  const now = Date.now()
  const { fixtures, training, events = [], fundraisers = [], includePastFundraisers = false } = input

  const fundraiserItems: CalendarItem[] = fundraisers
    .filter((f) => includePastFundraisers || new Date(`${f.date}T23:59:59`).getTime() >= now - 86400000)
    .map((data) => ({ type: 'fundraiser' as const, data }))

  return [
    ...fixtures
      .filter((f) => isUpcomingScheduledFixture(f))
      .map((data) => ({ type: 'fixture' as const, data })),
    ...training.map((data) => ({ type: 'training' as const, data })),
    ...events.map((data) => ({ type: 'event' as const, data })),
    ...fundraiserItems,
  ].sort((a, b) => getCalendarItemDate(a).getTime() - getCalendarItemDate(b).getTime())
}
