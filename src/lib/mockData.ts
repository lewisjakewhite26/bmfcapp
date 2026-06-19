import type {
  AdminUserRow,
  Availability,
  ClubEvent,
  Fixture,
  FixtureWithResult,
  FormationId,
  LeagueTableRow,
  Lineup,
  LineupSlotAssignment,
  MatchEvent,
  PlayerStats,
  SquadMember,
  TrainingSession,
  Fundraiser,
  FundraiserDetail,
  FundraiserParticipationRow,
  FundraiserParticipationSummary,
} from '../types'
import { buildDdsflMockState } from './ddsflMockImport'
import { isUpcomingScheduledFixture } from './fixtureFilters'
import { DDSFL_ACTIVE_SEASON, DDSFL_LEAGUE_NAME, DDSFL_SEASONS } from './ddsflConstants'

export const CLUB_NAME = 'Bishop Middleham FC'
/** Matches DEV_USER.id in devBypass — preview login sees own profile + calendar */
export const PREVIEW_PLAYER_ID = '00000000-0000-0000-0000-000000000001'
export const LEAGUE_NAME = DDSFL_LEAGUE_NAME
export const CURRENT_SEASON = DDSFL_SEASONS[DDSFL_ACTIVE_SEASON].appSeason

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

function dateOnlyFromNow(days: number): string {
  return daysFromNow(days).slice(0, 10)
}

/** Admin-added fixtures in mock mode (friendlies, cups). Empty by default — add via Admin → Fixtures. */
export const MANUAL_FIXTURES: Fixture[] = []

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

export const MOCK_FUNDRAISERS: Fundraiser[] = [
  {
    id: 'fr1',
    name: 'Bag pack at Tesco',
    date: dateOnlyFromNow(21),
    notes: 'Morning shift. All hands welcome',
    created_at: daysAgo(2),
  },
  {
    id: 'fr2',
    name: 'Race night',
    date: dateOnlyFromNow(42),
    notes: null,
    created_at: daysAgo(1),
  },
]

export const MOCK_CLUB_EVENTS: ClubEvent[] = [
  {
    id: 'ev1',
    title: 'Pre-season social',
    event_type: 'social',
    event_date: daysFromNow(12, 19, 30),
    location: 'The Crown, Bishop Middleham',
    notes: 'All squad welcome',
    created_at: daysAgo(3),
  },
  {
    id: 'ev2',
    title: 'Annual general meeting',
    event_type: 'agm',
    event_date: daysFromNow(35, 18, 0),
    location: 'Community Centre',
    notes: null,
    created_at: daysAgo(1),
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
let clubEvents = [...MOCK_CLUB_EVENTS]
let fundraisers = [...MOCK_FUNDRAISERS]
const fundraiserParticipation = new Map<string, Map<string, boolean>>()
let availability: Availability[] = []
const mockLineups = new Map<string, Lineup>()
let adminUsers = [...MOCK_ADMIN_USERS]
let squad = [...MOCK_SQUAD]
const mockPlayerPhotoUrls = new Map<string, string>()

function seedMockFundraiserParticipation() {
  fundraiserParticipation.clear()
  const fr1 = new Map<string, boolean>()
  fr1.set('p1', true)
  fr1.set('p2', true)
  fr1.set(PREVIEW_PLAYER_ID, true)
  fundraiserParticipation.set('fr1', fr1)
}

seedMockFundraiserParticipation()

function seedMockFixtureAvailability() {
  const next = [...fixtures]
    .filter((f) => isUpcomingScheduledFixture(f))
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())[0]
  if (!next) return

  for (const member of squad.filter((s) => s.active)) {
    availability.push({
      id: crypto.randomUUID(),
      player_id: member.player_id,
      fixture_id: next.id,
      training_id: null,
      status: 'yes',
      message: null,
      created_at: new Date().toISOString(),
    })
  }
}

seedMockFixtureAvailability()
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
    .filter((f) => isUpcomingScheduledFixture(f))
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
  return squad
    .filter((s) => s.active)
    .map((s) => ({
      ...s,
      photo_url: mockPlayerPhotoUrls.get(s.player_id) ?? null,
    }))
}

export function uploadMockPlayerPhoto(playerId: string, file: File): string {
  const existing = mockPlayerPhotoUrls.get(playerId)
  if (existing?.startsWith('blob:')) {
    URL.revokeObjectURL(existing)
  }
  const url = URL.createObjectURL(file)
  mockPlayerPhotoUrls.set(playerId, url)
  return url
}

