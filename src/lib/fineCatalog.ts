/** Preset match-day fines — amounts in GBP. */
export const FINE_CATALOG = [
  { key: 'late', label: 'Late', amount: 2 },
  { key: 'no_shin_pads', label: 'No shin pads', amount: 2 },
  { key: 'wrong_kit', label: 'Wrong kit', amount: 2 },
  { key: 'no_show', label: 'No show', amount: 5 },
  { key: 'late_no_text', label: 'Late no text', amount: 3 },
  { key: 'yellow_card', label: 'Yellow card', amount: 5 },
  { key: 'red_card', label: 'Red card', amount: 10 },
  { key: 'lost_ball', label: 'Lost ball', amount: 5 },
  { key: 'fine_of_fines', label: 'Fine of fines', amount: 1 },
] as const

export type FineCatalogKey = (typeof FINE_CATALOG)[number]['key']

export function getFinePreset(key: string) {
  return FINE_CATALOG.find((f) => f.key === key)
}

export function formatFineAmount(amount: number): string {
  return `£${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`
}
