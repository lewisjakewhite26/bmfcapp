import type { CalendarItem } from '../types'
import { isUpcomingScheduledFixture } from './fixtureFilters'

/** Three calendar categories: training, match, other (events + fundraisers). */
export const CALENDAR_BORDER = {
  training: 'border-brand-gold',
  match: 'border-brand-blue',
  other: 'border-slate-500',
} as const

export const CALENDAR_LABEL = {
  training: 'text-brand-gold',
  match: 'text-brand-blue',
  other: 'text-slate-600',
} as const

export const CALENDAR_DOT = {
  training: 'bg-brand-gold',
  match: 'bg-brand-blue',
  other: 'bg-slate-500',
} as const

export type MatchResultTint = 'win' | 'draw' | 'loss'

export function completedMatchResultTint(items: CalendarItem[]): MatchResultTint | null {
  for (const item of items) {
    if (item.type !== 'fixture') continue
    const fixture = item.data
    if (fixture.status !== 'completed' || !fixture.result) continue
    const { goals_for, goals_against } = fixture.result
    if (goals_for > goals_against) return 'win'
    if (goals_for < goals_against) return 'loss'
    return 'draw'
  }
  return null
}

/** Light background tint for completed-match days in the month grid. */
export function matchResultDayBackground(
  tint: MatchResultTint | null,
  options: { selected: boolean },
): string {
  if (!tint || options.selected) return ''
  switch (tint) {
    case 'win':
      return 'bg-emerald-500/15'
    case 'draw':
      return 'bg-amber-500/15'
    case 'loss':
      return 'bg-red-500/15'
  }
}

export function dayHasUpcomingMatch(items: CalendarItem[]): boolean {
  return items.some((item) => item.type === 'fixture' && isUpcomingScheduledFixture(item.data))
}

export function dayHasTraining(items: CalendarItem[]): boolean {
  return items.some((item) => item.type === 'training')
}

export function dayHasOther(items: CalendarItem[]): boolean {
  return items.some((item) => item.type === 'event' || item.type === 'fundraiser')
}
