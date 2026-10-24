import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchSquad } from '../lib/clubApi'
import { ensureGraphicsFonts } from '../lib/graphics/assets'
import { DISPLAY_FONT, TEXT_FONT } from '../lib/graphics/text'
import { listSharedSponsorLogos, withSharedSponsorLogos } from '../lib/sharedSponsorLogos'
import { resolveSponsorLogoUrl } from '../lib/sponsorLogoUrl'
import { reelSponsors, type ReelSponsor } from '../lib/sponsorReel'

/**
 * Sponsors reel: a full-screen, looping background for the TVs at club
 * events (race night). One sponsor at a time under "Proudly sponsored by",
 * slow crossfades in club colours. Picks up new sponsors every few minutes.
 */

const SLIDE_MS = 8000
const REFRESH_MS = 5 * 60 * 1000
const CURSOR_IDLE_MS = 2500

/** Designed at 1920×1080 and scaled to fit any screen. */
const STAGE_W = 1920
const STAGE_H = 1080

const NAVY = '#0D1B4B'
const BLUE = '#2B5FC0'
const GOLD = '#D4A017'

const base = import.meta.env.BASE_URL ?? '/'
const CREST = `${base}graphics/crest.webp`

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

function preload(urls: string[]) {
  for (const url of urls) {
    const img = new Image()
    img.src = url
  }
}

/** Long names drop a size or two so they stay on one or two lines. */
function nameSize(name: string): number {
  if (name.length > 34) return 64
  if (name.length > 22) return 80
  return 96
}

function SponsorSlide({ sponsor }: { sponsor: ReelSponsor }) {
  const logoUrl = resolveSponsorLogoUrl(sponsor.logo)
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = logoUrl && !logoFailed

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeIn' } }}
      transition={{ duration: 1, ease: 'easeOut' }}
    >
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
        style={{
          fontFamily: `'${TEXT_FONT}', Inter, system-ui, sans-serif`,
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: '0.32em',
          color: GOLD,
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        Proudly sponsored by
      </motion.p>

      {showLogo ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, delay: 0.5, ease: 'easeOut' }}
          style={{
            marginTop: 56,
            width: 880,
            height: 440,
            borderRadius: 36,
            background: '#FFFFFF',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 56,
            boxSizing: 'border-box',
          }}
        >
          <img
            src={logoUrl}
            alt=""
            onError={() => setLogoFailed(true)}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
        </motion.div>
      ) : null}

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: showLogo ? 0.8 : 0.5, ease: 'easeOut' }}
        style={{
          fontFamily: `'${DISPLAY_FONT}', Figtree, system-ui, sans-serif`,
          fontWeight: 900,
          fontSize: showLogo ? nameSize(sponsor.name) : nameSize(sponsor.name) * 1.5,
          lineHeight: 1.05,
          color: '#FFFFFF',
          textTransform: 'uppercase',
          textAlign: 'center',
          maxWidth: 1500,
          margin: 0,
          marginTop: showLogo ? 52 : 40,
        }}
      >
        {sponsor.name}
      </motion.h1>
    </motion.div>
  )
}

