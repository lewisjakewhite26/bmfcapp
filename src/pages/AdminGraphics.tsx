import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { GraphicCanvas, type GraphicCanvasHandle } from '../components/graphics/GraphicCanvas'
import { PlayerPhotoUploader } from '../components/graphics/PlayerPhotoUploader'
import { BadgeUploadButton } from '../components/graphics/BadgeUploadButton'
import { LibraryPanel } from '../components/graphics/LibraryPanel'
import { SponsorsPanel } from '../components/graphics/SponsorsPanel'
import { fetchAdminUsers, fetchFixturesWithResults, fetchSquad } from '../lib/clubApi'
import { withFullNames } from '../lib/graphics/names'
import { listSharedSponsorLogos, withSharedSponsorLogos, type SharedLogoFile } from '../lib/sharedSponsorLogos'
import { formatMatchDate } from '../lib/format'
import { pageContainerClass } from '../lib/layout'
import { resolveSponsorLogoUrl } from '../lib/sponsorLogoUrl'
import {
  buildMatchdayData,
  buildResultData,
  graphicFileName,
  motmPlayerId,
  scorersForFixture,
  type GraphicData,
  type GraphicKind,
} from '../lib/graphics/data'
import { canShareFiles, downloadGraphics, shareGraphics, type ExportFile } from '../lib/graphics/exportImage'
import { DEFAULT_FRAMING, type GraphicTheme, type PlayerFraming } from '../lib/graphics/render'
import {
  badgeForOpponent,
  fetchGraphicsLibrary,
  photosForPlayer,
  resolveGraphicsUrl,
  type GraphicsLibrary,
} from '../lib/graphicsApi'
import type { FixtureWithResult, SquadMember } from '../types'

const KINDS: { id: GraphicKind; label: string }[] = [
  { id: 'matchday', label: 'Matchday' },
  { id: 'goalscorer', label: 'Goalscorer' },
  { id: 'motm', label: 'MOTM' },
]

function fixtureLabel(f: FixtureWithResult): string {
  const venue = f.home_away === 'home' ? 'H' : 'A'
  const score = f.result ? ` · ${f.result.goals_for}–${f.result.goals_against}` : ''
  return `${formatMatchDate(f.match_date)} · ${f.opponent} (${venue})${score}`
}

interface PostPlayer {
  playerId: string
  name: string
  goals?: number
}

interface PostCardProps {
  kind: GraphicKind
  fixture: FixtureWithResult
  player: PostPlayer | null
  squadMember: SquadMember | null
  library: GraphicsLibrary
  onLibraryChanged: () => void
  register: (key: string, handle: GraphicCanvasHandle | null, fileName: string) => void
  theme: GraphicTheme
}

