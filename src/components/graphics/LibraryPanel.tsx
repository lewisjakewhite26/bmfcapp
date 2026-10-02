import { useId, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { SquadMember } from '../../types'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { makeCutout, prepareSource } from '../../lib/graphics/cutout'
import { teamInitials } from '../../lib/graphics/data'
import {
  badgeForOpponent,
  deleteGraphicPhoto,
  deleteOpponentBadge,
  fileNameKey,
  nameKey,
  photosForPlayer,
  resolveGraphicsUrl,
  setDefaultGraphicPhoto,
  uploadGraphicPlayerPhoto,
  uploadOpponentBadge,
  type GraphicsLibrary,
} from '../../lib/graphicsApi'
import { PlayerPhotoUploader } from './PlayerPhotoUploader'
import { BadgeUploadButton } from './BadgeUploadButton'

interface LibraryPanelProps {
  squad: SquadMember[]
  /** Opponent names from fixtures, so missing badges can be listed. */
  opponents: string[]
  library: GraphicsLibrary
  onChanged: () => void
}

type Target = { type: 'player'; id: string } | { type: 'badge'; name: string } | null

interface BulkRow {
  file: File
  target: Target
  status: 'ready' | 'working' | 'done' | 'failed'
  note?: string
}

function targetValue(t: Target): string {
  if (!t) return ''
  return t.type === 'player' ? `player:${t.id}` : `badge:${t.name}`
}

function parseTarget(value: string): Target {
  if (value.startsWith('player:')) return { type: 'player', id: value.slice(7) }
  if (value.startsWith('badge:')) return { type: 'badge', name: value.slice(6) }
  return null
}

export function LibraryPanel({ squad, opponents, library, onChanged }: LibraryPanelProps) {
  const bulkInputId = useId()
  const [rows, setRows] = useState<BulkRow[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [openPlayer, setOpenPlayer] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'photo' | 'badge'; id: string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const players = useMemo(
    () => [...squad].sort((a, b) => a.display_name.localeCompare(b.display_name)),
    [squad],
  )
  const opponentNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const o of opponents) names.set(nameKey(o), o)
    for (const b of library.badges) names.set(nameKey(b.opponent_name), b.opponent_name)
    return [...names.values()].sort((a, b) => a.localeCompare(b))
  }, [opponents, library.badges])

  const matchFile = (file: File): Target => {
    const key = fileNameKey(file.name)
    const player = players.find((p) => nameKey(p.display_name) === key)
    if (player) return { type: 'player', id: player.player_id }
    const opponent = opponentNames.find((o) => nameKey(o) === key)
    if (opponent) return { type: 'badge', name: opponent }
    return null
  }

  const addBulkFiles = (files: FileList | null) => {
    if (!files) return
    setRows((prev) => [...prev, ...[...files].map((file) => ({ file, target: matchFile(file), status: 'ready' as const }))])
  }

  const runBulk = async () => {
    setBulkBusy(true)
    let saved = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row.status === 'done' || !row.target) continue
      const update = (patch: Partial<BulkRow>) =>
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
      update({ status: 'working', note: undefined })
      try {
        if (row.target.type === 'player') {
          const source = await prepareSource(row.file)
          const cutout = await makeCutout(source, (message) => update({ note: message }))
          await uploadGraphicPlayerPhoto(row.target.id, cutout, source.alreadyCutOut ? null : source.originalJpeg, false)
        } else {
          await uploadOpponentBadge(row.target.name, row.file)
        }
        saved++
        update({ status: 'done', note: undefined })
      } catch (err) {
        update({ status: 'failed', note: err instanceof Error ? err.message : 'Failed' })
      }
    }
    setBulkBusy(false)
    if (saved > 0) {
      toast.success(`${saved} saved`)
      onChanged()
    }
  }

  const handleDelete = async () => {
    if (!confirm) return
    setDeleting(true)
    try {
      if (confirm.kind === 'photo') await deleteGraphicPhoto(confirm.id)
      else await deleteOpponentBadge(confirm.id)
      toast.success('Removed')
      setConfirm(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove it")
    } finally {
      setDeleting(false)
    }
  }

  const handleMakeDefault = async (photoId: string) => {
    try {
      await setDefaultGraphicPhoto(photoId)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update the photo")
    }
  }

  const pendingCount = rows.filter((r) => r.status !== 'done' && r.target).length

  return (
    <div className="space-y-6">
      <section className="glass-card p-4 space-y-3">
        <div>
          <h2 className="font-display text-lg text-brand-navy">Bulk upload</h2>
          <p className="text-sm text-gray-500 mt-1">
            Name files after the player or team, e.g. <span className="font-mono text-xs">jack-marley-2.jpg</span> or{' '}
            <span className="font-mono text-xs">ferryhill-ivorson.png</span>. Anything that doesn't match, pick from the list.
          </p>
        </div>
        <input
          id={bulkInputId}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            addBulkFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <label htmlFor={bulkInputId} className={`btn-secondary w-full cursor-pointer ${bulkBusy ? 'pointer-events-none opacity-50' : ''}`}>
          Choose files
        </label>

        {rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((row, i) => (
              <li key={`${row.file.name}-${i}`} className="rounded-card border border-brand-blue/15 bg-white/70 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-brand-navy truncate">{row.file.name}</span>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      row.status === 'done' ? 'text-green-700' : row.status === 'failed' ? 'text-red-600' : 'text-gray-500'
                    }`}
                  >
                    {row.status === 'done' ? 'Saved' : row.status === 'failed' ? 'Failed' : row.status === 'working' ? 'Working…' : row.target ? 'Ready' : 'Not matched'}
                  </span>
                </div>
                <label className="sr-only" htmlFor={`bulk-target-${i}`}>
                  Use {row.file.name} for
                </label>
                <select
                  id={`bulk-target-${i}`}
                  className="input-field py-2 text-sm"
                  value={targetValue(row.target)}
                  disabled={bulkBusy || row.status === 'done'}
                  onChange={(e) =>
                    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, target: parseTarget(e.target.value), status: 'ready' } : r)))
                  }
                >
                  <option value="">Skip this file</option>
                  <optgroup label="Player photo">
                    {players.map((p) => (
                      <option key={p.player_id} value={`player:${p.player_id}`}>
                        {p.display_name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Opponent badge">
                    {opponentNames.map((o) => (
                      <option key={o} value={`badge:${o}`}>
                        {o}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {row.note && <p className={`text-xs ${row.status === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>{row.note}</p>}
              </li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" disabled={bulkBusy || pendingCount === 0} onClick={() => void runBulk()}>
              {bulkBusy ? 'Uploading…' : `Upload ${pendingCount}`}
            </button>
            <button type="button" className="btn-secondary" disabled={bulkBusy} onClick={() => setRows([])}>
              Clear
            </button>
          </div>
        )}
        {rows.some((r) => r.target?.type === 'player' && r.status !== 'done') && (
          <p className="text-xs text-gray-500">
            Player photos have their backgrounds removed one at a time on this device. Keep this page open until they're done.
          </p>
        )}
      </section>

      <section className="glass-card p-4 space-y-3">
        <h2 className="font-display text-lg text-brand-navy">Player photos</h2>
        <ul className="divide-y divide-brand-blue/10">
          {players.map((player) => {
            const photos = photosForPlayer(library.photos, player.player_id)
            const open = openPlayer === player.player_id
            return (
              <li key={player.player_id} className="py-2">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 min-h-[44px] text-left"
                  aria-expanded={open}
                  onClick={() => setOpenPlayer(open ? null : player.player_id)}
                >
                  <span className="font-medium text-brand-navy">{player.display_name}</span>
                  <span className={`text-xs font-semibold ${photos.length ? 'text-gray-500' : 'text-amber-700'}`}>
                    {photos.length === 0 ? 'No photo' : photos.length === 1 ? '1 photo' : `${photos.length} photos`}
                  </span>
                </button>
                {open && (
                  <div className="pt-2 pb-3 space-y-3">
                    {photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((photo) => (
                          <div key={photo.id} className="space-y-1">
                            <div className="aspect-[4/5] rounded-2xl bg-gradient-to-b from-[#2D58C4] to-brand-navy grid place-items-end justify-items-center overflow-hidden">
                              <img
                                src={resolveGraphicsUrl(photo.cutout_path) ?? ''}
                                alt={`${player.display_name} cut-out`}
                                className="max-h-full w-auto"
                                loading="lazy"
                              />
                            </div>
                            {photo.is_default ? (
                              <p className="text-[11px] font-semibold text-brand-blue text-center">Main photo</p>
                            ) : (
                              <button
                                type="button"
                                className="w-full text-[11px] font-semibold text-brand-blue min-h-[32px]"
                                onClick={() => void handleMakeDefault(photo.id)}
                              >
                                Make main
                              </button>
                            )}
                            <button
                              type="button"
                              className="w-full text-[11px] font-semibold text-red-600 min-h-[32px]"
                              onClick={() => setConfirm({ kind: 'photo', id: photo.id, label: `this photo of ${player.display_name}` })}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <PlayerPhotoUploader
                      playerId={player.player_id}
                      playerName={player.display_name}
                      hasPhotos={photos.length > 0}
                      onSaved={onChanged}
                      compact
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="glass-card p-4 space-y-3">
        <h2 className="font-display text-lg text-brand-navy">Opponent badges</h2>
        {opponentNames.length === 0 ? (
          <p className="text-sm text-gray-500">No opponents in the fixture list yet.</p>
        ) : (
          <ul className="divide-y divide-brand-blue/10">
            {opponentNames.map((name) => {
              const badge = badgeForOpponent(library.badges, name)
              const url = resolveGraphicsUrl(badge?.badge_path)
              return (
                <li key={name} className="py-2 flex items-center gap-3">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-brand-navy grid place-items-center overflow-hidden">
                    {url ? (
                      <img src={url} alt={`${name} badge`} className="max-w-[40px] max-h-[40px]" loading="lazy" />
                    ) : (
                      <span className="text-xs font-bold text-white">{teamInitials(name)}</span>
                    )}
                  </div>
                  <span className="flex-1 text-sm font-medium text-brand-navy">{name}</span>
                  <BadgeUploadButton
                    opponentName={name}
                    hasBadge={Boolean(badge)}
                    onSaved={onChanged}
                    className="text-xs font-semibold text-brand-blue min-h-[44px] px-2 inline-flex items-center"
                  />
                  {badge && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600 min-h-[44px] px-2"
                      onClick={() => setConfirm({ kind: 'badge', id: badge.id, label: `the ${name} badge` })}
                    >
                      Remove
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Remove image?"
        message={confirm ? `Remove ${confirm.label}? Posts already shared aren't affected.` : ''}
        confirmLabel="Remove"
        destructive
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
