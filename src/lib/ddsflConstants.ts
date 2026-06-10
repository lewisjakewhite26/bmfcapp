/** DDSFL (TeamExpert) identifiers for Swinburne Maddison Third Division / BMFC. */

export const DDSFL_BASE_URL = 'https://www.ddsfl.co.uk'

export const DDSFL_IDS = {
  /** Third Division fixtures/results listing page */
  divisionFixturesPage: 1019,
  /** Bishop Middleham Fc in the club filter dropdown */
  clubId: 32,
  /** Swinburne Maddison Third Division on league-tables filter */
  thirdDivisionCompetition: 24,
} as const

export const DDSFL_CLUB = {
  /** Name as shown on ddsfl.co.uk */
  siteName: 'Bishop Middleham Fc',
  /** Name used in the club hub app */
  appName: 'Bishop Middleham FC',
} as const

export const DDSFL_LEAGUE_NAME = 'Swinburne Maddison Third Division'

export type DdsflSeasonId = 1 | 3 | 4 | 5 | 6 | 7 | 8

export interface DdsflSeasonInfo {
  id: DdsflSeasonId
  /** Label on ddsfl.co.uk season dropdown */
  ddsflLabel: string
  /** Season string stored in league_table_cache / app UI */
  appSeason: string
}

/** Map of DDSFL `fsea` query param values. */
export const DDSFL_SEASONS: Record<DdsflSeasonId, DdsflSeasonInfo> = {
  8: { id: 8, ddsflLabel: '2026-2027', appSeason: '2026/27' },
  7: { id: 7, ddsflLabel: '2025-2026', appSeason: '2025/26' },
  6: { id: 6, ddsflLabel: '2024-2025', appSeason: '2024/25' },
  5: { id: 5, ddsflLabel: '2023-2024', appSeason: '2023/24' },
  4: { id: 4, ddsflLabel: '2022-2023', appSeason: '2022/23' },
  3: { id: 3, ddsflLabel: '2021-2022', appSeason: '2021/22' },
  1: { id: 1, ddsflLabel: '2020-2021', appSeason: '2020/21' },
}

/**
 * Season to scrape for live data.
 *
 * DDSFL's site default is fsea=8 (2026-27), but that season has no published
 * fixtures until late summer. fsea=7 (2025-26) is the active season with results.
 * Re-check each August and bump when fsea=8 has fixtures.
 */
export const DDSFL_ACTIVE_SEASON: DdsflSeasonId = 7

export type FixtureRecordType = 'all' | 'fixtures' | 'results'

export function ddsflSeasonInfo(fsea: number): DdsflSeasonInfo | undefined {
  return DDSFL_SEASONS[fsea as DdsflSeasonId]
}

export function ddsflFixturesUrl(
  fsea: DdsflSeasonId = DDSFL_ACTIVE_SEASON,
  options: { clubOnly?: boolean; recordType?: FixtureRecordType } = {},
): string {
  const { clubOnly = true, recordType = 'all' } = options
  const params = new URLSearchParams({
    fsea: String(fsea),
    frt: recordType,
  })
  if (clubOnly) {
    params.set('fclub1', String(DDSFL_IDS.clubId))
  }
  return `${DDSFL_BASE_URL}/fixtureslge/${DDSFL_IDS.divisionFixturesPage}?${params}`
}

export function ddsflLeagueTableUrl(
  fsea: DdsflSeasonId = DDSFL_ACTIVE_SEASON,
): string {
  const params = new URLSearchParams({
    fsea: String(fsea),
    fcomplge: String(DDSFL_IDS.thirdDivisionCompetition),
  })
  return `${DDSFL_BASE_URL}/league-tables?${params}`
}
