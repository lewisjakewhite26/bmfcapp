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

function isCompletedFixture(fixture: FixtureWithResult): boolean {
  return fixture.status === 'completed' && Boolean(fixture.result)
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

  const activeEvents = events.filter((e) => !e.archived)
  const activeFundraisers = fundraisers.filter((f) => !f.archived)

  const fundraiserItems: CalendarItem[] = activeFundraisers
    .filter((f) => includePastFundraisers || new Date(`${f.date}T23:59:59`).getTime() >= now - 86400000)
    .map((data) => ({ type: 'fundraiser' as const, data }))

  const upcomingFixtures = fixtures
    .filter((f) => isUpcomingScheduledFixture(f))
    .map((data) => ({ type: 'fixture' as const, data }))

  const completedFixtures = fixtures
    .filter(isCompletedFixture)
    .map((data) => ({ type: 'fixture' as const, data }))

  return [
    ...upcomingFixtures,
    ...completedFixtures,
    ...training.map((data) => ({ type: 'training' as const, data })),
    ...activeEvents.map((data) => ({ type: 'event' as const, data })),
    ...fundraiserItems,
  ].sort((a, b) => getCalendarItemDate(a).getTime() - getCalendarItemDate(b).getTime())
}

export function isUpcomingFixtureItem(item: CalendarItem): boolean {
  return item.type === 'fixture' && isUpcomingScheduledFixture(item.data)
}

export function isCompletedFixtureItem(item: CalendarItem): boolean {
  return item.type === 'fixture' && isCompletedFixture(item.data)
}
