import { DISPLAY_FONT, TEXT_FONT } from './text'
import { classifyLogo, clearEdgeLines, contentBounds, opaqueBounds, removeWhiteBackground, whitenLogoPixels, type LogoKind } from './pixels'

const base = import.meta.env.BASE_URL ?? '/'
const asset = (path: string) => `${base}graphics/${path}`

const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'

// Static instances of Archivo (SIL OFL) cut from the variable font:
// display = 75% width, condensed (800/900); text = normal width (600/700).
const FONT_FILES: { family: string; weight: string; file: string }[] = [
  { family: DISPLAY_FONT, weight: '800', file: 'archivo-condensed-800' },
  { family: DISPLAY_FONT, weight: '900', file: 'archivo-condensed-900' },
  { family: TEXT_FONT, weight: '600', file: 'archivo-text-600' },
  { family: TEXT_FONT, weight: '700', file: 'archivo-text-700' },
]

let fontsPromise: Promise<void> | null = null

/** Registers and loads the graphics fonts once. Safe to call repeatedly. */
export function ensureGraphicsFonts(): Promise<void> {
  if (fontsPromise) return fontsPromise
  fontsPromise = (async () => {
    const faces: FontFace[] = []
    for (const spec of FONT_FILES) {
      for (const [subset, range] of [
        ['latin', LATIN],
        ['latin-ext', LATIN_EXT],
      ] as const) {
        const face = new FontFace(spec.family, `url(${asset(`fonts/${spec.file}-${subset}.woff2`)}) format('woff2')`, {
          weight: spec.weight,
          style: 'normal',
          unicodeRange: range,
        })
        document.fonts.add(face)
        faces.push(face)
      }
    }
    // Latin subsets are needed for every post; extended ones load on demand
    // but are fetched now too so accented names render on the first draw.
    await Promise.all(faces.map((f) => f.load()))
  })().catch((err) => {
    fontsPromise = null
    throw err
  })
  return fontsPromise
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached) return cached
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    // Remote images must be CORS-enabled or the canvas can't be exported.
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Couldn't load image: ${src}`))
    img.src = src
  })
  imageCache.set(src, promise)
  promise.catch(() => imageCache.delete(src))
  return promise
}

export function clubCrestUrl(): string {
  return asset('crest.webp')
}

export function knightWatermarkUrl(): string {
  return asset('knight.webp')
}

function imageSize(img: CanvasImageSource): { width: number; height: number } {
  if (img instanceof HTMLImageElement) return { width: img.naturalWidth, height: img.naturalHeight }
  if (img instanceof HTMLCanvasElement) return { width: img.width, height: img.height }
  if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) return { width: img.width, height: img.height }
  const sized = img as { width: number; height: number }
  return { width: Number(sized.width), height: Number(sized.height) }
}

export { imageSize }

/** Copies an image to a canvas, capped at `maxSide` px on its longest side. */
export function imageToCanvas(img: CanvasImageSource, maxSide = 1600): HTMLCanvasElement {
  const { width, height } = imageSize(img)
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Crops a canvas to its non-transparent pixels. */
export function trimCanvas(canvas: HTMLCanvasElement, padding = 0): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const box = opaqueBounds(data.data, canvas.width, canvas.height)
  if (!box) return canvas
  const out = document.createElement('canvas')
  out.width = box.width + padding * 2
  out.height = box.height + padding * 2
  out.getContext('2d')?.drawImage(canvas, box.x, box.y, box.width, box.height, padding, padding, box.width, box.height)
  return out
}

export interface PreparedLogo {
  image: CanvasImageSource
  /** Drawn as a rounded tile (the logo keeps its own background colour). */
  boxed: boolean
  kind: LogoKind
}

/**
 * Sponsor logo for the light design, in its own colours:
 *  - white background: removed, so the logo sits on the white footer
 *  - coloured background: kept, drawn as a rounded tile
 *  - transparent and white-only (made for dark backgrounds): recoloured navy
 *  - transparent with colour: used as it is
 */
export function lightLogo(img: CanvasImageSource, navy = '#0D1B4B'): PreparedLogo {
  const canvas = imageToCanvas(img, 1200)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { image: canvas, boxed: false, kind: 'colour-on-clear' }
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const kind = classifyLogo(data.data, canvas.width, canvas.height)
  if (kind === 'on-colour') return { image: tightTile(canvas, data.data), boxed: true, kind }
  if (kind === 'on-white') {
    removeWhiteBackground(data.data)
    clearEdgeLines(data.data, canvas.width, canvas.height)
    ctx.putImageData(data, 0, 0)
  } else if (kind === 'white-on-clear') {
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = navy
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'
  }
  return { image: trimCanvas(canvas), boxed: false, kind }
}

/** Crops a logo's own background down to the artwork plus a small even margin. */
function tightTile(canvas: HTMLCanvasElement, data: Uint8ClampedArray): HTMLCanvasElement {
  const box = contentBounds(data, canvas.width, canvas.height)
  if (!box) return canvas
  const pad = Math.round(Math.max(box.width, box.height) * 0.12)
  const x = Math.max(0, box.x - pad)
  const y = Math.max(0, box.y - pad)
  const w = Math.min(canvas.width, box.x + box.width + pad) - x
  const h = Math.min(canvas.height, box.y + box.height + pad) - y
  if (w >= canvas.width * 0.95 && h >= canvas.height * 0.95) return canvas
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d')?.drawImage(canvas, x, y, w, h, 0, 0, w, h)
  return out
}

/** White-on-transparent version of a sponsor logo for the navy footer. */
export function whiteLogo(img: CanvasImageSource): HTMLCanvasElement {
  const canvas = imageToCanvas(img, 1200)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  whitenLogoPixels(data.data, canvas.width, canvas.height)
  ctx.putImageData(data, 0, 0)
  return trimCanvas(canvas)
}
