/** Player-facing fines copy (en-GB, committee voice). */

export const FINE_PAGE = {
  title: 'Fines',
  subtitle: 'Match-day fines from training and games. Pay by the last Sunday of each month.',
} as const

export const FINE_YOUR_BALANCE = {
  heading: 'Your balance',
  count: (n: number) => `${n} fine${n === 1 ? '' : 's'}`,
} as const

export const FINE_SQUAD = {
  heading: 'Who still owes',
  hint: 'Tap a name to see each fine and when it was logged.',
  youTag: 'you',
} as const

export const FINE_EMPTY = {
  heading: 'All square',
  body: 'Nobody owes anything right now.',
} as const

export const FINE_BANNER = {
  label: 'Your fines',
  viewHint: 'View breakdown',
  fullHint: 'Tap for your fines and the squad list',
} as const

export function fineAgeLabel(days: number): string {
  if (days <= 0) return ''
  return `${days} day${days === 1 ? '' : 's'}`
}

export function fineCardSummary(count: number, oldestDays: number): string {
  const parts = [`${count} fine${count === 1 ? '' : 's'}`]
  if (oldestDays > 0) parts.push(`oldest ${fineAgeLabel(oldestDays)}`)
  return parts.join(' · ')
}
