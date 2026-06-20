import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { changePasscode } from '../../lib/clubApi'
import { getAuthErrorMessage } from '../../lib/authErrors'

interface ChangePasscodeFormProps {
  onClose: () => void
}

export function ChangePasscodeForm({ onClose }: ChangePasscodeFormProps) {
  const { user, refreshUser } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!/^\d{4}$/.test(current) || !/^\d{4}$/.test(next)) {
      toast.error('Passcode must be exactly 4 digits')
      return
    }
    if (next !== confirm) {
      toast.error('New passcodes do not match')
      return
    }
    if (current === next) {
      toast.error('Pick a different passcode')
      return
    }

    setLoading(true)
    try {
      await changePasscode(current, next)
      await refreshUser()
      toast.success('Passcode updated')
      onClose()
    } catch (err) {
      toast.error(getAuthErrorMessage(err, 'Could not change passcode'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <p className="text-sm text-gray-500 px-1">Enter your current passcode, then choose a new 4-digit code.</p>
      <div>
        <label htmlFor="passcode-current" className="block text-xs text-gray-500 mb-1 px-1">Current passcode</label>
        <input
          id="passcode-current"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={current}
          onChange={(e) => setCurrent(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="input-field tracking-[0.4em] text-center font-mono w-full"
          placeholder="••••"
          required
        />
      </div>
      <div>
        <label htmlFor="passcode-new" className="block text-xs text-gray-500 mb-1 px-1">New passcode</label>
        <input
          id="passcode-new"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={next}
          onChange={(e) => setNext(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="input-field tracking-[0.4em] text-center font-mono w-full"
          placeholder="••••"
          required
        />
      </div>
      <div>
        <label htmlFor="passcode-confirm" className="block text-xs text-gray-500 mb-1 px-1">Confirm new passcode</label>
        <input
          id="passcode-confirm"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="input-field tracking-[0.4em] text-center font-mono w-full"
          placeholder="••••"
          required
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading} className="btn-primary text-sm flex-1">
          {loading ? 'Saving...' : 'Save passcode'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
