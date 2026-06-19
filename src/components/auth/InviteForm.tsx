import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { saveSession } from '../../hooks/authContext'
import { rpcGetInvitePreview } from '../../lib/clubAuth'
import { completeMockInvite, getMockInvitePreview, isMockDataMode } from '../../lib/clubApi'
import { getAuthErrorMessage } from '../../lib/authErrors'
import type { InvitePreview } from '../../types'

interface InviteFormProps {
  token: string
}

export function InviteForm({ token }: InviteFormProps) {
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [passcode, setPasscode] = useState('')
  const [confirmPasscode, setConfirmPasscode] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const { completeInvite, refreshUser } = useAuth()
  const navigate = useNavigate()
  const mockMode = isMockDataMode()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingPreview(true)
      try {
        const data = mockMode
          ? await getMockInvitePreview(token)
          : await rpcGetInvitePreview(token)
        if (!cancelled) setPreview(data)
      } catch (err) {
        if (!cancelled) {
          setPreviewError(getAuthErrorMessage(err, 'Invalid invite link'))
        }
      } finally {
        if (!cancelled) setLoadingPreview(false)
      }
    })()
    return () => { cancelled = true }
  }, [token, mockMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!/^\d{4}$/.test(passcode)) {
      toast.error('Passcode must be exactly 4 digits')
      return
    }
    if (passcode !== confirmPasscode) {
      toast.error('Passcodes do not match')
      return
    }

    setLoading(true)
    try {
      if (mockMode) {
        const user = await completeMockInvite(token, passcode)
        if (!user) throw new Error('Invalid invite link')
        saveSession(user)
        await refreshUser()
        toast.success('You\'re in')
        navigate('/dashboard')
        return
      }

      await completeInvite(token, passcode)
      toast.success('You\'re in')
      navigate('/dashboard')
    } catch (err) {
      toast.error(getAuthErrorMessage(err, 'Setup failed'))
    } finally {
      setLoading(false)
    }
  }

  if (loadingPreview) {
    return (
      <div className="glass-card p-8 w-full max-w-md text-center">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (previewError || !preview) {
    return (
      <div className="glass-card p-8 text-center w-full max-w-md">
        <h1 className="font-display text-xl text-brand-navy">Invite link problem</h1>
        <p className="text-gray-500 mt-2 text-sm">{previewError ?? 'This link is not valid.'}</p>
        <Link to="/login" className="inline-block mt-6 text-brand-blue font-medium">Go to login</Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5 w-full max-w-md">
      <div className="text-center">
        <img
          src="/logo.png"
          alt="BMFC"
          className="h-20 w-20 mx-auto mb-4 object-contain drop-shadow-md"
          onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg' }}
        />
        <h1 className="font-display text-2xl text-brand-navy">Welcome, {preview.display_name}</h1>
        <p className="text-gray-500 text-sm mt-2">Pick a 4-digit passcode to finish setup.</p>
      </div>

      <div>
        <label htmlFor="invite-passcode" className="block text-sm text-gray-500 mb-2">Passcode</label>
        <input
          id="invite-passcode"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={passcode}
          onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="input-field tracking-[0.4em] text-center font-mono"
          placeholder="••••"
          required
        />
      </div>
      <div>
        <label htmlFor="invite-confirm" className="block text-sm text-gray-500 mb-2">Confirm passcode</label>
        <input
          id="invite-confirm"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={confirmPasscode}
          onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="input-field tracking-[0.4em] text-center font-mono"
          placeholder="••••"
          required
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Saving...' : 'Save passcode'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already set up?{' '}
        <Link to="/login" className="text-brand-blue font-medium hover:underline">Login</Link>
      </p>
    </form>
  )
}
