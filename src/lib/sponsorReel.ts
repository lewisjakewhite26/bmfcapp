import type { SquadMember } from '../types'
import { sponsorWords } from './sharedSponsorLogos'

export interface ReelSponsor {
  /** Sponsor name as entered in the app. */
  name: string
  /** Stored logo path or URL (resolve with resolveSponsorLogoUrl), or null. */
  logo: string | null
}

/**
 * One entry per sponsor, however many players they back. Names are matched
 * loosely ("Lines Valeting Ltd" = "lines valeting"), the first logo found
 * wins, and the list is sorted alphabetically.
 */
export function reelSponsors(squad: SquadMember[]): ReelSponsor[] {
  const byKey = new Map<string, ReelSponsor>()
  for (const p of squad) {
    const name = p.sponsor_name?.trim()
    if (!name) continue
    const key = sponsorWords(name).join(' ') || name.toLowerCase()
    const existing = byKey.get(key)
    const logo = p.sponsor_logo_url ?? null
    if (!existing) byKey.set(key, { name, logo })
    else if (!existing.logo && logo) existing.logo = logo
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }))
}
