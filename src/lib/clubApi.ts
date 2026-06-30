import { isUpcomingScheduledFixture } from './fixtureFilters'
import { supabase, isSupabaseConfigured } from './supabase'
import { findClubTableRow } from './clubTeams'
import { aggregatePlayerStats } from './playerStats'
import { auditCleanSheetFixtures } from './cleanSheet'
import { filterFixturesForStatsScope, type StatsScope } from './seasonScope'
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
  getMockTeamInviteSettings,
  generateMockTeamInvite,
  regenerateMockTeamInvite,
  disableMockTeamInvite,
  enableMockTeamInvite,
  updateMockPlayerNames,
  changeMockPasscode,
  getMockLineup,
  getMockLineupsByFixtureId,
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
  getMockSigningOnFees,
  setMockSigningOnPaid,
  updateMockExpense,
  updateMockSponsorship,
} from './mockFinance'
import {
  createMockFineSession,
  deleteMockFineSession,
  getMockFineSessionDetail,
  getMockFineSessions,
  getMockFinesOverview,
  getMockOutstandingFinesSummary,
  getMockPlayerFines,
  setMockFineEntry,
  setMockFinePaid,
} from './mockFines'
import { parseLiveDraftEntries } from './liveMatchDraftStorage'
import { recordAdminAudit } from './adminAudit'
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
  SigningOnFeeRow,
  SigningOnFeesSummary,
  FineSession,
  FineSessionDetail,
  FineEntry,
  FinesOverview,
  PlayerFinesSummaryRow,
  TeamInviteSettings,
} from '../types'

export {
  getMockInvitePreview,
  completeMockInvite,
  getMockTeamInvitePreview,
  completeMockTeamInvite,
} from './mockData'

export { fetchAuditLog } from './adminAudit'

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
    result: (() => {
      const row = (results ?? []).find((r) => r.fixture_id === f.id)
      if (!row) return undefined
      return {
        ...row,
        live_log_entries: row.live_log_entries
          ? parseLiveDraftEntries(row.live_log_entries)
          : null,
      }
    })(),
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
  return all
    .filter((f) => f.status === 'completed')
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
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

export async function fetchLineupsByFixtureId(): Promise<Map<string, Lineup | null>> {
  if (isMockDataMode()) {
    await delay(40)
    return getMockLineupsByFixtureId()
  }

  const { data, error } = await supabase.from('lineups').select('*')
  if (error) throw error

  const map = new Map<string, Lineup | null>()
  for (const row of data ?? []) {
    map.set(row.fixture_id, row as Lineup)
  }
  return map
}

export async function fetchPlayerStats(scope: StatsScope): Promise<PlayerStats[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockPlayerStats()
  }

  const [squad, fixtures, lineupsByFixtureId] = await Promise.all([
    fetchSquad(),
    fetchFixturesWithResults(),
    fetchLineupsByFixtureId(),
  ])
  const scoped = filterFixturesForStatsScope(fixtures, scope)
  return aggregatePlayerStats(squad, scoped, { lineupsByFixtureId }).stats
}

export async function fetchCleanSheetAudit() {
  const [squad, fixtures, lineupsByFixtureId] = await Promise.all([
    fetchSquad(),
    fetchFixturesWithResults(),
    fetchLineupsByFixtureId(),
  ])
  return auditCleanSheetFixtures(squad, fixtures, lineupsByFixtureId)
}

