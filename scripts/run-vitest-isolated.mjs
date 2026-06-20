#!/usr/bin/env node
/**
 * Canonical unit-test entry for local `npm run test:ci`.
 * Windows paths under OneDrive sync cause Vitest worker timeouts — run in Docker instead.
 * GitHub Actions uses ubuntu-latest + node:20-bookworm-slim container (see ci.yml).
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const cwd = process.cwd()

const onOneDriveWin =
  process.platform === 'win32' && /OneDrive/i.test(cwd.replace(/\\/g, '/'))
const inCi = Boolean(process.env.CI)
const forceLocal = process.env.VITEST_FORCE_LOCAL === '1'
const forceDocker =
  process.argv.includes('--docker') || process.env.VITEST_FORCE_DOCKER === '1'

function dockerAvailable() {
  const r = spawnSync('docker', ['info'], { stdio: 'ignore' })
  return r.status === 0
}

function runVitestDirect() {
  const r = spawnSync('npx', ['vitest', 'run'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  process.exit(r.status ?? 1)
}

function runVitestDocker() {
  const image = 'node:20-bookworm-slim'
  const mount = process.platform === 'win32' ? cwd : root
  const args = [
    'run',
    '--rm',
    '-v',
    `${mount}:/work`,
    '-w',
    '/work',
    '-e',
    'CI=1',
    image,
    'sh',
    '-c',
    'npm ci && npm run test:vitest',
  ]

  console.log('[test:ci] Running Vitest in Docker (%s) for filesystem isolation.', image)
  const r = spawnSync('docker', args, { stdio: 'inherit' })
  process.exit(r.status ?? 1)
}

function printOneDriveHelp() {
  console.error('')
  console.error('[test:ci] Vitest is unreliable on Windows OneDrive paths (worker timeouts).')
  console.error('')
  console.error('  Recommended: npm run test:docker   (Node 20 container, same as CI)')
  console.error('  Or push/PR — GitHub Actions runs tests in an isolated Linux container.')
  console.error('')
  console.error('  Override (not recommended): set VITEST_FORCE_LOCAL=1')
  console.error('')
}

if (inCi) {
  runVitestDirect()
}

if (forceLocal) {
  if (onOneDriveWin) {
    console.warn('[test:ci] VITEST_FORCE_LOCAL=1 on OneDrive — flakiness possible.')
  }
  runVitestDirect()
}

if (forceDocker) {
  if (!dockerAvailable()) {
    console.error('[test:ci] Docker is required but not available (install Docker Desktop).')
    process.exit(1)
  }
  runVitestDocker()
}

if (onOneDriveWin) {
  if (!dockerAvailable()) {
    printOneDriveHelp()
    process.exit(1)
  }
  runVitestDocker()
}

if (!existsSync(resolve(root, 'node_modules', 'vitest'))) {
  console.error('[test:ci] Run npm install first.')
  process.exit(1)
}

runVitestDirect()
