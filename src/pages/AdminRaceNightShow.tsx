import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchRaceNight } from '../lib/clubApi'
import { ensureGraphicsFonts } from '../lib/graphics/assets'
import { DISPLAY_FONT, TEXT_FONT } from '../lib/graphics/text'
import { isRunnerFilled, ordinal, placedRunners, type Programme, type Race, type Runner } from '../lib/raceNight'
import {
  formatClock,
  formatCountdown,
  matchRaceVideos,
  nextStage,
  showsClock,
  stageDuration,
  type ShowStage,
} from '../lib/raceNightShow'
import { listSharedSponsorLogos, sponsorLogoFiles, type SharedLogoFile } from '../lib/sharedSponsorLogos'
import { resolveSponsorLogoUrl } from '../lib/sponsorLogoUrl'
import { SponsorsReel } from './AdminSponsorsReel'

/**
 * Race night show, for the laptop plugged into the TV.
 *
 * Between races the sponsors reel plays. "Next race" (Space) shows the race
 * card with betting closing in 2:00, then "Betting closed – off in 1:00",
 * then that race's video full-screen from a folder on the laptop (nothing is
 * uploaded). When the video ends the result is revealed, then back to the
 * reel. The live clock shows on everything except the race itself.
 *
 * Results are never drawn before the race's video has finished.
 */

const NAVY = '#0D1B4B'
const BLUE = '#2B5FC0'
const GOLD = '#D4A017'
const STAGE_W = 1920
const STAGE_H = 1080
const CONTROLS_IDLE_MS = 3000
const PROGRAMME_REFRESH_MS = 30_000
const RESULT_POLL_MS = 5_000
const PROGRESS_KEY = 'bmfc-race-night-show'

const base = import.meta.env.BASE_URL ?? '/'
const CREST = `${base}graphics/crest.webp`

const LABEL: React.CSSProperties = {
  fontFamily: `'${TEXT_FONT}', Inter, system-ui, sans-serif`,
  fontWeight: 700,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color: GOLD,
  margin: 0,
}

const DISPLAY: React.CSSProperties = {
  fontFamily: `'${DISPLAY_FONT}', Figtree, system-ui, sans-serif`,
  fontWeight: 900,
  textTransform: 'uppercase',
  lineHeight: 1.02,
  color: '#fff',
  margin: 0,
}

const TEXT: React.CSSProperties = {
  fontFamily: `'${TEXT_FONT}', Inter, system-ui, sans-serif`,
  color: 'rgba(255,255,255,0.75)',
  margin: 0,
}

function readProgress(): number {
  try {
    const n = Number(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}').next)
    return Number.isInteger(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

function saveProgress(next: number) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ next }))
  } catch {
    // private window: progress just isn't remembered
  }
}

function useStageScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return scale
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function isFullscreen(): boolean {
  const d = document as Document & { webkitFullscreenElement?: Element | null }
  return !!(d.fullscreenElement || d.webkitFullscreenElement)
}

function toggleFullscreen() {
  const d = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> }
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
  if (d.fullscreenElement || d.webkitFullscreenElement) {
    void (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.())?.catch(() => {})
    return
  }
  void (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch(() => {})
}

/** Horse name, else owner, else "Runner 4". */
function runnerTitle(r: Runner): string {
  return r.horse.trim() || r.owner.trim() || `Runner ${r.number}`
}

type VideoCheck = { state: 'checking' } | { state: 'ok'; seconds: number } | { state: 'bad' }

/** Loads a video far enough to know the browser can show it (picture and length). */
function checkVideo(url: string): Promise<VideoCheck> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    const done = (result: VideoCheck) => {
      window.clearTimeout(timer)
      v.removeAttribute('src')
      v.load()
      resolve(result)
    }
    const timer = window.setTimeout(() => done({ state: 'bad' }), 20_000)
    v.onloadeddata = () => done(v.videoWidth > 0 ? { state: 'ok', seconds: v.duration } : { state: 'bad' })
    v.onerror = () => done({ state: 'bad' })
    v.src = url
  })
}

/* ------------------------------------------------------------------ */

function Clock({ now }: { now: number }) {
  return (
    <p
      style={{
        position: 'absolute',
        top: 48,
        right: 64,
        ...DISPLAY,
        fontSize: 76,
        letterSpacing: '0.02em',
        color: '#fff',
        textShadow: '0 4px 20px rgba(0,0,0,0.35)',
        fontVariantNumeric: 'tabular-nums',
        zIndex: 5,
      }}
    >
      {formatClock(new Date(now))}
    </p>
  )
}

