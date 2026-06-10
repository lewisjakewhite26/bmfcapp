import type { ScrapedFixture, ScrapedLeagueRow } from './ddsflScraper'
import { isBmfcTeam } from './ddsflScraper'

const CLUB_NAME = 'Bishop Middleham FC'
const DEFAULT_HOME_VENUE = 'Bishop Middleham Recreation Ground'
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
