interface DataErrorBannerProps {
  message: string
  onRetry?: () => void
}

export function DataErrorBanner({ message, onRetry }: DataErrorBannerProps) {
  return (
    <div className="glass-card p-4 border-l-4 border-red-400 bg-red-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-sm text-red-800">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary text-sm shrink-0">
          Try again
        </button>
      )}
    </div>
  )
}
