#!/usr/bin/env node
/**
 * Fetch live fixtures/results and league table from ddsfl.co.uk.
 *
 * Run: npm run scrape:ddsfl
 *      npm run scrape:ddsfl -- --season 7 --out scraped.json
 *
 * Requires tsx so this script can import ../src/lib/*.ts modules.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const MOCK_DATA_PATH = path.join(ROOT, 'src/data/ddsfl-scrape.json')
import {
  DDSFL_ACTIVE_SEASON,
  ddsflFixturesUrl,
  ddsflLeagueTableUrl,
  ddsflSeasonInfo,
} from '../src/lib/ddsflConstants.ts'
import { parseFixturesHtml, parseLeagueTableHtml } from '../src/lib/ddsflScraper.ts'

function usage() {
  console.log(`Usage: npm run scrape:ddsfl -- [options]

Options:
  --season <id>   DDSFL fsea value (default: ${DDSFL_ACTIVE_SEASON})
  --out <file>    Write JSON to file (default: print summary to stdout)
  --fixtures-only Only fetch/parse fixtures
  --table-only    Only fetch/parse league table
  --help          Show this help
`)
}

function parseArgs(argv) {
  let season = DDSFL_ACTIVE_SEASON
  let outFile = null
  let fixtures = true
  let table = true

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    }
    if (arg === '--season') {
      season = Number(argv[++i])
    } else if (arg === '--out') {
      outFile = argv[++i]
    } else if (arg === '--fixtures-only') {
      table = false
    } else if (arg === '--table-only') {
      fixtures = false
    } else {
      console.error(`Unknown argument: ${arg}`)
      usage()
      process.exit(1)
    }
  }

  if (!ddsflSeasonInfo(season)) {
    console.error(`Unknown season id: ${season}`)
    process.exit(1)
  }

  return { season, outFile, fixtures, table }
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'BMFC-Club-Hub-Scraper/1.0 (+local-dev)',
      Accept: 'text/html',
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  return res.text()
}

async function main() {
  const { season, outFile, fixtures, table } = parseArgs(process.argv.slice(2))
  const seasonInfo = ddsflSeasonInfo(season)

  const payload = {
    scraped_at: new Date().toISOString(),
    season_id: season,
    season_label: seasonInfo.ddsflLabel,
    app_season: seasonInfo.appSeason,
    fixtures: [],
    league_table: [],
    sources: {},
  }

  if (fixtures) {
    const url = ddsflFixturesUrl(season)
    console.error(`Fetching fixtures: ${url}`)
    const html = await fetchHtml(url)
    payload.fixtures = parseFixturesHtml(html)
    payload.sources.fixtures = url
    console.error(`Parsed ${payload.fixtures.length} fixtures`)
  }

  if (table) {
    const url = ddsflLeagueTableUrl(season)
    console.error(`Fetching league table: ${url}`)
    const html = await fetchHtml(url)
    payload.league_table = parseLeagueTableHtml(html)
    payload.sources.league_table = url
    console.error(`Parsed ${payload.league_table.length} league table rows`)
  }

  const completed = payload.fixtures.filter((f) => f.status === 'completed').length
  const scheduled = payload.fixtures.filter((f) => f.status === 'scheduled').length
  const thirdDiv = payload.fixtures.filter((f) =>
    f.competition.toLowerCase().includes('third division'),
  ).length

  const summary = {
    season: `${season} (${seasonInfo.ddsflLabel} → ${seasonInfo.appSeason})`,
    fixtures: payload.fixtures.length,
    completed,
    scheduled,
    third_division_fixtures: thirdDiv,
    league_table_rows: payload.league_table.length,
  }

  const json = JSON.stringify(payload, null, 2)
  fs.mkdirSync(path.join(ROOT, 'src/data'), { recursive: true })
  fs.writeFileSync(MOCK_DATA_PATH, json, 'utf8')
  console.error(`Wrote mock data: ${MOCK_DATA_PATH}`)

  if (outFile) {
    const resolved = path.resolve(outFile)
    fs.writeFileSync(resolved, json, 'utf8')
    console.log(`Wrote ${resolved}`)
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(JSON.stringify({ summary, ...payload }, null, 2))
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
