import { Navigate, useParams } from 'react-router-dom'
import { InviteForm } from '../components/auth/InviteForm'
import { PageShell } from '../components/ui/PageBackground'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()

  if (!token) return <Navigate to="/login" replace />

  return (
    <PageShell>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
        <InviteForm token={token} />
      </div>
    </PageShell>
  )
}
