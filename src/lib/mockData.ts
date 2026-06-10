import type {
  AdminUserRow,
  Availability,
  Fixture,
  FixtureWithResult,
  LeagueTableRow,
  MatchEvent,
  PlayerStats,
  SquadMember,
  TrainingSession,
} from '../types'
import { buildDdsflMockState } from './ddsflMockImport'

export const CLUB_NAME = 'Bishop Middleham FC'
/** Matches DEV_USER.id in devBypass — preview login sees own profile + calendar */
export const PREVIEW_PLAYER_ID = '00000000-0000-0000-0000-000000000001'
export const LEAGUE_NAME = 'Swinburne Maddison Third Division'
export const CURRENT_SEASON = '2025/26'

const now = new Date()

function daysFromNow(days: number, hour = 10, minute = 30): string {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function daysAgo(days: number, hour = 10, minute = 30): string {
  return daysFromNow(-days, hour, minute)
}

/** Manually added matches (friendlies, cups) — merged with DDSFL scrape data. */
export const MANUAL_FIXTURES: Fixture[] = [
  {
    id: 'f5',
    match_date: daysFromNow(21),
    opponent: 'Crook Town Miners',
    home_away: 'home',
    competition: 'Alan Smith Memorial Trophy',
    venue: 'Bishop Middleham Recreation Ground',
    kickoff_time: '14:00:00',
    ddsfl_fixture_id: null,
    status: 'scheduled',
    created_at: daysAgo(2),
  },
  {
    id: 'f6',
    match_date: daysFromNow(17),
    opponent: 'Shildon Town',
    home_away: 'away',
    competition: 'Friendly',
    venue: 'Shildon Recreation Ground',
    kickoff_time: '10:30:00',
    ddsfl_fixture_id: null,
    status: 'scheduled',
    created_at: daysAgo(1),
  },
]

export const MOCK_SQUAD: SquadMember[] = [
  { id: 's1', player_id: 'p1', display_name: 'Tom Harrison', squad_number: null, position: 'Goalkeeper', joined_date: '2023-08-01', active: true },
  { id: 's2', player_id: 'p2', display_name: 'James Wilson', squad_number: null, position: 'Defender', joined_date: '2022-08-01', active: true },
  { id: 's3', player_id: 'p3', display_name: 'Mark Davies', squad_number: null, position: 'Midfielder', joined_date: '2021-08-01', active: true },
  { id: 's4', player_id: PREVIEW_PLAYER_ID, display_name: 'Chris Lee', squad_number: null, position: 'Forward', joined_date: '2020-08-01', active: true },
  { id: 's5', player_id: 'p5', display_name: 'Sam Patel', squad_number: null, position: 'Forward', joined_date: '2024-01-01', active: true },
  { id: 's6', player_id: 'p6', display_name: 'Alex Morgan', squad_number: null, position: 'Midfielder', joined_date: '2023-01-01', active: true },
]

export const MOCK_TRAINING: TrainingSession[] = [
  {
    id: 't1',
    session_date: daysFromNow(1, 19, 0),
    location: 'Bishop Middleham Recreation Ground',
    notes: 'Tactical session, set pieces',
    created_at: daysAgo(5),
  },
  {
    id: 't2',
    session_date: daysFromNow(8, 19, 0),
    location: 'Bishop Middleham Recreation Ground',
    notes: null,
    created_at: daysAgo(3),
  },
]

export const MOCK_ADMIN_USERS: AdminUserRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'preview_user',
    display_name: 'Preview Player',
    is_admin: false,
    is_committee: false,
    is_approved: true,
    created_at: '2025-08-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    username: 'pending_user',
    display_name: 'Pending Player',
    is_admin: false,
    is_committee: false,
    is_approved: false,
    created_at: '2026-05-01T00:00:00Z',
  },
]

const ddsflMock = buildDdsflMockState()

function createInitialMockState() {
  return {
    fixtures: [...ddsflMock.fixtures, ...MANUAL_FIXTURES],
    results: [...ddsflMock.results],
    leagueTableRows: [...ddsflMock.leagueTable],
    matchEvents: [] as MatchEvent[],
  }
}

