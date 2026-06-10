import { LoginForm } from '../components/auth/LoginForm'
import { PageShell } from '../components/ui/PageBackground'

export default function Login() {
  return (
    <PageShell>
      <div className="min-h-screen flex items-center justify-center px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <LoginForm />
      </div>
    </PageShell>
  )
}
