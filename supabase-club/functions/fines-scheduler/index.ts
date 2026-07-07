// Fines automation orchestrator (canonical trigger for 26/27 fines rework).
//
// Invoked every 5 minutes via Supabase cron / pg_net (see migration 042).
// Order per tick: no-vote fines → vote reminders → weekly late fees.
// Each step is idempotent; pushes are best-effort and never block the tick.
//
// GitHub Action `apply-fine-late-fees.yml` remains a late-fee backstop only.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-fines-scheduler-secret',
}

interface ChargeRow {
  profile_id: string
  total_owed: number
}

interface FinedRow {
  profile_id: string
  total_owed: number
  event_label: string
}

interface ReminderRow {
  profile_id: string
  event_label: string
  when: string
}

function formatGbp(amount: number): string {
  return `£${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`
}

async function sendSystemPush(
  supabase: ReturnType<typeof createClient>,
  playerIds: string[],
  title: string,
  body: string,
  url: string,
): Promise<void> {
  if (playerIds.length === 0) return

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@bmfc.local'
  if (!vapidPublic || !vapidPrivate) {
    console.warn('fines-scheduler: VAPID keys not configured, skipping push')
    return
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('player_id', playerIds)

  if (error) {
    console.warn('fines-scheduler: push subscription query failed', error.message)
    return
  }

  const message = JSON.stringify({ title, body, url })
  const staleEndpoints: string[] = []

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message,
      )
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) staleEndpoints.push(sub.endpoint)
    }
  }

  if (staleEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const schedulerSecret = Deno.env.get('FINES_SCHEDULER_SECRET')?.trim()
  const providedSecret = req.headers.get('x-fines-scheduler-secret')?.trim()
  const authHeader = req.headers.get('authorization') ?? ''
  const apiKey = req.headers.get('apikey') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim()

  const authorized =
    (schedulerSecret && providedSecret === schedulerSecret) ||
    (serviceKey &&
      (bearerToken === serviceKey ||
        apiKey.trim() === serviceKey ||
        authHeader === `Bearer ${serviceKey}`))

  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const summary: Record<string, unknown> = {}

    const { data: noVoteData, error: noVoteError } = await supabase.rpc('apply_no_vote_fines')
    if (noVoteError) throw noVoteError
    summary.no_vote = noVoteData

    const fined = (noVoteData as { fined?: FinedRow[] })?.fined ?? []
    for (const row of fined) {
      try {
        await sendSystemPush(
          supabase,
          [row.profile_id],
          'No vote fine',
          `£1 added for not voting on ${row.event_label}. You owe ${formatGbp(Number(row.total_owed))}.`,
          '/fines',
        )
      } catch {
        // Push is optional.
      }
    }

    const { data: reminderData, error: reminderError } = await supabase.rpc('apply_vote_reminders')
    if (reminderError) throw reminderError
    summary.reminders = reminderData

    const reminders = (reminderData as { reminders?: ReminderRow[] })?.reminders ?? []
    for (const row of reminders) {
      try {
        await sendSystemPush(
          supabase,
          [row.profile_id],
          'Vote reminder',
          `You haven't voted for ${row.event_label} (${row.when}). No vote = £1 fine.`,
          '/dashboard',
        )
      } catch {
        // Push is optional.
      }
    }

    const { data: lateData, error: lateError } = await supabase.rpc('apply_fine_late_fees')
    if (lateError) throw lateError
    summary.late_fees = lateData

    const charges = (lateData as { charges?: ChargeRow[] })?.charges ?? []
    for (const row of charges) {
      try {
        await sendSystemPush(
          supabase,
          [row.profile_id],
          'Late payment fee added',
          `£2 added. You now owe ${formatGbp(Number(row.total_owed))}.`,
          '/fines',
        )
      } catch {
        // Push is optional.
      }
    }

    console.log('fines-scheduler:', JSON.stringify(summary))

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('fines-scheduler:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