// Mutable in-memory stores for dev interactions
const initialMock = createInitialMockState()
let fixtures = [...initialMock.fixtures]
let results = [...initialMock.results]
let leagueTableRows = [...initialMock.leagueTableRows]
let matchEvents = [...initialMock.matchEvents]
let training = [...MOCK_TRAINING]
let availability: Availability[] = []
let adminUsers = [...MOCK_ADMIN_USERS]
let squad = [...MOCK_SQUAD]
const mockInviteTokens = new Map<string, string>()

/** Stable token for dev previews and screenshot capture (/invite/demoinvite0001). */
export const MOCK_DEMO_INVITE_TOKEN = 'demoinvite0001'
mockInviteTokens.set(MOCK_DEMO_INVITE_TOKEN, '00000000-0000-0000-0000-000000000003')

function squadName(playerId: string): string {
  return squad.find((s) => s.player_id === playerId)?.display_name ?? 'Unknown'
}

function squadRowForUser(userId: string): SquadMember | undefined {
  return squad.find((s) => s.player_id === userId && s.active)
}

export function getMockFixturesWithResults(): FixtureWithResult[] {
  return fixtures
    .map((f) => ({
      ...f,
      result: results.find((r) => r.fixture_id === f.id),
      events: matchEvents
        .filter((e) => e.fixture_id === f.id)
        .map((e) => ({ ...e, player_name: squadName(e.player_id) })),
    }))
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
}

export function getMockUpcomingFixtures(): FixtureWithResult[] {
  return getMockFixturesWithResults()
    .filter((f) => f.status === 'scheduled')
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
}

export function getMockCompletedFixtures(): FixtureWithResult[] {
  return getMockFixturesWithResults().filter((f) => f.status === 'completed')
}

export function getMockLeagueTable(): LeagueTableRow[] {
  return [...leagueTableRows].sort((a, b) => a.position - b.position)
}

export function getMockTrainingSessions(): TrainingSession[] {
  return [...training].sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())
}

export function getMockSquad(): SquadMember[] {
  return squad.filter((s) => s.active)
}

export function getMockPlayerStats(): PlayerStats[] {
  const stats = new Map<string, PlayerStats>()

  for (const member of squad.filter((s) => s.active)) {
    stats.set(member.player_id, {
      player_id: member.player_id,
      display_name: member.display_name,
      squad_number: member.squad_number,
      position: member.position,
      appearances: 0,
      goals: 0,
      assists: 0,
      motm: 0,
      yellow_cards: 0,
      red_cards: 0,
      clean_sheets: 0,
    })
  }

  const completedIds = new Set(results.map((r) => r.fixture_id))
  const appearances = new Map<string, Set<string>>()

  for (const event of matchEvents) {
    const player = stats.get(event.player_id)
    if (!player) continue

    if (!appearances.has(event.player_id)) appearances.set(event.player_id, new Set())
    appearances.get(event.player_id)!.add(event.fixture_id)

    if (event.event_type === 'goal') player.goals++
    if (event.event_type === 'assist') player.assists++
    if (event.event_type === 'motm') player.motm++
    if (event.event_type === 'yellow_card') player.yellow_cards++
    if (event.event_type === 'red_card') player.red_cards++
  }

  for (const [playerId, set] of appearances) {
    const player = stats.get(playerId)
    if (player) player.appearances = set.size
  }

  const gk = stats.get('p1')
  if (gk) {
    gk.clean_sheets = results.filter((r) => r.goals_against === 0 && completedIds.has(r.fixture_id)).length
  }

  return Array.from(stats.values()).sort((a, b) => b.goals - a.goals || a.display_name.localeCompare(b.display_name))
}

export function getMockAvailability(playerId: string): Availability[] {
  return availability.filter((a) => a.player_id === playerId)
}

export function getMockAllAvailability(): Availability[] {
  return [...availability]
}

export function upsertMockAvailability(
  playerId: string,
  target: { fixtureId?: string; trainingId?: string },
  status: Availability['status'],
  message?: string | null
): Availability {
  const existing = availability.find(
    (a) =>
      a.player_id === playerId &&
      ((target.fixtureId && a.fixture_id === target.fixtureId) ||
        (target.trainingId && a.training_id === target.trainingId))
  )

  if (existing) {
    existing.status = status
    existing.message = message ?? null
    return existing
  }

  const row: Availability = {
    id: crypto.randomUUID(),
    player_id: playerId,
    fixture_id: target.fixtureId ?? null,
    training_id: target.trainingId ?? null,
    status,
    message: message ?? null,
    created_at: new Date().toISOString(),
  }
  availability.push(row)
  return row
}

