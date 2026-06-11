import { PageShell } from '../components/ui/PageBackground'
import { getSupabaseConfigDiagnostic } from '../lib/supabase'

export default function ConfigRequired() {
  const diag = getSupabaseConfigDiagnostic()

  return (
    <PageShell>
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="glass-card p-8 max-w-lg w-full space-y-4">
          <h1 className="font-display text-2xl text-brand-navy">Setup needed</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Vercel built this site without valid Supabase env vars. They must be set{' '}
            <strong>before</strong> the build runs, then you must <strong>redeploy</strong>.
          </p>

          <div className="rounded-xl bg-brand-light/80 border border-brand-blue/15 p-4 text-sm space-y-2 font-mono">
            <p className="text-brand-navy font-semibold font-sans">What this build received:</p>
            <p>
              <span className="text-gray-500">VITE_CLUB_DATA_SOURCE</span>{' '}
              <span className="text-brand-navy">{diag.dataSource}</span>
            </p>
            <p>
              <span className="text-gray-500">VITE_SUPABASE_URL</span>{' '}
              <span className={diag.urlStatus === 'ok' ? 'text-emerald-700' : 'text-red-600'}>
                {diag.urlStatus}
              </span>
            </p>
            <p>
              <span className="text-gray-500">VITE_SUPABASE_ANON_KEY</span>{' '}
              <span className={diag.keyStatus === 'ok' ? 'text-emerald-700' : 'text-red-600'}>
                {diag.keyStatus}
              </span>
            </p>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-brand-navy">Fix on Vercel:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Settings → Environment Variables</li>
              <li>
                Add all three — tick <strong>Production</strong> (and Preview if you use preview URLs)
              </li>
              <li>
                <code className="text-xs">VITE_SUPABASE_URL</code> ={' '}
                <code className="text-xs">https://kqxsbbkedhidsfojapny.supabase.co</code>
              </li>
              <li>
                <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> = anon key from Supabase → Settings → API
              </li>
              <li>
                <code className="text-xs">VITE_CLUB_DATA_SOURCE</code> = <code className="text-xs">supabase</code>
              </li>
              <li>
                Deployments → ⋯ on latest → <strong>Redeploy</strong> (not just save vars — must rebuild)
              </li>
            </ol>
          </div>

          <p className="text-xs text-gray-500">
            No quotes around values. URL must start with <code className="text-xs">https://</code>.
            Do not add <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> here.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
