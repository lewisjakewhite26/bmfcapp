import type { SquadMember } from '../types'

export function formatSquadPlayerLabel(member: Pick<SquadMember, 'display_name' | 'squad_number'>): string {
  const prefix = member.squad_number != null ? `#${member.squad_number} ` : ''
  return `${prefix}${member.display_name}`
}

export function squadMemberById(squad: SquadMember[], playerId: string): SquadMember | undefined {
  return squad.find((s) => s.player_id === playerId)
}