export function getMockAdminUsers(): AdminUserRow[] {
  return adminUsers.map((u) => {
    const sq = squadRowForUser(u.id)
    return {
      ...u,
      invite_pending: [...mockInviteTokens.entries()].some(([, id]) => id === u.id),
      in_squad: Boolean(sq),
      squad_position: sq?.position ?? null,
    }
  })
}

export function createMockInvite(
  displayName: string,
  position?: string | null
): { id: string; display_name: string; invite_token: string } {
  const name = displayName.trim()
  if (adminUsers.some((u) => u.display_name.toLowerCase() === name.toLowerCase())) {
    throw new Error('That name is already registered')
  }

  const id = crypto.randomUUID()
  const token = crypto.randomUUID().replace(/-/g, '')
  const username = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 16) || 'player'

  adminUsers.push({
    id,
    username,
    display_name: name,
    is_admin: false,
    is_committee: false,
    is_approved: true,
    created_at: new Date().toISOString(),
    invite_pending: true,
  })
  mockInviteTokens.set(token, id)

  if (position?.trim()) {
    squad.push({
      id: crypto.randomUUID(),
      player_id: id,
      display_name: name,
      squad_number: null,
      position: position.trim(),
      joined_date: new Date().toISOString().slice(0, 10),
      active: true,
    })
  }

  return { id, display_name: name, invite_token: token }
}

export function setMockUserCommittee(userId: string, isCommittee: boolean) {
  const user = adminUsers.find((u) => u.id === userId)
  if (user && !user.is_admin) user.is_committee = isCommittee
}

export function resetMockPasscode(userId: string, passcode: string) {
  void userId
  void passcode
}

export function upsertMockSquad(playerId: string, displayName: string, position: string) {
  const existing = squad.find((s) => s.player_id === playerId)
  if (existing) {
    existing.position = position
    existing.active = true
    existing.display_name = displayName
    return existing
  }
  const row: SquadMember = {
    id: crypto.randomUUID(),
    player_id: playerId,
    display_name: displayName,
    squad_number: null,
    position,
    joined_date: new Date().toISOString().slice(0, 10),
    active: true,
  }
  squad.push(row)
  return row
}

export function removeMockSquad(playerId: string) {
  const row = squad.find((s) => s.player_id === playerId)
  if (row) row.active = false
}

export function addMockFixture(input: {
  match_date: string
  opponent: string
  home_away: 'home' | 'away'
  competition: string
  venue: string | null
  kickoff_time: string | null
}): Fixture {
  const row: Fixture = {
    id: crypto.randomUUID(),
    match_date: input.match_date,
    opponent: input.opponent,
    home_away: input.home_away,
    competition: input.competition,
    venue: input.venue,
    kickoff_time: input.kickoff_time,
    ddsfl_fixture_id: null,
    status: 'scheduled',
    created_at: new Date().toISOString(),
  }
  fixtures.push(row)
  return row
}

export function updateMockFixture(
  fixtureId: string,
  input: {
    match_date: string
    opponent: string
    home_away: 'home' | 'away'
    competition: string
    venue: string | null
    kickoff_time: string | null
  },
): Fixture {
  const row = fixtures.find((f) => f.id === fixtureId)
  if (!row) throw new Error('Fixture not found')
  if (row.ddsfl_fixture_id != null) {
    throw new Error('Cannot edit DDSFL-synced fixtures')
  }

  row.match_date = input.match_date
  row.opponent = input.opponent
  row.home_away = input.home_away
  row.competition = input.competition
  row.venue = input.venue
  row.kickoff_time = input.kickoff_time
  return row
}

export function removeMockFixture(fixtureId: string): void {
  const fixture = fixtures.find((f) => f.id === fixtureId)
  if (!fixture) throw new Error('Fixture not found')
  if (fixture.ddsfl_fixture_id != null) {
    throw new Error('Cannot delete DDSFL-synced fixtures')
  }

  fixtures = fixtures.filter((f) => f.id !== fixtureId)
  results = results.filter((r) => r.fixture_id !== fixtureId)
  matchEvents = matchEvents.filter((e) => e.fixture_id !== fixtureId)
  availability = availability.filter((a) => a.fixture_id !== fixtureId)
}

