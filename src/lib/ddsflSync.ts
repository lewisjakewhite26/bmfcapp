import type { ScrapedFixture, ScrapedLeagueRow } from './ddsflScraper'
import { isBmfcTeam } from './ddsflScraper'

const CLUB_NAME = 'Bishop Middleham FC'
const DEFAULT_HOME_VENUE = 'Bishop Middleham Park'
const DEFAULT_KICKOFF = '10:30:00'

export interface DdsflScrapePayload {
  scraped_at: string
  app_season: string
  fixtures: ScrapedFixture[]
  league_table: ScrapedLeagueRow[]
}

export function formatOpponentName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (/\bFC\b/i.test(trimmed)) return trimmed
  if (/\bFc\b/.test(trimmed)) return trimmed.replace(/\bFc\b/, 'FC')
  return `${trimmed} FC`
}

export function formatLeagueTeamName(raw: string): string {
  const trimmed = raw.replace(/\s*\*+\s*$/, '').trim()
  return isBmfcTeam(trimmed) ? CLUB_NAME : trimmed
}

export interface DdsflFixtureRow {
  match_date: string
  opponent: string
  home_away: 'home' | 'away'
  competition: string
  venue: string | null
  kickoff_time: string
  ddsfl_fixture_id: string
  status: ScrapedFixture['status']
}

export interface DdsflResultRow {
  goals_for: number
  goals_against: number
  notes: string | null
}

export interface DdsflLeagueTableRow {
  season: string
  position: number
  team_name: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  last_scraped_at: string
}

export function mapScrapedFixture(row: ScrapedFixture): DdsflFixtureRow {
  return {
    match_date: row.match_date,
    opponent: formatOpponentName(row.opponent),
    home_away: row.home_away,
    competition: row.competition,
    venue: row.home_away === 'home' ? DEFAULT_HOME_VENUE : null,
    kickoff_time: DEFAULT_KICKOFF,
    ddsfl_fixture_id: row.ddsfl_fixture_id,
    status: row.status,
  }
}

/** Strip common club noise so "Ferryhill Ivorson FC" ≈ "Ferryhill The Ivorson". */
export function normalizeOpponentKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(
      /\b(fc|football\s+club|afc|wmc|the|o40s|o40|over\s*40s|juniors|jun)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

export function fixtureDateKey(matchDate: string): string {
  return matchDate.slice(0, 10)
}

/**
 * True when two opponent labels likely refer to the same club.
 * Handles DDSFL vs short admin names (e.g. Iron Horse vs Newton Aycliffe Iron horse).
 */
export function opponentsLikelySame(a: string, b: string): boolean {
  const na = normalizeOpponentKey(a)
  const nb = normalizeOpponentKey(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true

  const tokensA = new Set(na.split(' ').filter((t) => t.length > 1))
  const tokensB = new Set(nb.split(' ').filter((t) => t.length > 1))
  if (tokensA.size === 0 || tokensB.size === 0) return false

  let overlap = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++
  }
  const smaller = Math.min(tokensA.size, tokensB.size)
  return overlap >= Math.max(1, Math.ceil(smaller * 0.6))
}

export interface ManualFixtureCandidate {
  id: string
  match_date: string
  opponent: string
  home_away: 'home' | 'away'
  ddsfl_fixture_id?: string | null
}

/** Find a manually added fixture that is the same match as a scraped DDSFL row. */
export function findManualFixtureMatch(
  scraped: Pick<DdsflFixtureRow, 'match_date' | 'opponent' | 'home_away'>,
  candidates: ManualFixtureCandidate[],
): ManualFixtureCandidate | null {
  const date = fixtureDateKey(scraped.match_date)
  const matches = candidates.filter(
    (c) =>
      !c.ddsfl_fixture_id &&
      fixtureDateKey(c.match_date) === date &&
      c.home_away === scraped.home_away &&
      opponentsLikelySame(c.opponent, scraped.opponent),
  )
  return matches[0] ?? null
}

export function mapScrapedResult(row: ScrapedFixture): DdsflResultRow | null {
  if (row.status !== 'completed' || row.goals_for == null || row.goals_against == null) {
    return null
  }
  return {
    goals_for: row.goals_for,
    goals_against: row.goals_against,
    notes: row.score_extra,
  }
}

export function mapScrapedLeagueTable(
  rows: ScrapedLeagueRow[],
  season: string,
  scrapedAt: string,
): DdsflLeagueTableRow[] {
  return rows.map((row) => ({
    season,
    position: row.position,
    team_name: formatLeagueTeamName(row.team_name),
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goals_for: row.goals_for,
    goals_against: row.goals_against,
    goal_difference: row.goal_difference,
    points: row.points,
    last_scraped_at: scrapedAt,
  }))
}
