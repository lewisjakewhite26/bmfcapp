import { FunctionsHttpError } from '@supabase/supabase-js'
import { getClubSession } from './clubAuth'
import { supabase } from './supabase'

export interface SendPushPayload {
  title: string
  body: string
  url?: string
  player_ids?: string[]
}

export interface SendPushResult {
  sent: number
  failed?: number
  total?: number
}

async function sendPushErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status
    try {
      const body = (await error.context.json()) as { error?: string }
      if (status === 401) return 'Session expired. Log out and back in.'
      if (status === 403) return 'Only committee can send notifications.'
      if (body.error) return body.error
    } catch {
      // Response body wasn't JSON — fall through.
    }
    if (status === 403) return 'Only committee can send notifications.'
  }

  if (error instanceof Error && error.message !== 'Edge Function returned a non-2xx status code') {
    return error.message
  }

  return "Couldn't send notification"
}

export async function invokeSendPush(payload: SendPushPayload): Promise<SendPushResult> {
  const session = getClubSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.functions.invoke('send-push', {
    body: {
      ...payload,
      admin_id: session.userId,
      session_token: session.sessionToken,
    },
  })

  if (error) {
    throw new Error(await sendPushErrorMessage(error))
  }

  return (data ?? { sent: 0 }) as SendPushResult
}
