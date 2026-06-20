import { isUpcomingScheduledFixture } from './fixtureFilters'
import { supabase, isSupabaseConfigured } from './supabase'
import { findClubTableRow } from './clubTeams'
import { aggregatePlayerStats } from './playerStats'
import { getClubSession } from './clubAuth'
import { loadSession } from '../hooks/authContext'
import {
  addMockTrainingSession,
  updateMockTrainingSession,
  removeMockTrainingSession,
  getMockClubEvents,
  addMockClubEvent,
  updateMockClubEvent,
  removeMockClubEvent,
  setMockClubEventArchived,
  CURRENT_SEASON,
  getMockAdminUsers,
  getMockAllAvailability,
  getMockAvailability,
  getMockCompletedFixtures,
  getMockFixturesWithResults,
  getMockLeagueTable,
  getMockPlayerStats,
  getMockSquad,
  getMockTrainingSessions,
  getMockUpcomingFixtures,
  saveMockResult,
  addMockFixture,
  updateMockFixture,
  removeMockFixture,
  createMockInvite,
  regenerateMockInvite,
  updateMockPlayerNames,
  changeMockPasscode,
  getMockLineup,
  removeMockSquad,
  resetMockPasscode,
  saveMockLineup,
  setMockUserApproved,
  setMockUserCommittee,
  upsertMockAvailability,
  upsertMockSquad,
  getMockFundraisers,
  addMockFundraiser,
  setMockFundraiserArchived,
  removeMockFundraiser,
  getMockFundraiserDetail,
  saveMockFundraiserParticipation,
  getMockFundraiserParticipationSummary,
  uploadMockPlayerPhoto,
  deleteMockPlayerPhoto,
  startMockLiveMatch,
  getMockLiveMatchDraft,
  saveMockLiveMatchDraft,
  clearMockLiveMatchDraft,
} from './mockData'
import {
  addMockExpense,
  addMockSponsorship,
  deleteMockExpense,
  deleteMockSponsorship,
  getMockExpenses,
  getMockFinanceOverview,
  getMockSponsorships,
  updateMockExpense,
  updateMockSponsorship,
} from './mockFinance'
import { parseLiveDraftEntries } from './liveMatchDraftStorage'
import type { LiveMatchDraft } from './liveMatchEvents'
import { playerPhotoFileExt, validatePlayerPhotoFile } from './playerPhotos'
import type {
  AdminUserRow,
  Availability,
  AvailabilityStatus,
  DashboardSummary,
  FixtureWithResult,
  LeagueTableRow,
  MatchEvent,
  AvailablePlayer,
  CreateInviteResult,
  Fixture,
  FormationId,
  Fundraiser,
  FundraiserDetail,
  FundraiserParticipationRow,
  FundraiserParticipationSummary,
  HomeAway,
  Lineup,
  LineupSlotAssignment,
  PlayerProfile,
  PlayerStats,
  SquadMember,
  SquadPosition,
  TrainingSession,
  ClubEvent,
  Expense,
  ExpenseCategory,
  FinanceOverview,
  Sponsorship,
  SponsorshipCategory,
} from '../types'

export { getMockInvitePreview, completeMockInvite } from './mockData'

/** Use mock data until the club hub Supabase project is wired up. E2E builds always use mock. */
export function isMockDataMode(): boolean {
  if (import.meta.env.VITE_E2E === 'true') return true
  return import.meta.env.VITE_CLUB_DATA_SOURCE !== 'supabase' || !isSupabaseConfigured
}

