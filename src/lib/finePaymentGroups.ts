import type { FineEntry } from '../types'

export type PlayerFineGroup = {
  profileId: string
  displayName: string
  entries: FineEntry[]
  unpaidEntries: FineEntry[]
  unpaidTotal: number
  allPaid: boolean
}

export function groupFineEntriesByPlayer(entries: FineEntry[]): PlayerFineGroup[] {
  const byPlayer = new Map<string, FineEntry[]>()
  for (const entry of entries) {
    const list = byPlayer.get(entry.profile_id) ?? []
    list.push(entry)
    byPlayer.set(entry.profile_id, list)
  }

  return Array.from(byPlayer.entries())
    .map(([profileId, playerEntries]) => {
      const unpaidEntries = playerEntries.filter((e) => !e.paid)
      const unpaidTotal = unpaidEntries.reduce((sum, e) => sum + e.amount, 0)
      return {
        profileId,
        displayName: playerEntries[0].display_name,
        entries: playerEntries,
        unpaidEntries,
        unpaidTotal,
        allPaid: unpaidEntries.length === 0,
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
