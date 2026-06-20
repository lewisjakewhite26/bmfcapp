#!/usr/bin/env node
/**
 * Bulk-add approved squad players (account + squad row, blank position).
 * Skips existing profiles matched by first + last name (case-insensitive).
 *
 * Run: node scripts/bulk-add-players.mjs
 * Dry run: node scripts/bulk-add-players.mjs --dry-run
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const ENV_PATH = path.join(ROOT, '.env.local')

const PASSCODE = '0000'

const PLAYERS = [
  ['Simon', 'Darwin'],
  ['Ciaran', 'Lines'],
  ['Chris', 'Park'],
  ['Freddie', 'Lower'],
  ['Thomas', 'Laing'],
  ['Jack', 'Hinch'],
  ['Connor', 'Noades'],
  ['Matthew', 'Jones'],
  ['Will', 'Denholm'],
  ['Liam', 'Forster'],
  ['Carl', 'Hodges'],
  ['Harvey', 'Ryder'],
  ['Jack', 'Scanlon'],
  ['Dougie', 'English'],
  ['Lee', 'Hutchinson'],
  ['Will', 'Preston'],
  ['Dave', 'Redfern'],
]

/** Skip if already registered under these names (admins + existing players). */
const SKIP_NAMES = new Set([
  'ryan|hunter',
  'james|marshall',
  'jack|marley',
  'jordan|cooksey',
  'sam|marshall',
  'lewis|white',
  'ash|dodsworth',
  'dan|jones',
])

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

function nameKey(first, last) {
  return `${first.trim().toLowerCase()}|${last.trim().toLowerCase()}`
}

async function createPlayer(sbService, sbAnon, firstName, lastName, dryRun) {
  const token = crypto.randomBytes(24).toString('hex')
  const username = `inv_${crypto.randomBytes(8).toString('hex')}`

  if (dryRun) {
    return { status: 'dry-run', firstName, lastName }
  }

  const { error: insertErr } = await sbService.from('profiles').insert({
    username,
    display_name: 'New player',
    invite_token: token,
    invite_expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    is_admin: false,
    is_committee: false,
    is_approved: false,
  })
  if (insertErr) throw new Error(`${firstName} ${lastName}: invite insert — ${insertErr.message}`)

  const { data: completed, error: completeErr } = await sbAnon.rpc('complete_invite', {
    p_token: token,
    p_first_name: firstName,
    p_last_name: lastName,
    p_passcode: PASSCODE,
  })
  if (completeErr) throw new Error(`${firstName} ${lastName}: complete — ${completeErr.message}`)

  const userId = completed.id

  await sbService.from('profiles').update({ is_approved: true }).eq('id', userId)

  const { error: squadErr } = await sbService.from('squad').insert({
    player_id: userId,
    position: null,
    joined_date: new Date().toISOString().slice(0, 10),
    active: true,
  })
  if (squadErr && squadErr.code !== '23505') {
    throw new Error(`${firstName} ${lastName}: squad — ${squadErr.message}`)
  }

  const { data: profile } = await sbService
    .from('profiles')
    .select('login_name, display_name')
    .eq('id', userId)
    .single()

  const { error: loginErr } = await sbAnon.rpc('login_user', {
    p_display_name: profile.login_name,
    p_passcode: PASSCODE,
  })

  return {
    status: 'created',
    login_name: profile.login_name,
    display_name: profile.display_name,
    login_ok: !loginErr,
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const file = loadEnv(ENV_PATH)
  const url = process.env.VITE_SUPABASE_URL?.trim() || file.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() || file.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || file.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceKey) {
    console.error('Missing Supabase env vars in .env.local')
    process.exit(1)
  }

  const sbService = createClient(url, serviceKey)
  const sbAnon = createClient(url, anonKey)

  const { data: existing, error } = await sbService
    .from('profiles')
    .select('first_name, last_name, login_name, display_name')
  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  const existingKeys = new Set(
    (existing ?? [])
      .filter((p) => p.first_name && p.last_name)
      .map((p) => nameKey(p.first_name, p.last_name)),
  )

  const results = { created: [], skipped: [], failed: [] }

  for (const [first, last] of PLAYERS) {
    const key = nameKey(first, last)
    if (SKIP_NAMES.has(key) || existingKeys.has(key)) {
      results.skipped.push(`${first} ${last}`)
      console.log(`⊘ Skip ${first} ${last}`)
      continue
    }

    try {
      const result = await createPlayer(sbService, sbAnon, first, last, dryRun)
      results.created.push(result)
      if (result.status === 'created') {
        console.log(`✓ ${result.display_name} → login ${result.login_name}`)
        existingKeys.add(key)
      } else {
        console.log(`(dry-run) ${first} ${last}`)
      }
    } catch (err) {
      results.failed.push({ name: `${first} ${last}`, error: err.message })
      console.error(`✗ ${first} ${last}: ${err.message}`)
    }
  }

  // Clear Sam Marshall position if set (user wanted blank positions)
  if (!dryRun) {
    const sam = (existing ?? []).find(
      (p) => nameKey(p.first_name ?? '', p.last_name ?? '') === 'sam|marshall' ||
        p.login_name === 'SamM',
    )
    if (sam) {
      const { data: samProfile } = await sbService
        .from('profiles')
        .select('id')
        .eq('login_name', 'SamM')
        .maybeSingle()
      if (samProfile) {
        await sbService.from('squad').update({ position: null }).eq('player_id', samProfile.id)
        console.log('↻ Sam M — position cleared')
      }
    }
  }

  console.log(`\nDone: ${results.created.length} created, ${results.skipped.length} skipped, ${results.failed.length} failed${dryRun ? ' (dry run)' : ''}.`)
  if (results.failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
