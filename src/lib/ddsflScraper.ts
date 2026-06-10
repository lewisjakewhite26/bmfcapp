import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import { DDSFL_IDS } from './ddsflConstants'

export type ScrapedFixtureStatus = 'scheduled' | 'completed' | 'postponed' | 'cancelled'

export interface ScrapedFixture {
  ddsfl_fixture_id: string
  /** DD/MM/YYYY as shown on DDSFL */
  date_uk: string
  /** ISO 8601 date at midday UTC (DDSFL has no kick-off on list view) */
  match_date: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  /** e.g. "2-3 pens" — informational only */
  score_extra: string | null
  competition: string
  is_bmfc_home: boolean
  opponent: string
  home_away: 'home' | 'away'
  status: ScrapedFixtureStatus
  goals_for: number | null
  goals_against: number | null
}

export interface ScrapedLeagueRow {
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
}

const FIXTURE_ID_PATTERN = new RegExp(
  `fixtureslge/${DDSFL_IDS.divisionFixturesPage}/(\\d+)`,
)

export function isBmfcTeam(name: string): boolean {
  return name.toLowerCase().replace(/\s+/g, ' ').trim().includes('bishop middleham')
}

/** Parse DDSFL UK date (DD/MM/YYYY) to ISO string at 12:00 UTC. */
export function parseUkDateToIso(dateUk: string): string {
  const match = dateUk.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) {
    throw new Error(`Invalid UK date: ${dateUk}`)
  }
  const [, day, month, year] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0)).toISOString()
}

function parseScoreText(raw: string): number | null {
  const text = raw.trim()
  if (!text || text === '-' || text === '–') {
    return null
  }
  const n = Number.parseInt(text, 10)
  return Number.isFinite(n) ? n : null
}

function fixtureStatus(homeScore: number | null, awayScore: number | null): ScrapedFixtureStatus {
  if (homeScore !== null && awayScore !== null) {
    return 'completed'
  }
  return 'scheduled'
}

/** Team name from .homeclub / .awayclub — not goalscorer names in .MatchListScorers. */
function teamNameFromClub($club: cheerio.Cheerio<AnyNode>): string {
  const direct = $club.children('span').first().text().trim()
  if (direct) return direct
  return $club.clone().children('.MatchListScorers').remove().end().text().trim()
}

export function parseFixturesHtml(html: string): ScrapedFixture[] {
  const $ = cheerio.load(html)
  const fixtures: ScrapedFixture[] = []
  const seen = new Set<string>()

  $('table tbody tr').each((_, row) => {
    const $row = $(row)
    const link = $row.find('a.matchboxlink').attr('href') ?? ''
    const idMatch = link.match(FIXTURE_ID_PATTERN)
    if (!idMatch) return

    const ddsfl_fixture_id = idMatch[1]
    if (seen.has(ddsfl_fixture_id)) return
    seen.add(ddsfl_fixture_id)

    const dateUk =
      $row.find('td.matchcol .HideWhenNarrow').first().text().trim() ||
      $row.find('.ShowWhenNarrow.matchinfo div').first().text().trim().split(/\s+/).pop() ||
      ''

    if (!dateUk) return

    const home_team = teamNameFromClub($row.find('.homeclub'))
    const away_team = teamNameFromClub($row.find('.awayclub'))
    const home_score = parseScoreText($row.find('.homescore').text())
    const away_score = parseScoreText($row.find('.awayscore').text())
    const score_extra = $row.find('.extrascore').text().trim() || null

    const competition = $row
      .find('.matchinfo')
      .map((__, el) => $(el).text().trim())
      .get()
      .filter((text) => text && !/^\w+day\b/i.test(text))
      .pop() ?? ''

    const is_bmfc_home = isBmfcTeam(home_team)
    const is_bmfc_away = isBmfcTeam(away_team)
    if (!is_bmfc_home && !is_bmfc_away) return

    const home_away = is_bmfc_home ? 'home' : 'away'
    const opponent = is_bmfc_home ? away_team : home_team
    const status = fixtureStatus(home_score, away_score)
    const goals_for =
      status === 'completed' ? (is_bmfc_home ? home_score : away_score) : null
    const goals_against =
      status === 'completed' ? (is_bmfc_home ? away_score : home_score) : null

    fixtures.push({
      ddsfl_fixture_id,
      date_uk: dateUk,
      match_date: parseUkDateToIso(dateUk),
      home_team,
      away_team,
      home_score,
      away_score,
      score_extra,
      competition,
      is_bmfc_home,
      opponent,
      home_away,
      status,
      goals_for,
      goals_against,
    })
  })

  return fixtures
}

export function parseLeagueTableHtml(html: string): ScrapedLeagueRow[] {
  const $ = cheerio.load(html)
  const rows: ScrapedLeagueRow[] = []

  $('table.LeagueTable tbody tr').each((_, row) => {
    const $row = $(row)
    const position = Number.parseInt($row.find('th.ar').first().text().trim(), 10)
    const team_name = $row.find('.ItemFullName1').first().text().trim()
    const statCells = $row
      .find('td.ar')
      .map((__, el) => Number.parseInt($(el).text().trim(), 10))
      .get()
      .filter((n) => Number.isFinite(n))

    if (!position || !team_name || statCells.length < 8) return

    const [played, won, drawn, lost, goals_for, goals_against, goal_difference, points] =
      statCells

    rows.push({
      position,
      team_name,
      played,
      won,
      drawn,
      lost,
      goals_for,
      goals_against,
      goal_difference,
      points,
    })
  })

  return rows
}
