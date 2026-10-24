import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchAdminUsers, fetchSquad } from '../lib/clubApi'
import { fetchGraphicsLibrary, resolveGraphicsUrl, type GraphicPlayerPhoto } from '../lib/graphicsApi'
import { withFullNames } from '../lib/graphics/names'
import { resolvePlayerPhotoUrl } from '../lib/playerPhotoUrl'
import { ensureGraphicsFonts, imageToCanvas, loadImage } from '../lib/graphics/assets'
import { DISPLAY_FONT, TEXT_FONT } from '../lib/graphics/text'
import { listSharedSponsorLogos, withSharedSponsorLogos } from '../lib/sharedSponsorLogos'
import { resolveSponsorLogoUrl } from '../lib/sponsorLogoUrl'
import { logoBackdrop, reelSponsors, splitPlayers, type LogoBackdrop, type ReelSponsor } from '../lib/sponsorReel'

/**
 * Sponsors reel: a full-screen, looping background for the TVs at club
 * events (race night). One sponsor at a time under "Proudly sponsored by",
 * slow crossfades in club colours. Picks up new sponsors every few minutes.
 */

const SLIDE_MS = 8000
const REFRESH_MS = 5 * 60 * 1000
const CURSOR_IDLE_MS = 2500
/** Touch screens get longer to reach the buttons after a tap. */
const TOUCH_IDLE_MS = 5000

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

type FsDoc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> }
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }

/** False on iPhones, where web pages can't go full screen. */
function canFullscreen(): boolean {
  const d = document as FsDoc
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled)
}

/** Opened from the Home Screen icon: already full screen with no browser bars. */
function isInstalledApp(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true
}

function useIsPortrait() {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth)
  useEffect(() => {
    const update = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return portrait
}

interface SlidePlayer {
  playerId: string
  name: string
  number: number | null
  /** Matchday graphics cut-out (transparent PNG), the nicest option. */
  cutoutUrl: string | null
  /** Profile picture, used when there's no cut-out. */
  photoUrl: string | null
}

interface ReelSlide {
  /** Unique per slide (a sponsor with lots of players spans several). */
  key: string
  name: string
  /** Resolved URL of the logo to show, or null for a name-only slide. */
  logoUrl: string | null
  backdrop: LogoBackdrop
  players: SlidePlayer[]
}

interface SponsorLogo {
  logoUrl: string | null
  backdrop: LogoBackdrop
}

/**
 * Picks each sponsor's logo and what it sits on. A "light" file wins (made
 * for white backgrounds); otherwise the logo's pixels decide. If the pixels
 * can't be read, the white card is the safe default.
 */
async function prepareLogo(s: ReelSponsor): Promise<SponsorLogo> {
  const light = resolveSponsorLogoUrl(s.logoLight)
  if (light) {
    void loadImage(light).catch(() => {})
    return { logoUrl: light, backdrop: 'white' }
  }
  const url = resolveSponsorLogoUrl(s.logo)
  if (!url) return { logoUrl: null, backdrop: 'white' }
  try {
    const canvas = imageToCanvas(await loadImage(url), 400)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return { logoUrl: url, backdrop: 'white' }
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return { logoUrl: url, backdrop: logoBackdrop(data.data, canvas.width, canvas.height) }
  } catch {
    return { logoUrl: url, backdrop: 'white' }
  }
}

/** Each player's default Matchday graphics cut-out (or their first one). */
function defaultCutouts(photos: GraphicPlayerPhoto[]): Map<string, string> {
  const byPlayer = new Map<string, GraphicPlayerPhoto>()
  for (const photo of photos) {
    const current = byPlayer.get(photo.player_id)
    if (!current || (photo.is_default && !current.is_default)) byPlayer.set(photo.player_id, photo)
  }
  const urls = new Map<string, string>()
  for (const [playerId, photo] of byPlayer) {
    const url = resolveGraphicsUrl(photo.cutout_path)
    if (url) urls.set(playerId, url)
  }
  return urls
}

async function buildSlides(): Promise<ReelSlide[]> {
  const [squad, logos, users, library] = await Promise.all([
    fetchSquad(),
    listSharedSponsorLogos(),
    // Full names and cut-outs are admin-only; committee members still get a reel without them.
    fetchAdminUsers().catch(() => []),
    fetchGraphicsLibrary().catch(() => ({ photos: [] as GraphicPlayerPhoto[] })),
  ])
  const cutouts = defaultCutouts(library.photos)
  const sponsors = reelSponsors(withSharedSponsorLogos(withFullNames(squad, users), logos))
  const prepared = await Promise.all(sponsors.map(prepareLogo))
  const slides: ReelSlide[] = []
  sponsors.forEach((sponsor, i) => {
    const players: SlidePlayer[] = sponsor.players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      number: p.number,
      cutoutUrl: cutouts.get(p.playerId) ?? null,
      photoUrl: resolvePlayerPhotoUrl(p.photo),
    }))
    for (const p of players) {
      const url = p.cutoutUrl ?? p.photoUrl
      if (url) void loadImage(url).catch(() => {})
    }
    splitPlayers(players).forEach((group, g) => {
      slides.push({ key: `${sponsor.name}-${g}`, name: sponsor.name, ...prepared[i], players: group })
    })
  })
  return slides
}