export function regenerateMockInvite(userId: string): { id: string; display_name: string; invite_token: string } {
  const user = adminUsers.find((u) => u.id === userId)
  if (!user) throw new Error('User not found')
  if (![...mockInviteTokens.values()].includes(userId)) {
    throw new Error('This player has already set up their account')
  }

  for (const [tok, id] of mockInviteTokens) {
    if (id === userId) mockInviteTokens.delete(tok)
  }

  const token = crypto.randomUUID().replace(/-/g, '')
  mockInviteTokens.set(token, userId)
  return { id: userId, display_name: user.display_name, invite_token: token }
}

export function getMockInvitePreview(token: string): { display_name: string; expires_at: string | null } {
  const userId = mockInviteTokens.get(token)
  if (!userId) throw new Error('Invite link not found')
  const user = adminUsers.find((u) => u.id === userId)
  if (!user) throw new Error('Invite link not found')
  return { display_name: user.display_name, expires_at: null }
}

export function completeMockInvite(token: string, passcode: string): import('../types').User | null {
  if (!/^\d{4}$/.test(passcode)) throw new Error('Passcode must be exactly 4 digits')

  const userId = mockInviteTokens.get(token)
  if (!userId) return null

  const user = adminUsers.find((u) => u.id === userId)
  if (!user) return null

  mockInviteTokens.delete(token)

  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    is_admin: user.is_admin,
    is_committee: user.is_committee,
    is_approved: true,
    session_token: 'mock-invite-session',
  }
}

export function setMockUserApproved(userId: string, approved: boolean) {
  const user = adminUsers.find((u) => u.id === userId)
  if (user) user.is_approved = approved
}

export function saveMockResult(
  fixtureId: string,
  goalsFor: number,
  goalsAgainst: number,
  notes: string | null,
  events: Omit<MatchEvent, 'id' | 'created_at'>[]
) {
  const fixture = fixtures.find((f) => f.id === fixtureId)
  if (fixture) fixture.status = 'completed'

  const existing = results.find((r) => r.fixture_id === fixtureId)
  if (existing) {
    existing.goals_for = goalsFor
    existing.goals_against = goalsAgainst
    existing.notes = notes
  } else {
    results.push({
      id: crypto.randomUUID(),
      fixture_id: fixtureId,
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      notes,
      created_at: new Date().toISOString(),
    })
  }

  matchEvents = matchEvents.filter((e) => e.fixture_id !== fixtureId)
  for (const e of events) {
    matchEvents.push({
      ...e,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    })
  }
}

export function addMockTrainingSession(session: Omit<TrainingSession, 'id' | 'created_at'>) {
  const row: TrainingSession = {
    ...session,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  training.push(row)
  return row
}

export function updateMockTrainingSession(
  trainingId: string,
  session: Omit<TrainingSession, 'id' | 'created_at'>,
): TrainingSession {
  const row = training.find((t) => t.id === trainingId)
  if (!row) throw new Error('Training session not found')
  row.session_date = session.session_date
  row.location = session.location
  row.notes = session.notes
  return row
}

export function removeMockTrainingSession(trainingId: string): void {
  const exists = training.some((t) => t.id === trainingId)
  if (!exists) throw new Error('Training session not found')
  training = training.filter((t) => t.id !== trainingId)
  availability = availability.filter((a) => a.training_id !== trainingId)
}

export function resetMockData() {
  const reset = createInitialMockState()
  fixtures = [...reset.fixtures]
  results = [...reset.results]
  leagueTableRows = [...reset.leagueTableRows]
  matchEvents = [...reset.matchEvents]
  training = [...MOCK_TRAINING]
  availability = []
  adminUsers = [...MOCK_ADMIN_USERS]
  squad = [...MOCK_SQUAD]
  mockInviteTokens.clear()
  mockInviteTokens.set(MOCK_DEMO_INVITE_TOKEN, '00000000-0000-0000-0000-000000000003')
}
