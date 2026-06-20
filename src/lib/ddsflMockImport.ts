import ddsflScrape from '../data/ddsfl-scrape.json'
import type { Fixture, LeagueTableRow, Result } from '../types'
import type { ScrapedFixture, ScrapedLeagueRow } from './ddsflScraper'
import { isBmfcTeam } from './ddsflScraper'
import { DDSFL_ACTIVE_SEASON, DDSFL_SEASONS } from './ddsflConstants'

const CLUB_NAME = 'Bishop Middleham FC'
const CURRENT_SEASON = DDSFL_SEASONS[DDSFL_ACTIVE_SEASON].appSeason

export interface DdsflScrapePayload {
  scraped_at: string
  app_season: string
  fixtures: ScrapedFixture[]
  league_table: ScrapedLeagueRow[]
}

const DEFAULT_HOME_VENUE = 'Bishop Middleham Park'
const DEFAULT_KICKOFF = '10:30:00'

function formatOpponentName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (/\bFC\b/i.test(trimmed)) return trimmed
  if (/\bFc\b/.test(trimmed)) return trimmed.replace(/\bFc\b/, 'FC')
  return `${trimmed} FC`
}

function fixtureIdFromDdsfl(ddsflId: string): string {
  return `ddsfl-${ddsflId}`
}

export function buildDdsflMockState(payload: DdsflScrapePayload = ddsflScrape as DdsflScrapePayload) {
  const scrapedAt = payload.scraped_at
  const fixtures: Fixture[] = payload.fixtures.map((row) => ({
    id: fixtureIdFromDdsfl(row.ddsfl_fixture_id),
    match_date: row.match_date,
    opponent: formatOpponentName(row.opponent),
    home_away: row.home_away,
    competition: row.competition,
    venue: row.home_away === 'home' ? DEFAULT_HOME_VENUE : null,
    kickoff_time: DEFAULT_KICKOFF,
    ddsfl_fixture_id: row.ddsfl_fixture_id,
    status: row.status,
    created_at: scrapedAt,
  }))

  const results: Result[] = payload.fixtures
    .filter((row) => row.status === 'completed' && row.goals_for != null && row.goals_against != null)
    .map((row) => ({
      id: `r-ddsfl-${row.ddsfl_fixture_id}`,
      fixture_id: fixtureIdFromDdsfl(row.ddsfl_fixture_id),
      goals_for: row.goals_for!,
      goals_against: row.goals_against!,
      notes: row.score_extra,
      created_at: row.match_date,
    }))

  const leagueTable: LeagueTableRow[] = payload.league_table.map((row) => ({
    id: `lt-ddsfl-${row.position}`,
    season: payload.app_season || CURRENT_SEASON,
    position: row.position,
    team_name: isBmfcTeam(row.team_name) ? CLUB_NAME : row.team_name.replace(/\s*\*+\s*$/, '').trim(),
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

  return { fixtures, results, leagueTable, scrapedAt }
}
