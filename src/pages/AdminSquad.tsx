import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { PlayerPhotoAvatar } from '../components/club/PlayerPhotoAvatar'
import {
  deletePlayerPhoto,
  fetchAdminUsers,
  fetchSquad,
  removeSquadMember,
  uploadPlayerPhoto,
  upsertSquadMember,
} from '../lib/clubApi'
import { SQUAD_POSITIONS } from '../lib/squadPositions'
import { pageContainerClass } from '../lib/layout'
import { PLAYER_PHOTO_ACCEPT } from '../lib/playerPhotos'
import type { AdminUserRow, SquadMember, SquadPosition } from '../types'

function SquadPhotoControl({
  member,
  onUpdated,
}: {
  member: SquadMember
  onUpdated: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      await uploadPlayerPhoto(member.player_id, file)
      toast.success('Photo updated')
      onUpdated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload photo")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!confirm(`Remove photo for ${member.display_name}?`)) return
    setUploading(true)
    try {
      await deletePlayerPhoto(member.player_id)
      toast.success('Photo removed')
      onUpdated()
    } catch {
      toast.error("Couldn't remove photo")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <PlayerPhotoAvatar
        displayName={member.display_name}
        photoUrl={member.photo_url}
        size="sm"
        variant="admin"
      />
      <input
        ref={inputRef}
        type="file"
        accept={PLAYER_PHOTO_ACCEPT}
        className="hidden"
        disabled={uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="text-xs font-medium text-brand-blue disabled:opacity-50"
        >
          {uploading ? 'Saving…' : member.photo_url ? 'Replace' : 'Upload photo'}
        </button>
        {member.photo_url && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => void handleRemove()}
            className="text-xs font-medium text-red-600 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminSquad() {
  const [squad, setSquad] = useState<SquadMember[]>([])
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addPlayerId, setAddPlayerId] = useState('')
  const [addPosition, setAddPosition] = useState<SquadPosition>('Midfielder')
  const [saving, setSaving] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      const [s, u] = await Promise.all([fetchSquad(), fetchAdminUsers()])
      setSquad(s)
      setUsers(u)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  const notInSquad = useMemo(
    () => users.filter((u) => !u.in_squad && !u.invite_pending),
    [users]
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = users.find((u) => u.id === addPlayerId)
    if (!user) {
      toast.error('Pick a player')
      return
    }

    setSaving(true)
    try {
      await upsertSquadMember(user.id, user.display_name, addPosition)
      toast.success(`${user.display_name} added to squad`)
      setAddPlayerId('')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update squad")
    } finally {
      setSaving(false)
    }
  }

  const handlePositionChange = async (member: SquadMember, position: SquadPosition) => {
    try {
      await upsertSquadMember(member.player_id, member.display_name, position, member.squad_number)
      toast.success('Position updated')
      reload()
    } catch {
      toast.error("Couldn't update position")
    }
  }

  const handleSquadNumberChange = async (member: SquadMember, raw: string) => {
    const trimmed = raw.trim()
    const squadNumber = trimmed === '' ? null : parseInt(trimmed, 10)
    if (trimmed !== '' && (isNaN(squadNumber!) || squadNumber! < 1 || squadNumber! > 99)) {
      toast.error('Squad number must be 1–99')
      return
    }
    try {
      await upsertSquadMember(
        member.player_id,
        member.display_name,
        (member.position ?? 'Midfielder') as SquadPosition,
        squadNumber,
      )
      toast.success('Squad number updated')
      reload()
    } catch {
      toast.error("Couldn't update squad number")
    }
  }

  const handleRemove = async (member: SquadMember) => {
    if (!confirm(`Remove ${member.display_name} from the squad list?`)) return
    try {
      await removeSquadMember(member.player_id)
      toast.success('Removed from squad')
      reload()
    } catch {
      toast.error("Couldn't remove")
    }
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <h1 className="font-display text-2xl text-brand-navy">Squad list</h1>
        <p className="text-sm text-gray-500">
          Manage squad positions and profile photos. Players cannot change these themselves.
        </p>

        {notInSquad.length > 0 && (
          <form onSubmit={handleAdd} className="glass-card p-5 space-y-3">
            <h2 className="font-semibold text-brand-navy">Add to squad</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={addPlayerId}
                onChange={(e) => setAddPlayerId(e.target.value)}
                className="input-field flex-1"
                required
              >
                <option value="">Select player…</option>
                {notInSquad.map((u) => (
                  <option key={u.id} value={u.id}>{u.display_name}</option>
                ))}
              </select>
              <select
                value={addPosition}
                onChange={(e) => setAddPosition(e.target.value as SquadPosition)}
                className="input-field sm:w-40"
              >
                {SQUAD_POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button type="submit" disabled={saving} className="btn-primary shrink-0">
                Add
              </button>
            </div>
          </form>
        )}

        <section className="space-y-3">
          {loading ? (
            <div className="glass-card h-32 animate-pulse" />
          ) : squad.length === 0 ? (
            <div className="glass-card p-8 text-center text-gray-500">No squad members yet.</div>
          ) : (
            squad.map((member) => (
              <div key={member.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <SquadPhotoControl member={member} onUpdated={reload} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brand-navy">{member.display_name}</p>
                  {member.joined_date && (
                    <p className="text-xs text-gray-500">
                      Joined {new Date(member.joined_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <select
                  value={member.position ?? 'Midfielder'}
                  onChange={(e) => handlePositionChange(member, e.target.value as SquadPosition)}
                  className="input-field sm:w-40"
                  aria-label={`Position for ${member.display_name}`}
                >
                  {SQUAD_POSITIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={99}
                  placeholder="#"
                  defaultValue={member.squad_number ?? ''}
                  onBlur={(e) => handleSquadNumberChange(member, e.target.value)}
                  className="input-field w-16 text-center"
                  aria-label={`Squad number for ${member.display_name}`}
                />
                <button
                  type="button"
                  onClick={() => handleRemove(member)}
                  className="text-sm text-red-600 font-medium shrink-0"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </PageShell>
  )
}
