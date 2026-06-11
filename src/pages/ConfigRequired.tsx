import { PageShell } from '../components/ui/PageBackground'

export default function ConfigRequired() {
  return (
    <PageShell>
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="glass-card p-8 max-w-lg w-full space-y-4">
          <h1 className="font-display text-2xl text-brand-navy">Setup needed</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            This deploy expects Supabase, but the build did not get valid{' '}
            <code className="text-xs bg-brand-light px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs bg-brand-light px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>.
            The URL must start with <code className="text-xs">https://</code> — no quotes or spaces.
          </p>
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-brand-navy">On Vercel:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Project → Settings → Environment Variables</li>
              <li>Add the two keys above (from Supabase → Settings → API)</li>
              <li>Add <code className="text-xs">VITE_CLUB_DATA_SOURCE=supabase</code></li>
              <li>Redeploy (must rebuild after adding vars)</li>
            </ol>
          </div>
          <p className="text-xs text-gray-500">
            Do not add <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to Vercel. That stays local for{' '}
            <code className="text-xs">npm run sync:ddsfl</code> only.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
