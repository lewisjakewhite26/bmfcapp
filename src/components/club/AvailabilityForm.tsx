import { useEffect, useState } from 'react'
import type { AvailabilityStatus } from '../../types'
import { AvailabilityPicker } from './AvailabilityPicker'

interface AvailabilityFormProps {
  value: AvailabilityStatus | null
  message?: string | null
  onSave: (status: AvailabilityStatus, message: string | null) => void
  disabled?: boolean
}

export function AvailabilityForm({ value, message, onSave, disabled }: AvailabilityFormProps) {
  const [note, setNote] = useState(message ?? '')
  const showNote = value === 'no' || value === 'maybe'

  useEffect(() => {
    setNote(message ?? '')
  }, [message, value])

  const handleStatus = (status: AvailabilityStatus) => {
    if (status === 'yes') {
      setNote('')
      onSave(status, null)
      return
    }
    onSave(status, note.trim() || null)
  }

  const handleNoteBlur = () => {
    if (!value || value === 'yes') return
    onSave(value, note.trim() || null)
  }

  return (
    <div className="space-y-3">
      <AvailabilityPicker value={value} onChange={handleStatus} disabled={disabled} />
      {showNote && (
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Reason <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleNoteBlur}
            disabled={disabled}
            placeholder="e.g. away for the weekend, injured"
            className="input-field text-sm"
            maxLength={200}
          />
        </div>
      )}
    </div>
  )
}
