import { FunctionsHttpError } from '@supabase/supabase-js'
import { isMockDataMode } from './clubApi'
import { getClubSession } from './clubAuth'
import { supabase } from './supabase'

export interface CanvaTemplate {
  id: string
  name: string
  description?: string
  thumbnailUrl?: string | null
}

/**
 * Placeholder template list — swap in real Canva brand template IDs once
 * available. `listCanvaTemplates` is async so a later version can fetch
 * this from Canva's API instead without changing callers.
 */
const CANVA_TEMPLATES: CanvaTemplate[] = [
  {
    id: 'TEMPLATE_ID_MATCHDAY_LINEUP',
    name: 'Matchday Graphic',
    description: 'Player name + photo + sponsor logo, matchday social post',
    thumbnailUrl: null,
  },
  {
    id: 'TEMPLATE_ID_MOTM',
    name: 'Man of the match',
    description: 'Player name + photo, MOTM announcement post',
    thumbnailUrl: null,
  },
  {
    id: 'TEMPLATE_ID_SPONSOR_SHOUTOUT',
    name: 'Goalscorer',
    description: 'Player name + sponsor name + sponsor logo',
    thumbnailUrl: null,
  },
]

export async function listCanvaTemplates(): Promise<CanvaTemplate[]> {
  return CANVA_TEMPLATES
}

export interface AutofillPlayerData {
  displayName: string
  photoUrl?: string | null
  sponsorLogoUrl?: string | null
  sponsorName?: string | null
}

export interface AutofillResult {
  jobId: string
  status: 'in_progress' | 'success' | 'failed'
  designUrl: string | null
  /** True when no real Canva account is connected yet — result is a stand-in. */
  mock: boolean
  note?: string
}

async function autofillErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string }
      if (body.error) return body.error
    } catch {
      // Response body wasn't JSON — fall through.
    }
  }
  if (error instanceof Error) return error.message
  return "Couldn't generate design"
}

/**
 * Trigger a Canva autofill design for a player. Mockable end to end:
 * - Local/mock data mode: resolves a fake result, no network call.
 * - Live mode with no Canva account linked: the `canva-autofill` Edge
 *   Function itself returns a mock result (see its header comment).
 * - Live mode with `CANVA_ACCESS_TOKEN` set server-side: calls the real
 *   Canva Connect API autofill endpoint.
 */
export async function triggerAutofillDesign(
  templateId: string,
  playerData: AutofillPlayerData,
): Promise<AutofillResult> {
  if (isMockDataMode()) {
    await new Promise((r) => setTimeout(r, 300))
    return {
      jobId: `mock-${crypto.randomUUID()}`,
      status: 'success',
      designUrl: null,
      mock: true,
      note: 'Mock data mode — no Canva call made.',
    }
  }

  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.functions.invoke('canva-autofill', {
    body: {
      admin_id: session.userId,
      session_token: session.sessionToken,
      template_id: templateId,
      player_data: playerData,
    },
  })

  if (error) {
    throw new Error(await autofillErrorMessage(error))
  }

  const result = data as {
    job_id: string
    status: AutofillResult['status']
    design_url: string | null
    mock: boolean
    note?: string
  }

  return {
    jobId: result.job_id,
    status: result.status,
    designUrl: result.design_url,
    mock: result.mock,
    note: result.note,
  }
}
