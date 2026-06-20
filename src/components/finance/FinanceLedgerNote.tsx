import type { FinanceLedgerMeta } from '../../types'

export function FinanceLedgerNote({ entry }: { entry: FinanceLedgerMeta }) {
  return (
    <p className="text-xs text-gray-500 mt-1">
      Logged by <span className="font-medium text-gray-600">{entry.logged_by_name}</span>
      {entry.edited_by_name && entry.edited_at && (
        <>
          {' '}
          · Edited by{' '}
          <span className="font-medium text-gray-600">{entry.edited_by_name}</span>
          {' '}
          {new Date(entry.edited_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </>
      )}
    </p>
  )
}
