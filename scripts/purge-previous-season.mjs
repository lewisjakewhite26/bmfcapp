#!/usr/bin/env node
/**
 * One-off: preview and purge fixtures/results from before 2026/27 pre-season.
 * Keeps June–August 2026 pre-season friendlies (match_date >= 2026-06-14).
 *
 * Requires migration 026_purge_old_fixtures.sql applied first.
 *
 * Run preview:  node scripts/purge-previous-season.mjs --dry-run
 * Run delete:    node scripts/purge-previous-season.mjs --confirm
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const ENV_PATH = path.join(ROOT, '.env.local')

/** Same cutoff as src/lib/seasonScope.ts PRE_SEASON_START */
const PURGE_CUTOFF = '2026-06-14T00:00:00.000Z'

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
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || file.SUPABASE_SERVICE_ROLE_KEY,
    adminName: process.env.BMFC_ADMIN_DISPLAY_NAME?.trim() || file.BMFC_ADMIN_DISPLAY_NAME,
    adminPasscode: process.env.BMFC_ADMIN_PASSCODE?.trim() || file.BMFC_ADMIN_PASSCODE,
  }
}

async function login(supabase, displayName, passcode) {
  const { data, error } = await supabase.rpc('login_user', {
    p_display_name: displayName,
    p_passcode: passcode,
  })
  if (error) throw new Error(`Login failed: ${error.message}`)
  if (!data?.id || !data?.session_token) throw new Error('Login returned no session')
  if (!data.is_admin && !data.is_committee) {
    throw new Error('Account is not admin or committee')
  }
  return { id: data.id, session_token: data.session_token, display_name: data.display_name }
}

function formatFixtureRow(f) {
  const date = new Date(f.match_date).toLocaleDateString('en-GB')
  const src = f.ddsfl_fixture_id ? 'DDSFL' : 'manual'
  const score =
    f.results?.length === 1
      ? `${f.results[0].goals_for}-${f.results[0].goals_against}`
      : f.status === 'completed'
        ? '(no result row)'
        : f.status
  return `${date} · ${f.home_away} vs ${f.opponent} · ${f.competition} · ${score} · ${src} · id=${f.id}`
}

async function fetchFixturesToDelete(supabase) {
  const { data: fixtures, error: fErr } = await supabase
    .from('fixtures')
    .select('id, match_date, opponent, home_away, competition, status, ddsfl_fixture_id, results(goals_for, goals_against)')
    .lt('match_date', PURGE_CUTOFF)
    .order('match_date', { ascending: true })
  if (fErr) throw fErr

  const ids = (fixtures ?? []).map((f) => f.id)
  let eventCount = 0
  if (ids.length > 0) {
    const { count, error: eErr } = await supabase
      .from('match_events')
      .select('id', { count: 'exact', head: true })
      .in('fixture_id', ids)
    if (eErr) throw eErr
    eventCount = count ?? 0
  }

  const resultCount = (fixtures ?? []).filter((f) => (f.results?.length ?? 0) > 0).length

  return { fixtures: fixtures ?? [], eventCount, resultCount }
}

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run') || !args.includes('--confirm'),
    adminName: process.env.BMFC_ADMIN_DISPLAY_NAME?.trim(),
    adminPasscode: process.env.BMFC_ADMIN_PASSCODE?.trim(),
  }
}

async function main() {
  const { dryRun } = parseArgs()
  const env = resolveEnv()
  if (!env.url || !env.anonKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const supabase = createClient(env.url, env.anonKey)
  const { fixtures, eventCount, resultCount } = await fetchFixturesToDelete(supabase)

  console.log(`Cutoff: fixtures with match_date before ${PURGE_CUTOFF}`)
  console.log(`(Pre-season 2026 friendlies from 14 Jun 2026 onwards are kept.)\n`)

  if (fixtures.length === 0) {
    console.log('Nothing to delete.')
    return
  }

  console.log(`Would delete ${fixtures.length} fixture(s), ${resultCount} result row(s), ${eventCount} match event(s):\n`)
  for (const f of fixtures) {
    console.log(`  • ${formatFixtureRow(f)}`)
  }

  const { data: kept, error: kErr } = await supabase
    .from('fixtures')
    .select('id, match_date, opponent, competition')
    .gte('match_date', PURGE_CUTOFF)
    .order('match_date', { ascending: true })
  if (kErr) throw kErr

  console.log(`\nKeeping ${kept?.length ?? 0} fixture(s) on/after cutoff:`)
  for (const f of kept ?? []) {
    console.log(
      `  • ${new Date(f.match_date).toLocaleDateString('en-GB')} · ${f.opponent} · ${f.competition}`,
    )
  }

  if (dryRun) {
    console.log('\nDry run — pass --confirm to permanently delete.')
    return
  }

  if (!env.adminName || !env.adminPasscode) {
    if (!env.serviceKey) {
      console.error(
        'Missing BMFC_ADMIN_* credentials and SUPABASE_SERVICE_ROLE_KEY — cannot delete.',
      )
      process.exit(1)
    }

    console.log('\nUsing service role key (cascade deletes related rows)…')
    const admin = createClient(env.url, env.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const ids = fixtures.map((f) => f.id)
    const { error } = await admin.from('fixtures').delete().in('id', ids)
    if (error) throw new Error(`Purge failed: ${error.message}`)
    console.log(`Deleted ${ids.length} fixture(s).`)
    console.log('Related results, match_events, availability, and lineups cascade-deleted.')
    return
  }

  const session = await login(supabase, env.adminName, env.adminPasscode)
  console.log(`\nLogged in as ${session.display_name}. Purging…`)

  const { data, error } = await supabase.rpc('admin_purge_fixtures_before', {
    p_admin_id: session.id,
    p_session_token: session.session_token,
    p_cutoff: PURGE_CUTOFF,
  })
  if (error) throw new Error(`Purge failed: ${error.message}`)

  console.log(`Deleted ${data?.deleted_count ?? 0} fixture(s).`)
  console.log('Related results, match_events, availability, and lineups cascade-deleted.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
