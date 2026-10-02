import type { SquadMember } from '../types'
import { isMockDataMode } from './clubApi'
import { supabase } from './supabase'

/**
 * Shared sponsor logos: files dropped into the `sponsors` folder of the
 * `sponsor-logos` bucket (Supabase → Storage), named after the sponsor.
 * Every player with that sponsor uses the file unless they have their own
 * logo uploaded in the app, which always wins.
 */

export const SHARED_LOGO_FOLDER = 'sponsors'

/** Types the bucket accepts (see migration 048). */
const IMAGE_FILE = /\.(png|jpe?g|webp|gif)$/i

/** Words that don't help tell sponsors apart. */
const IGNORED_WORDS = new Set(['ltd', 'limited', 'the', 'and', 'co', 'logo', 'logos', 'final', 'new', 'official'])

export interface SharedLogoFile {
  /** File name as it appears in Supabase, e.g. "Lines Valeting.png". */
  name: string
  /** Storage path within the bucket, URL-safe. */
  path: string
}

export function sponsorWords(text: string, ignored: Set<string> = IGNORED_WORDS): string[] {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !ignored.has(w))
}

/** Words in a file name, without the extension or a trailing copy number ("logo-2", "logo (1)"). */
export function logoFileWords(fileName: string, ignored: Set<string> = IGNORED_WORDS): string[] {
  const words = sponsorWords(fileName.replace(/\.[a-z0-9]+$/i, ''), ignored)
  if (words.length > 1 && /^\d+$/.test(words[words.length - 1])) words.pop()
  return words
}

/**
 * Finds the file for a sponsor. Exact matches win; otherwise one name must
 * contain all the words of the other ("mess.png" → "Mess Sedgefield",
 * "lines-valeting-north-east.jpg" → "Lines Valeting"), preferring the
 * closest. Returns null when nothing fits.
 */
export function matchSharedLogo(
  sponsorName: string,
  files: SharedLogoFile[],
  ignored: Set<string> = IGNORED_WORDS,
): SharedLogoFile | null {
  const sponsor = sponsorWords(sponsorName, ignored)
  if (!sponsor.length) return null
  let best: { file: SharedLogoFile; score: number } | null = null
  for (const file of files) {
    const words = logoFileWords(file.name, ignored)
    if (!words.length) continue
    const fileInSponsor = words.every((w) => sponsor.includes(w))
    const sponsorInFile = sponsor.every((w) => words.includes(w))
    if (!fileInSponsor && !sponsorInFile) continue
    const shared = words.filter((w) => sponsor.includes(w))
    if (shared.join('').length < 3) continue
    const extra = Math.abs(words.length - sponsor.length)
    const score = (fileInSponsor && sponsorInFile ? 1000 : 0) + shared.length * 10 - extra
    if (!best || score > best.score || (score === best.score && file.name < best.file.name)) best = { file, score }
  }
  return best?.file ?? null
}

/** Lists image files in a storage folder. Never throws: on any problem the app carries on without them. */
export async function listSharedImages(bucket: string, folder: string): Promise<SharedLogoFile[]> {
  if (isMockDataMode()) return []
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
    if (error || !data) return []
    return data
      .filter((f) => IMAGE_FILE.test(f.name))
      .map((f) => ({ name: f.name, path: `${folder}/${encodeURIComponent(f.name)}` }))
  } catch {
    return []
  }
}

export function listSharedSponsorLogos(): Promise<SharedLogoFile[]> {
  return listSharedImages('sponsor-logos', SHARED_LOGO_FOLDER)
}

/** Fills in shared logos for players with a sponsor but no logo of their own. */
export function withSharedSponsorLogos(squad: SquadMember[], files: SharedLogoFile[]): SquadMember[] {
  if (!files.length) return squad
  return squad.map((p) => {
    if (p.sponsor_logo_url || !p.sponsor_name?.trim()) return p
    const file = matchSharedLogo(p.sponsor_name, files)
    return file ? { ...p, sponsor_logo_url: file.path, sponsor_logo_shared_file: file.name } : p
  })
}