function delay(ms = 120): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function fetchFixturesWithResults(): Promise<FixtureWithResult[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockFixturesWithResults()
  }

  const { data: fixtures, error: fErr } = await supabase.from('fixtures').select('*').order('match_date', { ascending: false })
  if (fErr) throw fErr

  const { data: results, error: rErr } = await supabase.from('results').select('*')
  if (rErr) throw rErr

  const { data: events, error: eErr } = await supabase
    .from('match_events')
    .select('*, profiles!match_events_player_id_fkey(display_name), related:profiles!match_events_related_player_id_fkey(display_name)')
  if (eErr) throw eErr

  return (fixtures ?? []).map((f) => ({
    ...f,
    result: (results ?? []).find((r) => r.fixture_id === f.id),
    events: (events ?? [])
      .filter((e) => e.fixture_id === f.id)
      .map((e) => {
        const row = e as {
          profiles?: { display_name: string }
          related?: { display_name: string } | null
        }
        return {
          ...e,
          player_name: row.profiles?.display_name,
          related_player_name: row.related?.display_name,
        }
      }),
  }))
}

export async function fetchUpcomingFixtures(): Promise<FixtureWithResult[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockUpcomingFixtures()
  }
  const all = await fetchFixturesWithResults()
  return all
    .filter((f) => isUpcomingScheduledFixture(f))
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
}

export async function fetchCompletedFixtures(): Promise<FixtureWithResult[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockCompletedFixtures()
  }
  const all = await fetchFixturesWithResults()
  return all.filter((f) => f.status === 'completed')
}

/** Manually added matches (friendlies, cups, etc.) — not from DDSFL sync. */
export async function fetchManualFixtures(): Promise<FixtureWithResult[]> {
  const all = await fetchFixturesWithResults()
  return all
    .filter((f) => f.ddsfl_fixture_id == null)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
}

export async function fetchLeagueTable(): Promise<LeagueTableRow[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockLeagueTable()
  }

  const { data, error } = await supabase
    .from('league_table_cache')
    .select('*')
    .eq('season', CURRENT_SEASON)
    .order('position')

  if (error) throw error
  return data ?? []
}

export async function fetchTrainingSessions(): Promise<TrainingSession[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockTrainingSessions()
  }

  const { data, error } = await supabase.from('training_sessions').select('*').order('session_date')
  if (error) throw error
  return data ?? []
}

export async function fetchSquad(): Promise<SquadMember[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockSquad()
  }

  const { data, error } = await supabase
    .from('squad')
    .select('*, profiles(display_name, photo_url)')
    .eq('active', true)

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    player_id: row.player_id,
    display_name: (row as { profiles: { display_name: string } }).profiles.display_name,
    squad_number: row.squad_number,
    position: row.position,
    joined_date: row.joined_date,
    active: row.active,
    photo_url: (row as { profiles: { photo_url: string | null } }).profiles.photo_url ?? null,
  }))
}

export async function fetchPlayerStats(): Promise<PlayerStats[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockPlayerStats()
  }

  const squad = await fetchSquad()
  const fixtures = await fetchFixturesWithResults()
  return aggregatePlayerStats(squad, fixtures)
}

export async function fetchPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  const [squad, statsList, fixtures] = await Promise.all([
    fetchSquad(),
    fetchPlayerStats(),
    fetchFixturesWithResults(),
  ])

  const member = squad.find((m) => m.player_id === playerId)
  if (!member) return null

  const stats = statsList.find((s) => s.player_id === playerId)
  if (!stats) return null

  const playerEvents = fixtures.flatMap((f) =>
    (f.events ?? [])
      .filter((e) => e.player_id === playerId)
      .map((e) => ({ fixture: f, event: e }))
  )

  const byFixture = new Map<string, PlayerProfile['matchHistory'][0]>()
  for (const { fixture, event } of playerEvents) {
    const existing = byFixture.get(fixture.id)
    if (existing) {
      existing.events.push(event)
    } else {
      byFixture.set(fixture.id, { fixture, events: [event] })
    }
  }

  const matchHistory = Array.from(byFixture.values()).sort(
    (a, b) => new Date(b.fixture.match_date).getTime() - new Date(a.fixture.match_date).getTime()
  )

  return {
    player_id: member.player_id,
    display_name: member.display_name,
    position: member.position,
    joined_date: member.joined_date,
    photo_url: member.photo_url ?? null,
    stats,
    matchHistory,
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const [upcoming, completed, table, training] = await Promise.all([
    fetchUpcomingFixtures(),
    fetchCompletedFixtures(),
    fetchLeagueTable(),
    fetchTrainingSessions(),
  ])

  const clubRow = findClubTableRow(table)
  const now = Date.now()

  return {
    nextFixture: upcoming[0] ?? null,
    lastResult: completed[0] ?? null,
    leaguePosition: clubRow?.position ?? null,
    leaguePoints: clubRow?.points ?? null,
    upcomingTraining: training.find((t) => new Date(t.session_date).getTime() > now) ?? null,
  }
}

