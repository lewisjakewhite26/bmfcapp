import { supabase, isSupabaseConfigured } from './supabase'
import { findClubTableRow } from './clubTeams'
import { aggregatePlayerStats } from './playerStats'
import { getClubSession } from './clubAuth'
import {
  addMockTrainingSession,
  updateMockTrainingSession,
  removeMockTrainingSession,
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
  getMockLineup,
  removeMockSquad,
  resetMockPasscode,
  saveMockLineup,
  setMockUserApproved,
  setMockUserCommittee,
  upsertMockAvailability,
  upsertMockSquad,
} from './mockData'
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
  HomeAway,
  Lineup,
  LineupSlotAssignment,
  PlayerProfile,
  PlayerStats,
  SquadMember,
  SquadPosition,
  TrainingSession,
} from '../types'

export { getMockInvitePreview, completeMockInvite } from './mockData'

/** Use mock data until the club hub Supabase project is wired up. */
export function isMockDataMode(): boolean {
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

  const { data: events, error: eErr } = await supabase.from('match_events').select('*, profiles(display_name)')
  if (eErr) throw eErr

  return (fixtures ?? []).map((f) => ({
    ...f,
    result: (results ?? []).find((r) => r.fixture_id === f.id),
    events: (events ?? [])
      .filter((e) => e.fixture_id === f.id)
      .map((e) => ({
        ...e,
        player_name: (e as { profiles?: { display_name: string } }).profiles?.display_name,
      })),
  }))
}

export async function fetchUpcomingFixtures(): Promise<FixtureWithResult[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockUpcomingFixtures()
  }
  const all = await fetchFixturesWithResults()
  return all.filter((f) => f.status === 'scheduled').sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
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
    .select('*, profiles(display_name)')
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
  displayName: string,
  position?: SquadPosition | null
): Promise<CreateInviteResult> {
  if (isMockDataMode()) {
    await delay()
    const row = createMockInvite(displayName, position)
    return { ...row, invite_expires_at: null }
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_create_invite', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_display_name: displayName.trim(),
    p_position: position ?? null,
  })
  if (error) throw error
  return data as CreateInviteResult
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
  position: SquadPosition
): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    upsertMockSquad(playerId, displayName, position)
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
    })),
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
