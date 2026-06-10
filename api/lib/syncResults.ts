import { getSupabaseAdmin } from './supabaseAdmin.js'
import { calculatePoints } from './calculatePoints.js'
import { checkAndAutoCompleteMatchdays } from './autoProgression.js'

const MAX_DAILY_REQUESTS = 80
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']

interface ApiFootballFixture {
  fixture: { id: number; date: string; status: { short: string } }
  goals: { home: number | null; away: number | null }
  teams: { home: { name: string }; away: { name: string } }
}

const TEAM_ALIASES: Record<string, string> = {
  'cote divoire': 'ivory coast',
  'korea republic': 'south korea',
  'congo dr': 'dr congo',
  'democratic republic of the congo': 'dr congo',
  'united states': 'usa',
  'bosnia herzegovina': 'bosnia and herzegovina',
}

function normalizeTeamName(name: string): string {
  let normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  normalized = TEAM_ALIASES[normalized] ?? normalized
  if (normalized.includes('ivory coast') || normalized === 'cote divoire') {
    normalized = 'ivory coast'
  }
  return normalized
}

function teamsMatch(dbHome: string, dbAway: string, apiHome: string, apiAway: string): boolean {
  const dh = normalizeTeamName(dbHome)
  const da = normalizeTeamName(dbAway)
  const ah = normalizeTeamName(apiHome)
  const aa = normalizeTeamName(apiAway)

  const homeOk = dh === ah || dh.includes(ah) || ah.includes(dh)
  const awayOk = da === aa || da.includes(aa) || aa.includes(da)
  return homeOk && awayOk
}

function utcDayBounds(date: string): { start: string; end: string } {
  return {
    start: `${date}T00:00:00.000Z`,
    end: `${date}T23:59:59.999Z`,
  }
}

async function findOurFixtureId(
  apiFixtureId: number,
  homeTeam: string,
  awayTeam: string,
  syncDate: string,
  apiKickoff: string
): Promise<number | null> {
  const supabase = getSupabaseAdmin()

  const { data: mapping } = await supabase
    .from('fixture_api_mapping')
    .select('fixture_id')
    .eq('api_fixture_id', apiFixtureId)
    .maybeSingle()

  if (mapping?.fixture_id) return mapping.fixture_id

  const { start, end } = utcDayBounds(syncDate)

  const { data: candidates } = await supabase
    .from('fixtures')
    .select('id, home_team, away_team, kickoff_utc, game_day')
    .neq('status', 'completed')
    .gte('kickoff_utc', start)
    .lte('kickoff_utc', end)

  if (!candidates?.length) return null

  const apiTime = new Date(apiKickoff).getTime()
  let best: { id: number; game_day: number; delta: number } | null = null

  for (const fixture of candidates) {
    if (!teamsMatch(fixture.home_team, fixture.away_team, homeTeam, awayTeam)) {
      continue
    }

    const delta = Math.abs(new Date(fixture.kickoff_utc).getTime() - apiTime)
    if (!best || delta < best.delta) {
      best = { id: fixture.id, game_day: fixture.game_day, delta: delta }
    }
  }

  if (!best) return null

  // Kickoff must be within 6 hours — guards against wrong-day edge cases
  if (best.delta > 6 * 60 * 60 * 1000) {
    console.log(
      `Rejected ${homeTeam} vs ${awayTeam}: kickoff mismatch (${Math.round(best.delta / 3600000)}h)`
    )
    return null
  }

  await supabase.from('fixture_api_mapping').upsert(
    { fixture_id: best.id, api_fixture_id: apiFixtureId },
    { onConflict: 'api_fixture_id' }
  )

  console.log(`Mapped API ${apiFixtureId} → fixture ${best.id} (game_day ${best.game_day})`)
  return best.id
}

export interface SyncResult {
  success: boolean
  skipped?: boolean
  reason?: string
  updated?: number
  requestCount?: number
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0]
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

