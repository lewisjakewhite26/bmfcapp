#!/usr/bin/env node
/**
 * Generate PWA / Apple touch icons from public/logo.png (club crest).
 * Run: npm run generate:pwa-icons
 */

import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'public', 'logo.png')
const OUT = path.join(ROOT, 'public')

const BG = { r: 0, g: 0, b: 0, alpha: 1 }

async function writeIcon(name, size) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(OUT, name))
  console.log(`Wrote public/${name} (${size}×${size})`)
}

async function writeMaskableIcon() {
  const size = 512
  const inner = 384
  const padding = (size - inner) / 2
  const innerBuf = await sharp(SRC)
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

async function main() {
  await writeIcon('pwa-192.png', 192)
  await writeIcon('pwa-512.png', 512)
  await writeIcon('apple-touch-icon.png', 180)
  await writeMaskableIcon()
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
