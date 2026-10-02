import type { GraphicData, GraphicSide, MatchdayGraphicData, ResultGraphicData } from './data'
import { teamInitials } from './data'
import { imageSize } from './assets'
import { baselineFor, drawText, fitFontSize, measureText, wrapLines, type TextStyle } from './text'

/**
 * Draws the matchday / goalscorer / MOTM posts at 1080×1350 (Instagram/Facebook
 * portrait). Layout values are measured from the approved HTML mockups.
 */

export const GRAPHIC_WIDTH = 1080
export const GRAPHIC_HEIGHT = 1350

const NAVY = '#0D1B4B'
const FOOTER_NAVY = '#081239'
const GOLD = '#D4A017'
const GOLD_LINE = 'rgba(212, 160, 23, 0.45)'
const SOFT_WHITE = '#C7CEDE'
const WHITE = '#FFFFFF'

const MARGIN = 64
const CONTENT_WIDTH = GRAPHIC_WIDTH - MARGIN * 2
const FOOTER_TOP = 1100
const FOOTER_RULE = 3
const FOOTER_MID = FOOTER_TOP + FOOTER_RULE + (GRAPHIC_HEIGHT - FOOTER_TOP - FOOTER_RULE) / 2
const FOOTER_SPLIT = MARGIN + (CONTENT_WIDTH * 1.55) / 2.55

export interface GraphicImages {
  crest: CanvasImageSource
  knight: CanvasImageSource
  player: CanvasImageSource | null
  opponentBadge: CanvasImageSource | null
  /** Sponsor logo ready to draw (already whitened unless `sponsorLogoOnTile`). */
  sponsorLogo: CanvasImageSource | null
  /** Draw the original logo on a white tile instead of a white mark. */
  sponsorLogoOnTile?: boolean
}

const upper = (s: string) => s.toLocaleUpperCase('en-GB')

function label(size: number, color = GOLD, weight: 600 | 700 = 700, trackingEm = 0.22): TextStyle {
  return { family: 'text', weight, size, tracking: size * trackingEm, color }
}

function drawContained(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  box: { x: number; y: number; width: number; height: number },
  align: 'left' | 'center' | 'right' = 'center',
  valign: 'top' | 'middle' | 'bottom' = 'middle',
): { x: number; y: number; width: number; height: number } {
  const { width, height } = imageSize(img)
  const scale = Math.min(box.width / width, box.height / height)
  const w = width * scale
  const h = height * scale
  const x = align === 'left' ? box.x : align === 'right' ? box.x + box.width - w : box.x + (box.width - w) / 2
  const y = valign === 'top' ? box.y : valign === 'bottom' ? box.y + box.height - h : box.y + (box.height - h) / 2
  ctx.drawImage(img, x, y, w, h)
  return { x, y, width: w, height: h }
}

function drawBackground(ctx: CanvasRenderingContext2D, centreY: number) {
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, GRAPHIC_WIDTH, GRAPHIC_HEIGHT)
  // CSS: radial-gradient(ellipse 70% 52% at 50% <centre>, …)
  const rx = GRAPHIC_WIDTH * 0.7
  const ry = GRAPHIC_HEIGHT * 0.52
  ctx.save()
  ctx.translate(GRAPHIC_WIDTH / 2, centreY)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, '#2D58C4')
  g.addColorStop(0.42, '#1B3790')
  g.addColorStop(0.82, NAVY)
  g.addColorStop(1, NAVY)
  ctx.fillStyle = g
  ctx.fillRect(-GRAPHIC_WIDTH, -GRAPHIC_HEIGHT * 2, GRAPHIC_WIDTH * 2, GRAPHIC_HEIGHT * 4)
  ctx.restore()
}

function drawKnight(ctx: CanvasRenderingContext2D, knight: CanvasImageSource) {
  const { width, height } = imageSize(knight)
  const w = 1540
  ctx.save()
  ctx.globalAlpha = 0.07
  ctx.drawImage(knight, -230, 150, w, (height / width) * w)
  ctx.restore()
}

function drawTopBar(ctx: CanvasRenderingContext2D, crest: CanvasImageSource, seasonLabel: string) {
  ctx.drawImage(crest, MARGIN, 48, 72, 72)
  drawText(ctx, upper('Bishop Middleham FC'), 156, baselineFor(73, 22), {
    family: 'display',
    weight: 800,
    size: 22,
    tracking: 22 * 0.06,
    color: WHITE,
  })
  drawText(ctx, seasonLabel, GRAPHIC_WIDTH - MARGIN, baselineFor(74, 20), label(20, GOLD, 600, 0.2), 'right')
}

