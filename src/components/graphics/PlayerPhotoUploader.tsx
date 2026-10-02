import { useEffect, useId, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { lastCutoutUsedGpu, makeCutout, prepareSource, switchToSlowerCutouts, type PreparedSource } from '../../lib/graphics/cutout'
import { uploadGraphicPlayerPhoto, type GraphicPlayerPhoto } from '../../lib/graphicsApi'

interface PlayerPhotoUploaderProps {
  playerId: string
  playerName: string
  /** Whether the player already has photos (shows the "make default" option). */
  hasPhotos: boolean
  onSaved: (photo: GraphicPlayerPhoto) => void
  compact?: boolean
}

type Stage =
  | { kind: 'idle' }
  | { kind: 'working'; message: string; fraction: number | null }
  | { kind: 'review'; source: PreparedSource; cutout: Blob; previewUrl: string; usedGpu: boolean }
  | { kind: 'saving'; previewUrl: string }

/** Pick a photo → background removed on the phone → check it → save to the library. */
export function PlayerPhotoUploader({ playerId, playerName, hasPhotos, onSaved, compact = false }: PlayerPhotoUploaderProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const [makeDefault, setMakeDefault] = useState(!hasPhotos)

  const previewUrl = stage.kind === 'review' || stage.kind === 'saving' ? stage.previewUrl : null
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file')
      return
    }
    setStage({ kind: 'working', message: 'Preparing photo…', fraction: null })
    try {
      await cutOut(await prepareSource(file))
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const cutOut = async (source: PreparedSource) => {
    try {
      const cutout = await makeCutout(source, (message, fraction) => setStage({ kind: 'working', message, fraction }))
      setStage({ kind: 'review', source, cutout, previewUrl: URL.createObjectURL(cutout), usedGpu: lastCutoutUsedGpu() })
    } catch (err) {
      setStage({ kind: 'idle' })
      toast.error(err instanceof Error ? err.message : "Couldn't cut out that photo")
    }
  }

  const redoSlower = async () => {
    if (stage.kind !== 'review') return
    const { source } = stage
    await switchToSlowerCutouts()
    setStage({ kind: 'working', message: 'Removing the background…', fraction: null })
    await cutOut(source)
  }

  const handleSave = async () => {
    if (stage.kind !== 'review') return
    const { source, cutout, previewUrl: url, usedGpu } = stage
    setStage({ kind: 'saving', previewUrl: url })
    try {
      const photo = await uploadGraphicPlayerPhoto(
        playerId,
        cutout,
        source.alreadyCutOut ? null : source.originalJpeg,
        makeDefault,
      )
      toast.success(`Photo saved for ${playerName}`)
      setStage({ kind: 'idle' })
      onSaved(photo)
    } catch (err) {
      setStage({ kind: 'review', source, cutout, previewUrl: url, usedGpu })
      toast.error(err instanceof Error ? err.message : "Couldn't save the photo")
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {stage.kind === 'idle' && (
        <label htmlFor={inputId} className={`${compact ? 'btn-secondary' : 'btn-primary'} w-full cursor-pointer`}>
          Add photo
        </label>
      )}

      {stage.kind === 'working' && (
        <div className="rounded-card border border-brand-blue/15 bg-white/70 p-4 space-y-2" aria-live="polite">
          <p className="text-sm font-medium text-brand-navy">{stage.message}</p>
          <div className="h-2 rounded-pill bg-brand-light overflow-hidden">
            <div
              className={`h-full bg-brand-blue rounded-pill transition-all ${stage.fraction === null ? 'w-1/3 animate-pulse' : ''}`}
              style={stage.fraction === null ? undefined : { width: `${Math.round(stage.fraction * 100)}%` }}
            />
          </div>
        </div>
      )}

      {(stage.kind === 'review' || stage.kind === 'saving') && (
        <div className="space-y-3">
          <div className="rounded-card bg-gradient-to-b from-[#2D58C4] to-brand-navy p-3 grid place-items-center">
            <img src={stage.previewUrl} alt={`Cut-out of ${playerName}`} className="max-h-72 w-auto" />
          </div>
          <p className="text-xs text-gray-500">Check the edges, hair and hands. If it looks rough, try a clearer photo.</p>
          {stage.kind === 'review' && stage.usedGpu && (
            <button type="button" className="text-xs font-semibold text-brand-blue" onClick={() => void redoSlower()}>
              Patchy or glitchy? Redo it the slower way
            </button>
          )}
          {hasPhotos && (
            <label className="flex items-center gap-2 text-sm text-brand-navy">
              <input
                type="checkbox"
                className="accent-brand-blue"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
              />
              Use as {playerName}'s main photo
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={stage.kind === 'saving'}
              onClick={() => void handleSave()}
            >
              {stage.kind === 'saving' ? 'Saving…' : 'Save photo'}
            </button>
            <label
              htmlFor={inputId}
              className={`btn-secondary flex-1 cursor-pointer ${stage.kind === 'saving' ? 'pointer-events-none opacity-50' : ''}`}
            >
              Try another
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
