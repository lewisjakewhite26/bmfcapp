/** Player-facing fines copy (en-GB, committee voice). */

export const FINE_PAGE = {
  title: 'Fines',
  subtitle:
    'Fines are due by the last Sunday of the month. Fined in the final week? You get until the following month\'s last Sunday. Anything unpaid after its due date picks up £2 every week until it\'s cleared.',
} as const

export const FINE_YOUR_BALANCE = {
  heading: 'Your balance',
  count: (n: number) => `${n} fine${n === 1 ? '' : 's'}`,
} as const

export const FINE_SQUAD = {
  heading: 'Who still owes',
  hint: 'Tap a name to see each fine and when it is due.',
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

export const FINE_DISCRETIONAL = {
  heading: 'Discretional fine',
  hint: "Committee/manager's discretion. Just for this player, this event.",
} as const

export function fineCardSummary(count: number, dueDate: string | null, isOverdue: boolean): string {
  const parts = [`${count} fine${count === 1 ? '' : 's'}`]
  if (dueDate) {
    parts.push(isOverdue ? 'overdue' : `due ${dueDate}`)
  }
  return parts.join(' · ')
}
