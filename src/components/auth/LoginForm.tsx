import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useMockData } from '../../lib/clubApi'

export function LoginForm() {
  const [displayName, setDisplayName] = useState('')
  const [passcode, setPasscode] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, devBypassLogin } = useAuth()
  const navigate = useNavigate()
  const mockMode = useMockData()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!/^\d{4}$/.test(passcode)) {
      toast.error('Passcode must be 4 digits')
      return
    }

    setLoading(true)
    try {
      await login(displayName.trim(), passcode)
      toast.success('Signed in')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleTest = () => {
    devBypassLogin(false)
    navigate('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6 w-full max-w-md">
      <div className="text-center">
        <img
          src="/logo.png"
          alt="BMFC"
          className="h-20 w-20 mx-auto mb-4 object-contain drop-shadow-md"
          onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg' }}
        />
        <h1 className="font-display text-2xl text-brand-navy">Welcome back</h1>
        <p className="text-gray-500 text-sm mt-1">Sign in to BMFC Club Hub</p>
      </div>

      <div>
        <label htmlFor="login-name" className="block text-sm text-gray-500 mb-2">Your name</label>
        <input
          id="login-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="input-field"
          placeholder="Chris Lee"
          autoComplete="name"
          required={!mockMode}
        />
      </div>
      <div>
        <label htmlFor="login-passcode" className="block text-sm text-gray-500 mb-2">Passcode</label>
        <input
          id="login-passcode"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={passcode}
          onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="input-field tracking-[0.4em] text-center font-mono"
          placeholder="••••"
          autoComplete="current-password"
          required={!mockMode}
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Signing in...' : 'Login'}
      </button>

      {mockMode && (
        <div className="space-y-2">
          <button type="button" onClick={handleTest} className="btn-secondary w-full">
            Test
          </button>
          <button
            type="button"
            onClick={() => { devBypassLogin(true); navigate('/admin') }}
            className="text-sm text-gray-500 hover:text-brand-blue w-full text-center"
          >
            Test as admin
          </button>
        </div>
      )}

      <p className="text-center text-sm text-gray-500">
        New player? Use the invite link your admin sent you.
      </p>
    </form>
  )
}
