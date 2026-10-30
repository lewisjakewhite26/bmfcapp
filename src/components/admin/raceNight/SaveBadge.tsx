import type { SaveStatus } from '../../../hooks/useRaceNightDoc'

const MAP: Record<SaveStatus, { text: string; cls: string }> = {
  saved: { text: 'All changes saved', cls: 'text-emerald-700 bg-emerald-50' },
  dirty: { text: 'Saving…', cls: 'text-gray-600 bg-gray-100' },
  saving: { text: 'Saving…', cls: 'text-gray-600 bg-gray-100' },
  error: { text: "Couldn't save · retrying", cls: 'text-amber-800 bg-amber-100' },
  conflict: { text: 'Not saved', cls: 'text-red-800 bg-red-100' },
}

export function SaveBadge({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const { text, cls } = MAP[status]
  return (
    <span className="flex items-center gap-2" aria-live="polite">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-pill ${cls}`}>{text}</span>
      {status === 'error' && (
        <button type="button" onClick={onRetry} className="text-xs font-semibold text-brand-blue underline">
          Retry now
        </button>
      )}
    </span>
  )
}
