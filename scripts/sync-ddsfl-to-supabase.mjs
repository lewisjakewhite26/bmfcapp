#!/usr/bin/env node
/**
 * Scrape DDSFL and upsert fixtures, results, and league table into Supabase.
 *
 * Requires (`.env.local` locally, or environment variables in CI):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (Dashboard → Settings → API → service_role)
 *
 * Run: npm run sync:ddsfl
 * Scheduled: `.github/workflows/sync-ddsfl.yml` (daily 20:00 UTC + manual)
 *
 * Deduping: if an admin already added the same match manually (same date,
 * home/away, similar opponent), the scrape links that row to the DDSFL id
 * instead of inserting a duplicate. If both a linked scrape row and a manual
 * match exist, the manual row is kept and the orphan scrape row is removed.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServiceClient } from './supabaseServiceClient.mjs'
import {
  DDSFL_ACTIVE_SEASON,
  ddsflFixturesUrl,
  ddsflLeagueTableUrl,
  ddsflSeasonInfo,
} from '../src/lib/ddsflConstants.ts'
import { parseFixturesHtml, parseLeagueTableHtml } from '../src/lib/ddsflScraper.ts'
import {
  findManualFixtureMatch,
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

function resolveEnv() {
  const file = loadEnv(ENV_PATH)
  return {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL?.trim() || file.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || file.SUPABASE_SERVICE_ROLE_KEY,
  }
}

/** When linking a manual row, keep admin kick-off/venue; attach DDSFL identity. */
function linkUpdateFromScraped(fixtureRow) {
  return {
    ddsfl_fixture_id: fixtureRow.ddsfl_fixture_id,
    opponent: fixtureRow.opponent,
    competition: fixtureRow.competition,
    status: fixtureRow.status,
    home_away: fixtureRow.home_away,
    match_date: fixtureRow.match_date,
  }
}

/** Never let the scrape revert a fixture an admin already completed with a
 * real result — DDSFL's own site can lag a day or more behind the app, and
 * blindly copying its status silently un-completes an already-scored match. */
function statusForUpdate(currentStatus, scrapedStatus) {
  return currentStatus === 'completed' ? 'completed' : scrapedStatus
}

