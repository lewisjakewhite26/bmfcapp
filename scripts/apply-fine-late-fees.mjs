#!/usr/bin/env node
/**
 * Apply monthly £2 late fees for unpaid fines (calls apply_fine_late_fees RPC).
 *
 * Requires `.env.local` or environment variables:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run apply:fine-late-fees
 * Scheduled: `.github/workflows/apply-fine-late-fees.yml` (daily 00:05 UTC)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const ENV_PATH = path.join(ROOT, '.env.local')

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
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || file.SUPABASE_SERVICE_ROLE_KEY,
  }
}

async function main() {
  const { url, serviceKey } = resolveEnv()

  if (!url || !serviceKey) {
    console.error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Add both to .env.local (see .env.example).',
    )
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey)
  const { data, error } = await supabase.rpc('apply_fine_late_fees')

  if (error) {
    console.error('apply_fine_late_fees failed:', error.message)
    process.exit(1)
  }

  console.log(JSON.stringify(data, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