export async function fetchPlayerProfile(playerId: string, scope: StatsScope): Promise<PlayerProfile | null> {
  const [squad, fixtures, lineupsByFixtureId] = await Promise.all([
    fetchSquad(),
    fetchFixturesWithResults(),
    fetchLineupsByFixtureId(),
  ])

  const member = squad.find((m) => m.player_id === playerId)
  if (!member) return null

  const scopedFixtures = filterFixturesForStatsScope(fixtures, scope)
  const statsList = aggregatePlayerStats(squad, scopedFixtures, { lineupsByFixtureId }).stats
  const stats = statsList.find((s) => s.player_id === playerId)
  if (!stats) return null

  const scopedIds = new Set(scopedFixtures.map((f) => f.id))
  const playerEvents = fixtures.flatMap((f) =>
    scopedIds.has(f.id)
      ? (f.events ?? [])
          .filter((e) => e.player_id === playerId)
          .map((e) => ({ fixture: f, event: e }))
      : [],
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
    void recordAdminAudit('invite_created', {
      entityType: 'profile',
      entityId: row.id,
      details: { display_name: row.display_name, invite_label: row.invite_label ?? null },
    })
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
  const result = data as CreateInviteResult
  void recordAdminAudit('invite_created', {
    entityType: 'profile',
    entityId: result.id,
    details: { display_name: result.display_name, invite_label: result.invite_label ?? null },
  })
  return result
}

export async function fetchTeamInviteSettings(): Promise<TeamInviteSettings> {
  if (isMockDataMode()) {
    await delay()
    return getMockTeamInviteSettings()
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_get_team_invite', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  return data as TeamInviteSettings
}

export async function generateTeamInvite(): Promise<TeamInviteSettings> {
  if (isMockDataMode()) {
    await delay()
    const settings = generateMockTeamInvite()
    void recordAdminAudit('team_invite_generated')
    return settings
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_generate_team_invite', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  void recordAdminAudit('team_invite_generated')
  return data as TeamInviteSettings
}

export async function regenerateTeamInvite(): Promise<TeamInviteSettings> {
  if (isMockDataMode()) {
    await delay()
    const settings = regenerateMockTeamInvite()
    void recordAdminAudit('team_invite_regenerated')
    return settings
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_regenerate_team_invite', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  void recordAdminAudit('team_invite_regenerated')
  return data as TeamInviteSettings
}

export async function disableTeamInvite(): Promise<TeamInviteSettings> {
  if (isMockDataMode()) {
    await delay()
    const settings = disableMockTeamInvite()
    void recordAdminAudit('team_invite_disabled')
    return settings
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_disable_team_invite', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  void recordAdminAudit('team_invite_disabled')
  return data as TeamInviteSettings
}

export async function enableTeamInvite(): Promise<TeamInviteSettings> {
  if (isMockDataMode()) {
    await delay()
    const settings = enableMockTeamInvite()
    void recordAdminAudit('team_invite_enabled')
    return settings
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_enable_team_invite', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  void recordAdminAudit('team_invite_enabled')
  return data as TeamInviteSettings
}

export async function updatePlayerNames(
  userId: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    updateMockPlayerNames(userId, firstName, lastName)
    void recordAdminAudit('user_names_updated', {
      entityType: 'profile',
      entityId: userId,
      details: { display_name: `${firstName} ${lastName}`.trim() },
    })
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
  void recordAdminAudit('user_names_updated', {
    entityType: 'profile',
    entityId: userId,
    details: { display_name: `${firstName} ${lastName}`.trim() },
  })
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
    void recordAdminAudit('user_roles_updated', {
      entityType: 'profile',
      entityId: userId,
      details: { is_committee: isCommittee },
    })
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
  void recordAdminAudit('user_roles_updated', {
    entityType: 'profile',
    entityId: userId,
    details: { is_committee: isCommittee },
  })
}

export async function resetUserPasscode(userId: string, newPasscode: string): Promise<void> {
  if (!/^\d{4}$/.test(newPasscode)) throw new Error('Passcode must be 4 digits')

  if (isMockDataMode()) {
    await delay()
    resetMockPasscode(userId, newPasscode)
    void recordAdminAudit('passcode_reset', { entityType: 'profile', entityId: userId })
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
  void recordAdminAudit('passcode_reset', { entityType: 'profile', entityId: userId })
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
    void recordAdminAudit('squad_upserted', {
      entityType: 'profile',
      entityId: playerId,
      details: { display_name: displayName, position },
    })
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
  void recordAdminAudit('squad_upserted', {
    entityType: 'profile',
    entityId: playerId,
    details: { display_name: displayName, position },
  })
}

export async function removeSquadMember(playerId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    removeMockSquad(playerId)
    void recordAdminAudit('squad_removed', { entityType: 'profile', entityId: playerId })
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
  void recordAdminAudit('squad_removed', { entityType: 'profile', entityId: playerId })
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
    const fixture = addMockFixture(input)
    void recordAdminAudit('fixture_created', {
      entityType: 'fixture',
      entityId: fixture.id,
      details: { opponent: input.opponent, match_date: input.match_date },
    })
    return fixture
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
  const fixture = data as Fixture
  void recordAdminAudit('fixture_created', {
    entityType: 'fixture',
    entityId: fixture.id,
    details: { opponent: input.opponent, match_date: input.match_date },
  })
  return fixture
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
    const fixture = updateMockFixture(fixtureId, input)
    void recordAdminAudit('fixture_updated', {
      entityType: 'fixture',
      entityId: fixtureId,
      details: { opponent: input.opponent, match_date: input.match_date },
    })
    return fixture
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
  void recordAdminAudit('fixture_updated', {
    entityType: 'fixture',
    entityId: fixtureId,
    details: { opponent: input.opponent, match_date: input.match_date },
  })
  return data as Fixture
}

export async function deleteFixture(fixtureId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    removeMockFixture(fixtureId)
    void recordAdminAudit('fixture_deleted', { entityType: 'fixture', entityId: fixtureId })
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
  void recordAdminAudit('fixture_deleted', { entityType: 'fixture', entityId: fixtureId })
}

export async function regenerateInvite(userId: string): Promise<CreateInviteResult> {
  if (isMockDataMode()) {
    await delay()
    const row = regenerateMockInvite(userId)
    void recordAdminAudit('invite_regenerated', {
      entityType: 'profile',
      entityId: userId,
      details: { display_name: row.display_name },
    })
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
  const result = data as CreateInviteResult
  void recordAdminAudit('invite_regenerated', {
    entityType: 'profile',
    entityId: userId,
    details: { display_name: result.display_name },
  })
  return result
}

export async function approveUser(userId: string, approved: boolean): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    setMockUserApproved(userId, approved)
    void recordAdminAudit(approved ? 'user_approved' : 'user_unapproved', {
      entityType: 'profile',
      entityId: userId,
    })
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

  // Approved players must appear in the squad so they are included in fines,
  // signing-on fees, availability, stats, etc. Only create a row when one is
  // missing so we never overwrite an admin's existing squad data.
  if (approved) {
    const { data: existingSquad, error: squadLookupError } = await supabase
      .from('squad')
      .select('id')
      .eq('player_id', userId)
      .maybeSingle()
    if (squadLookupError) throw squadLookupError
    if (!existingSquad) {
      const { error: squadError } = await supabase.rpc('admin_upsert_squad', {
        p_admin_id: session.userId,
        p_session_token: session.sessionToken,
        p_player_id: userId,
        p_position: null,
        p_joined_date: new Date().toISOString().slice(0, 10),
        p_squad_number: null,
      })
      if (squadError) throw squadError
    }
  }

  void recordAdminAudit(approved ? 'user_approved' : 'user_unapproved', {
    entityType: 'profile',
    entityId: userId,
  })
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
    void recordAdminAudit('live_match_started', { entityType: 'fixture', entityId: fixtureId })
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
  void recordAdminAudit('live_match_started', { entityType: 'fixture', entityId: fixtureId })
}

export async function submitMatchResult(
  fixtureId: string,
  goalsFor: number,
  goalsAgainst: number,
  notes: string | null,
  events: Omit<MatchEvent, 'id' | 'created_at'>[],
  goalkeeperPlayerId?: string | null,
): Promise<void> {
  if (isMockDataMode()) {
    await delay(150)
    saveMockResult(fixtureId, goalsFor, goalsAgainst, notes, events, goalkeeperPlayerId ?? null)
    void recordAdminAudit('match_result_submitted', {
      entityType: 'fixture',
      entityId: fixtureId,
      details: { goals_for: goalsFor, goals_against: goalsAgainst },
    })
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
    p_goalkeeper_player_id: goalkeeperPlayerId ?? null,
  })
  if (error) throw error
  void recordAdminAudit('match_result_submitted', {
    entityType: 'fixture',
    entityId: fixtureId,
    details: { goals_for: goalsFor, goals_against: goalsAgainst },
  })
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
    void recordAdminAudit('live_draft_cleared', { entityType: 'fixture', entityId: fixtureId })
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
  void recordAdminAudit('live_draft_cleared', { entityType: 'fixture', entityId: fixtureId })
}

export async function createTrainingSession(
  session: Omit<TrainingSession, 'id' | 'created_at'>
): Promise<TrainingSession> {
  if (isMockDataMode()) {
    await delay()
    const created = addMockTrainingSession(session)
    void recordAdminAudit('training_created', {
      entityType: 'training',
      entityId: created.id,
      details: { session_date: session.session_date },
    })
    return created
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
  const created = data as TrainingSession
  void recordAdminAudit('training_created', {
    entityType: 'training',
    entityId: created.id,
    details: { session_date: session.session_date },
  })
  return created
}

export async function updateTrainingSession(
  trainingId: string,
  session: Omit<TrainingSession, 'id' | 'created_at'>,
): Promise<TrainingSession> {
  if (isMockDataMode()) {
    await delay()
    const updated = updateMockTrainingSession(trainingId, session)
    void recordAdminAudit('training_updated', {
      entityType: 'training',
      entityId: trainingId,
      details: { session_date: session.session_date },
    })
    return updated
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
  void recordAdminAudit('training_updated', {
    entityType: 'training',
    entityId: trainingId,
    details: { session_date: session.session_date },
  })
  return data as TrainingSession
}

export async function deleteTrainingSession(trainingId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    removeMockTrainingSession(trainingId)
    void recordAdminAudit('training_deleted', { entityType: 'training', entityId: trainingId })
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
  void recordAdminAudit('training_deleted', { entityType: 'training', entityId: trainingId })
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
    const event = addMockClubEvent(input)
    void recordAdminAudit('club_event_created', {
      entityType: 'club_event',
      entityId: event.id,
      details: { event_title: input.title },
    })
    return event
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
  const event = data as ClubEvent
  void recordAdminAudit('club_event_created', {
    entityType: 'club_event',
    entityId: event.id,
    details: { event_title: input.title },
  })
  return event
}

export async function updateClubEvent(
  eventId: string,
  input: Omit<ClubEvent, 'id' | 'created_at' | 'archived'>,
): Promise<ClubEvent> {
  if (isMockDataMode()) {
    await delay()
    const event = updateMockClubEvent(eventId, input)
    void recordAdminAudit('club_event_updated', {
      entityType: 'club_event',
      entityId: eventId,
      details: { event_title: input.title },
    })
    return event
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
  void recordAdminAudit('club_event_updated', {
    entityType: 'club_event',
    entityId: eventId,
    details: { event_title: input.title },
  })
  return data as ClubEvent
}

export async function deleteClubEvent(eventId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    removeMockClubEvent(eventId)
    void recordAdminAudit('club_event_deleted', { entityType: 'club_event', entityId: eventId })
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
  void recordAdminAudit('club_event_deleted', { entityType: 'club_event', entityId: eventId })
}

export async function setClubEventArchived(eventId: string, archived: boolean): Promise<ClubEvent> {
  if (isMockDataMode()) {
    await delay()
    const event = setMockClubEventArchived(eventId, archived)
    void recordAdminAudit(archived ? 'club_event_archived' : 'club_event_unarchived', {
      entityType: 'club_event',
      entityId: eventId,
      details: { event_title: event.title },
    })
    return event
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
  const event = data as ClubEvent
  void recordAdminAudit(archived ? 'club_event_archived' : 'club_event_unarchived', {
    entityType: 'club_event',
    entityId: eventId,
    details: { event_title: event.title },
  })
  return event
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
    const lineup = saveMockLineup(fixtureId, formation, slots)
    void recordAdminAudit('lineup_saved', { entityType: 'fixture', entityId: fixtureId, details: { formation } })
    return lineup
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
  void recordAdminAudit('lineup_saved', { entityType: 'fixture', entityId: fixtureId, details: { formation } })
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
    const fundraiser = addMockFundraiser(input)
    void recordAdminAudit('fundraiser_created', {
      entityType: 'fundraiser',
      entityId: fundraiser.id,
      details: { title: input.name },
    })
    return fundraiser
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
  const fundraiser = data as Fundraiser
  void recordAdminAudit('fundraiser_created', {
    entityType: 'fundraiser',
    entityId: fundraiser.id,
    details: { title: input.name },
  })
  return fundraiser
}

export async function setFundraiserArchived(fundraiserId: string, archived: boolean): Promise<Fundraiser> {
  if (isMockDataMode()) {
    await delay()
    const fundraiser = setMockFundraiserArchived(fundraiserId, archived)
    void recordAdminAudit(archived ? 'fundraiser_archived' : 'fundraiser_unarchived', {
      entityType: 'fundraiser',
      entityId: fundraiserId,
      details: { title: fundraiser.name },
    })
    return fundraiser
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
  const fundraiser = data as Fundraiser
  void recordAdminAudit(archived ? 'fundraiser_archived' : 'fundraiser_unarchived', {
    entityType: 'fundraiser',
    entityId: fundraiserId,
    details: { title: fundraiser.name },
  })
  return fundraiser
}

export async function deleteFundraiser(fundraiserId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    removeMockFundraiser(fundraiserId)
    void recordAdminAudit('fundraiser_deleted', { entityType: 'fundraiser', entityId: fundraiserId })
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
  void recordAdminAudit('fundraiser_deleted', { entityType: 'fundraiser', entityId: fundraiserId })
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
    void recordAdminAudit('fundraiser_participation_saved', {
      entityType: 'fundraiser',
      entityId: fundraiserId,
      details: { entry_count: entries.length },
    })
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
  void recordAdminAudit('fundraiser_participation_saved', {
    entityType: 'fundraiser',
    entityId: fundraiserId,
    details: { entry_count: entries.length },
  })
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
    const url = uploadMockPlayerPhoto(playerId, file)
    void recordAdminAudit('photo_uploaded', { entityType: 'profile', entityId: playerId })
    return url
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

  void recordAdminAudit('photo_uploaded', { entityType: 'profile', entityId: playerId })
  return (confirmed as { photo_url: string }).photo_url
}

export async function deletePlayerPhoto(playerId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    deleteMockPlayerPhoto(playerId)
    void recordAdminAudit('photo_deleted', { entityType: 'profile', entityId: playerId })
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
  void recordAdminAudit('photo_deleted', { entityType: 'profile', entityId: playerId })
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
    const row = addMockSponsorship(input)
    void recordAdminAudit('sponsorship_created', {
      entityType: 'sponsorship',
      entityId: row.id,
      details: { sponsor_name: input.sponsor_name, amount: input.amount },
    })
    return row
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
  const row = mapSponsorship(data as Record<string, unknown>)
  void recordAdminAudit('sponsorship_created', {
    entityType: 'sponsorship',
    entityId: row.id,
    details: { sponsor_name: input.sponsor_name, amount: input.amount },
  })
  return row
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
    const row = updateMockSponsorship(id, input)
    void recordAdminAudit('sponsorship_updated', {
      entityType: 'sponsorship',
      entityId: id,
      details: { sponsor_name: input.sponsor_name, amount: input.amount },
    })
    return row
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
  const row = mapSponsorship(data as Record<string, unknown>)
  void recordAdminAudit('sponsorship_updated', {
    entityType: 'sponsorship',
    entityId: id,
    details: { sponsor_name: input.sponsor_name, amount: input.amount },
  })
  return row
}

export async function deleteSponsorship(id: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    deleteMockSponsorship(id)
    void recordAdminAudit('sponsorship_deleted', { entityType: 'sponsorship', entityId: id })
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
  void recordAdminAudit('sponsorship_deleted', { entityType: 'sponsorship', entityId: id })
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
    const row = addMockExpense(input)
    void recordAdminAudit('expense_created', {
      entityType: 'expense',
      entityId: row.id,
      details: { description: input.description, amount: input.amount },
    })
    return row
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
  const row = mapExpense(data as Record<string, unknown>)
  void recordAdminAudit('expense_created', {
    entityType: 'expense',
    entityId: row.id,
    details: { description: input.description, amount: input.amount },
  })
  return row
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
    const row = updateMockExpense(id, input)
    void recordAdminAudit('expense_updated', {
      entityType: 'expense',
      entityId: id,
      details: { description: input.description, amount: input.amount },
    })
    return row
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
  const row = mapExpense(data as Record<string, unknown>)
  void recordAdminAudit('expense_updated', {
    entityType: 'expense',
    entityId: id,
    details: { description: input.description, amount: input.amount },
  })
  return row
}

export async function deleteExpense(id: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    deleteMockExpense(id)
    void recordAdminAudit('expense_deleted', { entityType: 'expense', entityId: id })
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
  void recordAdminAudit('expense_deleted', { entityType: 'expense', entityId: id })
}

function mapSigningOnFeeRow(row: Record<string, unknown>): SigningOnFeeRow {
  return {
    profile_id: row.profile_id as string,
    display_name: row.display_name as string,
    paid: Boolean(row.paid),
    marked_at: (row.marked_at as string | null) ?? null,
    marked_by_name: (row.marked_by_name as string | null) ?? null,
  }
}

export async function fetchSigningOnFees(season: string): Promise<SigningOnFeesSummary> {
  if (isMockDataMode()) {
    await delay()
    return getMockSigningOnFees(season)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_list_signing_on_fees', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_season: season,
  })
  if (error) throw error

  const row = data as Record<string, unknown>
  return {
    season: row.season as string,
    members: ((row.members ?? []) as Record<string, unknown>[]).map(mapSigningOnFeeRow),
  }
}

export async function setSigningOnPaid(
  profileId: string,
  season: string,
  paid: boolean,
): Promise<SigningOnFeeRow> {
  if (isMockDataMode()) {
    await delay(40)
    const updated = setMockSigningOnPaid(season, profileId, paid)
    void recordAdminAudit('signing_on_fee_updated', {
      entityType: 'profile',
      entityId: profileId,
      details: { display_name: updated.display_name, paid, season },
    })
    return updated
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_set_signing_on_paid', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_profile_id: profileId,
    p_season: season,
    p_paid: paid,
  })
  if (error) throw error

  const updated = mapSigningOnFeeRow(data as Record<string, unknown>)
  void recordAdminAudit('signing_on_fee_updated', {
    entityType: 'profile',
    entityId: profileId,
    details: { paid, season },
  })
  return updated
}

function mapFineEntry(row: Record<string, unknown>): FineEntry {
  return {
    id: row.id as string,
    session_id: row.session_id as string,
    profile_id: row.profile_id as string,
    display_name: row.display_name as string,
    fine_key: row.fine_key as string,
    label: row.label as string,
    amount: Number(row.amount),
    paid: Boolean(row.paid),
    marked_at: (row.marked_at as string | null) ?? null,
    marked_by_name: (row.marked_by_name as string | null) ?? null,
    session_date: String(row.session_date).slice(0, 10),
    session_title: row.session_title as string,
    created_at: row.created_at as string,
  }
}

function mapFineSession(row: Record<string, unknown>): FineSession {
  return {
    id: row.id as string,
    session_date: String(row.session_date).slice(0, 10),
    title: row.title as string,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    entry_count: Number(row.entry_count ?? 0),
    session_total: Number(row.session_total ?? 0),
    unpaid_total: Number(row.unpaid_total ?? 0),
  }
}

export async function fetchFineSessions(): Promise<FineSession[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockFineSessions()
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_list_fine_sessions', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(mapFineSession)
}

export async function createFineSession(input: {
  session_date: string
  title?: string
  notes: string | null
}): Promise<FineSession> {
  if (isMockDataMode()) {
    await delay()
    return createMockFineSession(input)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_create_fine_session', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_session_date: input.session_date,
    p_title: input.title?.trim() ?? '',
    p_notes: input.notes,
  })
  if (error) throw error
  return mapFineSession(data as Record<string, unknown>)
}

export async function deleteFineSession(sessionId: string): Promise<void> {
  if (isMockDataMode()) {
    await delay()
    deleteMockFineSession(sessionId)
    return
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { error } = await supabase.rpc('admin_delete_fine_session', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_session_id: sessionId,
  })
  if (error) throw error
}

export async function fetchFineSessionDetail(sessionId: string): Promise<FineSessionDetail> {
  if (isMockDataMode()) {
    await delay()
    return getMockFineSessionDetail(sessionId)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_get_fine_session_detail', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_session_id: sessionId,
  })
  if (error) throw error
  const row = data as Record<string, unknown>
  return {
    session: mapFineSession(row.session as Record<string, unknown>),
    entries: ((row.entries ?? []) as Record<string, unknown>[]).map(mapFineEntry),
    squad: (row.squad ?? []) as FineSessionDetail['squad'],
  }
}

export async function setFineEntry(
  sessionId: string,
  profileId: string,
  fineKey: string,
  label: string,
  amount: number,
  enabled: boolean,
): Promise<FineEntry | null> {
  if (isMockDataMode()) {
    await delay(30)
    return setMockFineEntry(sessionId, profileId, fineKey, label, amount, enabled)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_set_fine_entry', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_session_id: sessionId,
    p_profile_id: profileId,
    p_fine_key: fineKey,
    p_label: label,
    p_amount: amount,
    p_enabled: enabled,
  })
  if (error) throw error
  if (!data) return null
  return mapFineEntry(data as Record<string, unknown>)
}

export async function fetchFinesOverview(
  filter: 'all' | 'unpaid' | 'paid' = 'unpaid',
): Promise<FinesOverview> {
  if (isMockDataMode()) {
    await delay()
    return getMockFinesOverview(filter)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_list_fine_entries', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_filter: filter,
  })
  if (error) throw error
  const row = data as Record<string, unknown>
  return {
    total_outstanding: Number(row.total_outstanding ?? 0),
    players_owing: Number(row.players_owing ?? 0),
    entries: ((row.entries ?? []) as Record<string, unknown>[]).map(mapFineEntry),
  }
}

export async function setFinePaid(entryId: string, paid: boolean): Promise<FineEntry> {
  if (isMockDataMode()) {
    await delay(30)
    return setMockFinePaid(entryId, paid)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('admin_set_fine_paid', {
    p_admin_id: session.userId,
    p_session_token: session.sessionToken,
    p_entry_id: entryId,
    p_paid: paid,
  })
  if (error) throw error
  return mapFineEntry(data as Record<string, unknown>)
}

export async function fetchOutstandingFinesSummary(): Promise<PlayerFinesSummaryRow[]> {
  if (isMockDataMode()) {
    await delay()
    return getMockOutstandingFinesSummary()
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('list_outstanding_fines_summary', {
    p_user_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    profile_id: row.profile_id as string,
    display_name: row.display_name as string,
    outstanding_total: Number(row.outstanding_total),
    unpaid_count: Number(row.unpaid_count),
    oldest_unpaid_days: Number(row.oldest_unpaid_days),
    entries: ((row.entries ?? []) as Record<string, unknown>[]).map(mapFineEntry),
  }))
}

export async function fetchMyUnpaidFines(): Promise<FineEntry[]> {
  if (isMockDataMode()) {
    await delay()
    const session = loadSession()
    if (!session) return []
    return getMockPlayerFines(session.id).filter((e) => !e.paid)
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.rpc('list_my_unpaid_fines', {
    p_user_id: session.userId,
    p_session_token: session.sessionToken,
  })
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(mapFineEntry)
}