async function main() {
  const { VITE_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = resolveEnv()

  if (!url || !serviceKey) {
    console.error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Local: add both to .env.local\n' +
        'CI: add as GitHub Actions secrets (see docs/SUPABASE-SETUP.md)\n' +
        'Service role key: Supabase Dashboard → Settings → API → service_role',
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

  const supabase = createServiceClient(url, serviceKey)

  const { data: allFixtures, error: listErr } = await supabase
    .from('fixtures')
    .select('id, match_date, opponent, home_away, ddsfl_fixture_id, status')

  if (listErr) throw new Error(`Could not load existing fixtures: ${listErr.message}`)

  /** @type {Array<{id: string, match_date: string, opponent: string, home_away: 'home'|'away', ddsfl_fixture_id: string|null, status: string}>} */
  let knownFixtures = allFixtures ?? []

  let fixturesUpserted = 0
  let fixturesLinkedManual = 0
  let fixturesMergedDuplicates = 0
  let resultsUpserted = 0
  let resultsSkipped = 0

  for (const scraped of scrapedFixtures) {
    const fixtureRow = mapScrapedFixture(scraped)

    const existingById = knownFixtures.find(
      (f) => f.ddsfl_fixture_id === scraped.ddsfl_fixture_id,
    )
    const manualMatch = findManualFixtureMatch(fixtureRow, knownFixtures)

    let fixture

    if (existingById && manualMatch && existingById.id !== manualMatch.id) {
      // Keep the admin-created row, drop the scrape duplicate — but migrate any
      // availability votes cast against the scrape row first. Players vote on
      // whichever row the app shows them (usually the scraped one, since the
      // daily sync beats manual entry); deleting it outright cascades away
      // their votes and falsely trips the no-vote fine automation.
      const { data: orphanVotes, error: voteFetchErr } = await supabase
        .from('availability')
        .select('player_id, status, message, created_at')
        .eq('fixture_id', existingById.id)
      if (voteFetchErr) {
        throw new Error(
          `Could not read votes on duplicate ${existingById.id}: ${voteFetchErr.message}`,
        )
      }

      if (orphanVotes && orphanVotes.length > 0) {
        const { error: migrateErr } = await supabase.from('availability').upsert(
          orphanVotes.map((v) => ({
            player_id: v.player_id,
            fixture_id: manualMatch.id,
            status: v.status,
            message: v.message,
            created_at: v.created_at,
          })),
          { onConflict: 'player_id,fixture_id', ignoreDuplicates: true },
        )
        if (migrateErr) {
          throw new Error(
            `Could not migrate votes from duplicate ${existingById.id}: ${migrateErr.message}`,
          )
        }
      }

      // Migrate the saved result and match events (scorers, assists, cards,
      // MOTM, appearance/clean-sheet credit) before dropping the scrape row.
      // Unlike votes, there's no automatic recovery for these: DDSFL's site
      // only ever has the final score, never individual scorer/appearance
      // detail, so losing this cascade means losing it for good.
      const { data: orphanResult, error: resultFetchErr } = await supabase
        .from('results')
        .select('goals_for, goals_against, notes')
        .eq('fixture_id', existingById.id)
        .maybeSingle()
      if (resultFetchErr) {
        throw new Error(
          `Could not read result on duplicate ${existingById.id}: ${resultFetchErr.message}`,
        )
      }

      const { data: orphanEvents, error: eventsFetchErr } = await supabase
        .from('match_events')
        .select('player_id, event_type, minute')
        .eq('fixture_id', existingById.id)
      if (eventsFetchErr) {
        throw new Error(
          `Could not read match events on duplicate ${existingById.id}: ${eventsFetchErr.message}`,
        )
      }

      if (orphanResult || (orphanEvents && orphanEvents.length > 0)) {
        const { data: targetResult, error: targetResultErr } = await supabase
          .from('results')
          .select('fixture_id')
          .eq('fixture_id', manualMatch.id)
          .maybeSingle()
        if (targetResultErr) {
          throw new Error(
            `Could not check existing result on ${manualMatch.id}: ${targetResultErr.message}`,
          )
        }
        if (targetResult) {
          throw new Error(
            `Both fixture ${existingById.id} and ${manualMatch.id} have saved results — ` +
              `refusing to auto-merge, needs manual review in Supabase`,
          )
        }

        if (orphanResult) {
          const { error: migrateResultErr } = await supabase.from('results').insert({
            fixture_id: manualMatch.id,
            goals_for: orphanResult.goals_for,
            goals_against: orphanResult.goals_against,
            notes: orphanResult.notes,
          })
          if (migrateResultErr) {
            throw new Error(
              `Could not migrate result from duplicate ${existingById.id}: ${migrateResultErr.message}`,
            )
          }
        }

        if (orphanEvents && orphanEvents.length > 0) {
          const { error: migrateEventsErr } = await supabase.from('match_events').insert(
            orphanEvents.map((e) => ({
              fixture_id: manualMatch.id,
              player_id: e.player_id,
              event_type: e.event_type,
              minute: e.minute,
            })),
          )
          if (migrateEventsErr) {
            throw new Error(
              `Could not migrate match events from duplicate ${existingById.id}: ${migrateEventsErr.message}`,
            )
          }
        }

        console.error(
          `Migrated result/events from duplicate ${existingById.id} to kept fixture ${manualMatch.id}`,
        )
      }

      // Clear DDSFL id first so the unique constraint allows linking the manual row.
      const { error: clearErr } = await supabase
        .from('fixtures')
        .update({ ddsfl_fixture_id: null })
        .eq('id', existingById.id)
      if (clearErr) {
        throw new Error(
          `Could not clear DDSFL id on duplicate ${existingById.id}: ${clearErr.message}`,
        )
      }

      const { data, error: linkErr } = await supabase
        .from('fixtures')
        .update({
          ...linkUpdateFromScraped(fixtureRow),
          status: statusForUpdate(manualMatch.status, fixtureRow.status),
        })
        .eq('id', manualMatch.id)
        .select('id, ddsfl_fixture_id')
        .single()
      if (linkErr) throw new Error(`Fixture ${scraped.ddsfl_fixture_id}: ${linkErr.message}`)

      const { error: delErr } = await supabase.from('fixtures').delete().eq('id', existingById.id)
      if (delErr) {
        throw new Error(
          `Could not remove duplicate DDSFL row ${existingById.id}: ${delErr.message}`,
        )
      }

      knownFixtures = knownFixtures
        .filter((f) => f.id !== existingById.id)
        .map((f) =>
          f.id === manualMatch.id
            ? { ...f, ddsfl_fixture_id: scraped.ddsfl_fixture_id, opponent: fixtureRow.opponent }
            : f,
        )

      fixture = data
      fixturesMergedDuplicates++
      console.error(
        `Merged duplicate: kept manual ${manualMatch.opponent} (${manualMatch.id}), removed scrape ${existingById.id}`,
      )
    } else if (existingById) {
      const { data, error: updateErr } = await supabase
        .from('fixtures')
        .update({ ...fixtureRow, status: statusForUpdate(existingById.status, fixtureRow.status) })
        .eq('id', existingById.id)
        .select('id, ddsfl_fixture_id')
        .single()
      if (updateErr) throw new Error(`Fixture ${scraped.ddsfl_fixture_id}: ${updateErr.message}`)
      fixture = data
      knownFixtures = knownFixtures.map((f) =>
        f.id === existingById.id
          ? {
              ...f,
              match_date: fixtureRow.match_date,
              opponent: fixtureRow.opponent,
              home_away: fixtureRow.home_away,
            }
          : f,
      )
    } else if (manualMatch) {
      const { data, error: linkErr } = await supabase
        .from('fixtures')
        .update({
          ...linkUpdateFromScraped(fixtureRow),
          status: statusForUpdate(manualMatch.status, fixtureRow.status),
        })
        .eq('id', manualMatch.id)
        .select('id, ddsfl_fixture_id')
        .single()
      if (linkErr) throw new Error(`Fixture ${scraped.ddsfl_fixture_id}: ${linkErr.message}`)
      fixture = data
      fixturesLinkedManual++
      knownFixtures = knownFixtures.map((f) =>
        f.id === manualMatch.id
          ? {
              ...f,
              ddsfl_fixture_id: scraped.ddsfl_fixture_id,
              opponent: fixtureRow.opponent,
              match_date: fixtureRow.match_date,
            }
          : f,
      )
      console.error(
        `Linked manual fixture ${manualMatch.opponent} → DDSFL ${scraped.ddsfl_fixture_id}`,
      )
    } else {
      const { data, error: insertErr } = await supabase
        .from('fixtures')
        .insert(fixtureRow)
        .select('id, ddsfl_fixture_id')
        .single()
      if (insertErr) throw new Error(`Fixture ${scraped.ddsfl_fixture_id}: ${insertErr.message}`)
      fixture = data
      knownFixtures.push({
        id: data.id,
        match_date: fixtureRow.match_date,
        opponent: fixtureRow.opponent,
        home_away: fixtureRow.home_away,
        ddsfl_fixture_id: scraped.ddsfl_fixture_id,
      })
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
    fixtures_linked_manual: fixturesLinkedManual,
    fixtures_merged_duplicates: fixturesMergedDuplicates,
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
