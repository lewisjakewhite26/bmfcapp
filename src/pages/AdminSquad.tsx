import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import {
  fetchAdminUsers,
  fetchSquad,
  removeSquadMember,
  upsertSquadMember,
} from '../lib/clubApi'
import { SQUAD_POSITIONS } from '../lib/squadPositions'
import { pageContainerClass } from '../lib/layout'
import type { AdminUserRow, SquadMember, SquadPosition } from '../types'

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
      toast.error(err instanceof Error ? err.message : 'Failed to update squad')
    } finally {
      setSaving(false)
    }
  }

  const handlePositionChange = async (member: SquadMember, position: SquadPosition) => {
    try {
      await upsertSquadMember(member.player_id, member.display_name, position)
      toast.success('Position updated')
      reload()
    } catch {
      toast.error('Failed to update position')
    }
  }

  const handleRemove = async (member: SquadMember) => {
    if (!confirm(`Remove ${member.display_name} from the squad list?`)) return
    try {
      await removeSquadMember(member.player_id)
      toast.success('Removed from squad')
      reload()
    } catch {
      toast.error('Failed to remove')
    }
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <h1 className="font-display text-2xl text-brand-navy">Squad list</h1>
        <p className="text-sm text-gray-500">
          Players on the squad list appear in stats and result entry. Link their account once they&apos;ve accepted their invite.
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
              <div key={member.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
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
                >
                  {SQUAD_POSITIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
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
