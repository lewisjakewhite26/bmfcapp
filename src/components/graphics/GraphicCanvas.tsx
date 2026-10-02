import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type PointerEvent } from 'react'
import type { GraphicData } from '../../lib/graphics/data'
import { clubCrestUrl, ensureGraphicsFonts, knightWatermarkUrl, lightLogo, loadImage, whiteLogo } from '../../lib/graphics/assets'
import { renderGraphic, type GraphicTheme, type PlayerFraming } from '../../lib/graphics/render'

export interface GraphicCanvasHandle {
  canvas: HTMLCanvasElement | null
  ready: boolean
}

interface GraphicCanvasProps {
  data: GraphicData
  /** Sponsor logo URL (goalscorer/MOTM only). */
  sponsorLogoUrl?: string | null
  logoOnTile?: boolean
  onReadyChange?: (ready: boolean) => void
  /** Size/position of the player photo for this post. */
  framing?: PlayerFraming
  /** When set, dragging on the preview moves the player. */
  onFramingChange?: (framing: PlayerFraming) => void
  theme?: GraphicTheme
}

interface LoadedImages {
  crest: HTMLImageElement
  knight: HTMLImageElement
  player: HTMLImageElement | null
  badge: HTMLImageElement | null
  logo: CanvasImageSource | null
  logoBoxed: boolean
}

async function tryLoad(url: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!url) return null
  try {
    return await loadImage(url)
  } catch {
    return null
  }
}

/** Draws one post. The on-screen canvas is the export — what you see is what downloads. */
export const GraphicCanvas = forwardRef<GraphicCanvasHandle, GraphicCanvasProps>(function GraphicCanvas(
  { data, sponsorLogoUrl, logoOnTile = false, onReadyChange, framing, onFramingChange, theme = 'dark' },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [images, setImages] = useState<LoadedImages | null>(null)
  const drag = useRef<{ id: number; startX: number; startY: number; from: PlayerFraming; scale: number } | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState<string[]>([])

  useImperativeHandle(ref, () => ({ canvas: canvasRef.current, ready }), [ready])

  useEffect(() => {
    onReadyChange?.(ready)
  }, [ready, onReadyChange])

  const opponentBadgeUrl = data.home.isClub ? data.away.badgeUrl : data.home.badgeUrl

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setError(null)
    ;(async () => {
      try {
        await ensureGraphicsFonts()
        const [crest, knight] = await Promise.all([loadImage(clubCrestUrl()), loadImage(knightWatermarkUrl())])
        const [player, badge, logo] = await Promise.all([
          tryLoad(data.playerImageUrl),
          tryLoad(opponentBadgeUrl),
          tryLoad(sponsorLogoUrl),
        ])
        if (cancelled) return

        const gaps: string[] = []
        if (data.playerImageUrl && !player) gaps.push("player photo couldn't load")
        if (opponentBadgeUrl && !badge) gaps.push("opponent badge couldn't load")
        if (sponsorLogoUrl && !logo) gaps.push("sponsor logo couldn't load")
        setMissing(gaps)
        const prepared = logo && theme === 'light' ? lightLogo(logo) : null
        setImages({
          crest,
          knight,
          player,
          badge,
          logo: prepared ? prepared.image : logo ? (logoOnTile ? logo : whiteLogo(logo)) : null,
          logoBoxed: prepared?.boxed ?? false,
        })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't draw the post")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [data.playerImageUrl, opponentBadgeUrl, sponsorLogoUrl, logoOnTile, theme])

  // Drawing is quick once the images are loaded, so moving the player redraws live.
  useEffect(() => {
    if (!images || !canvasRef.current) return
    try {
      renderGraphic(canvasRef.current, data, {
        crest: images.crest,
        knight: images.knight,
        player: images.player,
        opponentBadge: images.badge,
        sponsorLogo: images.logo,
        sponsorLogoOnTile: theme === 'dark' && logoOnTile,
        sponsorLogoBoxed: images.logoBoxed,
        playerFraming: framing,
        theme,
      })
      setReady(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't draw the post")
    }
  }, [images, data, framing, logoOnTile, theme])

  const canDrag = Boolean(onFramingChange && framing && images?.player)

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!canDrag || !framing || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, from: framing, scale: 1080 / rect.width }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId || !onFramingChange) return
    onFramingChange({
      ...d.from,
      x: Math.round(d.from.x + (e.clientX - d.startX) * d.scale),
      y: Math.round(d.from.y + (e.clientY - d.startY) * d.scale),
    })
  }
  const endDrag = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-card bg-brand-navy" style={{ aspectRatio: '1080 / 1350' }}>
        <canvas
          ref={canvasRef}
          width={1080}
          height={1350}
          className={`block w-full h-full transition-opacity ${ready ? 'opacity-100' : 'opacity-0'} ${
            canDrag ? 'cursor-grab active:cursor-grabbing touch-none' : ''
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="img"
          aria-label={data.kind === 'matchday' ? 'Matchday post preview' : `${data.playerName} post preview`}
        />
        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Drawing…</div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">{error}</div>
        )}
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-card px-3 py-2">
          Drawn without: {missing.join(', ')}.
        </p>
      )}
    </div>
  )
})
