// Supabase Edge Function — trigger a Canva autofill design from player data
// Deploy (from repo root): supabase functions deploy canva-autofill --project-ref kqxsbbkedhidsfojapny
// CLI reads supabase/config.toml → entrypoint points here (source of truth).
// Secret: CANVA_ACCESS_TOKEN — Canva Connect API OAuth token for the connected
// account. NOT set yet (Canva connector not re-linked) — until it is, this
// function returns a clearly-labelled mock result instead of calling Canva,
// so the client-side integration can be built and tested end to end now.
//
// Real API shape once CANVA_ACCESS_TOKEN is set (Canva Connect API — Autofill):
//   1. POST https://api.canva.com/rest/v1/asset-uploads for each image field
//      (player photo, sponsor logo) → poll until `job.status === 'success'` → asset_id
//   2. POST https://api.canva.com/rest/v1/autofills
//      { brand_template_id, title, data: { [field]: { type: 'text'|'image', text?, asset_id? } } }
//      → returns { job: { id, status } }
//   3. Poll GET https://api.canva.com/rest/v1/autofills/{job.id} until status
//      is 'success' (returns the created design URL) or 'failed'.
// Docs: https://www.canva.dev/docs/connect/api-reference/autofills/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutofillPlayerData {
  displayName: string
  photoUrl?: string | null
  sponsorLogoUrl?: string | null
  sponsorName?: string | null
}

interface AutofillPayload {
  admin_id: string
  session_token: string
  template_id: string
  player_data: AutofillPlayerData
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload = (await req.json()) as AutofillPayload
    const adminId = payload.admin_id?.trim()
    const sessionToken = payload.session_token?.trim()

    if (!adminId || !sessionToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('session_token, is_admin, is_committee')
      .eq('id', adminId)
      .maybeSingle()

    if (profileError) throw profileError

    if (!profile || profile.session_token !== sessionToken) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!profile.is_admin && !profile.is_committee) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!payload.template_id || !payload.player_data?.displayName) {
      return new Response(JSON.stringify({ error: 'template_id and player_data.displayName required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const canvaToken = Deno.env.get('CANVA_ACCESS_TOKEN')

    if (!canvaToken) {
      // Canva connector not linked yet — return a mock job so the client
      // flow (submit → poll → show result) can be built and tested now.
      return new Response(
        JSON.stringify({
          job_id: `mock-${crypto.randomUUID()}`,
          status: 'success',
          design_url: null,
          mock: true,
          note: 'CANVA_ACCESS_TOKEN not set — this is a mock result. Re-link the Canva account and set the secret to generate real designs.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // --- Real Canva Connect API path (runs once CANVA_ACCESS_TOKEN is set) ---
    const data: Record<string, { type: 'text' | 'image'; text?: string; asset_id?: string }> = {
      player_name: { type: 'text', text: payload.player_data.displayName },
    }
    if (payload.player_data.sponsorName) {
      data.sponsor_name = { type: 'text', text: payload.player_data.sponsorName }
    }
    // Image fields (player_photo, sponsor_logo) need a Canva asset_id, which
    // requires uploading the image via /v1/asset-uploads first — not yet
    // wired up pending real account access; text fields work as-is above.

    const autofillRes = await fetch('https://api.canva.com/rest/v1/autofills', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${canvaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brand_template_id: payload.template_id,
        title: `${payload.player_data.displayName} — ${new Date().toISOString().slice(0, 10)}`,
        data,
      }),
    })

    if (!autofillRes.ok) {
      const errText = await autofillRes.text()
      return new Response(JSON.stringify({ error: `Canva API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const autofillJson = (await autofillRes.json()) as { job: { id: string; status: string } }

    return new Response(
      JSON.stringify({
        job_id: autofillJson.job.id,
        status: autofillJson.job.status,
        design_url: null,
        mock: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