function SponsorLine({ race, logoUrl }: { race: Race; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false)
  if (!race.sponsor.trim()) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
      {logoUrl && !failed ? (
        <div
          style={{
            width: 240,
            height: 120,
            background: '#fff',
            borderRadius: 20,
            padding: 14,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
          }}
        >
          <img src={logoUrl} alt="" onError={() => setFailed(true)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      ) : null}
      <div>
        <p style={{ ...LABEL, fontSize: 24, color: 'rgba(255,255,255,0.6)' }}>Sponsored by</p>
        <p style={{ ...DISPLAY, fontSize: race.sponsor.length > 30 ? 44 : 56, color: GOLD, maxWidth: 1000 }}>{race.sponsor}</p>
        {race.supportedBy.trim() ? (
          <p style={{ ...TEXT, fontSize: 28, marginTop: 6 }}>
            supported by <b style={{ color: '#fff' }}>{race.supportedBy}</b>
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** Race card while betting is open. Never shows finishing positions. */
function RaceCard({ race, number, remaining, logoUrl }: { race: Race; number: number; remaining: number; logoUrl: string | null }) {
  const runners = race.runners.filter(isRunnerFilled)
  const half = Math.ceil(runners.length / 2)
  const urgent = remaining <= 30_000
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '56px 96px 48px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 64, paddingLeft: 150, paddingRight: 260, minHeight: 150 }}>
        <h1 style={{ ...DISPLAY, fontSize: 140, whiteSpace: 'nowrap', flexShrink: 0 }}>Race {number}</h1>
        <div style={{ minWidth: 0 }}>
          <SponsorLine race={race} logoUrl={logoUrl} />
        </div>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.18)', margin: '36px 0 28px' }} />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 80, alignContent: 'start' }}>
        {[runners.slice(0, half), runners.slice(half)].map((col, ci) => (
          <ul key={ci} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
            {col.map((r) => (
              <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                <span
                  style={{
                    ...DISPLAY,
                    width: 84,
                    height: 84,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: BLUE,
                    border: `4px solid ${GOLD}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 46,
                    boxSizing: 'border-box',
                  }}
                >
                  {r.number}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ ...DISPLAY, fontSize: 46, textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.horse.trim() || <span style={{ color: 'rgba(255,255,255,0.5)' }}>Name to come</span>}
                  </p>
                  <p style={{ ...TEXT, fontSize: 26, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {[r.owner.trim() && `Owner: ${r.owner.trim()}`, r.jockey.trim() && `Jockey: ${r.jockey.trim()}`].filter(Boolean).join('   ·   ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <div
        style={{
          alignSelf: 'center',
          display: 'flex',
          alignItems: 'center',
          gap: 36,
          padding: '18px 48px',
          borderRadius: 999,
          background: urgent ? GOLD : 'rgba(255,255,255,0.1)',
          transition: 'background 0.6s ease',
        }}
      >
        <span style={{ ...LABEL, fontSize: 34, color: urgent ? NAVY : GOLD }}>Betting closes in</span>
        <span style={{ ...DISPLAY, fontSize: 80, color: urgent ? NAVY : '#fff', fontVariantNumeric: 'tabular-nums', minWidth: 190 }}>
          {formatCountdown(remaining)}
        </span>
      </div>
    </div>
  )
}

function BettingClosed({ race, number, remaining, logoUrl }: { race: Race; number: number; remaining: number; logoUrl: string | null }) {
  const final = remaining <= 10_000
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ ...LABEL, fontSize: 44 }}>Race {number}</p>
      <h1 style={{ ...DISPLAY, fontSize: 170, marginTop: 24 }}>Betting closed</h1>
      <p style={{ ...LABEL, fontSize: 40, color: '#fff', marginTop: 56 }}>They're off in</p>
      <p
        style={{
          ...DISPLAY,
          fontSize: final ? 300 : 220,
          color: GOLD,
          marginTop: 12,
          fontVariantNumeric: 'tabular-nums',
          transition: 'font-size 0.4s ease',
        }}
      >
        {final ? Math.max(1, Math.ceil(remaining / 1000)) : formatCountdown(remaining)}
      </p>
      <div style={{ marginTop: 56 }}>
        <SponsorLine race={race} logoUrl={logoUrl} />
      </div>
    </div>
  )
}

/** Shown only after the race's video has finished. */
function Result({ race, number }: { race: Race; number: number }) {
  const placed = placedRunners(race)
  const winner = placed.find((r) => r.position === 1) ?? null
  const others = placed.filter((r) => r.position !== 1)
  if (!winner) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ ...LABEL, fontSize: 44 }}>Race {number} result</p>
        <h1 style={{ ...DISPLAY, fontSize: 140, marginTop: 28 }}>Result to follow</h1>
        <p style={{ ...TEXT, fontSize: 34, marginTop: 28 }}>It'll appear here as soon as it's entered.</p>
      </div>
    )
  }
  const people = [winner.owner.trim() && `Owner: ${winner.owner.trim()}`, winner.jockey.trim() && `Jockey: ${winner.jockey.trim()}`]
    .filter(Boolean)
    .join('   ·   ')
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} style={{ ...LABEL, fontSize: 44 }}>
        Race {number} · Winner
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.4, type: 'spring', bounce: 0.35 }}
        style={{
          ...DISPLAY,
          marginTop: 40,
          width: 230,
          height: 230,
          borderRadius: '50%',
          background: GOLD,
          color: NAVY,
          fontSize: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 0 14px ${BLUE}, 0 30px 80px rgba(0,0,0,0.45)`,
        }}
      >
        {winner.number}
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.9 }}
        style={{ ...DISPLAY, fontSize: runnerTitle(winner).length > 18 ? 110 : 140, marginTop: 52, textAlign: 'center', maxWidth: 1700 }}
      >
        {runnerTitle(winner)}
      </motion.h1>
      {people ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 1.3 }} style={{ ...TEXT, fontSize: 40, marginTop: 24, color: '#fff' }}>
          {people}
        </motion.p>
      ) : null}
      {others.length ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.8 }}
          style={{ ...TEXT, fontSize: 36, marginTop: 48 }}
        >
          {others.map((r) => `${ordinal(r.position ?? 0)}  #${r.number} ${runnerTitle(r)}`).join('      ')}
        </motion.p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function AdminRaceNightShow() {
  const scale = useStageScale()
  const now = useNow(250)
  const [programme, setProgramme] = useState<Programme | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [logos, setLogos] = useState<SharedLogoFile[]>([])
  const [nextRace, setNextRace] = useState(readProgress)
  const [current, setCurrent] = useState<number | null>(null)
  const [stage, setStage] = useState<ShowStage>('reel')
  const [stageEndsAt, setStageEndsAt] = useState<number | null>(null)
  const [videos, setVideos] = useState<Map<number, { name: string; url: string }>>(new Map())
  const [checks, setChecks] = useState<Map<number, VideoCheck>>(new Map())
  const [setupOpen, setSetupOpen] = useState(true)
  const [videoError, setVideoError] = useState(false)
  const [paused, setPaused] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const idleTimer = useRef<number | undefined>(undefined)
  const videoRef = useRef<HTMLVideoElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const filesInput = useRef<HTMLInputElement>(null)

  const races = programme?.races ?? []
  const race = current !== null ? races[current] ?? null : null

  const load = useCallback(async () => {
    try {
      const doc = await fetchRaceNight()
      setProgramme(doc.programme)
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    void ensureGraphicsFonts().catch(() => {})
    void load()
    void listSharedSponsorLogos().then(setLogos).catch(() => {})
  }, [load])

  // Keep names fresh between races; never mid-race.
  useEffect(() => {
    if (stage !== 'reel') return
    const id = window.setInterval(() => void load(), PROGRAMME_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [stage, load])

  // Result screen with no winner entered yet: keep checking until it is.
  const winnerKnown = !!race && placedRunners(race).some((r) => r.position === 1)
  useEffect(() => {
    if (stage !== 'result' || winnerKnown) return
    const id = window.setInterval(() => void load(), RESULT_POLL_MS)
    return () => window.clearInterval(id)
  }, [stage, winnerKnown, load])

  useEffect(() => saveProgress(nextRace), [nextRace])

  // Release video memory when the page closes or the folder changes.
  useEffect(() => () => videos.forEach((v) => URL.revokeObjectURL(v.url)), [videos])

  const goTo = useCallback((next: ShowStage) => {
    setStage(next)
    const ms = stageDuration(next)
    setStageEndsAt(ms === null ? null : Date.now() + ms)
    setVideoError(false)
    setPaused(false)
  }, [])

  // Timed stages move on by themselves.
  useEffect(() => {
    if (stageEndsAt !== null && now >= stageEndsAt) goTo(nextStage(stage))
  }, [now, stageEndsAt, stage, goTo])

  const remaining = stageEndsAt === null ? 0 : stageEndsAt - now

  const raceVideo = current !== null ? videos.get(current + 1) ?? null : null

  const startNextRace = useCallback(() => {
    if (stage !== 'reel' || !races.length || nextRace >= races.length) return
    if (!videos.get(nextRace + 1)) {
      setSetupOpen(true)
      return
    }
    setCurrent(nextRace)
    goTo('card')
  }, [stage, races.length, nextRace, videos, goTo])

  const finishRace = useCallback(() => {
    if (stage !== 'result') return
    if (current !== null) setNextRace(Math.max(nextRace, current + 1))
    setCurrent(null)
    goTo('reel')
  }, [stage, current, nextRace, goTo])

  /** Stops the race in progress without counting it as run. */
  const abandon = useCallback(() => {
    setCurrent(null)
    goTo('reel')
  }, [goTo])

  const skip = useCallback(() => {
    if (stage === 'card' || stage === 'closed') goTo(nextStage(stage))
  }, [stage, goTo])

  const onVideoEnded = useCallback(() => {
    void load()
    goTo('result')
  }, [load, goTo])

  const togglePause = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play().then(() => setPaused(false)).catch(() => {})
    else {
      v.pause()
      setPaused(true)
    }
  }, [])

  const pickFiles = (list: FileList | null) => {
    if (!list || !list.length) return
    const matched = matchRaceVideos(Array.from(list))
    videos.forEach((v) => URL.revokeObjectURL(v.url))
    const next = new Map<number, { name: string; url: string }>()
    matched.forEach((file, n) => next.set(n, { name: file.name, url: URL.createObjectURL(file) }))
    setVideos(next)
    const pending = new Map<number, VideoCheck>()
    next.forEach((_, n) => pending.set(n, { state: 'checking' }))
    setChecks(pending)
    next.forEach((v, n) => {
      void checkVideo(v.url).then((result) => setChecks((prev) => new Map(prev).set(n, result)))
    })
  }

  // Keys: Space next, S skip countdown, B back to the reel, ↑↓ choose race, V videos, F full screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (setupOpen) return
      // A clicked button keeps focus; without this Space would also press it.
      if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) document.activeElement.blur()
      const key = e.key.toLowerCase()
      if (key === ' ' || key === 'enter') {
        e.preventDefault()
        if (stage === 'reel') startNextRace()
        else if (stage === 'result') finishRace()
        else if (stage === 'video') togglePause()
      } else if (key === 's') skip()
      else if (key === 'b' || key === 'backspace') {
        if (stage !== 'reel' && stage !== 'result') abandon()
      } else if (key === 'arrowup' && stage === 'reel') setNextRace((n) => Math.max(0, n - 1))
      else if (key === 'arrowdown' && stage === 'reel') setNextRace((n) => Math.min(races.length, n + 1))
      else if (key === 'v' && stage === 'reel') setSetupOpen(true)
      else if (key === 'f') toggleFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setupOpen, stage, startNextRace, finishRace, togglePause, skip, abandon, races.length])

  // Mouse/touch brings the buttons back for a few seconds.
  useEffect(() => {
    const wake = () => {
      setControlsVisible(true)
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_IDLE_MS)
    }
    wake()
    window.addEventListener('mousemove', wake)
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)
    return () => {
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
      window.clearTimeout(idleTimer.current)
    }
  }, [])

  const logoFor = useMemo(() => {
    const cache = new Map<string, string | null>()
    return (name: string) => {
      if (!cache.has(name)) {
        const { main, light } = sponsorLogoFiles(name, logos)
        cache.set(name, resolveSponsorLogoUrl(light?.path ?? main?.path ?? null))
      }
      return cache.get(name) ?? null
    }
  }, [logos])

  const raceLogo = race ? logoFor(race.sponsor) : null
  const allDone = races.length > 0 && nextRace >= races.length
  const matchedCount = races.filter((_, i) => videos.has(i + 1)).length
  const badCount = races.filter((_, i) => checks.get(i + 1)?.state === 'bad').length

  return (
    <div className="fixed inset-0 z-[300] overflow-hidden" style={{ background: NAVY, cursor: controlsVisible ? 'default' : 'none' }}>
      {/* Between races: the sponsors reel (kept running underneath so it never reloads). */}
      <div style={{ position: 'absolute', inset: 0, visibility: stage === 'reel' ? 'visible' : 'hidden' }}>
        <SponsorsReel embedded />
      </div>

      {stage !== 'reel' && stage !== 'video' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(60% 60% at 25% 20%, ${BLUE}88 0%, transparent 70%), radial-gradient(40% 40% at 80% 85%, ${GOLD}22 0%, transparent 70%), ${NAVY}`,
          }}
        />
      ) : null}

      {/* 16:9 stage for everything drawn on top of the reel. */}
      <div
        style={{
          position: 'absolute',
          width: STAGE_W,
          height: STAGE_H,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
          zIndex: 310,
          pointerEvents: 'none',
        }}
      >
        {stage !== 'reel' && stage !== 'video' ? (
          <img src={CREST} alt="" style={{ position: 'absolute', top: 56, left: 64, height: 120, width: 'auto' }} />
        ) : null}
        {showsClock(stage) ? <Clock now={now} /> : null}

        <AnimatePresence mode="wait">
          {race && stage === 'card' ? (
            <motion.div key={`card-${current}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} style={{ position: 'absolute', inset: 0 }}>
              <RaceCard race={race} number={(current ?? 0) + 1} remaining={remaining} logoUrl={raceLogo} />
            </motion.div>
          ) : null}
          {race && stage === 'closed' ? (
            <motion.div key={`closed-${current}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} style={{ position: 'absolute', inset: 0 }}>
              <BettingClosed race={race} number={(current ?? 0) + 1} remaining={remaining} logoUrl={raceLogo} />
            </motion.div>
          ) : null}
          {race && stage === 'result' ? (
            <motion.div key={`result-${current}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} style={{ position: 'absolute', inset: 0 }}>
              <Result race={race} number={(current ?? 0) + 1} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* The race itself: full screen, no clock. */}
      {stage === 'video' && raceVideo ? (
        <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 320 }}>
          <video
            key={raceVideo.url}
            ref={videoRef}
            src={raceVideo.url}
            autoPlay
            playsInline
            onEnded={onVideoEnded}
            onError={() => setVideoError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
          {paused ? (
            <p style={{ position: 'absolute', top: 24, left: 0, right: 0, textAlign: 'center', ...LABEL, fontSize: 28, color: '#fff' }}>
              Paused · Space to carry on
            </p>
          ) : null}
          {videoError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white text-center px-6" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <p className="text-3xl font-bold">This race video won't play</p>
              <p className="text-lg text-white/80">{raceVideo.name}</p>
              <div className="flex gap-3">
                <button type="button" className="show-btn" onClick={onVideoEnded}>
                  Go to the result
                </button>
                <button type="button" className="show-btn" onClick={abandon}>
                  Back to the reel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Buttons: appear when the mouse moves. */}
      <div
        className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-center gap-2 transition-opacity duration-500"
        style={{ opacity: controlsVisible && !setupOpen ? 1 : 0, pointerEvents: controlsVisible && !setupOpen ? 'auto' : 'none', zIndex: 330 }}
      >
        {stage === 'reel' ? (
          <>
            <button type="button" className="show-btn" onClick={() => setNextRace((n) => Math.max(0, n - 1))} aria-label="Choose an earlier race">
              ‹
            </button>
            <button type="button" className="show-btn show-btn-primary" onClick={startNextRace} disabled={allDone || !races.length}>
              {allDone ? 'All races run' : races.length ? `Next race: Race ${nextRace + 1} (Space)` : 'Loading…'}
            </button>
            <button type="button" className="show-btn" onClick={() => setNextRace((n) => Math.min(races.length, n + 1))} aria-label="Choose a later race">
              ›
            </button>
            <button type="button" className="show-btn" onClick={() => setSetupOpen(true)}>
              Videos ({matchedCount}/{races.length || 0})
            </button>
          </>
        ) : null}
        {stage === 'card' || stage === 'closed' ? (
          <>
            <button type="button" className="show-btn" onClick={skip}>
              Skip countdown (S)
            </button>
            <button type="button" className="show-btn" onClick={abandon}>
              Stop, back to reel (B)
            </button>
          </>
        ) : null}
        {stage === 'video' ? (
          <>
            <button type="button" className="show-btn" onClick={togglePause}>
              {paused ? 'Play (Space)' : 'Pause (Space)'}
            </button>
            <button type="button" className="show-btn" onClick={abandon}>
              Stop, back to reel (B)
            </button>
          </>
        ) : null}
        {stage === 'result' ? (
          <button type="button" className="show-btn show-btn-primary" onClick={finishRace}>
            Back to the reel (Space)
          </button>
        ) : null}
        <button type="button" className="show-btn" onClick={toggleFullscreen}>
          Full screen (F)
        </button>
        {stage === 'reel' ? (
          <Link to="/admin/race-night" className="show-btn">
            Exit
          </Link>
        ) : null}
      </div>

      {/* Choose and test the videos. */}
      {setupOpen ? (
        <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(5,12,40,0.88)', zIndex: 340 }}>
          <div className="w-full max-w-xl rounded-3xl bg-white text-brand-navy p-6 space-y-4 shadow-2xl max-h-full overflow-y-auto">
            <div>
              <h2 className="font-display text-2xl">Race night show</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose the folder with the race videos on this laptop. They play from here; nothing is uploaded.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={() => folderInput.current?.click()}>
                Choose videos folder
              </button>
              <button type="button" className="text-brand-blue font-semibold text-sm px-3 min-h-[44px]" onClick={() => filesInput.current?.click()}>
                or pick the files
              </button>
              <input
                ref={folderInput}
                type="file"
                className="hidden"
                multiple
                // Folder picking: supported by Chrome, Edge and Safari.
                {...({ webkitdirectory: '' } as Record<string, string>)}
                onChange={(e) => pickFiles(e.target.files)}
              />
              <input ref={filesInput} type="file" className="hidden" multiple accept="video/*" onChange={(e) => pickFiles(e.target.files)} />
            </div>
            {loadError && !programme ? (
              <p className="text-sm text-red-700">Couldn't load the race night programme. Check the connection.</p>
            ) : null}
            {races.length ? (
              <ul className="divide-y divide-gray-100 text-sm">
                {races.map((r, i) => {
                  const v = videos.get(i + 1)
                  const check = checks.get(i + 1)
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <b>Race {i + 1}</b>
                        <span className="text-gray-500 truncate"> · {v ? v.name : 'no video yet'}</span>
                      </span>
                      <span className="shrink-0 font-semibold">
                        {!v ? (
                          <span className="text-gray-400">—</span>
                        ) : check?.state === 'ok' ? (
                          <span className="text-emerald-700">✓ plays · {formatCountdown(check.seconds * 1000)}</span>
                        ) : check?.state === 'bad' ? (
                          <span className="text-red-700">✗ won't play</span>
                        ) : (
                          <span className="text-gray-500">checking…</span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {badCount ? (
              <p className="text-sm text-red-700">
                {badCount === 1 ? 'One video' : `${badCount} videos`} won't play in this browser. Try Chrome, or convert to .mp4 (H.264).
              </p>
            ) : null}
            {races.length ? (
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Start from</span>
                <select
                  className="input-field max-w-[12rem]"
                  value={nextRace}
                  onChange={(e) => setNextRace(Number(e.target.value))}
                >
                  {races.map((_, i) => (
                    <option key={i} value={i}>
                      Race {i + 1}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <p className="text-xs text-gray-500">
              Space: next race · S: skip countdown · B: stop · ↑↓: choose race · F: full screen · V: videos
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1 min-h-[48px]"
                onClick={() => {
                  setSetupOpen(false)
                  if (!isFullscreen()) toggleFullscreen()
                }}
              >
                {matchedCount ? 'Start the show' : 'Show the reel for now'}
              </button>
              <Link to="/admin/race-night" className="flex-1 min-h-[48px] inline-flex items-center justify-center rounded-pill border border-brand-blue/15 text-sm font-semibold text-gray-600">
                Exit
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .show-btn { min-height: 48px; padding: 0 20px; border-radius: 9999px; background: rgba(255,255,255,0.16);
          color: #fff; font-size: 16px; font-weight: 700; backdrop-filter: blur(8px); display: inline-flex; align-items: center; }
        .show-btn:hover { background: rgba(255,255,255,0.26); }
        .show-btn:disabled { opacity: 0.5; }
        .show-btn-primary { background: ${GOLD}; color: ${NAVY}; }
        .show-btn-primary:hover { background: #e2b22a; }
      `}</style>
    </div>
  )
}
