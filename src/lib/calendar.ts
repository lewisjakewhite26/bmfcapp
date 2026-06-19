import type { CalendarItem } from '../types'
import { getCalendarItemDate } from './calendarItems'

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function getItemDate(item: CalendarItem): Date {
  return getCalendarItemDate(item)
}

export function itemsOnDay(items: CalendarItem[], day: Date): CalendarItem[] {
  return items.filter((item) => isSameDay(getItemDate(item), day))
}

export function buildMonthGrid(month: Date): (Date | null)[][] {
  const first = startOfMonth(month)
  const startPad = (first.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
