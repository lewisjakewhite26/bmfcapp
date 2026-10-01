import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { GraphicData } from '../../lib/graphics/data'
import { clubCrestUrl, ensureGraphicsFonts, knightWatermarkUrl, loadImage, whiteLogo } from '../../lib/graphics/assets'
import { renderGraphic } from '../../lib/graphics/render'

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
  { data, sponsorLogoUrl, logoOnTile = false, onReadyChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
        if (cancelled || !canvasRef.current) return

        const gaps: string[] = []
        if (data.playerImageUrl && !player) gaps.push("player photo couldn't load")
        if (opponentBadgeUrl && !badge) gaps.push("opponent badge couldn't load")
        if (sponsorLogoUrl && !logo) gaps.push("sponsor logo couldn't load")
        setMissing(gaps)

        renderGraphic(canvasRef.current, data, {
          crest,
          knight,
          player,
          opponentBadge: badge,
          sponsorLogo: logo ? (logoOnTile ? logo : whiteLogo(logo)) : null,
          sponsorLogoOnTile: logoOnTile,
        })
        setReady(true)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't draw the post")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [data, opponentBadgeUrl, sponsorLogoUrl, logoOnTile])

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-card bg-brand-navy" style={{ aspectRatio: '1080 / 1350' }}>
        <canvas
          ref={canvasRef}
          width={1080}
          height={1350}
          className={`block w-full h-full transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`}
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
