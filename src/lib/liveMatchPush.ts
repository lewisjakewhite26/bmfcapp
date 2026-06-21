import { isMockDataMode } from './clubApi'
import { invokeSendPush } from './sendPush'

/** Fire squad push on live goal — reuses send-push edge function; failures are non-blocking. */
export async function sendGoalPushNotification(
  scorerName: string,
  goalsFor: number,
  goalsAgainst: number,
): Promise<void> {
  if (isMockDataMode()) return

  try {
    await invokeSendPush({
      title: `GOAL! ${scorerName}`,
      body: `BMFC ${goalsFor}–${goalsAgainst}`,
      url: '/results',
    })
  } catch {
    // Push is optional — do not block live logging
  }
}