export async function fetchAvailability(playerId: string): Promise<Availability[]> {
  if (isMockDataMode()) {
    await delay(60)
    return getMockAvailability(playerId)
  }

  const { data, error } = await supabase.from('availability').select('*').eq('player_id', playerId)
  if (error) throw error
  return data ?? []
}

export async function fetchAllAvailability(): Promise<Availability[]> {
  if (isMockDataMode()) {
    await delay(60)
    return getMockAllAvailability()
  }

  const { data, error } = await supabase.from('availability').select('*')
  if (error) throw error
  return data ?? []
}

export async function saveAvailability(
  playerId: string,
  target: { fixtureId?: string; trainingId?: string },
  status: AvailabilityStatus,
  message?: string | null
): Promise<Availability> {
  if (isMockDataMode()) {
    await delay(80)
    return upsertMockAvailability(playerId, target, status, message)
  }

  const session = getClubSession()
  if (!session || session.userId !== playerId) {
    throw new Error('Not signed in')
  }

  const { data, error } = await supabase.rpc('save_availability', {
    p_user_id: session.userId,
    p_session_token: session.sessionToken,
    p_fixture_id: target.fixtureId ?? null,
    p_training_id: target.trainingId ?? null,
    p_status: status,
    p_message: status === 'yes' ? null : (message ?? null),
  })

  if (error) throw error
  return data as Availability
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockAdminUsers()
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_list_profiles', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  return (data ?? []) as AdminUserRow[]
}

export async function createInvite(
  position?: SquadPosition | null,
  inviteLabel?: string | null,
): Promise<CreateInviteResult> {
  if (isMockDataMode()) {
    await delay()
    const row = createMockInvite(position, inviteLabel)
    return { ...row, invite_expires_at: null }
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_create_invite', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_position: position ?? null,
    p_invite_label: inviteLabel?.trim() || null,
  })
  if (error) throw error
  return data as CreateInviteResult
}

export async function updatePlayerNames(
  userId: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    updateMockPlayerNames(userId, firstName, lastName)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_update_player_names', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_target_id: userId,
    p_first_name: firstName.trim(),
    p_last_name: lastName.trim(),
  })
  if (error) throw error
}

export async function changePasscode(currentPasscode: string, newPasscode: string): Promise<void> {
  if (!/^\d{4}$/.test(newPasscode) || !/^\d{4}$/.test(currentPasscode)) {
    throw new Error('Passcode must be 4 digits')
  }

  if (isMockDataMode()) {
    await delay()
    const session = getClubSession()
    if (!session) throw new Error('Not signed in')
    changeMockPasscode(session.userId, currentPasscode, newPasscode)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('change_player_passcode', {
    p_user_id: session.userId,
    p_session_token: session.sessionToken,
    p_current_passcode: currentPasscode,
    p_new_passcode: newPasscode,
  })
  if (error) throw error
}

export async function setUserCommittee(userId: string, isCommittee: boolean): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    setMockUserCommittee(userId, isCommittee)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_set_user_roles', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_target_id: userId,
    p_is_committee: isCommittee,
  })
  if (error) throw error
}

