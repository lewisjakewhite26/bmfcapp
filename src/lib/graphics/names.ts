import type { AdminUserRow, SquadMember } from '../../types'

/** "Jack Marley" from first/last name, or null if either is missing. */
export function fullNameOf(user: Pick<AdminUserRow, 'first_name' | 'last_name'>): string | null {
  const first = user.first_name?.trim()
  const last = user.last_name?.trim()
  return first && last ? `${first} ${last}` : null
}

/**
 * The app shows "Jack M" everywhere; posts and file/sponsor matching need
 * "Jack Marley". Full names come from admin_list_profiles (admin only), so the
 * graphics page swaps them in once; players without one keep their display name.
 */
export function withFullNames(squad: SquadMember[], users: AdminUserRow[]): SquadMember[] {
  const names = new Map<string, string>()
  for (const u of users) {
    const full = fullNameOf(u)
    if (full) names.set(u.id, full)
  }
  return squad.map((s) => {
    const full = names.get(s.player_id)
    return full ? { ...s, display_name: full } : s
  })
}
