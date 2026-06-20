import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { inviteUrl, teamInviteUrl } from '../lib/clubAuth'
import {
  approveUser,
  createInvite,
  disableTeamInvite,
  enableTeamInvite,
  fetchAdminUsers,
  fetchTeamInviteSettings,
  generateTeamInvite,
  regenerateInvite,
  regenerateTeamInvite,
  resetUserPasscode,
  setUserCommittee,
  updatePlayerNames,
} from '../lib/clubApi'
import { validateNamePart } from '../lib/playerNames'
import { SQUAD_POSITIONS } from '../lib/squadPositions'
import { pageContainerClass } from '../lib/layout'
import type { AdminUserRow, SquadPosition, TeamInviteSettings } from '../types'

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success('Copied to clipboard'),
    () => toast.error('Couldn\'t copy. Select the link manually.')
  )
}

function pendingInviteLabel(u: AdminUserRow): string {
  if (u.invite_label?.trim()) return u.invite_label.trim()
  return new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteLabel, setInviteLabel] = useState('')
  const [newPosition, setNewPosition] = useState<SquadPosition>('Midfielder')
  const [creating, setCreating] = useState(false)
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null)
  const [editTarget, setEditTarget] = useState<AdminUserRow | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [newPasscode, setNewPasscode] = useState('')
  const [teamInvite, setTeamInvite] = useState<TeamInviteSettings | null>(null)
  const [teamInviteLoading, setTeamInviteLoading] = useState(true)
  const [teamInviteBusy, setTeamInviteBusy] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      setUsers(await fetchAdminUsers())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  const reloadTeamInvite = async () => {
    setTeamInviteLoading(true)
    try {
      setTeamInvite(await fetchTeamInviteSettings())
    } catch {
      setTeamInvite(null)
    } finally {
      setTeamInviteLoading(false)
    }
  }

  useEffect(() => { reloadTeamInvite() }, [])

  const handleTeamInviteAction = async (action: 'generate' | 'regenerate' | 'disable' | 'enable') => {
    setTeamInviteBusy(true)
    try {
      const next =
        action === 'generate'
          ? await generateTeamInvite()
          : action === 'regenerate'
            ? await regenerateTeamInvite()
            : action === 'disable'
              ? await disableTeamInvite()
              : await enableTeamInvite()
      setTeamInvite(next)
      toast.success(
        action === 'disable'
          ? 'Team invite link turned off'
          : action === 'enable'
            ? 'Team invite link turned on'
            : action === 'regenerate'
              ? 'New team invite link created'
              : 'Team invite link created',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update team invite link")
    } finally {
      setTeamInviteBusy(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    setCreating(true)
    try {
      const result = await createInvite(newPosition, inviteLabel.trim() || null)
      const link = inviteUrl(result.invite_token)
      setLastInviteLink(link)
      setInviteLabel('')
      toast.success('Invite link created')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create invite")
    } finally {
      setCreating(false)
    }
  }

  const handleRegenerate = async (userId: string, label: string) => {
    try {
      const result = await regenerateInvite(userId)
      const link = inviteUrl(result.invite_token)
      setLastInviteLink(link)
      toast.success(`New link for ${label}`)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't regenerate link")
    }
  }

  const openEditNames = (user: AdminUserRow) => {
    setEditTarget(user)
    setEditFirstName(user.first_name ?? '')
    setEditLastName(user.last_name ?? '')
  }

  const handleEditNames = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    try {
      validateNamePart(editFirstName, 'First name')
      validateNamePart(editLastName, 'Last name')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enter a valid name')
      return
    }

    try {
      await updatePlayerNames(editTarget.id, editFirstName, editLastName)
      toast.success('Name updated')
      setEditTarget(null)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update name")
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
      toast.success(`Passcode reset for ${resetTarget.display_name}. Send them the new code.`)
      setResetTarget(null)
      setNewPasscode('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reset passcode")
    }
  }

  const awaitingSetup = users.filter((u) => u.invite_pending)
  const pendingApproval = users.filter((u) => !u.invite_pending && !u.is_approved && !u.is_admin)

  const handleApprove = async (userId: string, displayName: string) => {
    try {
      await approveUser(userId, true)
      toast.success(`${displayName} approved`)
      reload()
    } catch {
      toast.error("Couldn't approve")
    }
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <h1 className="font-display text-2xl text-brand-navy">Squad members</h1>
          <p className="text-sm text-gray-500">Create invite links. Players enter their name when they open the link. Position is optional but helps stats.</p>

        <section className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-brand-navy">Team invite link</h2>
          <p className="text-sm text-gray-500">
            One reusable link for the squad WhatsApp group. New joiners still need your approval before they get access.
          </p>

          {teamInviteLoading ? (
            <div className="h-16 animate-pulse rounded-card bg-brand-light/60" />
          ) : teamInvite?.token ? (
            <div className="space-y-3">
              <div className="rounded-card bg-brand-light/70 border border-brand-blue/15 p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-brand-navy">Current link</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-pill ${
                    teamInvite.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {teamInvite.enabled ? 'Active' : 'Off'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 break-all font-mono">{teamInviteUrl(teamInvite.token)}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(teamInviteUrl(teamInvite.token!))}
                    className="btn-secondary text-sm"
                  >
                    Copy link
                  </button>
                  {!teamInvite.enabled && (
                    <button
                      type="button"
                      disabled={teamInviteBusy}
                      onClick={() => handleTeamInviteAction('enable')}
                      className="btn-primary text-sm"
                    >
                      Turn on
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={teamInviteBusy}
                    onClick={() => handleTeamInviteAction('regenerate')}
                    className="btn-secondary text-sm"
                  >
                    Regenerate
                  </button>
                  {teamInvite.enabled && (
                    <button
                      type="button"
                      disabled={teamInviteBusy}
                      onClick={() => handleTeamInviteAction('disable')}
                      className="text-sm text-red-600 font-medium px-3 py-2"
                    >
                      Turn off
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={teamInviteBusy}
              onClick={() => handleTeamInviteAction('generate')}
              className="btn-primary text-sm"
            >
              {teamInviteBusy ? 'Creating...' : 'Generate team link'}
            </button>
          )}
        </section>

        <section className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-brand-navy">Add a player</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={inviteLabel}
                onChange={(e) => setInviteLabel(e.target.value)}
                className="input-field flex-1"
                placeholder="e.g. trialist A (optional)"
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

        {editTarget && (
          <form onSubmit={handleEditNames} className="glass-card p-5 space-y-3 border border-brand-blue/20">
            <h2 className="font-semibold text-brand-navy">Edit name: {editTarget.display_name}</h2>
            <p className="text-sm text-gray-500">Display name and @username update automatically.</p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <input
                type="text"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="input-field"
                placeholder="First name"
                required
              />
              <input
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="input-field"
                placeholder="Last name"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm">Save name</button>
              <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {resetTarget && (
          <form onSubmit={handleResetPasscode} className="glass-card p-5 space-y-3 border border-brand-gold/30">
            <h2 className="font-semibold text-brand-navy">Reset passcode: {resetTarget.display_name}</h2>
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
            <p className="text-sm text-gray-500 -mt-1">Invite sent. Name and passcode not set yet.</p>
            {awaitingSetup.map((u) => (
              <div key={u.id} className="glass-card p-4 flex items-center justify-between gap-3 border border-amber-200/60">
                <div>
                  <p className="font-semibold text-brand-navy">{pendingInviteLabel(u)}</p>
                  <p className="text-sm text-gray-500">
                    Created {new Date(u.created_at).toLocaleDateString('en-GB')}
                    {u.squad_position ? ` · ${u.squad_position}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRegenerate(u.id, pendingInviteLabel(u))}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  New link
                </button>
              </div>
            ))}
          </section>
        )}

        {pendingApproval.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-sky-800">Pending approval ({pendingApproval.length})</h2>
            <p className="text-sm text-gray-500 -mt-1">Passcode set. Approve to grant squad access.</p>
            {pendingApproval.map((u) => (
              <div key={u.id} className="glass-card p-4 flex items-center justify-between gap-3 border border-sky-200/60">
                <div>
                  <p className="font-semibold text-brand-navy">{u.display_name}</p>
                  <p className="text-sm text-gray-500">
                    {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : 'Ready for approval'}
                    {u.squad_position ? ` · ${u.squad_position}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleApprove(u.id, u.display_name)}
                  className="btn-primary text-sm py-2 px-4"
                >
                  Approve
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
                        <p className="font-medium">{u.invite_pending ? pendingInviteLabel(u) : u.display_name}</p>
                        <p className="text-xs text-gray-500">
                          {u.invite_pending
                            ? `Invite · ${new Date(u.created_at).toLocaleDateString('en-GB')}`
                            : u.first_name && u.last_name
                              ? `${u.first_name} ${u.last_name} · @${u.username}`
                              : u.is_admin
                                ? 'Admin'
                                : u.is_committee
                                  ? 'Committee'
                                  : `@${u.username}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                        {u.in_squad ? u.squad_position ?? 'Squad' : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-pill ${
                          u.invite_pending
                            ? 'bg-amber-100 text-amber-800'
                            : u.is_approved
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                        }`}>
                          {u.invite_pending ? 'Awaiting setup' : u.is_approved ? 'Active' : 'Pending approval'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {u.invite_pending ? (
                            <button
                              type="button"
                              onClick={() => handleRegenerate(u.id, pendingInviteLabel(u))}
                              className="text-xs text-brand-blue font-medium"
                            >
                              New link
                            </button>
                          ) : (
                            <>
                              {!u.is_admin && u.first_name && (
                                <button
                                  type="button"
                                  onClick={() => openEditNames(u)}
                                  className="text-xs text-brand-blue font-medium"
                                >
                                  Edit name
                                </button>
                              )}
                              {!u.is_admin && (
                                <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={u.is_committee}
                                    onChange={(e) => {
                                      setUserCommittee(u.id, e.target.checked)
                                        .then(() => { toast.success('Role updated'); reload() })
                                        .catch(() => toast.error("Couldn't update role"))
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
