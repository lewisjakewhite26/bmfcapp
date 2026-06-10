import { getSupabaseAdmin } from './supabaseAdmin.js'

const MAX_DAILY_REQUESTS = 80
const RETRY_MINUTES = 30
const KICKOFF_MATCH_HOURS = 2

interface ApiFootballFixture {
  fixture: { id: number; date: string }
  league: { round?: string }
  teams: { home: { name: string }; away: { name: string } }
}

interface DbFixture {
  id: number
  game_day: number
  home_team: string
  away_team: string
  kickoff_utc: string
}

const ROUND_MAP: Record<number, string[]> = {
  4: ['round of 32', '3rd round'],
  5: ['round of 16'],
  6: ['quarter-final', 'quarter final'],
  7: ['semi-final', 'semi final'],
  8: ['3rd place', 'final'],
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

function isPlaceholderTeamName(name: string): boolean {
  return /winner|runner-up|runner up|place team|r32|r16|sf loser|sf winner|qf winner|3rd place/i.test(
    name
  )
}

function fixtureHasPlaceholders(fixture: DbFixture): boolean {
  return isPlaceholderTeamName(fixture.home_team) || isPlaceholderTeamName(fixture.away_team)
}

async function getRequestCount(date: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('api_request_log')
    .select('request_count')
    .eq('date', date)
    .maybeSingle()

  return data?.request_count ?? 0
}

async function fetchUpcomingApiFixtures(): Promise<ApiFootballFixture[]> {
  const apiKey = process.env.API_FOOTBALL_KEY
  const baseUrl = process.env.API_FOOTBALL_BASE_URL
  const league = process.env.API_FOOTBALL_LEAGUE
  const season = process.env.API_FOOTBALL_SEASON

  if (!apiKey || !baseUrl || !league || !season) {
    throw new Error('Missing API-Football environment variables')
  }

  const url = `${baseUrl}/fixtures?league=${league}&season=${season}&status=NS`
  const response = await fetch(url, {
    headers: {
      'x-apisports-key': apiKey,
      'x-rapidapi-key': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`API-Football responded with ${response.status}`)
  }

  const data = await response.json()
  return (data.response ?? []) as ApiFootballFixture[]
}

function filterApiFixturesForGameDay(apiFixtures: ApiFootballFixture[], gameDay: number): ApiFootballFixture[] {
  const expectedRounds = ROUND_MAP[gameDay] ?? []
  if (expectedRounds.length === 0) return []

  return apiFixtures.filter((f) => {
    const round = (f.league.round ?? '').toLowerCase()
    return expectedRounds.some((r) => round.includes(r))
  })
}

async function getPlaceholderFixtures(gameDay: number): Promise<DbFixture[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('fixtures')
    .select('id, game_day, home_team, away_team, kickoff_utc')
    .eq('game_day', gameDay)
    .order('kickoff_utc', { ascending: true })

  if (error) throw error
  return (data ?? []).filter(fixtureHasPlaceholders)
}

async function getRemainingPlaceholderCount(gameDay: number): Promise<number> {
  const placeholders = await getPlaceholderFixtures(gameDay)
  return placeholders.length
}

async function scheduleRetry(gameDay: number): Promise<void> {
  const supabase = getSupabaseAdmin()
  const retryAt = new Date(Date.now() + RETRY_MINUTES * 60 * 1000).toISOString()

  await supabase
    .from('progression_queue')
    .update({ status: 'pending', scheduled_for: retryAt })
    .eq('game_day', gameDay)
}

async function markQueueCompleted(gameDay: number): Promise<void> {
  const supabase = getSupabaseAdmin()
  await supabase
    .from('progression_queue')
    .update({ status: 'completed', processed_at: new Date().toISOString() })
    .eq('game_day', gameDay)
}

async function discoverTeamsFromApi(gameDay: number): Promise<number> {
  const today = todayDateString()
  const currentCount = await getRequestCount(today)
  if (currentCount >= MAX_DAILY_REQUESTS) {
    throw new Error(`Daily API limit reached (${currentCount}/${MAX_DAILY_REQUESTS})`)
  }

  const supabase = getSupabaseAdmin()
  const placeholders = await getPlaceholderFixtures(gameDay)
  if (placeholders.length === 0) return 0

  const apiFixtures = await fetchUpcomingApiFixtures()

  const { error: countError } = await supabase.rpc('increment_api_request_log', { p_date: today })
  if (countError) throw countError

  const relevantApiFixtures = filterApiFixturesForGameDay(apiFixtures, gameDay)
  if (relevantApiFixtures.length === 0) {
    console.log(`No API fixtures found yet for game_day ${gameDay}`)
    return 0
  }

  const sortedApiFixtures = [...relevantApiFixtures].sort(
    (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  )

  const unmatched = [...placeholders]
  let updatedCount = 0

  for (const apiFix of sortedApiFixtures) {
    const apiFixtureId = apiFix.fixture.id
    const apiKickoff = new Date(apiFix.fixture.date).getTime()

    const { data: existingMapping } = await supabase
      .from('fixture_api_mapping')
      .select('id')
      .eq('api_fixture_id', apiFixtureId)
      .maybeSingle()

    if (existingMapping) continue

    const matchIndex = unmatched.findIndex((p) => {
      const placeholderKickoff = new Date(p.kickoff_utc).getTime()
      const diffHours = Math.abs(apiKickoff - placeholderKickoff) / (1000 * 60 * 60)
      return diffHours <= KICKOFF_MATCH_HOURS
    })

    if (matchIndex === -1) continue

    const placeholder = unmatched.splice(matchIndex, 1)[0]

    const { error } = await supabase.rpc('update_fixture_teams', {
      p_fixture_id: placeholder.id,
      p_home_team: apiFix.teams.home.name,
      p_away_team: apiFix.teams.away.name,
      p_api_fixture_id: apiFixtureId,
    })
    if (error) throw error

    updatedCount++
    console.log(
      `Updated fixture ${placeholder.id}: ${apiFix.teams.home.name} vs ${apiFix.teams.away.name}`
    )
  }

  await supabase.from('progression_log').insert({
    game_day: gameDay,
    event: 'teams_discovered',
    details: { fixtures_updated: updatedCount, api_candidates: sortedApiFixtures.length },
  })

  return updatedCount
}

export async function processMatchdayProgression(gameDay: number): Promise<'completed' | 'retry'> {
  const supabase = getSupabaseAdmin()
  const placeholders = await getPlaceholderFixtures(gameDay)

  if (placeholders.length === 0) {
    await supabase.rpc('auto_open_matchday', { p_game_day: gameDay })
    console.log(`Matchday ${gameDay} opened automatically (no placeholders)`)
    await markQueueCompleted(gameDay)
    return 'completed'
  }

  const updated = await discoverTeamsFromApi(gameDay)
  const remaining = await getRemainingPlaceholderCount(gameDay)

  if (remaining === 0) {
    await supabase.rpc('auto_open_matchday', { p_game_day: gameDay })
    console.log(`Matchday ${gameDay} opened automatically after team discovery`)
    await markQueueCompleted(gameDay)
    return 'completed'
  }

  console.log(
    `${remaining} placeholders still pending for game_day ${gameDay}` +
      (updated > 0 ? ` (${updated} updated this run)` : '')
  )
  await scheduleRetry(gameDay)
  return 'retry'
}

export interface ProcessProgressionResult {
  success: boolean
  processed: number
  message: string
}

export async function runProcessProgression(options?: { force?: boolean }): Promise<ProcessProgressionResult> {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  const statuses = options?.force ? (['pending', 'failed'] as const) : (['pending'] as const)

  let query = supabase.from('progression_queue').select('*').in('status', [...statuses])
  if (!options?.force) {
    query = query.lte('scheduled_for', now)
  }

  const { data: dueJobs, error } = await query.order('scheduled_for', { ascending: true })
  if (error) throw error

  if (!dueJobs?.length) {
    return { success: true, processed: 0, message: 'No jobs due' }
  }

  let processed = 0

  for (const job of dueJobs) {
    await supabase
      .from('progression_queue')
      .update({ status: 'processing' })
      .eq('id', job.id)

    try {
      await processMatchdayProgression(job.game_day)
      processed++
    } catch (err) {
      await supabase
        .from('progression_queue')
        .update({ status: 'failed' })
        .eq('id', job.id)

      console.error(`Failed to process game_day ${job.game_day}:`, err)
      throw err
    }
  }

  return {
    success: true,
    processed,
    message: processed > 0 ? `Processed ${processed} job(s)` : 'No jobs due',
  }
}
