#!/usr/bin/env node
/**
 * Fines automation — invokes fines-scheduler (canonical orchestrator).
 *
 * Requires `.env.local` or environment variables:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run fines:automation
 * Scheduled: `.github/workflows/fines-automation.yml` (every 5 minutes)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServiceClient } from './supabaseServiceClient.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const ENV_PATH = path.join(ROOT, '.env.local')

const SCHEDULER_ATTEMPTS = 3
const RETRY_BASE_MS = 500

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
    schedulerSecret: process.env.FINES_SCHEDULER_SECRET?.trim() || file.FINES_SCHEDULER_SECRET,
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function invokeScheduler(url, serviceKey, schedulerSecret) {
  const supabase = createServiceClient(url, serviceKey)
  const headers = {}
  if (schedulerSecret) {
    headers['x-fines-scheduler-secret'] = schedulerSecret
  }

  const { data, error } = await supabase.functions.invoke('fines-scheduler', {
    body: {},
    headers,
  })

  if (error) {
    throw new Error(error.message ?? 'fines-scheduler invoke failed')
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error))
  }
  return data
}

async function invokeSchedulerWithRetry(url, serviceKey, schedulerSecret) {
  let lastError
  for (let attempt = 1; attempt <= SCHEDULER_ATTEMPTS; attempt++) {
    try {
      return await invokeScheduler(url, serviceKey, schedulerSecret)
    } catch (err) {
      lastError = err
      if (attempt < SCHEDULER_ATTEMPTS) {
        await sleep(RETRY_BASE_MS * attempt)
      }
    }
  }
  throw lastError
}

async function main() {
  const { url, serviceKey, schedulerSecret } = resolveEnv()

  if (!url || !serviceKey) {
    console.error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Local: add both to .env.local (see .env.example).\n' +
        'GitHub Actions: add both as repository secrets (Settings → Secrets and variables → Actions).',
    )
    process.exit(1)
  }

  try {
    const result = await invokeSchedulerWithRetry(url, serviceKey, schedulerSecret)
    console.log(JSON.stringify(result, null, 2))
    return
  } catch (err) {
    console.warn(
      'fines-scheduler invoke failed after retries, falling back to apply_fine_late_fees RPC:',
      err instanceof Error ? err.message : err,
    )
  }

  const supabase = createServiceClient(url, serviceKey)
  const { data, error } = await supabase.rpc('apply_fine_late_fees')

  if (error) {
    console.error('apply_fine_late_fees failed:', error.message)
    process.exit(1)
  }

  console.error(
    'WARNING: fines-scheduler was unavailable — this tick ran apply_fine_late_fees RPC only. ' +
      'No-vote fines, vote reminders, and ALL push notifications were SKIPPED for this run.',
  )
  console.log(JSON.stringify(data, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
