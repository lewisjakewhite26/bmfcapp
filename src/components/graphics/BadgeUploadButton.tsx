import { useId, useState } from 'react'
import toast from 'react-hot-toast'
import { uploadOpponentBadge, type OpponentBadge } from '../../lib/graphicsApi'

interface BadgeUploadButtonProps {
  opponentName: string
  hasBadge: boolean
  onSaved: (badge: OpponentBadge) => void
  className?: string
}

export function BadgeUploadButton({ opponentName, hasBadge, onSaved, className = 'btn-secondary' }: BadgeUploadButtonProps) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)

  const handleFile = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setBusy(true)
    try {
      const badge = await uploadOpponentBadge(opponentName, file)
      toast.success(`Badge saved for ${opponentName}`)
      onSaved(badge)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the badge")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={(e) => void handleFile(e.currentTarget)}
      />
      <label htmlFor={inputId} className={`${className} cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
        {busy ? 'Saving…' : hasBadge ? 'Replace badge' : 'Add badge'}
      </label>
    </>
  )
}