/** Big faded word behind the player ("GOALSCORER", "MATCHDAY", …). */
function drawBigWord(ctx: CanvasRenderingContext2D, lines: string[], top: number, size: number, lineHeightEm: number) {
  const fitted = Math.min(
    ...lines.map((line) =>
      fitFontSize(
        (s) => measureText(ctx, upper(line), { family: 'display', weight: 900, size: s, tracking: -0.01 * s, color: WHITE }),
        CONTENT_WIDTH,
        size,
        40,
      ),
    ),
  )
  const lineHeight = fitted * lineHeightEm
  const g = ctx.createLinearGradient(0, top, 0, top + lineHeight * lines.length)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.92, 'rgba(255,255,255,0.14)')
  g.addColorStop(1, 'rgba(255,255,255,0.14)')
  lines.forEach((line, i) => {
    drawText(
      ctx,
      upper(line),
      GRAPHIC_WIDTH / 2,
      baselineFor(top + i * lineHeight, fitted, lineHeight),
      { family: 'display', weight: 900, size: fitted, tracking: -0.01 * fitted, color: g },
      'center',
    )
  })
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: CanvasImageSource | null, crest: CanvasImageSource) {
  if (!player) {
    // No cut-out yet: a large crest keeps the post usable.
    ctx.save()
    ctx.globalAlpha = 0.95
    ctx.shadowColor = 'rgba(4,10,40,0.55)'
    ctx.shadowBlur = 48
    ctx.shadowOffsetY = 28
    ctx.drawImage(crest, GRAPHIC_WIDTH / 2 - 210, 440, 420, 420)
    ctx.restore()
    return
  }
  ctx.save()
  ctx.shadowColor = 'rgba(4,10,40,0.55)'
  ctx.shadowBlur = 48
  ctx.shadowOffsetY = 28
  drawContained(ctx, player, { x: (GRAPHIC_WIDTH - 820) / 2, y: FOOTER_TOP - 880, width: 820, height: 880 }, 'center', 'bottom')
  ctx.restore()
}

/** Darkens the bottom of the player into the info area. */
function drawFade(ctx: CanvasRenderingContext2D) {
  const top = FOOTER_TOP - 360
  const g = ctx.createLinearGradient(0, top, 0, FOOTER_TOP)
  g.addColorStop(0, 'rgba(13,27,75,0)')
  g.addColorStop(0.58, 'rgba(13,27,75,0.86)')
  g.addColorStop(1, NAVY)
  ctx.fillStyle = g
  ctx.fillRect(0, top, GRAPHIC_WIDTH, 360)
}

function drawFooterFrame(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = FOOTER_NAVY
  ctx.fillRect(0, FOOTER_TOP, GRAPHIC_WIDTH, GRAPHIC_HEIGHT - FOOTER_TOP)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, FOOTER_TOP, GRAPHIC_WIDTH, FOOTER_RULE)
  ctx.fillStyle = GOLD_LINE
  ctx.fillRect(Math.round(FOOTER_SPLIT), FOOTER_MID - 75, 1, 150)
}

/** Badge (or initials roundel) centred on (cx, cy), `size` tall. */
function drawSideMark(
  ctx: CanvasRenderingContext2D,
  side: GraphicSide,
  images: GraphicImages,
  cx: number,
  cy: number,
  size: number,
) {
  if (side.isClub) {
    ctx.drawImage(images.crest, cx - size / 2, cy - size / 2, size, size)
    return
  }
  if (images.opponentBadge) {
    drawContained(ctx, images.opponentBadge, { x: cx - size * 0.6, y: cy - size / 2, width: size * 1.2, height: size })
    return
  }
  const r = size / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#13245E'
  ctx.fill()
  ctx.lineWidth = Math.max(2, size * 0.05)
  ctx.strokeStyle = GOLD
  ctx.beginPath()
  ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  const fontSize = Math.round(size * 0.36)
  drawText(
    ctx,
    teamInitials(side.name),
    cx,
    cy + fontSize * 0.36,
    { family: 'display', weight: 900, size: fontSize, color: WHITE },
    'center',
  )
}

/** Label + wrapped text block, vertically centred in the footer. */
function drawFooterText(
  ctx: CanvasRenderingContext2D,
  heading: string,
  body: string,
  extra: string | null,
  x: number,
  maxWidth: number,
  align: 'left' | 'right',
) {
  const words = upper(body).split(/\s+/).filter(Boolean)
  let size = 26
  let lines: string[] | null = null
  for (; size >= 16; size -= 1) {
    const style: TextStyle = { family: 'display', weight: 800, size, tracking: size * 0.04, color: WHITE }
    lines = wrapLines(words, (line) => measureText(ctx, line, style), maxWidth, 2)
    if (lines) break
  }
  if (!lines) lines = [upper(body)]
  const lineHeight = size * 1.15
  const blockHeight = 18 + 14 + lineHeight * lines.length + (extra ? 14 + 17 : 0)
  let top = FOOTER_MID - blockHeight / 2

  drawText(ctx, upper(heading), x, baselineFor(top, 18), label(18), align)
  top += 18 + 14
  lines.forEach((line, i) => {
    drawText(
      ctx,
      line,
      x,
      baselineFor(top + i * lineHeight, size, lineHeight),
      { family: 'display', weight: 800, size, tracking: size * 0.04, color: WHITE },
      align,
    )
  })
  top += lineHeight * lines.length
  if (extra) {
    top += 14
    drawText(ctx, upper(extra), x, baselineFor(top, 17), label(17, SOFT_WHITE, 600, 0.2), align)
  }
}

