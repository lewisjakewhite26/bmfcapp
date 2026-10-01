import { hasTransparency } from './pixels'
import { imageToCanvas, trimCanvas } from './assets'

/**
 * Player cut-outs for the graphics library.
 *
 * Background removal runs on the device with @imgly/background-removal
 * (AGPL-3.0, ISNet model). The model (~40–80 MB) is downloaded from IMG.LY's
 * CDN on first use and cached by the browser; the library is lazy-loaded so
 * it never touches the rest of the app's bundle.
 */

/** Longest side kept for the stored original and the image sent to the model. */
export const SOURCE_MAX_SIDE = 2000
/** Height cap for stored cut-outs (posts draw players at up to 880 px tall). */
export const CUTOUT_MAX_HEIGHT = 1800

export interface PreparedSource {
  canvas: HTMLCanvasElement
  /** JPEG of the resized original, kept so the cut-out can be redone later. */
  originalJpeg: Blob
  /** True when the file already has a transparent background (no removal needed). */
  alreadyCutOut: boolean
}

export type CutoutProgress = (message: string, fraction: number | null) => void

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't save the image"))), type, quality)
  })
}

async function fileToImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } catch {
    throw new Error("That file isn't an image this browser can open. Try a JPEG or PNG.")
  } finally {
    // Revoke after decode; the decoded image stays usable for drawing.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

/** Resizes a phone photo (often 4000px+) and checks for an existing transparent background. */
export async function prepareSource(file: Blob): Promise<PreparedSource> {
  const img = await fileToImage(file)
  const canvas = imageToCanvas(img, SOURCE_MAX_SIDE)
  const ctx = canvas.getContext('2d')
  const pixels = ctx?.getImageData(0, 0, canvas.width, canvas.height)
  const alreadyCutOut = pixels ? hasTransparency(pixels.data) : false

  // JPEG has no transparency: flatten onto white for the stored original.
  const flat = document.createElement('canvas')
  flat.width = canvas.width
  flat.height = canvas.height
  const fctx = flat.getContext('2d')
  if (fctx) {
    fctx.fillStyle = '#ffffff'
    fctx.fillRect(0, 0, flat.width, flat.height)
    fctx.drawImage(canvas, 0, 0)
  }
  const originalJpeg = await canvasBlob(flat, 'image/jpeg', 0.9)
  return { canvas, originalJpeg, alreadyCutOut }
}

/**
 * Tightens soft edges a little so sky/grass haloes don't show on navy
 * (same curve used for the approved mockups).
 */
function tightenAlpha(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = data.data
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i] / 255
    const t = Math.min(1, Math.max(0, (a - 0.06) / 0.94))
    d[i] = Math.round(Math.pow(t, 1.25) * 255)
  }
  ctx.putImageData(data, 0, 0)
}

function capHeight(canvas: HTMLCanvasElement, maxHeight: number): HTMLCanvasElement {
  if (canvas.height <= maxHeight) return canvas
  const scale = maxHeight / canvas.height
  const out = document.createElement('canvas')
  out.width = Math.round(canvas.width * scale)
  out.height = maxHeight
  const ctx = out.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(canvas, 0, 0, out.width, out.height)
  }
  return out
}

/** Removes the background (unless already transparent) and returns a trimmed PNG. */
export async function makeCutout(source: PreparedSource, onProgress?: CutoutProgress): Promise<Blob> {
  let result: HTMLCanvasElement

  if (source.alreadyCutOut) {
    result = source.canvas
  } else {
    onProgress?.('Loading the cut-out tool…', null)
    const { removeBackground } = await import('@imgly/background-removal')
    const input = await canvasBlob(source.canvas, 'image/png')
    const blob = await removeBackground(input, {
      model: 'isnet_fp16',
      output: { format: 'image/png' },
      progress: (key, current, total) => {
        if (key.startsWith('fetch')) {
          onProgress?.('Downloading the cut-out tool (first time only)…', total ? current / total : null)
        } else {
          onProgress?.('Removing the background…', null)
        }
      },
    })
    const img = await fileToImage(blob)
    result = imageToCanvas(img, SOURCE_MAX_SIDE)
    tightenAlpha(result)
  }

  const trimmed = capHeight(trimCanvas(result), CUTOUT_MAX_HEIGHT)
  return canvasBlob(trimmed, 'image/png')
}