export async function resetUserPasscode(userId: string, newPasscode: string): Promise<void> {
  if (!/^\d{4}$/.test(newPasscode)) throw new Error('Passcode must be 4 digits')

  if (isMockDataMode()) {
    await delay()
    resetMockPasscode(userId, newPasscode)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_reset_passcode', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_target_id: userId,
    p_new_passcode: newPasscode,
  })
  if (error) throw error
}

export async function upsertSquadMember(
  playerId: string,
  displayName: string,
  position: SquadPosition,
  squadNumber?: number | null,
): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    upsertMockSquad(playerId, displayName, position, squadNumber)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_upsert_squad', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
    p_position: position,
    p_joined_date: new Date().toISOString().slice(0, 10),
    p_squad_number: squadNumber ?? null,
  })
  if (error) throw error
}

export async function removeSquadMember(playerId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    removeMockSquad(playerId)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_remove_squad', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
  })
  if (error) throw error
}

export async function createFixture(input: {
  match_date: string
  opponent: string
  home_away: HomeAway
  competition: string
  venue: string | null
  kickoff_time: string | null
}): Promise<Fixture> {
  if (isMockDataMode()) {
    await delay()
    return addMockFixture(input)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_create_fixture', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_match_date: input.match_date,
    p_opponent: input.opponent,
    p_home_away: input.home_away,
    p_competition: input.competition,
    p_venue: input.venue,
    p_kickoff_time: input.kickoff_time,
  })
  if (error) throw error
  return data as Fixture
}

export async function updateFixture(
  fixtureId: string,
  input: {
    match_date: string
    opponent: string
    home_away: HomeAway
    competition: string
    venue: string | null
    kickoff_time: string | null
  },
): Promise<Fixture> {
  if (isMockDataMode()) {
    await delay()
    return updateMockFixture(fixtureId, input)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_update_fixture', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fixture_id: fixtureId,
    p_match_date: input.match_date,
    p_opponent: input.opponent,
    p_home_away: input.home_away,
    p_competition: input.competition,
    p_venue: input.venue,
    p_kickoff_time: input.kickoff_time,
  })
  if (error) throw error
  return data as Fixture
}

export async function deleteFixture(fixtureId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    removeMockFixture(fixtureId)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_delete_fixture', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fixture_id: fixtureId,
  })
  if (error) throw error
}

export async function regenerateInvite(userId: string): Promise<CreateInviteResult> {
  if (isMockDataMode()) {
    await delay()
    const row = regenerateMockInvite(userId)
    return { ...row, invite_expires_at: null }
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_regenerate_invite', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_target_id: userId,
  })
  if (error) throw error
  return data as CreateInviteResult
}

export async function approveUser(userId: string, approved: boolean): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    setMockUserApproved(userId, approved)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_set_user_approved', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_target_id: userId,
    p_approved: approved,
  })
  if (error) throw error
}

/** Manual fixtures eligible for live matchday logging. */
export async function fetchLiveMatchFixtures(): Promise<FixtureWithResult[]> {
  const manual = await fetchManualFixtures()
  return manual.filter((f) => f.status === 'scheduled' || f.status === 'in_progress')
}

export async function startLiveMatch(fixtureId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    startMockLiveMatch(fixtureId)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_start_live_match', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fixture_id: fixtureId,
  })
  if (error) throw error
}

export async function submitMatchResult(
  fixtureId: string,
  goalsFor: number,
  goalsAgainst: number,
  notes: string | null,
  events: Omit<MatchEvent, 'id' | 'created_at'>[]
): Promise<void> {
  if (isMockDataMode()) {
    await delay(150)
    saveMockResult(fixtureId, goalsFor, goalsAgainst, notes, events)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_submit_match_result', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fixture_id: fixtureId,
    p_goals_for: goalsFor,
    p_goals_against: goalsAgainst,
    p_notes: notes,
    p_events: events.map((e) => ({
      player_id: e.player_id,
      event_type: e.event_type,
      minute: e.minute,
      ...(e.related_player_id ? { related_player_id: e.related_player_id } : {}),
    })),
  })
  if (error) throw error
}

