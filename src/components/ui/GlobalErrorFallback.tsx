import { PageShell } from './PageBackground'

export function GlobalErrorFallback({
  error,
  onRetry,
}: {
  error: Error | null
  onRetry: () => void
}) {
  return (
    <PageShell>
      <div className="min-h-screen flex items-center justify-center px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-8">
        <div
          className="glass-card p-8 max-w-md w-full text-center space-y-5 border-t-2 border-brand-gold"
          role="alert"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">Unexpected error</p>
          </div>
          <h1 className="font-display text-2xl text-brand-navy">Something went wrong</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            The app hit an unexpected problem. Try again or reload the page. Your data should be safe.
          </p>
          {import.meta.env.DEV && error && (
            <details className="text-left text-xs text-gray-500 rounded-xl bg-brand-light/60 border border-brand-blue/10 px-3 py-2">
              <summary className="cursor-pointer font-medium text-gray-600">Error details (dev only)</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono">{error.message}</pre>
            </details>
          )}
          <div className="flex flex-col gap-3 pt-1">
            <button type="button" onClick={onRetry} className="btn-primary w-full">
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-secondary w-full"
            >
              Reload page
            </button>
            <a href="/" className="text-sm text-brand-blue hover:underline">
              Back to home
            </a>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
