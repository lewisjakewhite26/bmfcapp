#!/usr/bin/env node
/**
 * Generate PWA / Apple touch icons from public/logo.svg (via logo.png).
 * Run: npm run generate:pwa-icons
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'public')
const SRC_PNG = path.join(OUT, 'logo.png')
const SRC_SVG = path.join(OUT, 'logo.svg')
const BG = { r: 0, g: 0, b: 0, alpha: 1 }

async function ensureLogoPng() {
  if (fs.existsSync(SRC_PNG)) return SRC_PNG
  if (!fs.existsSync(SRC_SVG)) {
    throw new Error('Missing public/logo.png and public/logo.svg')
  }
  await sharp(SRC_SVG)
    .resize(512, 512, { fit: 'contain', background: BG })
    .png()
    .toFile(SRC_PNG)
  console.log('Wrote public/logo.png (from logo.svg)')
  return SRC_PNG
}

async function writeIcon(src, name, size) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(OUT, name))
  console.log(`Wrote public/${name} (${size}×${size})`)
}

async function writeMaskableIcon(src) {
  const size = 512
  const inner = 384
  const padding = (size - inner) / 2
  const innerBuf = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: BG })
    .png()
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: innerBuf, left: padding, top: padding }])
    .png()
    .toFile(path.join(OUT, 'pwa-512-maskable.png'))

  console.log('Wrote public/pwa-512-maskable.png (512×512 maskable)')
}

/**
 * Rasterise the hand-drawn notification badge SVG (white BM monogram).
 * Do not trace the crest — it collapses to a blob at status-bar size.
 */
async function writeBadgeIcon() {
  const src = path.join(OUT, 'notification-badge.svg')
  if (!fs.existsSync(src)) {
    throw new Error('Missing public/notification-badge.svg')
  }

  await sharp(src)
    .resize(96, 96)
    .png()
    .toFile(path.join(OUT, 'pwa-badge-96.png'))

  console.log('Wrote public/pwa-badge-96.png (96×96 notification badge)')
}

async function main() {
  const src = await ensureLogoPng()
  await writeIcon(src, 'pwa-192.png', 192)
  await writeIcon(src, 'pwa-512.png', 512)
  await writeIcon(src, 'apple-touch-icon.png', 180)
  await writeMaskableIcon(src)
  await writeBadgeIcon()
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
