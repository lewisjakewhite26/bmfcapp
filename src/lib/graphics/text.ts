/** Canvas text helpers for the graphics renderer. */

export const DISPLAY_FONT = 'BMFC Graphic Display'
export const TEXT_FONT = 'BMFC Graphic Text'

// Archivo vertical metrics (hhea): ascent 0.878em, descent 0.21em.
const ASCENT = 0.878
const CONTENT = 1.088

export type FontFamilyKind = 'display' | 'text'

export interface TextStyle {
  family: FontFamilyKind
  weight: 600 | 700 | 800 | 900
  size: number
  /** Extra space between letters in px (CSS letter-spacing). */
  tracking?: number
  color: string | CanvasGradient
}

export function fontString(style: Pick<TextStyle, 'family' | 'weight' | 'size'>): string {
  const family = style.family === 'display' ? DISPLAY_FONT : TEXT_FONT
  return `${style.weight} ${style.size}px "${family}"`
}

/**
 * Baseline for a CSS-style line box: the same maths the browser uses to place
 * text inside `line-height`, so canvas output matches the HTML mockups.
 */
export function baselineFor(top: number, size: number, lineHeight = size): number {
  return top + (lineHeight - CONTENT * size) / 2 + ASCENT * size
}

export function measureText(ctx: CanvasRenderingContext2D, text: string, style: TextStyle): number {
  ctx.font = fontString(style)
  const tracking = style.tracking ?? 0
  if (!tracking) return ctx.measureText(text).width
  let width = 0
  for (const ch of text) width += ctx.measureText(ch).width
  return width + tracking * Math.max(0, [...text].length - 1)
}

/**
 * Draws one line of text. Tracked text is drawn glyph by glyph so letter
 * spacing works in every browser (ctx.letterSpacing isn't universal yet).
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  style: TextStyle,
  align: 'left' | 'center' | 'right' = 'left',
): number {
  const width = measureText(ctx, text, style)
  let start = x
  if (align === 'center') start = x - width / 2
  if (align === 'right') start = x - width

  ctx.font = fontString(style)
  ctx.fillStyle = style.color
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  const tracking = style.tracking ?? 0
  if (!tracking) {
    ctx.fillText(text, start, baseline)
    return width
  }
  let cursor = start
  for (const ch of text) {
    ctx.fillText(ch, cursor, baseline)
    cursor += ctx.measureText(ch).width + tracking
  }
  return width
}

/** Largest size (stepping down by 1px) at which `text` fits `maxWidth`. */
export function fitFontSize(
  measure: (size: number) => number,
  maxWidth: number,
  maxSize: number,
  minSize: number,
): number {
  for (let size = maxSize; size > minSize; size -= 1) {
    if (measure(size) <= maxWidth) return size
  }
  return minSize
}

/**
 * Greedy word wrap into at most `maxLines` lines. Returns null when the text
 * can't fit — callers shrink the font and try again.
 */
export function wrapLines(
  words: string[],
  measure: (line: string) => number,
  maxWidth: number,
  maxLines: number,
): string[] | null {
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (measure(next) <= maxWidth) {
      current = next
      continue
    }
    if (!current) return null
    lines.push(current)
    current = word
    if (measure(current) > maxWidth) return null
  }
  if (current) lines.push(current)
  return lines.length <= maxLines ? lines : null
}
