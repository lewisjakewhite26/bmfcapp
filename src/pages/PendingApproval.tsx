import { Link } from 'react-router-dom'
import { PageShell } from '../components/ui/PageBackground'
import { useAuth } from '../hooks/useAuth'

export default function PendingApproval() {
  const { user, logout } = useAuth()

  return (
    <PageShell>
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">⏳</div>
          <h1 className="font-display text-2xl text-brand-navy">Awaiting approval</h1>
          <p className="text-gray-600">
            Hi {user?.display_name ?? 'there'} — your account is waiting for approval. A committee member will sort it shortly.
          </p>
          <p className="text-sm text-gray-500">
            Once approved you&apos;ll be able to see fixtures, mark your availability and view squad stats.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button type="button" onClick={() => logout()} className="btn-secondary w-full">
              Log out
            </button>
            <Link to="/" className="text-sm text-brand-blue hover:underline">Back to home</Link>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