export async function getLiveMatchDraft(fixtureId: string): Promise<LiveMatchDraft> {
  if (isMockDataMode()) {
    await delay(60)
    return getMockLiveMatchDraft(fixtureId)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_get_live_match_draft', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fixture_id: fixtureId,
  })
  if (error) throw error

  const row = data as {
    fixture_id: string
    entries: unknown
    goals_for: number
    goals_against: number
    updated_at?: string
  } | null

  if (!row) {
    return { fixture_id: fixtureId, entries: [], goals_for: 0, goals_against: 0 }
  }

  return {
    fixture_id: row.fixture_id,
    entries: parseLiveDraftEntries(row.entries),
    goals_for: row.goals_for,
    goals_against: row.goals_against,
    updated_at: row.updated_at,
  }
}

export async function saveLiveMatchDraft(draft: LiveMatchDraft): Promise<void> {
  if (isMockDataMode()) {
    await delay(40)
    saveMockLiveMatchDraft(draft)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_save_live_match_draft', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fixture_id: draft.fixture_id,
    p_entries: draft.entries,
    p_goals_for: draft.goals_for,
    p_goals_against: draft.goals_against,
  })
  if (error) throw error
}

export async function clearLiveMatchDraft(fixtureId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay(40)
    clearMockLiveMatchDraft(fixtureId)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_clear_live_match_draft', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fixture_id: fixtureId,
  })
  if (error) throw error
}

export async function createTrainingSession(
  session: Omit<TrainingSession, 'id' | 'created_at'>
): Promise<TrainingSession> {
  if (isMockDataMode()) {
    await delay()
    return addMockTrainingSession(session)
  }

  const clubSession = getClubSession()
  if (!clubSession) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_create_training_session', {
    p_admin_id: clubSession.userId,
    p_session_token: clubSession.sessionToken,
    p_session_date: session.session_date,
    p_location: session.location,
    p_notes: session.notes,
  })
  if (error) throw error
  return data as TrainingSession
}

export async function updateTrainingSession(
  trainingId: string,
  session: Omit<TrainingSession, 'id' | 'created_at'>,
): Promise<TrainingSession> {
  if (isMockDataMode()) {
    await delay()
    return updateMockTrainingSession(trainingId, session)
  }

  const clubSession = getClubSession()
  if (!clubSession) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_update_training_session', {
    p_admin_id: clubSession.userId,
    p_session_token: clubSession.sessionToken,
    p_training_id: trainingId,
    p_session_date: session.session_date,
    p_location: session.location,
    p_notes: session.notes,
  })
  if (error) throw error
  return data as TrainingSession
}

export async function deleteTrainingSession(trainingId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    removeMockTrainingSession(trainingId)
    return
  }

  const clubSession = getClubSession()
  if (!clubSession) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_delete_training_session', {
    p_admin_id: clubSession.userId,
    p_session_token: clubSession.sessionToken,
    p_training_id: trainingId,
  })
  if (error) throw error
}

export async function fetchClubEvents(options?: { includeArchived?: boolean }): Promise<ClubEvent[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockClubEvents(Boolean(options?.includeArchived))
  }

  let query = supabase.from('club_events').select('*').order('event_date')
  if (!options?.includeArchived) {
    query = query.eq('archived', false)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []).map((row) => ({
    ...(row as ClubEvent),
    archived: Boolean((row as ClubEvent).archived),
  }))
}

export async function createClubEvent(
  input: Omit<ClubEvent, 'id' | 'created_at' | 'archived'>,
): Promise<ClubEvent> {
  if (isMockDataMode()) {
    await delay()
    return addMockClubEvent(input)
  }

  const clubSession = getClubSession()
  if (!clubSession) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_create_club_event', {
    p_admin_id: clubSession.userId,
    p_session_token: clubSession.sessionToken,
    p_title: input.title,
    p_event_type: input.event_type,
    p_event_date: input.event_date,
    p_location: input.location,
    p_notes: input.notes,
  })
  if (error) throw error
  return data as ClubEvent
}

