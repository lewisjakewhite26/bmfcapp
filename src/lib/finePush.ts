import { isMockDataMode } from './clubApi'
import { formatFineAmount } from './fineCatalog'
import { invokeSendPush } from './sendPush'

/**
 * Push a single player when new fines are logged against them.
 * Only fires for newly added fines (not removals). Non-blocking — never
 * blocks the admin save flow, mirroring `liveMatchPush.ts`.
 */
export async function sendFinePushNotification(
  playerId: string,
  newFineLabels: string[],
  owedTotal: number,
): Promise<void> {
  if (isMockDataMode()) return
  if (!playerId || newFineLabels.length === 0) return

  const labels = newFineLabels.join(', ')
  try {
    await invokeSendPush({
      title: 'New fine added',
      body: `${labels} · ${formatFineAmount(owedTotal)} owed`,
      url: '/fines',
      player_ids: [playerId],
    })
  } catch {
    // Push is optional — do not block fine saving.
  }
}
