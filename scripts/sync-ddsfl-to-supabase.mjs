#!/usr/bin/env node
/**
 * Scrape DDSFL and upsert fixtures, results, and league table into Supabase.
 *
 * Requires in .env.local:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (Dashboard → Settings → API → service_role)
 *
 * Run: npm run sync:ddsfl
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import {
  DDSFL_ACTIVE_SEASON,
  ddsflFixturesUrl,
  ddsflLeagueTableUrl,
  ddsflSeasonInfo,
} from '../src/lib/ddsflConstants.ts'
import { parseFixturesHtml, parseLeagueTableHtml } from '../src/lib/ddsflScraper.ts'
import {
  mapScrapedFixture,
  mapScrapedLeagueTable,
  mapScrapedResult,
} from '../src/lib/ddsflSync.ts'

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

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'BMFC-Club-Hub-Scraper/1.0 (+local-dev)',
      Accept: 'text/html',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

async function main() {
  const env = loadEnv(ENV_PATH)
  const url = env.VITE_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n' +
        'Get the service role key from Supabase Dashboard → Settings → API → service_role',
    )
    process.exit(1)
  }

  const season = DDSFL_ACTIVE_SEASON
  const seasonInfo = ddsflSeasonInfo(season)
  if (!seasonInfo) {
    console.error(`Unknown season: ${season}`)
    process.exit(1)
  }

  const scrapedAt = new Date().toISOString()
  console.error(`Scraping DDSFL season ${season} (${seasonInfo.appSeason})...`)

  const fixturesUrl = ddsflFixturesUrl(season)
  const tableUrl = ddsflLeagueTableUrl(season)

  const [fixturesHtml, tableHtml] = await Promise.all([
    fetchHtml(fixturesUrl),
    fetchHtml(tableUrl),
  ])

  const scrapedFixtures = parseFixturesHtml(fixturesHtml)
  const scrapedTable = parseLeagueTableHtml(tableHtml)

  console.error(`Parsed ${scrapedFixtures.length} fixtures, ${scrapedTable.length} table rows`)

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let fixturesUpserted = 0
  let resultsUpserted = 0
  let resultsSkipped = 0

  for (const scraped of scrapedFixtures) {
    const fixtureRow = mapScrapedFixture(scraped)

    const { data: existing, error: lookupErr } = await supabase
      .from('fixtures')
      .select('id')
      .eq('ddsfl_fixture_id', scraped.ddsfl_fixture_id)
      .maybeSingle()

    if (lookupErr) {
      throw new Error(`Fixture ${scraped.ddsfl_fixture_id}: ${lookupErr.message}`)
    }

    let fixture
    if (existing) {
      const { data, error: updateErr } = await supabase
        .from('fixtures')
        .update(fixtureRow)
        .eq('id', existing.id)
        .select('id, ddsfl_fixture_id')
        .single()
      if (updateErr) throw new Error(`Fixture ${scraped.ddsfl_fixture_id}: ${updateErr.message}`)
      fixture = data
    } else {
      const { data, error: insertErr } = await supabase
        .from('fixtures')
        .insert(fixtureRow)
        .select('id, ddsfl_fixture_id')
        .single()
      if (insertErr) throw new Error(`Fixture ${scraped.ddsfl_fixture_id}: ${insertErr.message}`)
      fixture = data
    }

    fixturesUpserted++

    const resultRow = mapScrapedResult(scraped)
    if (!resultRow) continue

    const { count, error: countErr } = await supabase
      .from('match_events')
      .select('*', { count: 'exact', head: true })
      .eq('fixture_id', fixture.id)

    if (countErr) throw countErr

    if (count && count > 0) {
      resultsSkipped++
      continue
    }

    const { error: resultErr } = await supabase.from('results').upsert(
      {
        fixture_id: fixture.id,
        goals_for: resultRow.goals_for,
        goals_against: resultRow.goals_against,
        notes: resultRow.notes,
      },
      { onConflict: 'fixture_id' },
    )

    if (resultErr) {
      throw new Error(`Result for ${scraped.ddsfl_fixture_id}: ${resultErr.message}`)
    }

    resultsUpserted++
  }

  const leagueRows = mapScrapedLeagueTable(scrapedTable, seasonInfo.appSeason, scrapedAt)

  const { error: deleteErr } = await supabase
    .from('league_table_cache')
    .delete()
    .eq('season', seasonInfo.appSeason)

  if (deleteErr) throw deleteErr

  if (leagueRows.length > 0) {
    const { error: insertErr } = await supabase.from('league_table_cache').insert(leagueRows)
    if (insertErr) throw insertErr
  }

  const summary = {
    season: seasonInfo.appSeason,
    scraped_at: scrapedAt,
    fixtures_upserted: fixturesUpserted,
    results_upserted: resultsUpserted,
    results_skipped_has_events: resultsSkipped,
    league_table_rows: leagueRows.length,
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