function PostCard({ kind, fixture, player, squadMember, library, onLibraryChanged, register, theme }: PostCardProps) {
  const photos = useMemo(() => (player ? photosForPlayer(library.photos, player.playerId) : []), [library.photos, player])
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [logoOnTile, setLogoOnTile] = useState(false)
  const [sharing, setSharing] = useState(false)
  const canvasRef = useRef<GraphicCanvasHandle | null>(null)

  const chosen = photos.find((p) => p.id === photoId) ?? photos[0] ?? null
  // Size and position of the photo on this post only; starts fresh for each photo.
  const [framing, setFraming] = useState<PlayerFraming>(DEFAULT_FRAMING)
  const [framingFor, setFramingFor] = useState<string | null>(null)
  if ((chosen?.id ?? null) !== framingFor) {
    setFramingFor(chosen?.id ?? null)
    setFraming(DEFAULT_FRAMING)
  }
  const framed = framing.scale !== 1 || framing.x !== 0 || framing.y !== 0
  const badge = badgeForOpponent(library.badges, fixture.opponent, library.crests)
  const badgeUrl = resolveGraphicsUrl(badge?.badge_path)
  const playerImageUrl = resolveGraphicsUrl(chosen?.cutout_path)
  const sponsorLogoUrl =
    kind === 'matchday'
      ? null
      : resolveSponsorLogoUrl(
          (theme === 'light' && squadMember?.sponsor_logo_light_url) || squadMember?.sponsor_logo_url,
        )

  const data = useMemo<GraphicData | null>(() => {
    try {
      if (kind === 'matchday') {
        return buildMatchdayData(fixture, { opponentBadgeUrl: badgeUrl, playerImageUrl })
      }
      if (!player) return null
      return buildResultData(fixture, {
        kind,
        goals: player.goals,
        opponentBadgeUrl: badgeUrl,
        playerImageUrl,
        player: {
          display_name: player.name,
          sponsor_name: squadMember?.sponsor_name ?? null,
          sponsorLogoUrl,
        },
      })
    } catch {
      return null
    }
  }, [kind, fixture, player, squadMember?.sponsor_name, sponsorLogoUrl, badgeUrl, playerImageUrl])

  const fileName = graphicFileName(kind, fixture, kind === 'matchday' ? null : player?.name)
  const key = `${kind}-${fixture.id}-${player?.playerId ?? 'none'}`

  const setHandle = useCallback(
    (handle: GraphicCanvasHandle | null) => {
      canvasRef.current = handle
      register(key, handle, fileName)
    },
    [key, fileName, register],
  )

  const exportFiles = (): ExportFile[] | null => {
    const canvas = canvasRef.current?.canvas
    if (!canvas || !canvasRef.current?.ready) {
      toast.error('Still drawing. Try again in a second.')
      return null
    }
    return [{ canvas, fileName }]
  }

  const handleShare = async () => {
    const files = exportFiles()
    if (!files) return
    setSharing(true)
    try {
      await shareGraphics(files)
    } catch {
      toast.error("Couldn't open sharing. Download it instead.")
    } finally {
      setSharing(false)
    }
  }

  if (!data) return null

  return (
    <div className="glass-card p-4 space-y-4">
      {player && (
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg text-brand-navy">{player.name}</p>
          {kind === 'goalscorer' && player.goals && player.goals > 1 && (
            <span className="text-xs font-semibold text-brand-blue">{player.goals} goals</span>
          )}
        </div>
      )}

      {player && photos.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Photo</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPhotoId(p.id)}
                aria-pressed={chosen?.id === p.id}
                aria-label={`Use photo${p.is_default ? ' (main)' : ''}`}
                className={`shrink-0 w-16 h-20 rounded-xl bg-gradient-to-b from-[#2D58C4] to-brand-navy overflow-hidden grid place-items-end justify-items-center border-2 ${
                  chosen?.id === p.id ? 'border-brand-gold' : 'border-transparent'
                }`}
              >
                <img src={resolveGraphicsUrl(p.cutout_path) ?? ''} alt="" className="max-h-full w-auto" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {player && photos.length === 0 && (
        <div className="rounded-card border border-amber-200 bg-amber-50 p-3 space-y-3">
          <p className="text-sm text-amber-800">No graphics photo for {player.name} yet. The crest is used until you add one.</p>
          <PlayerPhotoUploader
            playerId={player.playerId}
            playerName={player.name}
            hasPhotos={false}
            onSaved={onLibraryChanged}
            compact
          />
        </div>
      )}

      {!badge && (
        <div className="rounded-card border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800">No {fixture.opponent} badge yet. Their initials are used.</p>
          <BadgeUploadButton
            opponentName={fixture.opponent}
            hasBadge={false}
            onSaved={onLibraryChanged}
            className="text-sm font-semibold text-brand-blue shrink-0 min-h-[44px] inline-flex items-center"
          />
        </div>
      )}

      {kind !== 'matchday' && sponsorLogoUrl && theme === 'dark' && (
        <label className="flex items-center gap-2 text-sm text-brand-navy">
          <input type="checkbox" className="accent-brand-blue" checked={logoOnTile} onChange={(e) => setLogoOnTile(e.target.checked)} />
          Show sponsor logo on a white tile
        </label>
      )}

      <GraphicCanvas
        ref={setHandle}
        data={data}
        sponsorLogoUrl={sponsorLogoUrl}
        logoOnTile={logoOnTile}
        framing={chosen ? framing : undefined}
        onFramingChange={chosen ? setFraming : undefined}
        theme={theme}
      />

      {chosen && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label htmlFor={`${key}-size`} className="text-sm font-semibold text-brand-navy shrink-0">
              Photo size
            </label>
            <input
              id={`${key}-size`}
              type="range"
              min={60}
              max={250}
              step={5}
              value={Math.round(framing.scale * 100)}
              onChange={(e) => setFraming((f) => ({ ...f, scale: Number(e.target.value) / 100 }))}
              className="flex-1 accent-brand-blue"
            />
            <span className="w-12 text-right text-sm tabular-nums text-gray-500">{Math.round(framing.scale * 100)}%</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">Drag the player on the preview to move them. Anything below the footer is cut off.</p>
            <button
              type="button"
              className="text-xs font-semibold text-brand-blue min-h-[36px] shrink-0 disabled:opacity-40"
              disabled={!framed}
              onClick={() => setFraming(DEFAULT_FRAMING)}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => {
            const files = exportFiles()
            if (files) void downloadGraphics(files)
          }}
        >
          Download
        </button>
        {canShareFiles() && (
          <button type="button" className="btn-secondary flex-1" disabled={sharing} onClick={() => void handleShare()}>
            {sharing ? 'Opening…' : 'Share'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminGraphics() {
  const [tab, setTab] = useState<'make' | 'library' | 'sponsors'>('make')
  const [loading, setLoading] = useState(true)
  const [fixtures, setFixtures] = useState<FixtureWithResult[]>([])
  const [squad, setSquad] = useState<SquadMember[]>([])
  const [sharedLogos, setSharedLogos] = useState<SharedLogoFile[]>([])
  const [library, setLibrary] = useState<GraphicsLibrary>({ photos: [], badges: [] })
  const [kind, setKind] = useState<GraphicKind>('matchday')
  const [theme, setTheme] = useState<GraphicTheme>(() => {
    try {
      return localStorage.getItem('bmfc-graphics-theme') === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  const chooseTheme = (t: GraphicTheme) => {
    setTheme(t)
    try {
      localStorage.setItem('bmfc-graphics-theme', t)
    } catch {
      // Not saved; the choice still applies on this visit.
    }
  }
  const [fixtureId, setFixtureId] = useState('')
  const [includePast, setIncludePast] = useState(false)
  const [posterPlayerId, setPosterPlayerId] = useState('')
  const [motmId, setMotmId] = useState('')
  const handles = useRef(new Map<string, { handle: GraphicCanvasHandle; fileName: string }>())

  // Full names ("Jack Marley") for posts and matching; the app's "Jack M" is the fallback.
  // Shared logos (Supabase sponsors folder) fill in for players without their own.
  const loadSquad = useCallback(async () => {
    const [sq, users, logos] = await Promise.all([
      fetchSquad(),
      fetchAdminUsers().catch(() => []),
      listSharedSponsorLogos(),
    ])
    setSharedLogos(logos)
    return withSharedSponsorLogos(withFullNames(sq, users), logos)
  }, [])

  const refreshSquad = useCallback(async () => {
    try {
      setSquad(await loadSquad())
    } catch {
      toast.error("Couldn't reload the squad")
    }
  }, [loadSquad])

  const refreshLibrary = useCallback(async () => {
    try {
      setLibrary(await fetchGraphicsLibrary())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load photos and badges")
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [fx, sq, lib] = await Promise.all([fetchFixturesWithResults(), loadSquad(), fetchGraphicsLibrary()])
        if (cancelled) return
        setFixtures(fx)
        setSquad(sq)
        setLibrary(lib)
      } catch {
        if (!cancelled) toast.error("Couldn't load fixtures, squad or photos")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadSquad])

  // Matchday posts: upcoming games, plus past ones on request (a week that got missed).
  const upcoming = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const next = fixtures
      .filter((f) => f.status === 'scheduled' && new Date(f.match_date) >= startOfToday)
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
    if (!includePast) return next
    const past = fixtures
      .filter((f) => !next.includes(f))
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
    return [...next, ...past]
  }, [fixtures, includePast])

  const played = useMemo(
    () =>
      fixtures
        .filter((f) => f.status === 'completed' && f.result)
        .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()),
    [fixtures],
  )

  const fixtureOptions = kind === 'matchday' ? upcoming : played

  // Default to the next match (matchday) or the last result (goalscorer/MOTM).
  useEffect(() => {
    if (!fixtureOptions.some((f) => f.id === fixtureId)) setFixtureId(fixtureOptions[0]?.id ?? '')
  }, [fixtureOptions, fixtureId])

  const fixture = fixtureOptions.find((f) => f.id === fixtureId) ?? null

  useEffect(() => {
    if (kind === 'motm' && fixture) setMotmId(motmPlayerId(fixture) ?? '')
  }, [kind, fixture])

  const sortedSquad = useMemo(() => [...squad].sort((a, b) => a.display_name.localeCompare(b.display_name)), [squad])
  const squadById = useMemo(() => new Map(squad.map((s) => [s.player_id, s])), [squad])

  const opponents = useMemo(() => [...new Set(fixtures.map((f) => f.opponent))], [fixtures])

  const posts: PostPlayer[] | null = useMemo(() => {
    if (!fixture) return null
    if (kind === 'goalscorer') {
      return scorersForFixture(fixture).map((s) => ({ playerId: s.playerId, name: squadById.get(s.playerId)?.display_name ?? s.name, goals: s.goals }))
    }
    if (kind === 'motm') {
      const member = squadById.get(motmId)
      const fromEvent = fixture.events?.find((e) => e.event_type === 'motm' && e.player_id === motmId)
      if (!motmId) return []
      return [{ playerId: motmId, name: member?.display_name ?? fromEvent?.player_name ?? 'Player' }]
    }
    const poster = squadById.get(posterPlayerId)
    return poster ? [{ playerId: poster.player_id, name: poster.display_name }] : []
  }, [fixture, kind, motmId, posterPlayerId, squadById])

  const register = useCallback((key: string, handle: GraphicCanvasHandle | null, fileName: string) => {
    if (handle) handles.current.set(key, { handle, fileName })
    else handles.current.delete(key)
  }, [])

  const allFiles = (): ExportFile[] | null => {
    const files: ExportFile[] = []
    for (const { handle, fileName } of handles.current.values()) {
      if (!handle.canvas || !handle.ready) {
        toast.error('Still drawing. Try again in a second.')
        return null
      }
      files.push({ canvas: handle.canvas, fileName })
    }
    return files
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass('max-w-lg')}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">
          ← Admin
        </Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">Matchday graphics</h1>
          <p className="text-sm text-gray-500 mt-1">Matchday, goalscorer and MOTM posts, ready to share.</p>
        </div>

        <div className="flex gap-2 p-1 glass-card" role="tablist" aria-label="Graphics sections">
          {(
            [
              ['make', 'Make a post'],
              ['library', 'Photos & badges'],
              ['sponsors', 'Sponsors'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex-1 min-h-[44px] px-2 rounded-pill text-[13px] sm:text-sm leading-tight font-semibold transition-colors ${
                tab === id ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-white/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass-card h-64 animate-pulse" />
        ) : tab === 'library' ? (
          <LibraryPanel squad={squad} opponents={opponents} library={library} onChanged={() => void refreshLibrary()} />
        ) : tab === 'sponsors' ? (
          <SponsorsPanel squad={squad} sharedLogos={sharedLogos} onChanged={() => void refreshSquad()} />
        ) : (
          <>
            <div className="glass-card p-4 space-y-4">
              <fieldset>
                <legend className="text-sm font-semibold text-brand-navy mb-2">Post</legend>
                <div className="flex gap-2">
                  {KINDS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      aria-pressed={kind === k.id}
                      onClick={() => setKind(k.id)}
                      className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold border transition-colors ${
                        kind === k.id ? 'bg-brand-navy text-white border-brand-navy' : 'border-brand-blue/20 text-brand-navy bg-white/70'
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold text-brand-navy mb-2">Look</legend>
                <div className="flex gap-2">
                  {(
                    [
                      ['dark', 'Navy'],
                      ['light', 'Light'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={theme === id}
                      onClick={() => chooseTheme(id)}
                      className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold border transition-colors ${
                        theme === id ? 'bg-brand-navy text-white border-brand-navy' : 'border-brand-blue/20 text-brand-navy bg-white/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="graphics-fixture" className="text-sm font-semibold text-brand-navy block mb-2">
                  {kind === 'matchday' ? (includePast ? 'Match' : 'Upcoming match') : 'Match (newest first)'}
                </label>
                {fixtureOptions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {kind === 'matchday' ? 'No upcoming matches in the fixture list.' : 'No results entered yet.'}
                  </p>
                ) : (
                  <select id="graphics-fixture" className="input-field" value={fixtureId} onChange={(e) => setFixtureId(e.target.value)}>
                    {fixtureOptions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {fixtureLabel(f)}
                      </option>
                    ))}
                  </select>
                )}
                {kind === 'matchday' && (
                  <label className="mt-2 flex items-center gap-2 text-sm text-brand-navy">
                    <input
                      type="checkbox"
                      className="accent-brand-blue"
                      checked={includePast}
                      onChange={(e) => setIncludePast(e.target.checked)}
                    />
                    Include past matches
                  </label>
                )}
              </div>

              {kind === 'matchday' && fixture && (
                <div>
                  <label htmlFor="graphics-poster" className="text-sm font-semibold text-brand-navy block mb-2">
                    Poster player
                  </label>
                  <select id="graphics-poster" className="input-field" value={posterPlayerId} onChange={(e) => setPosterPlayerId(e.target.value)}>
                    <option value="">No player (crest only)</option>
                    {sortedSquad.map((s) => (
                      <option key={s.player_id} value={s.player_id}>
                        {s.display_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Matchday posts don't show a sponsor.</p>
                </div>
              )}

              {kind === 'motm' && fixture && (
                <div>
                  <label htmlFor="graphics-motm" className="text-sm font-semibold text-brand-navy block mb-2">
                    Man of the match
                  </label>
                  <select id="graphics-motm" className="input-field" value={motmId} onChange={(e) => setMotmId(e.target.value)}>
                    <option value="">Pick a player</option>
                    {sortedSquad.map((s) => (
                      <option key={s.player_id} value={s.player_id}>
                        {s.display_name}
                      </option>
                    ))}
                  </select>
                  {!motmPlayerId(fixture) && (
                    <p className="text-xs text-gray-500 mt-1">No MOTM logged for this match. Pick one here or add it in Enter results.</p>
                  )}
                </div>
              )}
            </div>

            {fixture && kind === 'goalscorer' && posts?.length === 0 && (
              <p className="glass-card p-4 text-sm text-gray-500">
                No goalscorers logged for this match. Add them in <Link to="/admin/results" className="text-brand-blue font-medium">Enter results</Link>.
              </p>
            )}

            {fixture && kind === 'matchday' && (
              <PostCard
                key={`matchday-${fixture.id}-${posterPlayerId}`}
                kind="matchday"
                fixture={fixture}
                player={posts?.[0] ?? null}
                squadMember={squadById.get(posterPlayerId) ?? null}
                library={library}
                onLibraryChanged={() => void refreshLibrary()}
                register={register}
                theme={theme}
              />
            )}

            {fixture &&
              kind !== 'matchday' &&
              posts?.map((p) => (
                <PostCard
                  key={`${kind}-${fixture.id}-${p.playerId}`}
                  kind={kind}
                  fixture={fixture}
                  player={p}
                  squadMember={squadById.get(p.playerId) ?? null}
                  library={library}
                  onLibraryChanged={() => void refreshLibrary()}
                  register={register}
                  theme={theme}
                />
              ))}

            {kind === 'goalscorer' && posts && posts.length > 1 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={() => {
                    const files = allFiles()
                    if (files) void downloadGraphics(files)
                  }}
                >
                  Download all
                </button>
                {canShareFiles() && (
                  <button
                    type="button"
                    className="btn-secondary flex-1"
                    onClick={() => {
                      const files = allFiles()
                      if (files) void shareGraphics(files).catch(() => toast.error("Couldn't open sharing. Download them instead."))
                    }}
                  >
                    Share all
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
