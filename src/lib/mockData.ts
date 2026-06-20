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
import type { LiveMatchDraft } from './liveMatchEvents'
import { clearLocalLiveDraft, readLocalLiveDraft, writeLocalLiveDraft } from './liveMatchDraftStorage'
import { buildDdsflMockState } from './ddsflMockImport'
import { isUpcomingScheduledFixture } from './fixtureFilters'
import {
  allocateUniqueDisplayName,
  allocateUniqueLoginName,
  allocateUniqueUsername,
  formatPlayerDisplayName,
  formatPlayerLoginName,
  formatPlayerUsernameBase,
  normalizeNamePart,
  validateNamePart,
} from './playerNames'
import { DDSFL_ACTIVE_SEASON, DDSFL_LEAGUE_NAME, DDSFL_SEASONS } from './ddsflConstants'
import { aggregatePlayerStats } from './playerStats'

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
  { id: 's1', player_id: 'p1', display_name: 'Tom H', squad_number: null, position: 'Goalkeeper', joined_date: '2023-08-01', active: true },
  { id: 's2', player_id: 'p2', display_name: 'James W', squad_number: null, position: 'Defender', joined_date: '2022-08-01', active: true },
  { id: 's3', player_id: 'p3', display_name: 'Mark D', squad_number: null, position: 'Midfielder', joined_date: '2021-08-01', active: true },
  { id: 's4', player_id: PREVIEW_PLAYER_ID, display_name: 'Chris L', squad_number: null, position: 'Forward', joined_date: '2020-08-01', active: true },
  { id: 's5', player_id: 'p5', display_name: 'Sam P', squad_number: null, position: 'Forward', joined_date: '2024-01-01', active: true },
  { id: 's6', player_id: 'p6', display_name: 'Alex M', squad_number: null, position: 'Midfielder', joined_date: '2023-01-01', active: true },
]

export const MOCK_TRAINING: TrainingSession[] = [
  {
    id: 't1',
    session_date: daysFromNow(1, 19, 0),
    location: 'Bishop Middleham Park',
    notes: 'Tactical session, set pieces',
    created_at: daysAgo(5),
  },
  {
    id: 't2',
    session_date: daysFromNow(8, 19, 0),
    location: 'Bishop Middleham Park',
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
    archived: false,
    created_at: daysAgo(2),
  },
  {
    id: 'fr2',
    name: 'Race night',
    date: dateOnlyFromNow(42),
    notes: null,
    archived: false,
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
    archived: false,
    created_at: daysAgo(3),
  },
  {
    id: 'ev2',
    title: 'Annual general meeting',
    event_type: 'agm',
    event_date: daysFromNow(35, 18, 0),
    location: 'Community Centre',
    notes: null,
    archived: false,
    created_at: daysAgo(1),
  },
]

export const MOCK_ADMIN_USERS: AdminUserRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'clee',
    display_name: 'Chris L',
    login_name: 'ChrisL',
    first_name: 'Chris',
    last_name: 'Lee',
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

type MockAdminUser = AdminUserRow & { invite_label?: string | null }

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

/** Pre-seeded pending player when VITE_E2E=true (Playwright). */
export const E2E_PENDING_APPROVAL_USER_ID = '00000000-0000-0000-0000-0000000000e2'

const E2E_SEED_USERS: MockAdminUser[] =
  import.meta.env.VITE_E2E === 'true'
    ? [
        {
          id: E2E_PENDING_APPROVAL_USER_ID,
          username: 'same2e',
          display_name: 'Sam E',
          login_name: 'SamE2e',
          first_name: 'Sam',
          last_name: 'E2e',
          is_admin: false,
          is_committee: false,
          is_approved: false,
          created_at: '2026-06-01T00:00:00Z',
        },
      ]
    : []

let adminUsers: MockAdminUser[] = [...MOCK_ADMIN_USERS, ...E2E_SEED_USERS]
let squad = [...MOCK_SQUAD]
const mockPasscodes = new Map<string, string>([[PREVIEW_PLAYER_ID, '1234']])
const mockPlayerPhotoUrls = new Map<string, string>()
const mockLiveDrafts = new Map<string, LiveMatchDraft>()

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