export function deleteMockPlayerPhoto(playerId: string): void {
  const existing = mockPlayerPhotoUrls.get(playerId)
  if (existing?.startsWith('blob:')) {
    URL.revokeObjectURL(existing)
  }
  mockPlayerPhotoUrls.delete(playerId)
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

export function upsertMockSquad(
  playerId: string,
  displayName: string,
  position: string,
  squadNumber?: number | null,
) {
  const existing = squad.find((s) => s.player_id === playerId)
  if (existing) {
    existing.position = position
    existing.active = true
    existing.display_name = displayName
    if (squadNumber !== undefined) {
      existing.squad_number = squadNumber
    }
    return existing
  }
  const row: SquadMember = {
    id: crypto.randomUUID(),
    player_id: playerId,
    display_name: displayName,
    squad_number: squadNumber ?? null,
    position,
    joined_date: new Date().toISOString().slice(0, 10),
    active: true,
  }
  squad.push(row)
  return row
}

export function startMockLiveMatch(fixtureId: string) {
  const fixture = fixtures.find((f) => f.id === fixtureId)
  if (!fixture) throw new Error('Fixture not found')
  if (fixture.ddsfl_fixture_id != null) throw new Error('Only manually added fixtures can go live here')
  if (fixture.status !== 'scheduled' && fixture.status !== 'in_progress') {
    throw new Error('Fixture cannot go live')
  }
  fixture.status = 'in_progress'
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
    is_approved: false,
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

export function getMockClubEvents(): ClubEvent[] {
  return [...clubEvents].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
  )
}

export function addMockClubEvent(
  input: Omit<ClubEvent, 'id' | 'created_at'>,
): ClubEvent {
  const row: ClubEvent = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  clubEvents.push(row)
  return row
}

export function updateMockClubEvent(
  eventId: string,
  input: Omit<ClubEvent, 'id' | 'created_at'>,
): ClubEvent {
  const row = clubEvents.find((e) => e.id === eventId)
  if (!row) throw new Error('Event not found')
  row.title = input.title
  row.event_type = input.event_type
  row.event_date = input.event_date
  row.location = input.location
  row.notes = input.notes
  return row
}

export function removeMockClubEvent(eventId: string): void {
  const exists = clubEvents.some((e) => e.id === eventId)
  if (!exists) throw new Error('Event not found')
  clubEvents = clubEvents.filter((e) => e.id !== eventId)
}

export function getMockFundraisers(): Fundraiser[] {
  return [...fundraisers].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return b.created_at.localeCompare(a.created_at)
  })
}

export function addMockFundraiser(
  input: Pick<Fundraiser, 'name' | 'date' | 'notes'>,
): Fundraiser {
  const row: Fundraiser = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  fundraisers.push(row)
  fundraiserParticipation.set(row.id, new Map())
  return row
}

export function getMockFundraiserDetail(fundraiserId: string): FundraiserDetail {
  const fundraiser = fundraisers.find((f) => f.id === fundraiserId)
  if (!fundraiser) throw new Error('Fundraiser not found')

  const participation = fundraiserParticipation.get(fundraiserId) ?? new Map()

  return {
    fundraiser,
    participants: squad
      .filter((m) => m.active)
      .map((m) => ({
        profile_id: m.player_id,
        display_name: m.display_name,
        participated: participation.get(m.player_id) ?? false,
      }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name)),
  }
}

export function saveMockFundraiserParticipation(
  fundraiserId: string,
  entries: Pick<FundraiserParticipationRow, 'profile_id' | 'participated'>[],
): void {
  if (!fundraisers.some((f) => f.id === fundraiserId)) {
    throw new Error('Fundraiser not found')
  }

  const map = new Map<string, boolean>()
  for (const entry of entries) {
    if (!squad.some((m) => m.active && m.player_id === entry.profile_id)) {
      throw new Error('Invalid squad member')
    }
    map.set(entry.profile_id, entry.participated)
  }
  fundraiserParticipation.set(fundraiserId, map)
}

export function getMockFundraiserParticipationSummary(): FundraiserParticipationSummary {
  const total = fundraisers.length
  const members = squad
    .filter((m) => m.active)
    .map((m) => {
      let participated_count = 0
      for (const f of fundraisers) {
        const map = fundraiserParticipation.get(f.id)
        if (map?.get(m.player_id)) participated_count += 1
      }
      return {
        profile_id: m.player_id,
        display_name: m.display_name,
        participated_count,
        total_fundraisers: total,
      }
    })
    .sort((a, b) => {
      if (a.participated_count !== b.participated_count) {
        return a.participated_count - b.participated_count
      }
      return a.display_name.localeCompare(b.display_name)
    })

  return { total_fundraisers: total, members }
}

export function getMockLineup(fixtureId: string): Lineup | null {
  return mockLineups.get(fixtureId) ?? null
}

export function saveMockLineup(
  fixtureId: string,
  formation: FormationId,
  slots: LineupSlotAssignment[]
): Lineup {
  const existing = mockLineups.get(fixtureId)
  const now = new Date().toISOString()
  const row: Lineup = {
    id: existing?.id ?? crypto.randomUUID(),
    fixture_id: fixtureId,
    formation,
    slots: [...slots],
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }
  mockLineups.set(fixtureId, row)
  return row
}

export function resetMockData() {
  const reset = createInitialMockState()
  fixtures = [...reset.fixtures]
  results = [...reset.results]
  leagueTableRows = [...reset.leagueTableRows]
  matchEvents = [...reset.matchEvents]
  training = [...MOCK_TRAINING]
  clubEvents = [...MOCK_CLUB_EVENTS]
  fundraisers = [...MOCK_FUNDRAISERS]
  seedMockFundraiserParticipation()
  availability = []
  mockLineups.clear()
  adminUsers = [...MOCK_ADMIN_USERS]
  squad = [...MOCK_SQUAD]
  mockInviteTokens.clear()
  mockInviteTokens.set(MOCK_DEMO_INVITE_TOKEN, '00000000-0000-0000-0000-000000000003')
  seedMockFixtureAvailability()
}