export default function AdminSponsorsReel() {
  const scale = useStageScale()
  const [sponsors, setSponsors] = useState<ReelSponsor[] | null>(null)
  const [error, setError] = useState(false)
  const [index, setIndex] = useState(0)
  const [idle, setIdle] = useState(false)
  const idleTimer = useRef<number | undefined>(undefined)

  const load = useCallback(async () => {
    try {
      const [squad, logos] = await Promise.all([fetchSquad(), listSharedSponsorLogos()])
      const list = reelSponsors(withSharedSponsorLogos(squad, logos))
      preload(list.map((s) => resolveSponsorLogoUrl(s.logo)).filter((u): u is string => !!u))
      setSponsors(list)
      setError(false)
    } catch {
      // Keep showing what we had; only show the error if there's nothing yet.
      setError(true)
    }
  }, [])

  useEffect(() => {
    void ensureGraphicsFonts().catch(() => {})
    void load()
    const id = window.setInterval(() => void load(), REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load])

  const count = sponsors?.length ?? 0
  useEffect(() => {
    if (count < 2) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS)
    return () => window.clearInterval(id)
  }, [count])

  // Hide the cursor and controls when the mouse is still.
  useEffect(() => {
    const wake = () => {
      setIdle(false)
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => setIdle(true), CURSOR_IDLE_MS)
    }
    wake()
    window.addEventListener('mousemove', wake)
    window.addEventListener('keydown', wake)
    return () => {
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('keydown', wake)
      window.clearTimeout(idleTimer.current)
    }
  }, [])

  // Keep the screen awake where the browser allows it.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    const request = () => {
      if (document.visibilityState === 'visible' && nav.wakeLock) {
        nav.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {})
      }
    }
    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      document.removeEventListener('visibilitychange', request)
      void lock?.release().catch(() => {})
    }
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void document.documentElement.requestFullscreen().catch(() => {})
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      if (count > 1 && e.key === 'ArrowRight') setIndex((i) => (i + 1) % count)
      if (count > 1 && e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count])

  const current = sponsors && count ? sponsors[index % count] : null

  return (
    <div
      className="fixed inset-0 z-[300] overflow-hidden"
      style={{ background: NAVY, cursor: idle ? 'none' : 'default' }}
      onDoubleClick={toggleFullscreen}
    >
      <style>{`
        @keyframes reel-drift-a { 0%,100% { transform: translate(-8%, -6%) scale(1); } 50% { transform: translate(6%, 4%) scale(1.15); } }
        @keyframes reel-drift-b { 0%,100% { transform: translate(6%, 8%) scale(1.1); } 50% { transform: translate(-6%, -4%) scale(0.95); } }
        @media (prefers-reduced-motion: reduce) { .reel-glow { animation: none !important; } }
      `}</style>

      {/* Slow-moving glows behind everything. */}
      <div
        className="reel-glow absolute pointer-events-none"
        style={{
          inset: '-30%',
          background: `radial-gradient(40% 40% at 30% 35%, ${BLUE}99 0%, transparent 70%)`,
          animation: 'reel-drift-a 38s ease-in-out infinite',
        }}
      />
      <div
        className="reel-glow absolute pointer-events-none"
        style={{
          inset: '-30%',
          background: `radial-gradient(30% 30% at 72% 70%, ${GOLD}33 0%, transparent 70%)`,
          animation: 'reel-drift-b 46s ease-in-out infinite',
        }}
      />

      {/* 16:9 stage, scaled to the screen and centred. */}
      <div
        className="absolute"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        <img
          src={CREST}
          alt="Bishop Middleham FC"
          style={{ position: 'absolute', top: 56, left: 64, height: 120, width: 'auto', opacity: 0.95 }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
          }}
        >
          {count > 1 &&
            count <= 40 &&
            sponsors!.map((s, i) => (
              <span
                key={s.name}
                style={{
                  width: i === index % count ? 34 : 10,
                  height: 10,
                  borderRadius: 5,
                  background: i === index % count ? GOLD : 'rgba(255,255,255,0.25)',
                  transition: 'all 0.8s ease',
                }}
              />
            ))}
        </div>

        <AnimatePresence mode="wait">
          {current ? <SponsorSlide key={`${index}-${current.name}`} sponsor={current} /> : null}
        </AnimatePresence>

        {sponsors && !count ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p style={{ color: '#fff', fontSize: 44, fontFamily: `'${TEXT_FONT}', Inter, sans-serif`, textAlign: 'center' }}>
              No sponsors yet. Add them in Matchday graphics → Sponsors.
            </p>
          </div>
        ) : null}
        {!sponsors && error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p style={{ color: '#fff', fontSize: 44, fontFamily: `'${TEXT_FONT}', Inter, sans-serif` }}>
              Couldn&apos;t load sponsors. Check the connection — retrying shortly.
            </p>
          </div>
        ) : null}
      </div>

      {/* Controls: only visible while the mouse moves. */}
      <div
        className="absolute top-4 right-4 flex items-center gap-2 transition-opacity duration-500"
        style={{ opacity: idle ? 0 : 1, pointerEvents: idle ? 'none' : 'auto' }}
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-pill bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2 backdrop-blur"
        >
          Full screen (F)
        </button>
        <Link
          to="/admin"
          className="rounded-pill bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2 backdrop-blur"
        >
          Exit
        </Link>
      </div>
    </div>
  )
}
