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
  first_name?: string | null
  last_name?: string | null
  invite_label?: string | null
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
  expires_at: string | null
  invite_label?: string | null
}

export interface CreateInviteResult {
  id: string
  display_name: string
  invite_label?: string | null
  invite_token: string
  invite_expires_at: string | null
}

export type FixtureStatus = 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled'
export type HomeAway = 'home' | 'away'
export type AvailabilityStatus = 'yes' | 'no' | 'maybe'
export type MatchEventType = 'goal' | 'assist' | 'motm' | 'yellow_card' | 'red_card' | 'substitution'

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
  related_player_id?: string | null
  related_player_name?: string
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

export type ClubEventType = 'social' | 'agm' | 'committee' | 'other'

export interface ClubEvent {
  id: string
  title: string
  event_type: ClubEventType
  event_date: string
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
  photo_url?: string | null
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
  | { type: 'event'; data: ClubEvent }
  | { type: 'fundraiser'; data: Fundraiser }

export interface PlayerMatchRecord {
  fixture: FixtureWithResult
  events: MatchEvent[]
}

export interface PlayerProfile {
  player_id: string
  display_name: string
  position: string | null
  joined_date: string | null
  photo_url?: string | null
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

export type FormationId = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2'

export interface LineupSlotAssignment {
  position: string
  player_id: string
}

export interface Lineup {
  id: string
  fixture_id: string
  formation: FormationId
  slots: LineupSlotAssignment[]
  created_at: string
  updated_at: string
}

export interface AvailablePlayer {
  player_id: string
  display_name: string
}

export interface Fundraiser {
  id: string
  name: string
  date: string
  notes: string | null
  created_at: string
}

export interface FundraiserParticipationRow {
  profile_id: string
  display_name: string
  participated: boolean
}

export interface FundraiserDetail {
  fundraiser: Fundraiser
  participants: FundraiserParticipationRow[]
}

export interface FundraiserParticipationSummaryRow {
  profile_id: string
  display_name: string
  participated_count: number
  total_fundraisers: number
}

export interface FundraiserParticipationSummary {
  total_fundraisers: number
  members: FundraiserParticipationSummaryRow[]
}

export type SponsorshipCategory = 'player_sponsor' | 'match_balls' | 'kit' | 'other'

export type ExpenseCategory =
  | 'pitch_hire'
  | 'referee_fees'
  | 'kit'
  | 'equipment'
  | 'admin_fees'
  | 'other'

export interface FinanceLedgerMeta {
  logged_by_id: string
  logged_by_name: string
  edited_by_id?: string | null
  edited_by_name?: string | null
  edited_at?: string | null
  created_at: string
}

export interface Sponsorship extends FinanceLedgerMeta {
  id: string
  sponsor_name: string
  category: SponsorshipCategory
  item_detail?: string | null
  amount: number
  paid: boolean
  date_added: string
}

export interface Expense extends FinanceLedgerMeta {
  id: string
  description: string
  category: ExpenseCategory
  amount: number
  expense_date: string
}

export interface FinanceCategoryBreakdown {
  category: string
  paid_amount?: number
  pending_amount?: number
  amount?: number
}

export interface FinanceOverview {
  paid_income: number
  pending_income: number
  total_expenses: number
  net_balance: number
  sponsorship_by_category: FinanceCategoryBreakdown[]
  expenses_by_category: FinanceCategoryBreakdown[]
}
