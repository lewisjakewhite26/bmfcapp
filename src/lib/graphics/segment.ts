import type { InferenceSession } from 'onnxruntime-common'
// ONNX Runtime's engine files, emitted by Vite as plain assets (the package's
// "exports" hide them, hence the direct path).
import ortWasmUrl from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url'
import ortMjsUrl from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url'

/**
 * On-device background removal.
 *
 * Model: ISNet "isnet-general-use" (DIS, Apache-2.0), converted to fp16 and
 * served from our own site in five parts (public/models/isnet-fp16). It runs
 * with ONNX Runtime Web (MIT). Nothing is sent to anyone else's server.
 *
 * The model (~90 MB) downloads on first use and is kept in the browser's
 * Cache Storage, so later cut-outs start straight away.
 */

const MODEL_BASE = '/models/isnet-fp16/'
const CACHE_NAME = 'bmfc-cutout-model-v1'
const SIZE = 1024
const MEAN = [0.485, 0.456, 0.406]

interface Manifest {
  bytes: number
  parts: { file: string; bytes: number }[]
}

export type DownloadProgress = (fraction: number) => void

let sessionPromise: Promise<InferenceSession> | null = null

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches === 'undefined' ? null : await caches.open(CACHE_NAME)
  } catch {
    return null
  }
}

/** Fetches one part, reporting bytes as they arrive. */
async function fetchPart(url: string, cache: Cache | null, onBytes: (n: number) => void): Promise<Uint8Array> {
  const cached = await cache?.match(url)
  if (cached) {
    const buf = new Uint8Array(await cached.arrayBuffer())
    onBytes(buf.byteLength)
    return buf
  }

  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error("Couldn't download the cut-out tool. Check your connection and try again.")
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.byteLength
    onBytes(value.byteLength)
  }
  const buf = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    buf.set(c, offset)
    offset += c.byteLength
  }
  try {
    await cache?.put(url, new Response(buf, { headers: { 'Content-Type': 'application/octet-stream' } }))
  } catch {
    // Storage full or blocked: still works, just downloads again next time.
  }
  return buf
}

async function loadModelBytes(onProgress?: DownloadProgress): Promise<Uint8Array> {
  const manifestRes = await fetch(`${MODEL_BASE}manifest.json`, { cache: 'no-cache' })
  if (!manifestRes.ok) throw new Error("Couldn't download the cut-out tool. Check your connection and try again.")
  const manifest = (await manifestRes.json()) as Manifest
  const cache = await openCache()

  let loaded = 0
  const report = (n: number) => {
    loaded += n
    onProgress?.(Math.min(1, loaded / manifest.bytes))
  }
  const parts = await Promise.all(manifest.parts.map((p) => fetchPart(`${MODEL_BASE}${p.file}`, cache, report)))

  const model = new Uint8Array(manifest.bytes)
  let offset = 0
  for (const p of parts) {
    model.set(p, offset)
    offset += p.byteLength
  }
  if (offset !== manifest.bytes) {
    // A part was cut short; clear the cache so the next try starts clean.
    await caches?.delete(CACHE_NAME).catch(() => undefined)
    throw new Error('The cut-out tool download was incomplete. Try again.')
  }
  return model
}

/** Loads ONNX Runtime and the model once per page visit. */
export function loadSegmenter(onProgress?: DownloadProgress): Promise<InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import('onnxruntime-web/wasm')
      ort.env.wasm.wasmPaths = { wasm: ortWasmUrl, mjs: ortMjsUrl }
      ort.env.wasm.numThreads =
        typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated
          ? Math.min(4, navigator.hardwareConcurrency || 1)
          : 1
      const bytes = await loadModelBytes(onProgress)
      return ort.InferenceSession.create(bytes, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      })
    })()
    sessionPromise.catch(() => {
      sessionPromise = null
    })
  }
  return sessionPromise
}

/** Model input: the photo squashed to 1024×1024, RGB in 0–1 minus the ImageNet mean. */
function toTensorData(source: HTMLCanvasElement): Float32Array {
  const c = document.createElement('canvas')
  c.width = SIZE
  c.height = SIZE
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error("This browser can't process images")
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, SIZE, SIZE)
  const px = ctx.getImageData(0, 0, SIZE, SIZE).data
  const plane = SIZE * SIZE
  const out = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    out[i] = px[i * 4] / 255 - MEAN[0]
    out[plane + i] = px[i * 4 + 1] / 255 - MEAN[1]
    out[2 * plane + i] = px[i * 4 + 2] / 255 - MEAN[2]
  }
  return out
}

/** Scales the model's 1024×1024 mask to the photo and uses it as the alpha channel. */
function applyMask(source: HTMLCanvasElement, mask: Float32Array): HTMLCanvasElement {
  let min = Infinity
  let max = -Infinity
  for (const v of mask) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const range = max - min || 1

  const m = document.createElement('canvas')
  m.width = SIZE
  m.height = SIZE
  const mctx = m.getContext('2d')
  if (!mctx) throw new Error("This browser can't process images")
  const mdata = mctx.createImageData(SIZE, SIZE)
  for (let i = 0; i < mask.length; i++) {
    const o = i * 4
    mdata.data[o] = 255
    mdata.data[o + 1] = 255
    mdata.data[o + 2] = 255
    mdata.data[o + 3] = Math.round(((mask[i] - min) / range) * 255)
  }
  mctx.putImageData(mdata, 0, 0)

  const out = document.createElement('canvas')
  out.width = source.width
  out.height = source.height
  const octx = out.getContext('2d', { willReadFrequently: true })
  if (!octx) throw new Error("This browser can't process images")
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(m, 0, 0, out.width, out.height)
  const alpha = octx.getImageData(0, 0, out.width, out.height).data

  octx.clearRect(0, 0, out.width, out.height)
  octx.drawImage(source, 0, 0)
  const img = octx.getImageData(0, 0, out.width, out.height)
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = alpha[i]
  octx.putImageData(img, 0, 0)
  return out
}

/** Returns a copy of the photo with the background made transparent. */
export async function removeBackground(source: HTMLCanvasElement, onDownload?: DownloadProgress): Promise<HTMLCanvasElement> {
  const session = await loadSegmenter(onDownload)
  const ort = await import('onnxruntime-web/wasm')
  const input = new ort.Tensor('float32', toTensorData(source), [1, 3, SIZE, SIZE])
  const results = await session.run({ [session.inputNames[0]]: input })
  const output = results[session.outputNames[0]]
  try {
    return applyMask(source, output.data as Float32Array)
  } finally {
    input.dispose()
    output.dispose()
  }
}