const CARD_STYLE: Record<LogoBackdrop, React.CSSProperties> = {
  white: { background: '#FFFFFF', boxShadow: '0 30px 80px rgba(0, 0, 0, 0.35)' },
  blue: { background: BLUE, boxShadow: '0 30px 80px rgba(0, 0, 0, 0.35)' },
  none: { background: 'transparent' },
}

/** Long names drop a size or two so they stay on one or two lines. */
function nameSize(name: string): number {
  if (name.length > 34) return 64
  if (name.length > 22) return 80
  return 96
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: `'${TEXT_FONT}', Inter, system-ui, sans-serif`,
  fontWeight: 700,
  letterSpacing: '0.32em',
  color: GOLD,
  textTransform: 'uppercase',
  margin: 0,
}

const NAME_STYLE: React.CSSProperties = {
  fontFamily: `'${DISPLAY_FONT}', Figtree, system-ui, sans-serif`,
  fontWeight: 900,
  lineHeight: 1.05,
  color: '#FFFFFF',
  textTransform: 'uppercase',
  textAlign: 'center',
  margin: 0,
}

function LogoCard({ url, backdrop, width, height, padding, onError }: {
  url: string
  backdrop: LogoBackdrop
  width: number
  height: number
  padding: number
  onError: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.6, delay: 0.5, ease: 'easeOut' }}
      style={{
        width,
        height,
        borderRadius: 36,
        ...CARD_STYLE[backdrop],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        boxSizing: 'border-box',
      }}
    >
      <img src={url} alt="" onError={onError} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
    </motion.div>
  )
}

/** "Jack Marley" → "JM", "Jack M" → "JM". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
}

/** One player: cut-out standing on the name plate, or a ringed profile picture, or just the name. */
function PlayerTile({ player, slotWidth, photoHeight, index, count }: {
  player: SlidePlayer
  slotWidth: number
  photoHeight: number
  index: number
  count: number
}) {
  const [cutoutFailed, setCutoutFailed] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const cutout = player.cutoutUrl && !cutoutFailed ? player.cutoutUrl : null
  const photo = !cutout && player.photoUrl && !photoFailed ? player.photoUrl : null
  const big = count <= 2
  const circle = Math.min(slotWidth - 40, big ? 360 : 250)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.7 + index * 0.15, ease: 'easeOut' }}
      style={{ width: slotWidth, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div style={{ height: photoHeight, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {cutout ? (
          <img
            src={cutout}
            alt=""
            onError={() => setCutoutFailed(true)}
            style={{
              maxWidth: '112%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'bottom center',
              display: 'block',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.45))',
              maskImage: 'linear-gradient(to bottom, #000 82%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 82%, transparent 100%)',
            }}
          />
        ) : photo ? (
          <img
            src={photo}
            alt=""
            onError={() => setPhotoFailed(true)}
            style={{
              width: circle,
              height: circle,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `8px solid ${GOLD}`,
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              marginBottom: 28,
              display: 'block',
            }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: circle,
              height: circle,
              borderRadius: '50%',
              background: BLUE,
              border: `8px solid ${GOLD}`,
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              marginBottom: 28,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...NAME_STYLE,
              fontSize: Math.round(circle * 0.36),
            }}
          >
            {initials(player.name)}
          </div>
        )}
      </div>
      <div style={{ marginTop: 14, textAlign: 'center', width: '100%' }}>
        {player.number != null ? (
          <p style={{ ...NAME_STYLE, color: GOLD, fontSize: big ? 56 : 44 }}>#{player.number}</p>
        ) : null}
        <p style={{ ...NAME_STYLE, fontSize: big ? 48 : 36, overflowWrap: 'anywhere' }}>{player.name}</p>
      </div>
    </motion.div>
  )
}

