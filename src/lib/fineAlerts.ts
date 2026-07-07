import type { FineEntry } from '../types'
import { formatMatchDate } from './format'

export type FineAlertLevel = 'none' | 'normal' | 'warning' | 'critical'

const MS_PER_DAY = 86_400_000

const londonDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Calendar date (yyyy-mm-dd) in Europe/London — matches server CURRENT_DATE for UK users. */
export function londonCalendarDateYmd(now = new Date()): string {
  const parts = londonDateFormatter.formatToParts(now)
  const year = parts.find((p) => p.type === 'year')!.value
  const month = parts.find((p) => p.type === 'month')!.value
  const day = parts.find((p) => p.type === 'day')!.value
  return `${year}-${month}-${day}`
}

function ymdToUtcMs(ymd: string): number {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Whole days from today (Europe/London) until due_date (negative when overdue). */
export function daysUntilDue(dueDate: string, now = new Date()): number {
  const todayYmd = londonCalendarDateYmd(now)
  const dueYmd = dueDate.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueYmd)) return 0
  return Math.floor((ymdToUtcMs(dueYmd) - ymdToUtcMs(todayYmd)) / MS_PER_DAY)
}

export function unpaidTotal(entries: FineEntry[]): number {
  return entries.filter((e) => !e.paid).reduce((sum, e) => sum + e.amount, 0)
}

export function earliestDueDate(entries: FineEntry[]): string | null {
  const unpaid = entries.filter((e) => !e.paid && e.due_date)
  if (unpaid.length === 0) return null
  return unpaid.reduce((min, e) => (e.due_date < min ? e.due_date : min), unpaid[0].due_date)
}

export function getDeadlineProximityScore(daysUntil: number): number {
  if (daysUntil < 0) return 3
  if (daysUntil <= 3) return 2
  if (daysUntil <= 7) return 1
  return 0
}

/** Escalates with amount owed and proximity to earliest due date. */
export function getFineAlertLevel(totalOwed: number, daysUntil: number): FineAlertLevel {
  if (totalOwed <= 0) return 'none'

  let score = 0
  if (totalOwed >= 15) score += 3
  else if (totalOwed >= 8) score += 2
  else if (totalOwed >= 4) score += 1

  score += getDeadlineProximityScore(daysUntil)

  if (score >= 4) return 'critical'
  if (score >= 2) return 'warning'
  return 'normal'
}

export function getFineAlertLevelFromEntries(entries: FineEntry[]): FineAlertLevel {
  const total = unpaidTotal(entries)
  const due = earliestDueDate(entries)
  if (!due) return total > 0 ? 'normal' : 'none'
  return getFineAlertLevel(total, daysUntilDue(due))
}

export function fineAlertClasses(level: FineAlertLevel): string {
  switch (level) {
    case 'critical':
      return 'fine-alert-critical border-red-400/60 bg-red-50/90'
    case 'warning':
      return 'fine-alert-warning border-amber-400/50 bg-amber-50/80'
    case 'normal':
      return 'border-brand-blue/15 bg-brand-light/40'
    default:
      return ''
  }
}

function formatDueDay(dueDate: string): string {
  return formatMatchDate(`${dueDate}T12:00:00`)
}

export function formatFineDueSummary(dueDate: string | null): string {
  if (!dueDate) return ''
  const days = daysUntilDue(dueDate)
  const label = formatDueDay(dueDate)
  if (days < 0) {
    return `Overdue since ${label} · £2/week is being added`
  }
  if (days === 0) {
    return `Due today (${label})`
  }
  return `Due by ${label}`
}

export function summarizeFineAlert(totalOwed: number, daysUntil: number): string {
  const level = getFineAlertLevel(totalOwed, daysUntil)
  if (level === 'none') return ''
  const amount = `£${totalOwed.toFixed(totalOwed % 1 === 0 ? 0 : 2)}`
  if (daysUntil < 0) {
    return `${amount} still to pay · overdue`
  }
  if (level === 'critical' || level === 'warning') {
    return `${amount} still to pay`
  }
  return `${amount} outstanding`
}
