import { getSupabaseAdmin } from './lib/supabaseAdmin.js'
import { runSyncResults, recordSyncError } from './lib/syncResults.js'

export const config = {
  runtime: 'nodejs',
}

async function isAuthorized(req: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  if (req.method === 'POST') {
    try {
      const body = await req.clone().json() as { admin_id?: string; session_token?: string }
      if (!body.admin_id || !body.session_token) return false

      const supabase = getSupabaseAdmin()
      const { data: user } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', body.admin_id)
        .eq('session_token', body.session_token)
        .maybeSingle()

      return user?.is_admin === true
    } catch {
      return false
    }
  }

  // Allow GET in development without secret for local testing
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    return true
  }

  return false
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!(await isAuthorized(req))) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const force = req.method === 'POST'
    const result = await runSyncResults({ force })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Sync error:', error)
    await recordSyncError(error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Sync failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
