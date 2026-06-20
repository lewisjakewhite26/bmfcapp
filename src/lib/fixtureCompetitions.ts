import { LEAGUE_NAME } from './mockData'

export type CompetitionPreset = 'friendly' | 'league' | 'cup' | 'other'

export const COMPETITION_PRESETS: Record<
  CompetitionPreset,
  { label: string; placeholder: string; needsCustomName: boolean }
> = {
  friendly: {
    label: 'Friendly',
    placeholder: 'Friendly',
    needsCustomName: false,
  },
  league: {
    label: 'League',
    placeholder: LEAGUE_NAME,
    needsCustomName: false,
  },
  cup: {
    label: 'Cup / trophy',
    placeholder: 'e.g. Alan Smith Memorial Trophy',
    needsCustomName: true,
  },
  other: {
    label: 'Other',
    placeholder: 'e.g. charity match',
    needsCustomName: true,
  },
}

export function resolveCompetitionName(
  preset: CompetitionPreset,
  customName: string,
): string {
  if (preset === 'friendly') return 'Friendly'
  if (preset === 'league') return LEAGUE_NAME
  const trimmed = customName.trim()
  if (!trimmed) {
    throw new Error('Competition name is required')
  }
  return trimmed
}

export function isManualFixture(ddsflFixtureId: string | null): boolean {
  return ddsflFixtureId == null
}

export function guessCompetitionPreset(competition: string): {
  preset: CompetitionPreset
  custom: string
} {
  if (competition === 'Friendly') return { preset: 'friendly', custom: '' }
  if (competition === LEAGUE_NAME) return { preset: 'league', custom: '' }
  const lower = competition.toLowerCase()
  if (lower.includes('cup') || lower.includes('trophy') || lower.includes('memorial')) {
    return { preset: 'cup', custom: competition }
  }
  return { preset: 'other', custom: competition }
}
