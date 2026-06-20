import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { getClubSession } from '../lib/clubAuth'
import { recordAdminAudit } from '../lib/adminAudit'
import { supabase } from '../lib/supabase'
import { fetchAdminUsers, isMockDataMode } from '../lib/clubApi'
import { pageContainerClass } from '../lib/layout'
import type { AdminUserRow } from '../types'

type SendMode = 'all' | 'selected'

export default function AdminNotifications() {
  const [title, setTitle] = useState('BMFC reminder')
  const [body, setBody] = useState('Mark availability for this weekend\'s game.')
  const [url, setUrl] = useState('/calendar')
  const [sending, setSending] = useState(false)
  const [sendMode, setSendMode] = useState<SendMode>('all')
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingUsers, setLoadingUsers] = useState(true)

  const recipients = users.filter((u) => u.is_approved && !u.invite_pending)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingUsers(true)
      try {
        const rows = await fetchAdminUsers()
        if (!cancelled) setUsers(rows)
      } catch {
        if (!cancelled) toast.error("Couldn't load squad list")
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSend = async () => {
    if (isMockDataMode()) {
      toast.error('Connect Supabase to send push notifications.')
      return
    }

    if (sendMode === 'selected' && selectedIds.size === 0) {
      toast.error('Pick at least one player')
      return
    }

    const session = getClubSession()
    if (!session) {
      toast.error('Not signed in')
      return
    }

    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          title,
          body,
          url,
          admin_id: session.userId,
          session_token: session.sessionToken,
          ...(sendMode === 'selected' ? { player_ids: [...selectedIds] } : {}),
        },
      })

      if (error) throw error
      const sent = (data as { sent?: number })?.sent ?? 0
      void recordAdminAudit('push_sent', {
        details: {
          title,
          recipient_count: sent,
          mode: sendMode,
          selected_count: sendMode === 'selected' ? selectedIds.size : undefined,
        },
      })
      toast.success(`Sent to ${sent} device(s)`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send")
    } finally {
      setSending(false)
    }
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass('max-w-lg')}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">Send notification</h1>
          <p className="text-sm text-gray-500 mt-1">
            Push to squad members who have notifications turned on.
          </p>
        </div>

        <form
          className="glass-card p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <div>
            <label className="text-sm text-gray-500">Title</label>
            <input className="input-field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-gray-500">Message</label>
            <textarea
              className="input-field mt-1 min-h-[88px] resize-y"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">Link (when tapped)</label>
            <input className="input-field mt-1" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm text-gray-500">Recipients</legend>
            <label className="flex items-center gap-2 text-sm text-brand-navy cursor-pointer">
              <input
                type="radio"
                name="send-mode"
                checked={sendMode === 'all'}
                onChange={() => setSendMode('all')}
                className="accent-brand-blue"
              />
              Whole squad
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-navy cursor-pointer">
              <input
                type="radio"
                name="send-mode"
                checked={sendMode === 'selected'}
                onChange={() => setSendMode('selected')}
                className="accent-brand-blue"
              />
              Selected players
            </label>
          </fieldset>

          {sendMode === 'selected' && (
            <div className="rounded-xl border border-brand-blue/10 bg-brand-light/30 p-3 space-y-2 max-h-48 overflow-y-auto">
              {loadingUsers ? (
                <p className="text-sm text-gray-500">Loading squad...</p>
              ) : recipients.length === 0 ? (
                <p className="text-sm text-gray-500">No approved players yet.</p>
              ) : (
                recipients.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 text-sm text-brand-navy cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => togglePlayer(user.id)}
                      className="accent-brand-blue"
                    />
                    {user.display_name}
                  </label>
                ))
              )}
            </div>
          )}

          <button type="submit" disabled={sending} className="btn-primary w-full">
            {sending ? 'Sending...' : sendMode === 'all' ? 'Send to squad' : `Send to ${selectedIds.size || '…'} player(s)`}
          </button>
        </form>
      </div>
    </PageShell>
  )
}
