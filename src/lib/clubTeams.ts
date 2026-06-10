export function isClubTeam(name: string): boolean {
  return name.toLowerCase().replace(/\*/g, '').trim().includes('bishop middleham')
}

export function findClubTableRow<T extends { team_name: string }>(rows: T[]): T | undefined {
  return rows.find((row) => isClubTeam(row.team_name))
}
