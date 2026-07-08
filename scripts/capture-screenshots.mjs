/**
 * Capture full-page screenshots of every club hub route.
 *
 * Usage:
 *   npm run dev          (in another terminal)
 *   npm run screenshots
 *
 * Output folder: screenshots-club-hub/
 * Optional base URL: npm run screenshots -- http://localhost:5173
 * Mobile only: npm run screenshots -- --mobile
 * Desktop only: npm run screenshots -- --desktop
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'screenshots-club-hub')
const args = process.argv.slice(2)
const mobileOnly = args.includes('--mobile')
const desktopOnly = args.includes('--desktop')
const BASE_URL = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const STORAGE_KEY = 'bmfc_club_session'
const PLAYER_ID = '00000000-0000-0000-0000-000000000001'
const INVITE_TOKEN = 'demoinvite0001'

const DEV_USER = {
  id: PLAYER_ID,
  username: 'preview_user',
  display_name: 'Preview Player',
  is_admin: false,
  is_committee: false,
  is_fines_admin: false,
  is_approved: true,
  session_token: 'dev-bypass-token',
}

const DEV_ADMIN = {
  id: '00000000-0000-0000-0000-000000000002',
  username: 'preview_admin',
  display_name: 'Preview Admin',
  is_admin: true,
  is_committee: true,
  is_fines_admin: false,
  is_approved: true,
  session_token: 'dev-bypass-token',
}

const DEV_PENDING = {
  id: '00000000-0000-0000-0000-000000000003',
  username: 'pending_user',
  display_name: 'Pending Player',
  is_admin: false,
  is_committee: false,
  is_fines_admin: false,
  is_approved: false,
  session_token: 'dev-bypass-token',
}

/** Unique routes only — skips redirects like /signup → /login */
const PAGES = [
  { file: '01-landing', path: '/', auth: null },
  { file: '02-login', path: '/login', auth: null },
  { file: '03-invite', path: `/invite/${INVITE_TOKEN}`, auth: null },
  { file: '04-dashboard', path: '/dashboard', auth: 'player' },
  { file: '05-league-table', path: '/table', auth: 'player' },
  { file: '06-results', path: '/results', auth: 'player' },
  { file: '07-stats', path: '/stats', auth: 'player' },
  { file: '08-calendar', path: '/calendar', auth: 'player' },
  { file: '09-player-profile', path: `/player/${PLAYER_ID}`, auth: 'player' },
  { file: '10-pending-approval', path: '/pending', auth: 'pending' },
  { file: '11-admin-home', path: '/admin', auth: 'admin' },
  { file: '12-admin-results', path: '/admin/results', auth: 'admin' },
  { file: '13-admin-users', path: '/admin/users', auth: 'admin' },
  { file: '14-admin-squad', path: '/admin/squad', auth: 'admin' },
  { file: '15-admin-fixtures', path: '/admin/fixtures', auth: 'admin' },
  { file: '16-admin-training', path: '/admin/training', auth: 'admin' },
  { file: '17-admin-availability', path: '/admin/availability', auth: 'admin' },
  { file: '18-admin-notifications', path: '/admin/notifications', auth: 'admin' },
]

const AUTH_USERS = {
  player: DEV_USER,
  admin: DEV_ADMIN,
  pending: DEV_PENDING,
}

async function capture(viewport, subfolder) {
  const dir = join(OUT_DIR, subfolder)
  mkdirSync(dir, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
  })

  for (const page of PAGES) {
    await context.clearCookies()
    await context.addInitScript(
      ({ key, authUser }) => {
        if (authUser) {
          localStorage.setItem(key, JSON.stringify(authUser))
        } else {
          localStorage.removeItem(key)
        }
      },
      {
        key: STORAGE_KEY,
        authUser: page.auth ? AUTH_USERS[page.auth] : null,
      },
    )

    const tab = await context.newPage()
    const url = `${BASE_URL}${page.path}`

    try {
      await tab.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
      await tab.waitForTimeout(1200)
      await tab.screenshot({
        path: join(dir, `${page.file}.png`),
        fullPage: true,
      })
      console.log(`  ✓ ${subfolder}/${page.file}.png`)
    } catch (err) {
      console.error(`  ✗ ${subfolder}/${page.file}.png — ${err.message}`)
    } finally {
      await tab.close()
    }
  }

  await browser.close()
}

console.log(`Capturing BMFC Club Hub screenshots from ${BASE_URL}`)
console.log(`Output: ${OUT_DIR}\n`)

if (!desktopOnly) {
  await capture({ width: 390, height: 844 }, 'mobile')
}
if (!mobileOnly) {
  await capture({ width: 1280, height: 800 }, 'desktop')
}

console.log('\nDone.')
