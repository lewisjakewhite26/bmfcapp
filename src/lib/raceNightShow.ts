/**
 * Race night show: the laptop-on-the-TV flow for each race.
 *
 *   reel → card (betting closes in 2:00) → closed (off in 1:00) → video → result → reel …
 *
 * Results are never shown before the race's video has finished.
 */

export type ShowStage = 'reel' | 'card' | 'closed' | 'video' | 'result'

/** Betting stays open this long once "Next race" is pressed. */
export const BETTING_MS = 2 * 60 * 1000
/** Then "Betting closed" counts down this long before the video plays. */
export const OFF_MS = 60 * 1000

/** Plays in a browser on the laptop. */
const VIDEO_FILE = /\.(mp4|m4v|webm|mov|ogv)$/i

/**
 * Pairs video files with race numbers by the number in the file name
 * ("Race 3.mp4", "race_03.mp4", "3.mp4"). The last number in the name wins;
 * files without one, or that aren't videos, are left out. If two files share
 * a number, the first in A–Z order is used.
 */
export function matchRaceVideos<T extends { name: string }>(files: T[]): Map<number, T> {
  const out = new Map<number, T>()
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { numeric: true }))
  for (const file of sorted) {
    if (!VIDEO_FILE.test(file.name)) continue
    const numbers = file.name.replace(/\.[a-z0-9]+$/i, '').match(/\d+/g)
    if (!numbers) continue
    const n = Number(numbers[numbers.length - 1])
    if (n > 0 && !out.has(n)) out.set(n, file)
  }
  return out
}

/** 95_000 → "1:35". Never negative; rounds up so "0:00" only shows at the very end. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** 24-hour UK clock, e.g. "21:47". */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** The live clock shows on every screen except while a race is playing. */
export function showsClock(stage: ShowStage): boolean {
  return stage !== 'video'
}

/** Where a stage goes next. The last race's result returns to the reel with nothing left to run. */
export function nextStage(stage: ShowStage): ShowStage {
  switch (stage) {
    case 'reel':
      return 'card'
    case 'card':
      return 'closed'
    case 'closed':
      return 'video'
    case 'video':
      return 'result'
    case 'result':
      return 'reel'
  }
}

/** How long a timed stage lasts, or null for stages that wait (reel, video, result). */
export function stageDuration(stage: ShowStage): number | null {
  if (stage === 'card') return BETTING_MS
  if (stage === 'closed') return OFF_MS
  return null
}
