import type { ExpenseCategory, SponsorshipCategory } from '../types'

export const SPONSORSHIP_CATEGORIES: { value: SponsorshipCategory; label: string }[] = [
  { value: 'player_sponsor', label: 'Player sponsor' },
  { value: 'match_balls', label: 'Match balls' },
  { value: 'kit', label: 'Kit' },
  { value: 'other', label: 'Other' },
]

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'pitch_hire', label: 'Pitch hire' },
  { value: 'referee_fees', label: 'Referee fees' },
  { value: 'kit', label: 'Kit' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'admin_fees', label: 'Admin / fees' },
  { value: 'other', label: 'Other' },
]

export function sponsorshipCategoryLabel(category: SponsorshipCategory): string {
  return SPONSORSHIP_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

export function expenseCategoryLabel(category: ExpenseCategory): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}