let mockTeamInvite: { token: string | null; enabled: boolean } = {
  token: null,
  enabled: false,
}

/** Stable token for dev previews and screenshot capture (/invite/demoinvite0001). */
export const MOCK_DEMO_INVITE_TOKEN = 'demoinvite0001'
mockInviteTokens.set(MOCK_DEMO_INVITE_TOKEN, '00000000-0000-0000-0000-000000000003')

const E2E_MOCK_STORAGE_KEY = 'bmfc_e2e_mock_snapshot'

type E2eMockSnapshot = {
  adminUsers: MockAdminUser[]
  passcodes: [string, string][]
  inviteTokens: [string, string][]
}

function persistE2eMockSnapshot(): void {
  if (import.meta.env.VITE_E2E !== 'true') return
  try {
    const snapshot: E2eMockSnapshot = {
      adminUsers: adminUsers.map((u) => ({ ...u })),
      passcodes: [...mockPasscodes.entries()],
      inviteTokens: [...mockInviteTokens.entries()],
    }
    localStorage.setItem(E2E_MOCK_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore quota / private mode
  }
}

function hydrateE2eMockSnapshot(): void {
  if (import.meta.env.VITE_E2E !== 'true') return
  try {
    const raw = localStorage.getItem(E2E_MOCK_STORAGE_KEY)
    if (!raw) return
    const snap = JSON.parse(raw) as E2eMockSnapshot
    if (!Array.isArray(snap.adminUsers)) return
    adminUsers = snap.adminUsers
    mockPasscodes.clear()
    for (const [k, v] of snap.passcodes ?? []) mockPasscodes.set(k, v)
    mockInviteTokens.clear()
    for (const [k, v] of snap.inviteTokens ?? []) mockInviteTokens.set(k, v)
  } catch {
    localStorage.removeItem(E2E_MOCK_STORAGE_KEY)
  }
}

hydrateE2eMockSnapshot()

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
  return aggregatePlayerStats(
    squad.filter((s) => s.active),
    getMockFixturesWithResults(),
    { lineupsByFixtureId: getMockLineupsByFixtureId() },
  ).stats
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

function applyMockPlayerNames(userId: string, firstName: string, lastName: string) {
  const first = validateNamePart(firstName, 'First name')
  const last = validateNamePart(lastName, 'Last name')

  if (
    adminUsers.some(
      (u) =>
        u.id !== userId &&
        u.first_name &&
        u.last_name &&
        u.first_name.toLowerCase() === first.toLowerCase() &&
        u.last_name.toLowerCase() === last.toLowerCase(),
    )
  ) {
    throw new Error('Someone with that name is already registered')
  }

  const user = adminUsers.find((u) => u.id === userId)
  if (!user) throw new Error('Player not found')

  const baseLogin = formatPlayerLoginName(first, last)
  const baseDisplay = formatPlayerDisplayName(first, last)
  const baseUsername = formatPlayerUsernameBase(first, last)
  user.first_name = first
  user.last_name = last
  user.login_name = allocateUniqueLoginName(baseLogin, (candidate) =>
    adminUsers.some((u) => u.id !== userId && (u.login_name ?? '').toLowerCase() === candidate.toLowerCase()),
  )
  user.display_name = allocateUniqueDisplayName(baseDisplay, (candidate) =>
    adminUsers.some((u) => u.id !== userId && u.display_name.toLowerCase() === candidate.toLowerCase()),
  )
  user.username = allocateUniqueUsername(baseUsername, (candidate) =>
    adminUsers.some((u) => u.id !== userId && u.username.toLowerCase() === candidate.toLowerCase()),
  )

  const sq = squad.find((s) => s.player_id === userId)
  if (sq) sq.display_name = user.display_name
}

export function createMockInvite(
  position?: string | null,
  inviteLabel?: string | null,
): { id: string; display_name: string; invite_label: string | null; invite_token: string } {
  const id = crypto.randomUUID()
  const token = crypto.randomUUID().replace(/-/g, '')
  const label = inviteLabel?.trim() || null
  const username = `inv_${token.slice(0, 12)}`

  adminUsers.push({
    id,
    username,
    display_name: label ?? 'New player',
    invite_label: label,
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
      display_name: label ?? 'New player',
      squad_number: null,
      position: position.trim(),
      joined_date: new Date().toISOString().slice(0, 10),
      active: true,
    })
  }

  persistE2eMockSnapshot()
  return { id, display_name: label ?? 'New player', invite_label: label, invite_token: token }
}

