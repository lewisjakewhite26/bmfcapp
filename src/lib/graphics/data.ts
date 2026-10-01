import type { FixtureWithResult, SquadMember } from '../../types'

/** The three weekly social posts. */
export type GraphicKind = 'matchday' | 'goalscorer' | 'motm'

export const CLUB_NAME = 'Bishop Middleham FC'
export const CLUB_SHORT_NAME = 'Bishop Middleham'
export const HOME_GROUND = 'Bishop Middleham Park'
export const HOME_POSTCODE = 'DL17 9AH'

/** One side of a fixture as drawn on a post (left = home team). */
export interface GraphicSide {
  name: string
  isClub: boolean
  /** Opponent badge URL; null draws an initials roundel. Unused for the club (crest is bundled). */
  badgeUrl: string | null
}

export interface GraphicSponsor {
  name: string
  logoUrl: string | null
}

interface GraphicBase {
  /** "2026/27" — top-right label. */
  seasonLabel: string
  competition: string
  home: GraphicSide
  away: GraphicSide
  /** Background-removed player image URL; null draws the crest in its place. */
  playerImageUrl: string | null
}

export interface MatchdayGraphicData extends GraphicBase {
  kind: 'matchday'
  dayLabel: string
  dateLabel: string
  kickoffLabel: string
  fixtureLabel: 'Home' | 'Away'
  venueName: string
  venueDetail: string | null
}

export interface ResultGraphicData extends GraphicBase {
  kind: 'goalscorer' | 'motm'
  playerName: string
  /** Gold line under the name: "2 goals" / "Hat-trick" / "vs Ferryhill Ivorson". */
  detail: string
  homeScore: number
  awayScore: number
  sponsor: GraphicSponsor | null
}

export type GraphicData = MatchdayGraphicData | ResultGraphicData

export interface ScorerSummary {
  playerId: string
  name: string
  goals: number
}

/** "2026/27" for any date in that season (seasons roll over in July). */
export function seasonLabelFor(iso: string): string {
  const d = new Date(iso)
  const startYear = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`
}

export function kickoffLabel(kickoffTime: string | null | undefined): string {
  if (!kickoffTime) return 'TBC'
  const [h, m] = kickoffTime.split(':')
  if (!h || !m) return 'TBC'
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
}

/** "SUN" style labels are built from these; always UK English. */
export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long' })
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "20 Sep" — fixed month names (some browsers write "Sept"). */
export function shortDateLabel(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`
}

export function goalsDetail(goals: number): string {
  if (goals === 3) return 'Hat-trick'
  return goals === 1 ? '1 goal' : `${goals} goals`
}

/** Up to two initials for a badge roundel, ignoring "FC"/"AFC" style suffixes. */
export function teamInitials(name: string): string {
  const skip = new Set(['FC', 'AFC', 'CF', 'FC.', 'F.C.', 'A.F.C.', 'THE'])
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter((w) => w && !skip.has(w.toUpperCase()))
  if (words.length === 0) return name.slice(0, 2).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Normalised opponent name — must match public.opponent_key() in migration 053. */
export function opponentKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Goalscorers for a fixture, most goals first. */
export function scorersForFixture(fixture: FixtureWithResult): ScorerSummary[] {
  const byPlayer = new Map<string, ScorerSummary>()
  for (const event of fixture.events ?? []) {
    if (event.event_type !== 'goal' || !event.player_id) continue
    const existing = byPlayer.get(event.player_id)
    if (existing) {
      existing.goals += 1
    } else {
      byPlayer.set(event.player_id, {
        playerId: event.player_id,
        name: event.player_name ?? 'Unknown player',
        goals: 1,
      })
    }
  }
  return [...byPlayer.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
}

export function motmPlayerId(fixture: FixtureWithResult): string | null {
  return fixture.events?.find((e) => e.event_type === 'motm')?.player_id ?? null
}

function sides(fixture: FixtureWithResult, opponentBadgeUrl: string | null): { home: GraphicSide; away: GraphicSide } {
  const club: GraphicSide = { name: CLUB_SHORT_NAME, isClub: true, badgeUrl: null }
  const opponent: GraphicSide = { name: fixture.opponent, isClub: false, badgeUrl: opponentBadgeUrl }
  return fixture.home_away === 'home' ? { home: club, away: opponent } : { home: opponent, away: club }
}

function venueFor(fixture: FixtureWithResult): { venueName: string; venueDetail: string | null } {
  const venue = fixture.venue?.trim() || null
  if (fixture.home_away === 'home') {
    const name = venue ?? HOME_GROUND
    return { venueName: name, venueDetail: name === HOME_GROUND ? HOME_POSTCODE : null }
  }
  return { venueName: venue ?? fixture.opponent, venueDetail: venue ? null : 'Away' }
}

export interface BuildOptions {
  opponentBadgeUrl: string | null
  playerImageUrl: string | null
}

export function buildMatchdayData(fixture: FixtureWithResult, options: BuildOptions): MatchdayGraphicData {
  return {
    kind: 'matchday',
    seasonLabel: seasonLabelFor(fixture.match_date),
    competition: fixture.competition,
    ...sides(fixture, options.opponentBadgeUrl),
    playerImageUrl: options.playerImageUrl,
    dayLabel: dayLabel(fixture.match_date),
    dateLabel: shortDateLabel(fixture.match_date),
    kickoffLabel: kickoffLabel(fixture.kickoff_time),
    fixtureLabel: fixture.home_away === 'home' ? 'Home' : 'Away',
    ...venueFor(fixture),
  }
}

export interface ResultBuildOptions extends BuildOptions {
  kind: 'goalscorer' | 'motm'
  player: Pick<SquadMember, 'display_name' | 'sponsor_name'> & { sponsorLogoUrl: string | null }
  /** Goal count for the goalscorer post (ignored for MOTM). */
  goals?: number
}

export function buildResultData(fixture: FixtureWithResult, options: ResultBuildOptions): ResultGraphicData {
  const result = fixture.result
  if (!result) throw new Error('This match has no result yet')

  const clubIsHome = fixture.home_away === 'home'
  const sponsorName = options.player.sponsor_name?.trim() || null
  const sponsor =
    sponsorName || options.player.sponsorLogoUrl
      ? { name: sponsorName ?? '', logoUrl: options.player.sponsorLogoUrl }
      : null

  return {
    kind: options.kind,
    seasonLabel: seasonLabelFor(fixture.match_date),
    competition: fixture.competition,
    ...sides(fixture, options.opponentBadgeUrl),
    playerImageUrl: options.playerImageUrl,
    playerName: options.player.display_name,
    detail:
      options.kind === 'goalscorer'
        ? goalsDetail(Math.max(1, options.goals ?? 1))
        : `vs ${fixture.opponent}`,
    homeScore: clubIsHome ? result.goals_for : result.goals_against,
    awayScore: clubIsHome ? result.goals_against : result.goals_for,
    sponsor,
  }
}

/** Download file name, e.g. "goalscorer-jack-marley-2026-09-20.png". */
export function graphicFileName(kind: GraphicKind, fixture: FixtureWithResult, playerName?: string | null): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  const date = new Date(fixture.match_date).toISOString().slice(0, 10)
  const parts = [kind, playerName ? slug(playerName) : slug(fixture.opponent), date]
  return `${parts.filter(Boolean).join('-')}.png`
}
