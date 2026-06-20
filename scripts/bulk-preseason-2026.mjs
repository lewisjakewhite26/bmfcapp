#!/usr/bin/env node
/**
 * One-off: bulk-add BMFC 2026/27 pre-season training, friendlies, and season-start event.
 *
 * Uses admin RPCs (same path as Admin → Fixtures / Training / Events).
 *
 * Requires in `.env.local` or environment:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   BMFC_ADMIN_DISPLAY_NAME
 *   BMFC_ADMIN_PASSCODE
 *
 * Run: node scripts/bulk-preseason-2026.mjs
 * Dry run: node scripts/bulk-preseason-2026.mjs --dry-run
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const ENV_PATH = path.join(ROOT, '.env.local')

const TRAINING_TIME = '19:00'
const MATCH_TIME = '10:30'
const HOME_VENUE = 'Bishop Middleham Park'
const COMPETITION_FRIENDLY = 'Friendly'

const TRAINING_DATES = ['2026-06-14', '2026-06-21', '2026-06-28', '2026-08-02']

const FIXTURES = [
  { date: '2026-07-05', opponent: 'Duke of Wellington', home_away: 'home' },
  { date: '2026-07-12', opponent: 'Kirk Merrington', home_away: 'home' },
  { date: '2026-07-19', opponent: "Sedgefield St Edmund's", home_away: 'home' },
  { date: '2026-07-26', opponent: 'Black Bull', home_away: 'away' },
  { date: '2026-07-31', opponent: "Sedgefield O40's", home_away: 'home', kickoffTbc: true },
]

const SEASON_START = {
  date: '2026-08-09',
  title: 'Season Start',
  notes: '2026/27 season start — league fixtures follow from DDSFL sync.',
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const vars = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    vars[key] = value
  }
  return vars
}

function resolveEnv() {
  const file = loadEnv(ENV_PATH)
  return {
    url: process.env.VITE_SUPABASE_URL?.trim() || file.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY?.trim() || file.VITE_SUPABASE_ANON_KEY,
    adminName: process.env.BMFC_ADMIN_DISPLAY_NAME?.trim() || file.BMFC_ADMIN_DISPLAY_NAME,
    adminPasscode: process.env.BMFC_ADMIN_PASSCODE?.trim() || file.BMFC_ADMIN_PASSCODE,
  }
}

function formatOpponentName(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (/\bFC\b/i.test(trimmed)) return trimmed
  return `${trimmed} FC`
}

function localIso(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0).toISOString()
}

function dayRange(dateStr) {
  const start = localIso(dateStr, '00:00')
  const end = localIso(dateStr, '23:59')
  return { start, end }
}

async function login(supabase, displayName, passcode) {
  const { data, error } = await supabase.rpc('login_user', {
    p_display_name: displayName,
    p_passcode: passcode,
  })
  if (error) throw new Error(`Login failed: ${error.message}`)
  if (!data?.id || !data?.session_token) throw new Error('Login returned no session')
  if (!data.is_admin && !data.is_committee) {
    throw new Error('Account is not admin or committee — cannot create fixtures/training')
  }
  return { id: data.id, session_token: data.session_token, display_name: data.display_name }
}

async function trainingExists(supabase, dateStr) {
  const { start, end } = dayRange(dateStr)
  const { data, error } = await supabase
    .from('training_sessions')
    .select('id, session_date')
    .gte('session_date', start)
    .lte('session_date', end)
  if (error) throw error
  return data ?? []
}

async function fixtureExists(supabase, dateStr, opponent) {
  const { start, end } = dayRange(dateStr)
  const { data, error } = await supabase
    .from('fixtures')
    .select('id, opponent, match_date, ddsfl_fixture_id')
    .gte('match_date', start)
    .lte('match_date', end)
    .is('ddsfl_fixture_id', null)
  if (error) throw error
  const normalized = formatOpponentName(opponent)
  return (data ?? []).filter((row) => row.opponent === normalized || row.opponent === opponent.trim())
}

async function seasonStartExists(supabase, dateStr) {
  const { start, end } = dayRange(dateStr)
  const { data, error } = await supabase
    .from('club_events')
    .select('id, title, event_date')
    .gte('event_date', start)
    .lte('event_date', end)
    .ilike('title', 'Season Start')
  if (error) throw error
  return data ?? []
}

async function createTraining(supabase, session, dateStr, dryRun) {
  const existing = await trainingExists(supabase, dateStr)
  if (existing.length > 0) {
    return { status: 'skipped', reason: 'already exists', id: existing[0].id, date: dateStr }
  }

  const payload = {
    p_admin_id: session.id,
    p_session_token: session.session_token,
    p_session_date: localIso(dateStr, TRAINING_TIME),
    p_location: HOME_VENUE,
    p_notes: 'Pre-season training',
  }

  if (dryRun) return { status: 'dry-run', date: dateStr, payload }

  const { data, error } = await supabase.rpc('admin_create_training_session', payload)
  if (error) throw new Error(`Training ${dateStr}: ${error.message}`)
  return { status: 'created', id: data.id, date: dateStr, time: TRAINING_TIME }
}

async function createFixture(supabase, session, row, dryRun) {
  const opponent = formatOpponentName(row.opponent)
  const existing = await fixtureExists(supabase, row.date, row.opponent)
  if (existing.length > 0) {
    return { status: 'skipped', reason: 'already exists', id: existing[0].id, date: row.date, opponent }
  }

  const kickoffTbc = row.kickoffTbc === true
  const matchTime = kickoffTbc ? '12:00' : MATCH_TIME

  const payload = {
    p_admin_id: session.id,
    p_session_token: session.session_token,
    p_match_date: localIso(row.date, matchTime),
    p_opponent: opponent,
    p_home_away: row.home_away,
    p_competition: COMPETITION_FRIENDLY,
    p_venue: row.home_away === 'home' ? HOME_VENUE : null,
    p_kickoff_time: kickoffTbc ? null : `${MATCH_TIME}:00`,
  }

  if (dryRun) return { status: 'dry-run', date: row.date, opponent, payload }

  const { data, error } = await supabase.rpc('admin_create_fixture', payload)
  if (error) throw new Error(`Fixture ${row.date} vs ${opponent}: ${error.message}`)
  return {
    status: 'created',
    id: data.id,
    date: row.date,
    opponent,
    home_away: row.home_away,
    time: kickoffTbc ? null : MATCH_TIME,
    label: row.label,
  }
}

async function createSeasonStart(supabase, session, dryRun) {
  const existing = await seasonStartExists(supabase, SEASON_START.date)
  if (existing.length > 0) {
    return { status: 'skipped', reason: 'already exists', id: existing[0].id, date: SEASON_START.date }
  }

  const payload = {
    p_admin_id: session.id,
    p_session_token: session.session_token,
    p_title: SEASON_START.title,
    p_event_type: 'other',
    p_event_date: localIso(SEASON_START.date, '10:00'),
    p_location: HOME_VENUE,
    p_notes: SEASON_START.notes,
  }

  if (dryRun) return { status: 'dry-run', ...SEASON_START, payload }

  const { data, error } = await supabase.rpc('admin_create_club_event', payload)
  if (error) throw new Error(`Season Start event: ${error.message}`)
  return { status: 'created', id: data.id, date: SEASON_START.date, title: SEASON_START.title }
}

function printResult(kind, result) {
  const prefix = `[${kind}]`
  if (result.status === 'created') {
    console.log(`${prefix} ✓ ${result.date}${result.opponent ? ` — ${result.opponent}` : ''}${result.title ? ` — ${result.title}` : ''} (id: ${result.id})`)
  } else if (result.status === 'skipped') {
    console.log(`${prefix} ⊘ ${result.date}${result.opponent ? ` — ${result.opponent}` : ''} — skipped (${result.reason})`)
  } else {
    console.log(`${prefix} (dry-run) ${JSON.stringify(result)}`)
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  let adminName = process.env.BMFC_ADMIN_DISPLAY_NAME?.trim()
  let adminPasscode = process.env.BMFC_ADMIN_PASSCODE?.trim()

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--admin-name' && args[i + 1]) adminName = args[++i].trim()
    if (args[i] === '--admin-passcode' && args[i + 1]) adminPasscode = args[++i].trim()
  }

  return { dryRun, adminName, adminPasscode }
}

async function main() {
  const { dryRun, adminName: cliName, adminPasscode: cliPasscode } = parseArgs()
  const env = resolveEnv()
  const url = env.url
  const anonKey = env.anonKey
  const adminName = cliName || env.adminName
  const adminPasscode = cliPasscode || env.adminPasscode

  if (!url || !anonKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
    process.exit(1)
  }
  if (!adminName || !adminPasscode) {
    console.error(
      'Missing BMFC_ADMIN_DISPLAY_NAME or BMFC_ADMIN_PASSCODE.\n' +
        'Add them to .env.local, or pass --admin-name and --admin-passcode.',
    )
    process.exit(1)
  }

  const supabase = createClient(url, anonKey)
  const session = await login(supabase, adminName, adminPasscode)
  console.log(`Logged in as ${session.display_name}${dryRun ? ' (dry run)' : ''}\n`)

  const results = { training: [], fixtures: [], event: null }

  for (const date of TRAINING_DATES) {
    const result = await createTraining(supabase, session, date, dryRun)
    results.training.push(result)
    printResult('training', result)
  }

  console.log('')
  for (const row of FIXTURES) {
    const result = await createFixture(supabase, session, row, dryRun)
    results.fixtures.push(result)
    printResult('fixture', result)
  }

  console.log('')
  results.event = await createSeasonStart(supabase, session, dryRun)
  printResult('event', results.event)

  const created = [
    ...results.training.filter((r) => r.status === 'created'),
    ...results.fixtures.filter((r) => r.status === 'created'),
    ...(results.event?.status === 'created' ? [results.event] : []),
  ].length
  const skipped = [
    ...results.training.filter((r) => r.status === 'skipped'),
    ...results.fixtures.filter((r) => r.status === 'skipped'),
    ...(results.event?.status === 'skipped' ? [results.event] : []),
  ].length

  console.log(`\nDone: ${created} created, ${skipped} skipped${dryRun ? ' (dry run — nothing written)' : ''}.`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
