import type { ClubEventType } from '../types'

export const CLUB_EVENT_TYPES: { value: ClubEventType; label: string }[] = [
  { value: 'social', label: 'Team social' },
  { value: 'agm', label: 'AGM' },
  { value: 'committee', label: 'Committee meeting' },
  { value: 'other', label: 'Other event' },
]

export const CLUB_EVENT_TYPE_LABELS: Record<ClubEventType, string> = {
  social: 'Team social',
  agm: 'AGM',
  committee: 'Committee meeting',
  other: 'Other event',
}
