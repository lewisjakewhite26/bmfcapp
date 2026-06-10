export interface User {
  id: string
  username: string
  display_name: string
  is_admin: boolean
  is_committee: boolean
  is_approved: boolean
  session_token?: string
}

export interface AdminUserRow {
  id: string
  username: string
  display_name: string
  is_admin: boolean
  is_committee: boolean
  is_approved: boolean
  created_at: string
  invite_pending?: boolean
  invite_expires_at?: string | null
  in_squad?: boolean
  squad_position?: string | null
}

export type SquadPosition = 'Forward' | 'Midfielder' | 'Defender' | 'Goalkeeper'

export interface InvitePreview {
  display_name: string
  expires_at: string | null
}

export interface CreateInviteResult {
  id: string
  display_name: string
  invite_token: string
  invite_expires_at: string | null
}

export type FixtureStatus = 'scheduled' | 'completed' | 'postponed' | 'cancelled'
export type HomeAway = 'home' | 'away'
export type AvailabilityStatus = 'yes' | 'no' | 'maybe'
export type MatchEventType = 'goal' | 'assist' | 'motm' | 'yellow_card' | 'red_card'

export interface Fixture {
  id: string
  match_date: string
  opponent: string
  home_away: HomeAway
  competition: string
  venue: string | null
  kickoff_time: string | null
  ddsfl_fixture_id: string | null
  status: FixtureStatus
  created_at: string
}

export interface Result {
  id: string
  fixture_id: string
  goals_for: number
  goals_against: number
  notes: string | null
  created_at: string
}

export interface MatchEvent {
  id: string
  fixture_id: string
  player_id: string
  player_name?: string
  event_type: MatchEventType
  minute: number | null
  created_at: string
}

export interface FixtureWithResult extends Fixture {
  result?: Result
  events?: MatchEvent[]
}

export interface TrainingSession {
  id: string
  session_date: string
  location: string | null
  notes: string | null
  created_at: string
}

export interface Availability {
  id: string
  player_id: string
  fixture_id: string | null
  training_id: string | null
  status: AvailabilityStatus
  message: string | null
  created_at: string
}

export interface LeagueTableRow {
  id: string
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

export interface SquadMember {
  id: string
  player_id: string
  display_name: string
  squad_number: number | null
  position: string | null
  joined_date: string | null
  active: boolean
}

export interface PlayerStats {
  player_id: string
  display_name: string
  squad_number: number | null
  position: string | null
  appearances: number
  goals: number
  assists: number
  motm: number
  yellow_cards: number
  red_cards: number
  clean_sheets: number
}

export type CalendarItem =
  | { type: 'fixture'; data: FixtureWithResult }
  | { type: 'training'; data: TrainingSession }

export interface PlayerMatchRecord {
  fixture: FixtureWithResult
  events: MatchEvent[]
}

export interface PlayerProfile {
  player_id: string
  display_name: string
  position: string | null
  joined_date: string | null
  stats: PlayerStats
  matchHistory: PlayerMatchRecord[]
}

export interface DashboardSummary {
  nextFixture: FixtureWithResult | null
  lastResult: FixtureWithResult | null
  leaguePosition: number | null
  leaguePoints: number | null
  upcomingTraining: TrainingSession | null
}
