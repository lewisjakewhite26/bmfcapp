import { getClubSession } from './clubAuth'
import { isMockDataMode } from './clubApi'
import { supabase } from './supabase'

/** Fire squad push on live goal — reuses send-push edge function; failures are non-blocking. */
export async function sendGoalPushNotification(
  scorerName: string,
  goalsFor: number,
  goalsAgainst: number,
): Promise<void> {
  if (isMockDataMode()) return

  const session = getClubSession()
  if (!session) return

  try {
    await supabase.functions.invoke('send-push', {
      body: {
        title: `GOAL! ${scorerName}`,
        body: `BMFC ${goalsFor}–${goalsAgainst}`,
        url: '/results',
        admin_id: session.userId,
        session_token: session.sessionToken,
      },
    })
  } catch {
    // Push is optional — do not block live logging
  }
}
