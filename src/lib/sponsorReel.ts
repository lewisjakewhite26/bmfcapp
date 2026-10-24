import type { SquadMember } from '../types'
import { classifyLogo } from './graphics/pixels'
import { sponsorWords } from './sharedSponsorLogos'

export interface ReelPlayer {
  playerId: string
  /** Full name where the app has one ("Jack Marley"), else the display name. */
  name: string
  number: number | null
  /** Profile picture path or URL (resolve with resolvePlayerPhotoUrl), or null. */
  photo: string | null
}

export interface ReelSponsor {
  /** Sponsor name as entered in the app. */
  name: string
  /** Stored logo path or URL (resolve with resolveSponsorLogoUrl), or null. */
  logo: string | null
  /** The sponsor's "light" file from the sponsors folder (made for white backgrounds), if any. */
  logoLight: string | null
  /** Players this sponsor backs, by squad number. */
  players: ReelPlayer[]
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
    const logoLight = p.sponsor_logo_light_url ?? null
    const player: ReelPlayer = { playerId: p.player_id, name: p.display_name, number: p.squad_number ?? null, photo: p.photo_url ?? null }
    if (!existing) {
      byKey.set(key, { name, logo, logoLight, players: [player] })
      continue
    }
    if (!existing.logo && logo) existing.logo = logo
    if (!existing.logoLight && logoLight) existing.logoLight = logoLight
    if (!existing.players.some((x) => x.playerId === player.playerId)) existing.players.push(player)
  }
  const byNumber = (a: ReelPlayer, b: ReelPlayer) =>
    (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name, 'en-GB')
  return [...byKey.values()]
    .map((s) => ({ ...s, players: [...s.players].sort(byNumber) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }))
}

/** Most players shown on one slide; a sponsor backing more gets extra slides. */
export const MAX_PLAYERS_PER_SLIDE = 4

/**
 * Splits players into slides as evenly as possible (7 → 4 + 3, 5 → 3 + 2),
 * so no slide ends up with a lone player. A sponsor with no players is one slide.
 */
export function splitPlayers<T>(players: T[], max = MAX_PLAYERS_PER_SLIDE): T[][] {
  if (players.length <= max) return [players]
  const groups = Math.ceil(players.length / max)
  const out: T[][] = []
  let start = 0
  for (let g = 0; g < groups; g++) {
    const size = Math.ceil((players.length - start) / (groups - g))
    out.push(players.slice(start, start + size))
    start += size
  }
  return out
}

/**
 * What a logo sits on in the reel:
 *  - white: the white card (logos on white, coloured boxes, dark artwork)
 *  - none: straight on the navy (white artwork made for dark backgrounds)
 *  - blue: a club-blue card (clear logos mixing white and black parts, which
 *    would lose one or the other on white or navy)
 */
export type LogoBackdrop = 'white' | 'none' | 'blue'

/** Picks the backdrop from the logo's pixels (RGBA). */
export function logoBackdrop(data: Uint8ClampedArray, width: number, height: number): LogoBackdrop {
  const kind = classifyLogo(data, width, height)
  if (kind === 'white-on-clear') return 'none'
  if (kind !== 'colour-on-clear') return 'white'
  let visible = 0
  let light = 0
  let dark = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    visible++
    const min = Math.min(data[i], data[i + 1], data[i + 2])
    const max = Math.max(data[i], data[i + 1], data[i + 2])
    if (min > 215) light++
    else if (max < 80) dark++
  }
  if (!visible) return 'white'
  const lightShare = light / visible
  const darkShare = dark / visible
  if (lightShare < 0.2) return 'white'
  return darkShare < 0.15 ? 'none' : 'blue'
}