export async function updateClubEvent(
  eventId: string,
  input: Omit<ClubEvent, 'id' | 'created_at' | 'archived'>,
): Promise<ClubEvent> {
  if (isMockDataMode()) {
    await delay()
    return updateMockClubEvent(eventId, input)
  }

  const clubSession = getClubSession()
  if (!clubSession) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_update_club_event', {
    p_admin_id: clubSession.userId,
    p_session_token: clubSession.sessionToken,
    p_event_id: eventId,
    p_title: input.title,
    p_event_type: input.event_type,
    p_event_date: input.event_date,
    p_location: input.location,
    p_notes: input.notes,
  })
  if (error) throw error
  return data as ClubEvent
}

export async function deleteClubEvent(eventId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    removeMockClubEvent(eventId)
    return
  }

  const clubSession = getClubSession()
  if (!clubSession) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_delete_club_event', {
    p_admin_id: clubSession.userId,
    p_session_token: clubSession.sessionToken,
    p_event_id: eventId,
  })
  if (error) throw error
}

export async function setClubEventArchived(eventId: string, archived: boolean): Promise<ClubEvent> {
  if (isMockDataMode()) {
    await delay()
    return setMockClubEventArchived(eventId, archived)
  }

  const clubSession = getClubSession()
  if (!clubSession) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_set_club_event_archived', {
    p_admin_id: clubSession.userId,
    p_session_token: clubSession.sessionToken,
    p_event_id: eventId,
    p_archived: archived,
  })
  if (error) throw error
  return data as ClubEvent
}

export async function fetchAvailablePlayersForFixture(fixtureId: string): Promise<AvailablePlayer[]> {
  const [allAvailability, squad] = await Promise.all([
    fetchAllAvailability(),
    fetchSquad(),
  ])

  const availableIds = new Set(
    allAvailability
      .filter((a) => a.fixture_id === fixtureId && a.status === 'yes')
      .map((a) => a.player_id)
  )

  return squad
    .filter((m) => availableIds.has(m.player_id))
    .map((m) => ({ player_id: m.player_id, display_name: m.display_name }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name))
}

export async function fetchLineup(fixtureId: string): Promise<Lineup | null> {
  if (isMockDataMode()) {
    await delay(60)
    return getMockLineup(fixtureId)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_get_lineup', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fixture_id: fixtureId,
  })
  if (error) throw error
  if (!data) return null
  return data as Lineup
}

export async function saveLineup(
  fixtureId: string,
  formation: FormationId,
  slots: LineupSlotAssignment[]
): Promise<Lineup> {
  if (isMockDataMode()) {
    await delay(80)
    return saveMockLineup(fixtureId, formation, slots)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_save_lineup', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fixture_id: fixtureId,
    p_formation: formation,
    p_slots: slots,
  })
  if (error) throw error
  return data as Lineup
}

export async function fetchFundraisers(options?: { includeArchived?: boolean; calendar?: boolean }): Promise<Fundraiser[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockFundraisers(Boolean(options?.includeArchived))
  }

  if (options?.calendar) {
    const { data, error } = await supabase
      .from('fundraisers')
      .select('*')
      .eq('archived', false)
      .order('date', { ascending: false })

    if (error) throw error
    return (data ?? []).map((row) => ({
      ...(row as Fundraiser),
      archived: Boolean((row as Fundraiser).archived),
    }))
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const user = loadSession()
  if (!user?.is_admin && !user?.is_committee) {
    return []
  }

  const { data, error } = await supabase.rpc('admin_list_fundraisers', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  const rows = (data ?? []) as Fundraiser[]
  if (options?.includeArchived) return rows
  return rows.filter((f) => !f.archived)
}

export async function createFundraiser(
  input: Pick<Fundraiser, 'name' | 'date' | 'notes'>,
): Promise<Fundraiser> {
  if (isMockDataMode()) {
    await delay()
    return addMockFundraiser(input)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_create_fundraiser', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_name: input.name,
    p_date: input.date,
    p_notes: input.notes,
  })
  if (error) throw error
  return data as Fundraiser
}