async function hasActiveFixtures(now: Date): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
  const windowEnd = new Date(now.getTime() + 15 * 60 * 1000).toISOString()

  const { data: activeFixtures } = await supabase
    .from('fixtures')
    .select('id')
    .gte('kickoff_utc', windowStart)
    .lte('kickoff_utc', windowEnd)
    .neq('status', 'completed')

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const { data: todayIncomplete } = await supabase
    .from('fixtures')
    .select('id')
    .gte('kickoff_utc', todayStart.toISOString())
    .lte('kickoff_utc', now.toISOString())
    .neq('status', 'completed')

  return (
    (activeFixtures?.length ?? 0) > 0 ||
    (todayIncomplete?.length ?? 0) > 0
  )
}

async function fetchApiFixtures(date: string): Promise<ApiFootballFixture[]> {
  const apiKey = process.env.API_FOOTBALL_KEY
  const baseUrl = process.env.API_FOOTBALL_BASE_URL
  const league = process.env.API_FOOTBALL_LEAGUE
  const season = process.env.API_FOOTBALL_SEASON

  if (!apiKey || !baseUrl || !league || !season) {
    throw new Error('Missing API-Football environment variables')
  }

  const url = `${baseUrl}/fixtures?league=${league}&season=${season}&date=${date}`
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

export async function runSyncResults(options?: { force?: boolean }): Promise<SyncResult> {
  const supabase = getSupabaseAdmin()
  const now = new Date()
  const today = todayDateString()
  const currentCount = await getRequestCount(today)

  if (currentCount >= MAX_DAILY_REQUESTS) {
    await supabase.rpc('update_api_sync_log', {
      p_date: today,
      p_status: 'skipped',
      p_message: `Daily limit reached (${currentCount}/${MAX_DAILY_REQUESTS})`,
    })
    return {
      success: true,
      skipped: true,
      reason: 'Daily limit reached',
      requestCount: currentCount,
    }
  }

  if (!options?.force) {
    const active = await hasActiveFixtures(now)
    if (!active) {
      await supabase.rpc('update_api_sync_log', {
        p_date: today,
        p_status: 'idle',
        p_message: 'No active fixtures in window',
      })
      return {
        success: true,
        skipped: true,
        reason: 'No active fixtures',
        requestCount: currentCount,
      }
    }
  }

  const apiFixtures = await fetchApiFixtures(today)

  const { data: newCount, error: countError } = await supabase.rpc('increment_api_request_log', {
    p_date: today,
  })
  if (countError) throw countError

  let updatedCount = 0
  const affectedGameDays: number[] = []

  for (const apiFix of apiFixtures) {
    const apiFixtureId = apiFix.fixture.id
    const apiStatus = apiFix.fixture.status.short
    const homeScore = apiFix.goals.home
    const awayScore = apiFix.goals.away
    const homeTeam = apiFix.teams.home.name
    const awayTeam = apiFix.teams.away.name

    if (!FINISHED_STATUSES.includes(apiStatus)) continue
    if (homeScore === null || awayScore === null) continue

    const ourFixtureId = await findOurFixtureId(
      apiFixtureId,
      homeTeam,
      awayTeam,
      today,
      apiFix.fixture.date
    )
    if (!ourFixtureId) {
      console.log(`No match found for ${homeTeam} vs ${awayTeam} (${today})`)
      continue
    }

    const { data: ourFixture } = await supabase
      .from('fixtures')
      .select('status, game_day')
      .eq('id', ourFixtureId)
      .single()

    if (ourFixture?.status === 'completed') continue

    await calculatePoints(ourFixtureId, homeScore, awayScore)
    updatedCount++
    if (ourFixture?.game_day != null) {
      affectedGameDays.push(ourFixture.game_day)
    }
    console.log(
      `Updated game_day ${ourFixture?.game_day}: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`
    )
  }

  await checkAndAutoCompleteMatchdays(affectedGameDays)

  const message =
    updatedCount > 0
      ? `Updated ${updatedCount} fixture${updatedCount === 1 ? '' : 's'}`
      : 'No new results to apply'

  await supabase.rpc('update_api_sync_log', {
    p_date: today,
    p_status: 'success',
    p_message: message,
  })

  return {
    success: true,
    updated: updatedCount,
    requestCount: newCount as number,
  }
}

export async function recordSyncError(error: unknown): Promise<void> {
  const supabase = getSupabaseAdmin()
  const today = todayDateString()
  await supabase.rpc('update_api_sync_log', {
    p_date: today,
    p_status: 'error',
    p_message: error instanceof Error ? error.message : String(error),
  })
}
