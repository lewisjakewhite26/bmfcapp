import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { getClubSession } from '../lib/clubAuth'
import { supabase } from '../lib/supabase'
import { isMockDataMode } from '../lib/clubApi'

export default function AdminNotifications() {
  const [title, setTitle] = useState('BMFC reminder')
  const [body, setBody] = useState('Please mark your availability for this weekend.')
  const [url, setUrl] = useState('/calendar')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (isMockDataMode()) {
      toast.error('Connect Supabase to send push notifications.')
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
        },
      })

      if (error) throw error
      toast.success(`Sent to ${data?.sent ?? 0} device(s)`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <PageShell>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-5 sm:py-8 space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8">
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">Send notification</h1>
          <p className="text-sm text-gray-500 mt-1">Push to all squad members who have notifications turned on.</p>
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
          <button type="submit" disabled={sending} className="btn-primary w-full">
            {sending ? 'Sending...' : 'Send to squad'}
          </button>
        </form>
      </div>
    </PageShell>
  )
}
