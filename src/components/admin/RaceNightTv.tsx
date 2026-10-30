import { useCallback, useEffect, useRef, useState } from 'react'
import { isRunnerFilled, ordinal, placedRunners, type Programme, type Runner } from '../../lib/raceNight'

interface RaceNightTvProps {
  programme: Programme
  onClose: () => void
  /** Start on this race (0-based). */
  startIndex?: number
}

const SLIDE_MS = 15000
const CONTROLS_IDLE_MS = 3000

const NAVY = '#0D1B4B'
const GOLD = '#D4A017'

/** Full-screen race card for the TVs on the night: one race at a time. */
export function RaceNightTv({ programme, onClose, startIndex = 0 }: RaceNightTvProps) {
  const races = programme.races
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(races.length - 1, 0)))
  const [paused, setPaused] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const go = useCallback(
    (delta: number) => {
      if (races.length === 0) return
      setIndex((i) => (i + delta + races.length) % races.length)
    },
    [races.length],
  )

  const close = useCallback(() => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen()
    } catch {
      // not in full screen
    }
    onClose()
  }, [onClose])

  // Try to go full screen (works from the button tap; ignored where unsupported, e.g. iPhone).
  useEffect(() => {
    try {
      void document.documentElement.requestFullscreen?.()
    } catch {
      // not supported
    }
  }, [])

  useEffect(() => {
    if (paused || races.length < 2) return
    const t = setInterval(() => go(1), SLIDE_MS)
    return () => clearInterval(t)
  }, [paused, races.length, go])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, go])

  // If the browser leaves full screen (Esc), close the overlay too.
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) onClose()
    }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [onClose])

  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_IDLE_MS)
  }, [])

  useEffect(() => {
    showControls()
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [showControls])

  const race = races[index]
  const placed = race ? placedRunners(race) : []
  const hasResults = placed.length > 0
  const runners = race ? race.runners.filter(isRunnerFilled) : []
  const half = Math.ceil(runners.length / 2)

  return (
    <div
      className="fixed inset-0 z-[100] text-white overflow-hidden select-none"
      style={{ background: `radial-gradient(circle at 30% 20%, #1c3a8a 0%, ${NAVY} 70%)` }}
      onMouseMove={showControls}
      onTouchStart={showControls}
      role="dialog"
      aria-label="Race night programme"
    >
      {!race ? (
        <div className="h-full flex items-center justify-center text-[3vw]">No races yet</div>
      ) : (
        <div className="h-full flex flex-col px-[4vw] py-[3vh]">
          <p className="text-[1.6vw] tracking-[0.3em] uppercase" style={{ color: GOLD }}>
            {programme.title}
          </p>
          <div className="flex items-end justify-between gap-[3vw] mt-[1vh]">
            <h1 className="font-display font-bold leading-none text-[8vw]">Race {index + 1}</h1>
            {race.sponsor.trim() && (
              <div className="text-right pb-[1vh]">
                <p className="text-[1.5vw] uppercase tracking-widest text-white/60">Sponsored by</p>
                <p className="font-display font-semibold leading-tight text-[3.4vw]" style={{ color: GOLD }}>
                  {race.sponsor}
                </p>
              </div>
            )}
          </div>

          <div className="mt-[3vh] h-px bg-white/20" />

          <div className="flex-1 grid grid-cols-2 gap-x-[4vw] mt-[3vh] content-start">
            {[runners.slice(0, half), runners.slice(half)].map((col, ci) => (
              <ul key={ci} className="space-y-[1.6vh]">
                {col.map((r) => (
                  <RunnerRow key={r.id} runner={r} />
                ))}
              </ul>
            ))}
            {runners.length === 0 && (
              <p className="col-span-2 text-[2.4vw] text-white/60">Runners to be confirmed</p>
            )}
          </div>

          {hasResults && (
            <p className="text-[1.8vw] text-white/70 pb-[1vh]">
              Result:{' '}
              {placed
                .map((r) => `${ordinal(r.position ?? 0)} ${r.horse.trim() || r.owner.trim() || `Runner ${r.number}`}`)
                .join('  ·  ')}
            </p>
          )}

          <div className="flex items-center justify-center gap-[0.8vw] pb-[0.5vh]">
            {races.map((r, i) => (
              <span
                key={r.id}
                className="rounded-full transition-all"
                style={{
                  width: i === index ? '2.4vw' : '0.9vw',
                  height: '0.9vw',
                  background: i === index ? GOLD : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div
        className={`absolute top-3 right-3 flex gap-2 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button type="button" onClick={() => go(-1)} className="tv-btn" aria-label="Previous race">
          ‹
        </button>
        <button type="button" onClick={() => setPaused((p) => !p)} className="tv-btn" aria-label={paused ? 'Resume' : 'Pause'}>
          {paused ? '▶' : '❚❚'}
        </button>
        <button type="button" onClick={() => go(1)} className="tv-btn" aria-label="Next race">
          ›
        </button>
        <button type="button" onClick={close} className="tv-btn" aria-label="Close">
          ✕
        </button>
      </div>

      <style>{`
        .tv-btn { min-width: 48px; min-height: 48px; padding: 0 16px; border-radius: 9999px;
          background: rgba(255,255,255,0.15); color: #fff; font-size: 20px; font-weight: 700;
          backdrop-filter: blur(6px); }
        .tv-btn:active { background: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  )
}

function RunnerRow({ runner }: { runner: Runner }) {
  const name = runner.horse.trim()
  const people = [runner.owner.trim() && `Owner: ${runner.owner.trim()}`, runner.jockey.trim() && `Jockey: ${runner.jockey.trim()}`]
    .filter(Boolean)
    .join('   ')
  const placed = runner.position !== null
  return (
    <li className="flex items-center gap-[1.6vw]">
      <span
        className="shrink-0 rounded-full flex items-center justify-center font-bold text-[2.2vw] w-[4.2vw] h-[4.2vw]"
        style={placed ? { background: GOLD, color: NAVY } : { background: 'rgba(255,255,255,0.15)' }}
      >
        {placed ? ordinal(runner.position ?? 0) : runner.number}
      </span>
      <div className="min-w-0">
        <p className="font-display font-semibold leading-tight truncate text-[2.6vw]">
          {name || runner.owner.trim() || runner.jockey.trim()}
        </p>
        {name && people && <p className="text-[1.5vw] text-white/60 truncate">{people}</p>}
        {!name && runner.owner.trim() && runner.jockey.trim() && (
          <p className="text-[1.5vw] text-white/60 truncate">Jockey: {runner.jockey.trim()}</p>
        )}
      </div>
    </li>
  )
}
