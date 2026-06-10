export function playerInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function formatMatchDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMatchTime(iso: string, kickoffTime?: string | null): string {
  if (kickoffTime) {
    const [h, m] = kickoffTime.split(':')
    return `${h}:${m}`
  }
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function formatScore(goalsFor: number, goalsAgainst: number): string {
  return `${goalsFor}–${goalsAgainst}`
}

export function resultLabel(goalsFor: number, goalsAgainst: number): 'W' | 'D' | 'L' {
  if (goalsFor > goalsAgainst) return 'W'
  if (goalsFor < goalsAgainst) return 'L'
  return 'D'
}

export function resultColor(goalsFor: number, goalsAgainst: number): string {
  const label = resultLabel(goalsFor, goalsAgainst)
  if (label === 'W') return 'bg-emerald-100 text-emerald-800'
  if (label === 'L') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-700'
}