function SponsorSlide({ sponsor }: { sponsor: ReelSlide }) {
  const { logoUrl, players } = sponsor
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = !!logoUrl && !logoFailed
  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.8, ease: 'easeIn' as const } },
    transition: { duration: 1, ease: 'easeOut' as const },
  }
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1.2, delay, ease: 'easeOut' as const },
  })

  if (!players.length) {
    return (
      <motion.div className="absolute inset-0 flex flex-col items-center justify-center" {...fade}>
        <motion.p {...rise(0.3)} style={{ ...LABEL_STYLE, fontSize: 40 }}>Proudly sponsored by</motion.p>
        {showLogo ? (
          <div style={{ marginTop: 56 }}>
            <LogoCard url={logoUrl} backdrop={sponsor.backdrop} width={880} height={440} padding={56} onError={() => setLogoFailed(true)} />
          </div>
        ) : null}
        <motion.h1
          {...rise(showLogo ? 0.8 : 0.5)}
          style={{ ...NAME_STYLE, fontSize: nameSize(sponsor.name) * (showLogo ? 1 : 1.5), maxWidth: 1500, marginTop: showLogo ? 52 : 40 }}
        >
          {sponsor.name}
        </motion.h1>
      </motion.div>
    )
  }

  // Sponsor on the left, their players on the right.
  const AREA_W = 860
  const slotWidth = Math.min(420, AREA_W / players.length)
  const photoHeight = players.length <= 2 ? 680 : 560

  return (
    <motion.div className="absolute inset-0" {...fade}>
      <div style={{ position: 'absolute', left: 100, top: 0, bottom: 0, width: 820, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <motion.p {...rise(0.3)} style={{ ...LABEL_STYLE, fontSize: 34 }}>Proudly sponsored by</motion.p>
        {showLogo ? (
          <div style={{ marginTop: 48 }}>
            <LogoCard url={logoUrl} backdrop={sponsor.backdrop} width={720} height={380} padding={48} onError={() => setLogoFailed(true)} />
          </div>
        ) : null}
        <motion.h1
          {...rise(showLogo ? 0.8 : 0.5)}
          style={{ ...NAME_STYLE, fontSize: Math.round(nameSize(sponsor.name) * (showLogo ? 0.85 : 1.2)), maxWidth: 820, marginTop: showLogo ? 44 : 32 }}
        >
          {sponsor.name}
        </motion.h1>
      </div>
      <div style={{ position: 'absolute', left: 960, width: AREA_W, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {players.map((p, i) => (
          <PlayerTile key={p.playerId} player={p} slotWidth={slotWidth} photoHeight={photoHeight} index={i} count={players.length} />
        ))}
      </div>
    </motion.div>
  )
}

export default function AdminSponsorsReel() {
  const scale = useStageScale()
  const portrait = useIsPortrait()
  const [fullscreenOk] = useState(canFullscreen)
  const [installed] = useState(isInstalledApp)
  const [hasKeyboard] = useState(() => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? true)
  const [sponsors, setSponsors] = useState<ReelSlide[] | null>(null)
  const [error, setError] = useState(false)
  const [index, setIndex] = useState(0)
  const [idle, setIdle] = useState(false)
  const idleTimer = useRef<number | undefined>(undefined)

  const load = useCallback(async () => {
    try {
      setSponsors(await buildSlides())
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

  // Hide the cursor and controls when the mouse is still; a tap brings them back.
  useEffect(() => {
    const wake = (e?: Event) => {
      setIdle(false)
      window.clearTimeout(idleTimer.current)
      const touch = e instanceof PointerEvent && e.pointerType === 'touch'
      idleTimer.current = window.setTimeout(() => setIdle(true), touch ? TOUCH_IDLE_MS : CURSOR_IDLE_MS)
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
    const d = document as FsDoc
    const el = document.documentElement as FsEl
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      void (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.())?.catch(() => {})
      return
    }
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el)
    void request?.()
      .then(() => {
        // Phones: turn the picture sideways for the TV where the browser allows it.
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
        return orientation?.lock?.('landscape')
      })
      .catch(() => {})
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
                key={s.key}
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
          {current ? <SponsorSlide key={`${index}-${current.key}`} sponsor={current} /> : null}
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

      {/* Controls: only visible while the mouse moves or after a tap. */}
      <div
        className="absolute top-4 right-4 left-4 flex flex-col items-end gap-2 transition-opacity duration-500"
        style={{ opacity: idle ? 0 : 1, pointerEvents: idle ? 'none' : 'auto' }}
      >
        <div className="flex items-center gap-2">
          {fullscreenOk ? (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-pill bg-white/15 hover:bg-white/25 text-white text-base font-semibold px-5 py-3 backdrop-blur"
            >
              {hasKeyboard ? 'Full screen (F)' : 'Full screen'}
            </button>
          ) : null}
          <Link
            to="/admin"
            className="rounded-pill bg-white/15 hover:bg-white/25 text-white text-base font-semibold px-5 py-3 backdrop-blur"
          >
            Exit
          </Link>
        </div>
        {!fullscreenOk && !installed ? (
          <p className="max-w-xs rounded-2xl bg-white/15 text-white text-sm leading-snug px-4 py-3 backdrop-blur text-right">
            For full screen on iPhone, open the app from its Home Screen icon (Share → Add to Home Screen).
          </p>
        ) : null}
        {portrait ? (
          <p className="max-w-xs rounded-2xl bg-white/15 text-white text-sm leading-snug px-4 py-3 backdrop-blur text-right">
            Turn your phone sideways so it fills the TV.
          </p>
        ) : null}
      </div>
    </div>
  )
}
