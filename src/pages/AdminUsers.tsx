import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { inviteUrl } from '../lib/clubAuth'
import {
  approveUser,
  createInvite,
  fetchAdminUsers,
  regenerateInvite,
  resetUserPasscode,
  setUserCommittee,
} from '../lib/clubApi'
import { SQUAD_POSITIONS } from '../lib/squadPositions'
import type { AdminUserRow, SquadPosition } from '../types'

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success('Copied to clipboard'),
    () => toast.error('Could not copy — select the link manually')
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newPosition, setNewPosition] = useState<SquadPosition>('Midfielder')
  const [creating, setCreating] = useState(false)
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null)
  const [newPasscode, setNewPasscode] = useState('')

  const reload = async () => {
    setLoading(true)
    try {
      setUsers(await fetchAdminUsers())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim().length < 2) {
      toast.error('Enter the player\'s name')
      return
    }

    setCreating(true)
    try {
      const result = await createInvite(newName.trim(), newPosition)
      const link = inviteUrl(result.invite_token)
      setLastInviteLink(link)
      setNewName('')
      toast.success(`Invite created for ${result.display_name}`)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setCreating(false)
    }
  }

  const handleRegenerate = async (userId: string, displayName: string) => {
    try {
      const result = await regenerateInvite(userId)
      const link = inviteUrl(result.invite_token)
      setLastInviteLink(link)
      toast.success(`New link for ${displayName}`)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate link')
    }
  }

  const handleResetPasscode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    if (!/^\d{4}$/.test(newPasscode)) {
      toast.error('Passcode must be 4 digits')
      return
    }

    try {
      await resetUserPasscode(resetTarget.id, newPasscode)
      toast.success(`Passcode reset for ${resetTarget.display_name} — tell them the new code`)
      setResetTarget(null)
      setNewPasscode('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset passcode')
    }
  }

  const awaitingSetup = users.filter((u) => u.invite_pending)

  return (
    <PageShell>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8 space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8">
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <h1 className="font-display text-2xl text-brand-navy">Squad members</h1>
        <p className="text-sm text-gray-500">Create accounts and send invite links. Set a position so they show up in stats as soon as they accept.</p>

        <section className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-brand-navy">Add a player</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input-field flex-1"
                placeholder="Player name, e.g. Chris Lee"
              />
              <select
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value as SquadPosition)}
                className="input-field sm:w-40"
              >
                {SQUAD_POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button type="submit" disabled={creating} className="btn-primary shrink-0">
                {creating ? 'Creating...' : 'Create invite'}
              </button>
            </div>
          </form>

          {lastInviteLink && (
            <div className="rounded-card bg-brand-light/70 border border-brand-blue/15 p-4 space-y-2">
              <p className="text-sm font-medium text-brand-navy">Latest invite link</p>
              <p className="text-xs text-gray-600 break-all font-mono">{lastInviteLink}</p>
              <button type="button" onClick={() => copyText(lastInviteLink)} className="btn-secondary text-sm">
                Copy link
              </button>
            </div>
          )}
        </section>

        {resetTarget && (
          <form onSubmit={handleResetPasscode} className="glass-card p-5 space-y-3 border border-brand-gold/30">
            <h2 className="font-semibold text-brand-navy">Reset passcode — {resetTarget.display_name}</h2>
            <p className="text-sm text-gray-500">Set a new 4-digit code and send it to them on WhatsApp.</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="input-field max-w-[160px] tracking-[0.4em] text-center font-mono"
              placeholder="••••"
              required
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm">Save new passcode</button>
              <button type="button" onClick={() => { setResetTarget(null); setNewPasscode('') }} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {awaitingSetup.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-amber-700">Awaiting setup ({awaitingSetup.length})</h2>
            {awaitingSetup.map((u) => (
              <div key={u.id} className="glass-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-navy">{u.display_name}</p>
                  <p className="text-sm text-gray-500">
                    Invite not used{u.squad_position ? ` · ${u.squad_position}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRegenerate(u.id, u.display_name)}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  New link
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold text-brand-navy">All members</h2>
          {loading ? (
            <div className="glass-card h-32 animate-pulse" />
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-blue/5 text-left text-xs uppercase text-gray-500">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3 hidden md:table-cell">Squad</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-brand-blue/8">
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.display_name}</p>
                        <p className="text-xs text-gray-500">
                          {u.is_admin ? 'Admin' : u.is_committee ? 'Committee' : 'Player'}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                        {u.in_squad ? u.squad_position ?? 'Squad' : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-pill ${
                          u.invite_pending
                            ? 'bg-amber-100 text-amber-800'
                            : u.is_approved
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                        }`}>
                          {u.invite_pending ? 'Invite sent' : u.is_approved ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {u.invite_pending ? (
                            <button
                              type="button"
                              onClick={() => handleRegenerate(u.id, u.display_name)}
                              className="text-xs text-brand-blue font-medium"
                            >
                              New link
                            </button>
                          ) : (
                            <>
                              {!u.is_admin && (
                                <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={u.is_committee}
                                    onChange={(e) => {
                                      setUserCommittee(u.id, e.target.checked)
                                        .then(() => { toast.success('Role updated'); reload() })
                                        .catch(() => toast.error('Failed to update role'))
                                    }}
                                  />
                                  Committee
                                </label>
                              )}
                              <button
                                type="button"
                                onClick={() => setResetTarget(u)}
                                className="text-xs text-brand-navy font-medium"
                              >
                                Reset code
                              </button>
                              {u.is_approved ? (
                                <button type="button" onClick={() => approveUser(u.id, false).then(reload)} className="text-xs text-red-600">
                                  Revoke
                                </button>
                              ) : (
                                <button type="button" onClick={() => approveUser(u.id, true).then(reload)} className="text-xs text-brand-blue font-medium">
                                  Approve
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
