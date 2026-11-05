import { describe, expect, it } from 'vitest'
import { BETTING_MS, OFF_MS, formatClock, formatCountdown, matchRaceVideos, nextStage, showsClock, stageDuration } from './raceNightShow'

const f = (name: string) => ({ name })

describe('matching race videos', () => {
  it('pairs "Race N.mp4" files with their race', () => {
    const files = ['Race 7.mp4', 'Race 8.mp4', 'Race 1.mp4', 'Race 2.mp4'].map(f)
    const m = matchRaceVideos(files)
    expect(m.get(1)?.name).toBe('Race 1.mp4')
    expect(m.get(7)?.name).toBe('Race 7.mp4')
    expect(m.size).toBe(4)
  })

  it('copes with other spellings and leaves out non-videos', () => {
    const m = matchRaceVideos(['race_03.MP4', '4.webm', 'notes.txt', 'Race 5.jpg', 'intro.mp4'].map(f))
    expect(m.get(3)?.name).toBe('race_03.MP4')
    expect(m.get(4)?.name).toBe('4.webm')
    expect(m.has(5)).toBe(false)
    expect(m.size).toBe(2)
  })

  it('uses the last number in the name', () => {
    expect(matchRaceVideos([f('2026 race night 6.mp4')]).get(6)?.name).toBe('2026 race night 6.mp4')
  })
})

describe('countdown and clock', () => {
  it('shows minutes and seconds, rounding up', () => {
    expect(formatCountdown(BETTING_MS)).toBe('2:00')
    expect(formatCountdown(OFF_MS)).toBe('1:00')
    expect(formatCountdown(95_000)).toBe('1:35')
    expect(formatCountdown(400)).toBe('0:01')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-5)).toBe('0:00')
  })

  it('shows a 24-hour clock', () => {
    expect(formatClock(new Date(2026, 10, 14, 21, 7))).toBe('21:07')
    expect(formatClock(new Date(2026, 10, 14, 9, 30))).toBe('09:30')
  })

  it('hides the clock only while a race is playing', () => {
    expect(showsClock('video')).toBe(false)
    for (const s of ['reel', 'card', 'closed', 'result'] as const) expect(showsClock(s)).toBe(true)
  })
})

describe('stages', () => {
  it('runs reel → card → closed → video → result → reel', () => {
    expect(nextStage('reel')).toBe('card')
    expect(nextStage('card')).toBe('closed')
    expect(nextStage('closed')).toBe('video')
    expect(nextStage('video')).toBe('result')
    expect(nextStage('result')).toBe('reel')
  })

  it('times betting at 2 minutes and the off at 1 minute', () => {
    expect(stageDuration('card')).toBe(120_000)
    expect(stageDuration('closed')).toBe(60_000)
    expect(stageDuration('video')).toBeNull()
  })
})
