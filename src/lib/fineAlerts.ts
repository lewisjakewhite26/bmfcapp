import type { FineEntry } from '../types'

export type FineAlertLevel = 'none' | 'normal' | 'warning' | 'critical'

const MS_PER_DAY = 86_400_000

export function daysSince(iso: string): number {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 0
  return Math.max(0, Math.floor((Date.now() - then) / MS_PER_DAY))
}

export function oldestUnpaidDays(entries: FineEntry[]): number {
  const unpaid = entries.filter((e) => !e.paid)
  if (unpaid.length === 0) return 0
  return Math.max(...unpaid.map((e) => daysSince(e.created_at)))
}

export function unpaidTotal(entries: FineEntry[]): number {
  return entries.filter((e) => !e.paid).reduce((sum, e) => sum + e.amount, 0)
}

/** Escalates with amount owed and how long fines have sat unpaid. */
export function getFineAlertLevel(totalOwed: number, oldestDays: number): FineAlertLevel {
  if (totalOwed <= 0) return 'none'

  let score = 0
  if (totalOwed >= 15) score += 3
  else if (totalOwed >= 8) score += 2
  else if (totalOwed >= 4) score += 1

  if (oldestDays >= 21) score += 3
  else if (oldestDays >= 14) score += 2
  else if (oldestDays >= 7) score += 1
  else if (oldestDays >= 3) score += 0

  if (score >= 4) return 'critical'
  if (score >= 2) return 'warning'
  return 'normal'
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

export function summarizeFineAlert(totalOwed: number, oldestDays: number): string {
  const level = getFineAlertLevel(totalOwed, oldestDays)
  if (level === 'none') return ''
  const amount = `£${totalOwed.toFixed(totalOwed % 1 === 0 ? 0 : 2)}`
  const age =
    oldestDays > 0 ? ` · oldest fine ${oldestDays} day${oldestDays === 1 ? '' : 's'}` : ''
  if (level === 'critical') {
    return `${amount} still to pay${age}`
  }
  if (level === 'warning') {
    return `${amount} still to pay${age}`
  }
  return `${amount} outstanding`
}