function drawSponsorBlock(ctx: CanvasRenderingContext2D, data: ResultGraphicData, images: GraphicImages) {
  const sponsor = data.sponsor
  if (!sponsor) {
    // Free advert for the sponsorship slot every time the player features.
    drawFooterText(ctx, 'Sponsor this player', 'Get in touch', null, MARGIN, FOOTER_SPLIT - MARGIN - 40, 'left')
    return
  }
  const logo = images.sponsorLogo
  if (!logo) {
    drawFooterText(ctx, 'Sponsored by', sponsor.name || 'Our sponsor', null, MARGIN, FOOTER_SPLIT - MARGIN - 40, 'left')
    return
  }

  const maxW = Math.min(480, FOOTER_SPLIT - MARGIN - 40)
  const maxH = 150
  const { width, height } = imageSize(logo)
  const tilePad = images.sponsorLogoOnTile ? 16 : 0
  const scale = Math.min((maxW - tilePad * 2) / width, (maxH - tilePad * 2) / height)
  const logoW = width * scale
  const logoH = height * scale
  const blockH = 18 + 16 + logoH + tilePad * 2
  const top = FOOTER_MID - blockH / 2

  drawText(ctx, upper('Sponsored by'), MARGIN, baselineFor(top, 18), label(18))
  const logoTop = top + 18 + 16
  if (images.sponsorLogoOnTile) {
    ctx.fillStyle = WHITE
    roundRect(ctx, MARGIN, logoTop, logoW + tilePad * 2, logoH + tilePad * 2, 12)
    ctx.fill()
  }
  ctx.drawImage(logo, MARGIN + tilePad, logoTop + tilePad, logoW, logoH)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawResultBlock(ctx: CanvasRenderingContext2D, data: ResultGraphicData, images: GraphicImages) {
  const right = GRAPHIC_WIDTH - MARGIN
  const rowCentre = FOOTER_MID - (70 + 16 + 17) / 2 + 35
  const scoreStyle: TextStyle = { family: 'display', weight: 900, size: 60, tracking: 1.2, color: WHITE }
  const score = `${data.homeScore}–${data.awayScore}`
  const scoreW = measureText(ctx, score, scoreStyle)
  const markW = 70
  const gap = 22
  const awayCx = right - markW / 2
  const scoreRight = right - markW - gap
  const homeCx = scoreRight - scoreW - gap - markW / 2

  drawSideMark(ctx, data.home, images, homeCx, rowCentre, data.home.isClub ? 66 : 70)
  drawText(ctx, score, scoreRight, baselineFor(rowCentre - 30, 60), scoreStyle, 'right')
  drawSideMark(ctx, data.away, images, awayCx, rowCentre, data.away.isClub ? 66 : 70)

  drawText(ctx, upper('Full time'), right, baselineFor(rowCentre + 35 + 16, 17), label(17, SOFT_WHITE, 600, 0.2), 'right')
}

function drawNameBlock(ctx: CanvasRenderingContext2D, data: ResultGraphicData) {
  const name = upper(data.playerName)
  const size = fitFontSize(
    (s) => measureText(ctx, name, { family: 'display', weight: 900, size: s, color: WHITE }),
    CONTENT_WIDTH,
    84,
    44,
  )
  // Bottom of the block stays put; the name grows upwards from 1020.
  const nameTop = 1020 - size * 0.95
  drawText(ctx, name, GRAPHIC_WIDTH / 2, baselineFor(nameTop, size, size * 0.95), {
    family: 'display',
    weight: 900,
    size,
    color: WHITE,
  }, 'center')

  const detailStyle = label(26)
  const detail = upper(data.detail)
  const detailW = measureText(ctx, detail, detailStyle)
  const ruleW = 40
  const gap = 16
  const total = ruleW * 2 + gap * 2 + detailW
  const left = GRAPHIC_WIDTH / 2 - total / 2
  const lineTop = 1038
  ctx.fillStyle = GOLD
  ctx.fillRect(left, lineTop + 12, ruleW, 2)
  ctx.fillRect(left + total - ruleW, lineTop + 12, ruleW, 2)
  drawText(ctx, detail, left + ruleW + gap, baselineFor(lineTop, 26), detailStyle)
}

function renderResult(ctx: CanvasRenderingContext2D, data: ResultGraphicData, images: GraphicImages) {
  drawBackground(ctx, GRAPHIC_HEIGHT * 0.46)
  drawKnight(ctx, images.knight)
  drawTopBar(ctx, images.crest, data.seasonLabel)
  if (data.kind === 'goalscorer') {
    drawBigWord(ctx, ['Goalscorer'], 172, 102, 0.9)
  } else {
    drawBigWord(ctx, ['Man of', 'the Match'], 156, 116, 0.92)
  }
  drawPlayer(ctx, images.player, images.crest)
  drawFade(ctx)
  drawNameBlock(ctx, data)
  drawFooterFrame(ctx)
  drawSponsorBlock(ctx, data, images)
  drawResultBlock(ctx, data, images)
}

function drawFixtureHeader(ctx: CanvasRenderingContext2D, data: MatchdayGraphicData, images: GraphicImages) {
  const colW = (CONTENT_WIDTH - 120) / 2
  const centres = [MARGIN + colW / 2, GRAPHIC_WIDTH - MARGIN - colW / 2]
  const sidesList = [data.home, data.away]
  sidesList.forEach((side, i) => {
    drawSideMark(ctx, side, images, centres[i], 52 + 60, 120)
    const name = upper(side.name)
    const size = fitFontSize(
      (s) => measureText(ctx, name, { family: 'display', weight: 800, size: s, tracking: s * 0.08, color: WHITE }),
      colW - 16,
      17,
      11,
    )
    drawText(ctx, name, centres[i], baselineFor(186, size, 17), {
      family: 'display',
      weight: 800,
      size,
      tracking: size * 0.08,
      color: WHITE,
    }, 'center')
  })
  drawText(ctx, 'VS', GRAPHIC_WIDTH / 2, baselineFor(113, 30), {
    family: 'display',
    weight: 900,
    size: 30,
    tracking: 3,
    color: GOLD,
  }, 'center')
}

function drawInfoRow(ctx: CanvasRenderingContext2D, data: MatchdayGraphicData) {
  const colW = CONTENT_WIDTH / 3
  const cols = [
    [data.dayLabel, data.dateLabel],
    ['Kick-off', data.kickoffLabel],
    ['Fixture', data.fixtureLabel],
  ]
  cols.forEach(([heading, value], i) => {
    const cx = MARGIN + colW * i + colW / 2
    drawText(ctx, upper(heading), cx, baselineFor(994, 18), label(18), 'center')
    const valueText = upper(value)
    const size = fitFontSize(
      (s) => measureText(ctx, valueText, { family: 'display', weight: 900, size: s, color: WHITE }),
      colW - 24,
      40,
      24,
    )
    drawText(ctx, valueText, cx, baselineFor(1024, size, 40), { family: 'display', weight: 900, size, color: WHITE }, 'center')
  })
  ctx.fillStyle = GOLD_LINE
  ctx.fillRect(Math.round(MARGIN + colW), 994, 1, 70)
  ctx.fillRect(Math.round(MARGIN + colW * 2), 994, 1, 70)
}

function renderMatchday(ctx: CanvasRenderingContext2D, data: MatchdayGraphicData, images: GraphicImages) {
  drawBackground(ctx, GRAPHIC_HEIGHT * 0.5)
  drawKnight(ctx, images.knight)
  drawFixtureHeader(ctx, data, images)
  drawBigWord(ctx, ['Matchday'], 270, 128, 0.9)
  drawPlayer(ctx, images.player, images.crest)
  drawFade(ctx)
  drawInfoRow(ctx, data)
  drawFooterFrame(ctx)
  // No sponsor on matchday posts: competition left, venue right.
  drawFooterText(ctx, 'Competition', data.competition, null, MARGIN, FOOTER_SPLIT - MARGIN - 40, 'left')
  drawFooterText(ctx, 'Venue', data.venueName, data.venueDetail, GRAPHIC_WIDTH - MARGIN, GRAPHIC_WIDTH - MARGIN - FOOTER_SPLIT - 8, 'right')
}

/** Draws a post onto `canvas` (resized to 1080×1350). Fonts must be loaded first. */
export function renderGraphic(canvas: HTMLCanvasElement, data: GraphicData, images: GraphicImages): void {
  canvas.width = GRAPHIC_WIDTH
  canvas.height = GRAPHIC_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser')
  ctx.clearRect(0, 0, GRAPHIC_WIDTH, GRAPHIC_HEIGHT)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (data.kind === 'matchday') renderMatchday(ctx, data, images)
  else renderResult(ctx, data, images)
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create the image"))), 'image/png')
  })
}
