import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { saveSession } from '../../hooks/authContext'
import { rpcGetInvitePreview } from '../../lib/clubAuth'
import { completeMockInvite, getMockInvitePreview, isMockDataMode } from '../../lib/clubApi'
import { getAuthErrorMessage } from '../../lib/authErrors'
import { validateNamePart } from '../../lib/playerNames'
import type { InvitePreview } from '../../types'

const passcodeInputType = import.meta.env.VITE_E2E === 'true' ? 'text' : 'password'

type InviteStep = 1 | 2 | 3

interface InviteFormProps {
  token: string
}

export function InviteForm({ token }: InviteFormProps) {
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [step, setStep] = useState<InviteStep>(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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

  const canAdvanceFromStep1 = firstName.trim().length > 0
  const canAdvanceFromStep2 = lastName.trim().length > 0
  const canFinish =
    /^\d{4}$/.test(passcode) &&
    /^\d{4}$/.test(confirmPasscode) &&
    passcode === confirmPasscode

  const goToStep2 = () => {
    try {
      validateNamePart(firstName, 'First name')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enter your first name')
      return
    }
    setStep(2)
  }

  const goToStep3 = () => {
    try {
      validateNamePart(lastName, 'Last name')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enter your surname')
      return
    }
    setStep(3)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (step !== 3) return

    const form = e.currentTarget
    const passEl = form.elements.namedItem('passcode') as HTMLInputElement | null
    const confirmEl = form.elements.namedItem('confirmPasscode') as HTMLInputElement | null
    const effectivePasscode = passcode || passEl?.value || ''
    const effectiveConfirm = confirmPasscode || confirmEl?.value || ''

    try {
      validateNamePart(firstName, 'First name')
      validateNamePart(lastName, 'Last name')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enter your name')
      return
    }

    if (!/^\d{4}$/.test(effectivePasscode)) {
      toast.error('Passcode must be exactly 4 digits')
      return
    }
    if (effectivePasscode !== effectiveConfirm) {
      toast.error('Passcodes do not match')
      return
    }

    setLoading(true)
    try {
      if (mockMode) {
        const user = await completeMockInvite(token, firstName, lastName, effectivePasscode)
        if (!user) throw new Error('Invalid invite link')
        saveSession(user)
        await refreshUser()
        toast.success('Passcode saved. Waiting for approval')
        navigate('/pending')
        return
      }

      await completeInvite(token, firstName, lastName, effectivePasscode)
      toast.success('Passcode saved. Waiting for approval')
      navigate('/pending')
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
        <h1 className="font-display text-2xl text-brand-navy">Join BMFC Club Hub</h1>
        <p className="text-gray-500 text-sm mt-2">
          {preview.invite_label
            ? `Invite: ${preview.invite_label}`
            : step === 3
              ? 'Pick a 4-digit passcode.'
              : 'A few quick details to get you set up.'}
        </p>
      </div>

      {step === 1 && (
        <div>
          <label htmlFor="invite-first" className="block text-sm font-medium text-brand-navy mb-2">
            What&apos;s your first name?
          </label>
          <input
            id="invite-first"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input-field"
            autoComplete="given-name"
            autoFocus
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <label htmlFor="invite-last" className="block text-sm font-medium text-brand-navy mb-2">
            What&apos;s your surname?
          </label>
          <input
            id="invite-last"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="input-field"
            autoComplete="family-name"
            autoFocus
          />
        </div>
      )}

      {step === 3 && (
        <>
          <div>
            <label htmlFor="invite-passcode" className="block text-sm text-gray-500 mb-2">Passcode</label>
            <input
              id="invite-passcode"
              name="passcode"
              type={passcodeInputType}
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="input-field tracking-[0.4em] text-center font-mono"
              placeholder="••••"
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor="invite-confirm" className="block text-sm text-gray-500 mb-2">Confirm passcode</label>
            <input
              id="invite-confirm"
              name="confirmPasscode"
              type={passcodeInputType}
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
        </>
      )}

      <div className={`flex gap-3 ${step > 1 ? '' : ''}`}>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((step - 1) as InviteStep)}
            disabled={loading}
            className="btn-secondary flex-1 min-h-[44px]"
          >
            Back
          </button>
        )}
        {step === 1 && (
          <button
            type="button"
            onClick={goToStep2}
            disabled={!canAdvanceFromStep1}
            className="btn-primary w-full min-h-[44px]"
          >
            Next
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            onClick={goToStep3}
            disabled={!canAdvanceFromStep2}
            className="btn-primary flex-1 min-h-[44px]"
          >
            Next
          </button>
        )}
        {step === 3 && (
          <button
            type="submit"
            disabled={loading || !canFinish}
            className="btn-primary flex-1 min-h-[44px]"
          >
            {loading ? 'Saving...' : 'Finish setup'}
          </button>
        )}
      </div>

      <p className="text-center text-sm text-gray-500">
        Already set up?{' '}
        <Link to="/login" className="text-brand-blue font-medium hover:underline">Log in</Link>
      </p>
    </form>
  )
}