export function setMockUserCommittee(userId: string, isCommittee: boolean) {
  const user = adminUsers.find((u) => u.id === userId)
  if (user && !user.is_admin) user.is_committee = isCommittee
}

export function resetMockPasscode(userId: string, passcode: string) {
  if (!/^\d{4}$/.test(passcode)) throw new Error('Passcode must be 4 digits')
  mockPasscodes.set(userId, passcode)
  persistE2eMockSnapshot()
}

export function changeMockPasscode(userId: string, currentPasscode: string, newPasscode: string) {
  if (!/^\d{4}$/.test(newPasscode) || !/^\d{4}$/.test(currentPasscode)) {
    throw new Error('Passcode must be exactly 4 digits')
  }
  if (currentPasscode === newPasscode) throw new Error('Pick a different passcode')
  const stored = mockPasscodes.get(userId)
  if (!stored || stored !== currentPasscode) throw new Error('Current passcode is wrong')
  mockPasscodes.set(userId, newPasscode)
  persistE2eMockSnapshot()
}

export function updateMockPlayerNames(userId: string, firstName: string, lastName: string) {
  const user = adminUsers.find((u) => u.id === userId)
  if (!user) throw new Error('Player not found')
  if (user.invite_pending) throw new Error('Player has not finished invite setup yet')
  applyMockPlayerNames(userId, firstName, lastName)
  persistE2eMockSnapshot()
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

export function getMockLiveMatchDraft(fixtureId: string): LiveMatchDraft {
  const stored = mockLiveDrafts.get(fixtureId) ?? readLocalLiveDraft(fixtureId)
  if (stored) return stored
  return { fixture_id: fixtureId, entries: [], goals_for: 0, goals_against: 0 }
}

export function saveMockLiveMatchDraft(draft: LiveMatchDraft): void {
  mockLiveDrafts.set(draft.fixture_id, draft)
  writeLocalLiveDraft(draft)
}

export function clearMockLiveMatchDraft(fixtureId: string): void {
  mockLiveDrafts.delete(fixtureId)
  clearLocalLiveDraft(fixtureId)
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
  persistE2eMockSnapshot()
  return { id: userId, display_name: user.display_name, invite_token: token }
}

export function getMockInvitePreview(token: string): { expires_at: string | null; invite_label: string | null } {
  const userId = mockInviteTokens.get(token)
  if (!userId) throw new Error('Invite link not found')
  const user = adminUsers.find((u) => u.id === userId)
  if (!user) throw new Error('Invite link not found')
  return { expires_at: null, invite_label: user.invite_label ?? null }
}

export function completeMockInvite(
  token: string,
  firstName: string,
  lastName: string,
  passcode: string,
): import('../types').User | null {
  if (!/^\d{4}$/.test(passcode)) throw new Error('Passcode must be exactly 4 digits')

  const userId = mockInviteTokens.get(token)
  if (!userId) return null

  const user = adminUsers.find((u) => u.id === userId)
  if (!user) return null

  applyMockPlayerNames(userId, firstName, lastName)
  user.invite_label = null
  user.is_approved = false
  mockPasscodes.set(userId, passcode)
  mockInviteTokens.delete(token)
  persistE2eMockSnapshot()

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

export function getMockTeamInviteSettings(): import('../types').TeamInviteSettings {
  return { enabled: mockTeamInvite.enabled && Boolean(mockTeamInvite.token), token: mockTeamInvite.token }
}

function assertMockTeamInviteToken(token: string) {
  if (!mockTeamInvite.enabled || !mockTeamInvite.token || mockTeamInvite.token !== token) {
    throw new Error('Invite link not found')
  }
}

export function generateMockTeamInvite(): import('../types').TeamInviteSettings {
  const token = crypto.randomUUID().replace(/-/g, '')
  mockTeamInvite = { token, enabled: true }
  persistE2eMockSnapshot()
  return getMockTeamInviteSettings()
}

export function regenerateMockTeamInvite(): import('../types').TeamInviteSettings {
  const token = crypto.randomUUID().replace(/-/g, '')
  mockTeamInvite = { token, enabled: true }
  persistE2eMockSnapshot()
  return getMockTeamInviteSettings()
}

export function disableMockTeamInvite(): import('../types').TeamInviteSettings {
  mockTeamInvite = { ...mockTeamInvite, enabled: false }
  persistE2eMockSnapshot()
  return getMockTeamInviteSettings()
}

export function enableMockTeamInvite(): import('../types').TeamInviteSettings {
  if (!mockTeamInvite.token) throw new Error('Generate a team invite link first')
  mockTeamInvite = { ...mockTeamInvite, enabled: true }
  persistE2eMockSnapshot()
  return getMockTeamInviteSettings()
}

export function getMockTeamInvitePreview(token: string): { expires_at: string | null; invite_label: string | null; is_team_invite: boolean } {
  assertMockTeamInviteToken(token)
  return { expires_at: null, invite_label: 'Team invite', is_team_invite: true }
}

export function completeMockTeamInvite(
  token: string,
  firstName: string,
  lastName: string,
  passcode: string,
): import('../types').User {
  if (!/^\d{4}$/.test(passcode)) throw new Error('Passcode must be exactly 4 digits')
  assertMockTeamInviteToken(token)

  const first = normalizeNamePart(firstName)
  const last = normalizeNamePart(lastName)
  const existing = adminUsers.find(
    (u) =>
      u.first_name?.toLowerCase() === first.toLowerCase() &&
      u.last_name?.toLowerCase() === last.toLowerCase() &&
      mockPasscodes.has(u.id),
  )
  if (existing) {
    if (existing.is_approved) throw new Error('You\'ve already signed up. Go to login.')
    throw new Error('You\'ve already signed up. Waiting for approval.')
  }

  const id = crypto.randomUUID()
  const username = `inv_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
  adminUsers.push({
    id,
    username,
    display_name: 'New player',
    invite_label: null,
    is_admin: false,
    is_committee: false,
    is_approved: false,
    created_at: new Date().toISOString(),
    invite_pending: false,
  })
  applyMockPlayerNames(id, firstName, lastName)
  mockPasscodes.set(id, passcode)
  persistE2eMockSnapshot()

  const user = adminUsers.find((u) => u.id === id)!
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    is_admin: user.is_admin,
    is_committee: user.is_committee,
    is_approved: false,
    session_token: 'mock-team-invite-session',
  }
}

/** E2E-only mock login (VITE_E2E) — display name + passcode after invite approval. */
export function mockLoginByCredentials(displayName: string, passcode: string): import('../types').User | null {
  if (!import.meta.env.VITE_E2E || !/^\d{4}$/.test(passcode)) return null

  const normalized = displayName.trim().toLowerCase()
  const user = adminUsers.find(
    (u) => (u.login_name ?? u.display_name).toLowerCase() === normalized,
  )
  if (!user || !user.is_approved) return null
  if (mockPasscodes.get(user.id) !== passcode) return null

  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    is_admin: user.is_admin,
    is_committee: user.is_committee,
    is_approved: true,
    session_token: 'mock-e2e-login',
  }
}

export function setMockUserApproved(userId: string, approved: boolean) {
  const user = adminUsers.find((u) => u.id === userId)
  if (user) user.is_approved = approved
  persistE2eMockSnapshot()
}

export function saveMockResult(
  fixtureId: string,
  goalsFor: number,
  goalsAgainst: number,
  notes: string | null,
  events: Omit<MatchEvent, 'id' | 'created_at'>[],
  goalkeeperPlayerId: string | null = null,
) {
  const fixture = fixtures.find((f) => f.id === fixtureId)
  if (fixture) fixture.status = 'completed'

  const draft = mockLiveDrafts.get(fixtureId)
  const liveLogEntries = draft?.entries?.length ? [...draft.entries] : null

  const existing = results.find((r) => r.fixture_id === fixtureId)
  if (existing) {
    existing.goals_for = goalsFor
    existing.goals_against = goalsAgainst
    existing.notes = notes
    existing.goalkeeper_player_id = goalkeeperPlayerId
    if (liveLogEntries) existing.live_log_entries = liveLogEntries
  } else {
    results.push({
      id: crypto.randomUUID(),
      fixture_id: fixtureId,
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      notes,
      goalkeeper_player_id: goalkeeperPlayerId,
      live_log_entries: liveLogEntries,
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

  clearMockLiveMatchDraft(fixtureId)
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

export function getMockClubEvents(includeArchived = false): ClubEvent[] {
  return clubEvents
    .filter((e) => includeArchived || !e.archived)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
}

export function addMockClubEvent(
  input: Omit<ClubEvent, 'id' | 'created_at' | 'archived'>,
): ClubEvent {
  const row: ClubEvent = {
    ...input,
    archived: false,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  clubEvents.push(row)
  return row
}

export function updateMockClubEvent(
  eventId: string,
  input: Omit<ClubEvent, 'id' | 'created_at' | 'archived'>,
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

export function setMockClubEventArchived(eventId: string, archived: boolean): ClubEvent {
  const row = clubEvents.find((e) => e.id === eventId)
  if (!row) throw new Error('Event not found')
  row.archived = archived
  return row
}

export function removeMockClubEvent(eventId: string): void {
  const exists = clubEvents.some((e) => e.id === eventId)
  if (!exists) throw new Error('Event not found')
  clubEvents = clubEvents.filter((e) => e.id !== eventId)
}

export function getMockFundraisers(includeArchived = false): Fundraiser[] {
  return fundraisers
    .filter((f) => includeArchived || !f.archived)
    .sort((a, b) => {
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
    archived: false,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  fundraisers.push(row)
  fundraiserParticipation.set(row.id, new Map())
  return row
}

export function setMockFundraiserArchived(fundraiserId: string, archived: boolean): Fundraiser {
  const row = fundraisers.find((f) => f.id === fundraiserId)
  if (!row) throw new Error('Fundraiser not found')
  row.archived = archived
  return row
}

export function removeMockFundraiser(fundraiserId: string): void {
  const exists = fundraisers.some((f) => f.id === fundraiserId)
  if (!exists) throw new Error('Fundraiser not found')
  fundraisers = fundraisers.filter((f) => f.id !== fundraiserId)
  fundraiserParticipation.delete(fundraiserId)
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
  const total = fundraisers.filter((f) => !f.archived).length
  const members = squad
    .filter((m) => m.active)
    .map((m) => {
      let participated_count = 0
      for (const f of fundraisers) {
        if (f.archived) continue
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

export function getMockLineupsByFixtureId(): Map<string, Lineup | null> {
  return new Map(mockLineups.entries())
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
  adminUsers = [...MOCK_ADMIN_USERS, ...(import.meta.env.VITE_E2E === 'true' ? E2E_SEED_USERS : [])]
  squad = [...MOCK_SQUAD]
  mockPasscodes.clear()
  mockPasscodes.set(PREVIEW_PLAYER_ID, '1234')
  mockInviteTokens.clear()
  mockInviteTokens.set(MOCK_DEMO_INVITE_TOKEN, '00000000-0000-0000-0000-000000000003')
  seedMockFixtureAvailability()
}

/** Playwright: reset in-memory mock state between tests (window.__BMFC_E2E_RESET__). */
export function resetMockDataForE2e() {
  try {
    localStorage.removeItem(E2E_MOCK_STORAGE_KEY)
  } catch {
    // ignore
  }
  resetMockData()
}