export async function setFundraiserArchived(fundraiserId: string, archived: boolean): Promise<Fundraiser> {
  if (isMockDataMode()) {
    await delay()
    return setMockFundraiserArchived(fundraiserId, archived)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_set_fundraiser_archived', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fundraiser_id: fundraiserId,
    p_archived: archived,
  })
  if (error) throw error
  return data as Fundraiser
}

export async function deleteFundraiser(fundraiserId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    removeMockFundraiser(fundraiserId)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_delete_fundraiser', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fundraiser_id: fundraiserId,
  })
  if (error) throw error
}

export async function fetchFundraiserDetail(fundraiserId: string): Promise<FundraiserDetail> {
  if (isMockDataMode()) {
    await delay()
    return getMockFundraiserDetail(fundraiserId)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_get_fundraiser_participation', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fundraiser_id: fundraiserId,
  })
  if (error) throw error
  return data as FundraiserDetail
}

export async function saveFundraiserParticipation(
  fundraiserId: string,
  entries: Pick<FundraiserParticipationRow, 'profile_id' | 'participated'>[],
): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    saveMockFundraiserParticipation(fundraiserId, entries)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_save_fundraiser_participation', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_fundraiser_id: fundraiserId,
    p_entries: entries,
  })
  if (error) throw error
}

export async function fetchFundraiserParticipationSummary(): Promise<FundraiserParticipationSummary> {
  if (isMockDataMode()) {
    await delay()
    return getMockFundraiserParticipationSummary()
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_fundraiser_participation_summary', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  return data as FundraiserParticipationSummary
}

export async function uploadPlayerPhoto(playerId: string, file: File): Promise<string> {
  validatePlayerPhotoFile(file)

  if (isMockDataMode()) {
    await delay()
    return uploadMockPlayerPhoto(playerId, file)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const ext = playerPhotoFileExt(file)

  const { data: prep, error: prepErr } = await supabase.rpc('admin_prepare_player_photo_upload', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
    p_file_ext: ext,
  })
  if (prepErr) throw prepErr

  const path = (prep as { path: string }).path

  const { error: uploadErr } = await supabase.storage
    .from('player-photos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadErr) throw uploadErr

  const { data: confirmed, error: confirmErr } = await supabase.rpc('admin_confirm_player_photo_upload', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
    p_storage_path: path,
  })
  if (confirmErr) throw confirmErr

  return (confirmed as { photo_url: string }).photo_url
}

export async function deletePlayerPhoto(playerId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    deleteMockPlayerPhoto(playerId)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_delete_player_photo', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_player_id: playerId,
  })
  if (error) throw error
}

function num(value: unknown): number {
  return typeof value === 'number' ? value : Number(value)
}

