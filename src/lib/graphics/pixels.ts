/**
 * Pure pixel helpers (no DOM) so they can be unit-tested.
 * Pixel arrays are RGBA, row-major, as in ImageData.data.
 */

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** Bounding box of pixels with alpha above `threshold`, or null if none. */
export function opaqueBounds(data: Uint8ClampedArray, width: number, height: number, threshold = 8): Box | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/** True when a meaningful share of the image is transparent (already cut out). */
export function hasTransparency(data: Uint8ClampedArray, minShare = 0.02): boolean {
  let transparent = 0
  const total = data.length / 4
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 200) transparent++
  }
  return transparent / total >= minShare
}

function cornerSamples(data: Uint8ClampedArray, width: number, height: number): number[][] {
  const samples: number[][] = []
  const size = Math.max(1, Math.min(4, Math.floor(Math.min(width, height) / 10)))
  const corners = [
    [0, 0],
    [width - size, 0],
    [0, height - size],
    [width - size, height - size],
  ]
  for (const [cx, cy] of corners) {
    for (let y = cy; y < cy + size; y++) {
      for (let x = cx; x < cx + size; x++) {
        const i = (y * width + x) * 4
        samples.push([data[i], data[i + 1], data[i + 2], data[i + 3]])
      }
    }
  }
  return samples
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Turns a sponsor logo into a white mark on transparent, for the navy footer.
 *  - Logos that already have a transparent background keep their shape (alpha).
 *  - Logos on a solid background (white JPEG, black box, …): the background
 *    colour is read from the corners and everything that differs from it
 *    becomes white, the rest transparent.
 * Mutates and returns `data`.
 */
export function whitenLogoPixels(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  whitenCore(data, width, height)
  clearEdgeLines(data, width, height)
  return data
}

/**
 * Removes thin solid lines along the outer edges (left by a loose crop or a
 * screenshot border): up to 2% of the size from each edge, a row or column
 * that is almost entirely visible is cleared.
 */
export function clearEdgeLines(data: Uint8ClampedArray, width: number, height: number): void {
  const alphaAt = (x: number, y: number) => (y * width + x) * 4 + 3
  const rowShare = (y: number) => {
    let n = 0
    for (let x = 0; x < width; x++) if (data[alphaAt(x, y)] > 40) n++
    return n / width
  }
  const colShare = (x: number) => {
    let n = 0
    for (let y = 0; y < height; y++) if (data[alphaAt(x, y)] > 40) n++
    return n / height
  }
  const clearRow = (y: number) => {
    for (let x = 0; x < width; x++) data[alphaAt(x, y)] = 0
  }
  const clearCol = (x: number) => {
    for (let y = 0; y < height; y++) data[alphaAt(x, y)] = 0
  }
  const maxRows = Math.max(2, Math.round(height * 0.02))
  const maxCols = Math.max(2, Math.round(width * 0.02))
  for (let i = 0; i < maxRows; i++) {
    if (rowShare(i) > 0.85) clearRow(i)
    if (rowShare(height - 1 - i) > 0.85) clearRow(height - 1 - i)
  }
  for (let i = 0; i < maxCols; i++) {
    if (colShare(i) > 0.85) clearCol(i)
    if (colShare(width - 1 - i) > 0.85) clearCol(width - 1 - i)
  }
}

function whitenCore(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const corners = cornerSamples(data, width, height)
  const cornerAlpha = median(corners.map((c) => c[3]))

  if (cornerAlpha < 200) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
    }
    return data
  }

  const bg = [0, 1, 2].map((ch) => median(corners.map((c) => c[ch])))
  const low = 18
  const high = 90
  for (let i = 0; i < data.length; i += 4) {
    const diff = Math.max(
      Math.abs(data[i] - bg[0]),
      Math.abs(data[i + 1] - bg[1]),
      Math.abs(data[i + 2] - bg[2]),
    )
    const t = Math.min(1, Math.max(0, (diff - low) / (high - low)))
    data[i] = 255
    data[i + 1] = 255
    data[i + 2] = 255
    data[i + 3] = Math.round(t * (data[i + 3] / 255) * 255)
  }
  return data
}