function mapSponsorship(row: Record<string, unknown>): Sponsorship {
  return {
    id: row.id as string,
    sponsor_name: row.sponsor_name as string,
    category: row.category as SponsorshipCategory,
    item_detail: (row.item_detail as string | null) ?? null,
    amount: num(row.amount),
    paid: Boolean(row.paid),
    date_added: row.date_added as string,
    logged_by_id: row.logged_by_id as string,
    logged_by_name: row.logged_by_name as string,
    edited_by_id: (row.edited_by_id as string | null) ?? null,
    edited_by_name: (row.edited_by_name as string | null) ?? null,
    edited_at: (row.edited_at as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

function mapExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    description: row.description as string,
    category: row.category as ExpenseCategory,
    amount: num(row.amount),
    expense_date: row.expense_date as string,
    logged_by_id: row.logged_by_id as string,
    logged_by_name: row.logged_by_name as string,
    edited_by_id: (row.edited_by_id as string | null) ?? null,
    edited_by_name: (row.edited_by_name as string | null) ?? null,
    edited_at: (row.edited_at as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

export async function fetchFinanceOverview(): Promise<FinanceOverview> {
  if (isMockDataMode()) {
    await delay()
    return getMockFinanceOverview()
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_finance_overview', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error

  const row = data as Record<string, unknown>
  return {
    paid_income: num(row.paid_income),
    pending_income: num(row.pending_income),
    total_expenses: num(row.total_expenses),
    net_balance: num(row.net_balance),
    sponsorship_by_category: (row.sponsorship_by_category as FinanceOverview['sponsorship_by_category']) ?? [],
    expenses_by_category: (row.expenses_by_category as FinanceOverview['expenses_by_category']) ?? [],
  }
}

export async function fetchSponsorships(): Promise<Sponsorship[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockSponsorships()
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_list_sponsorships', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(mapSponsorship)
}

export async function createSponsorship(input: {
  sponsor_name: string
  category: SponsorshipCategory
  item_detail?: string | null
  amount: number
  paid: boolean
  date_added: string
}): Promise<Sponsorship> {
  if (isMockDataMode()) {
    await delay()
    return addMockSponsorship(input)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_create_sponsorship', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_sponsor_name: input.sponsor_name.trim(),
    p_category: input.category,
    p_item_detail: input.item_detail ?? null,
    p_amount: input.amount,
    p_paid: input.paid,
    p_date_added: input.date_added,
  })
  if (error) throw error
  return mapSponsorship(data as Record<string, unknown>)
}

export async function updateSponsorship(
  id: string,
  input: {
    sponsor_name: string
    category: SponsorshipCategory
    item_detail?: string | null
    amount: number
    paid: boolean
    date_added: string
  },
): Promise<Sponsorship> {
  if (isMockDataMode()) {
    await delay()
    return updateMockSponsorship(id, input)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_update_sponsorship', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_sponsorship_id: id,
    p_sponsor_name: input.sponsor_name.trim(),
    p_category: input.category,
    p_item_detail: input.item_detail ?? null,
    p_amount: input.amount,
    p_paid: input.paid,
    p_date_added: input.date_added,
  })
  if (error) throw error
  return mapSponsorship(data as Record<string, unknown>)
}

export async function deleteSponsorship(id: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    deleteMockSponsorship(id)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_delete_sponsorship', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_sponsorship_id: id,
  })
  if (error) throw error
}

export async function fetchExpenses(): Promise<Expense[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockExpenses()
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_list_expenses', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(mapExpense)
}

export async function createExpense(input: {
  description: string
  category: ExpenseCategory
  amount: number
  expense_date: string
}): Promise<Expense> {
  if (isMockDataMode()) {
    await delay()
    return addMockExpense(input)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_create_expense', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_description: input.description.trim(),
    p_category: input.category,
    p_amount: input.amount,
    p_expense_date: input.expense_date,
  })
  if (error) throw error
  return mapExpense(data as Record<string, unknown>)
}

export async function updateExpense(
  id: string,
  input: {
    description: string
    category: ExpenseCategory
    amount: number
    expense_date: string
  },
): Promise<Expense> {
  if (isMockDataMode()) {
    await delay()
    return updateMockExpense(id, input)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_update_expense', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_expense_id: id,
    p_description: input.description.trim(),
    p_category: input.category,
    p_amount: input.amount,
    p_expense_date: input.expense_date,
  })
  if (error) throw error
  return mapExpense(data as Record<string, unknown>)
}

export async function deleteExpense(id: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    deleteMockExpense(id)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_delete_expense', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_expense_id: id,
  })
  if (error) throw error
}
