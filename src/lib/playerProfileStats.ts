import type { MatchEvent, PlayerMatchRecord, PlayerStats } from '../types'

const IMPACT: Record<MatchEvent['event_type'], number> = {
  goal: 10,
  assist: 6,
  motm: 15,
  yellow_card: -3,
  red_card: -10,
}

export function eventImpact(event: MatchEvent): number {
  return IMPACT[event.event_type] ?? 0
}

export function matchImpactPoints(events: MatchEvent[]): number {
  return events.reduce((sum, e) => sum + eventImpact(e), 0)
}

export interface MatchPerformance {
  fixtureId: string
  date: string
  opponent: string
  homeAway: 'home' | 'away'
  goalsFor: number | null
  goalsAgainst: number | null
  points: number
  events: MatchEvent[]
}

export function getMatchPerformances(history: PlayerMatchRecord[]): MatchPerformance[] {
  return history
    .map(({ fixture, events }) => ({
      fixtureId: fixture.id,
      date: fixture.match_date,
      opponent: fixture.opponent.replace(/ FC$/, ''),
      homeAway: fixture.home_away,
      goalsFor: fixture.result?.goals_for ?? null,
      goalsAgainst: fixture.result?.goals_against ?? null,
      points: matchImpactPoints(events),
      events,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function getSeasonImpactTotal(history: PlayerMatchRecord[]): number {
  return history.reduce((sum, m) => sum + matchImpactPoints(m.events), 0)
}

export interface RadarAxis {
  label: string
  value: number
  raw: number
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function scale(value: number, cap: number): number {
  return clampPct((value / cap) * 100)
}

export function getRadarAxes(stats: PlayerStats): RadarAxis[] {
  const isGk = stats.position === 'Goalkeeper'

  if (isGk) {
    return [
      { label: 'Clean sheets', value: scale(stats.clean_sheets, 8), raw: stats.clean_sheets },
      { label: 'Apps', value: scale(stats.appearances, 15), raw: stats.appearances },
      { label: 'MOTM', value: scale(stats.motm, 4), raw: stats.motm },
      { label: 'Discipline', value: clampPct(100 - stats.yellow_cards * 20 - stats.red_cards * 50), raw: stats.yellow_cards + stats.red_cards },
      { label: 'Goals', value: scale(stats.goals, 2), raw: stats.goals },
    ]
  }

  return [
    { label: 'Goals', value: scale(stats.goals, 10), raw: stats.goals },
    { label: 'Assists', value: scale(stats.assists, 8), raw: stats.assists },
    { label: 'Apps', value: scale(stats.appearances, 15), raw: stats.appearances },
    { label: 'MOTM', value: scale(stats.motm, 4), raw: stats.motm },
    { label: 'Discipline', value: clampPct(100 - stats.yellow_cards * 20 - stats.red_cards * 50), raw: stats.yellow_cards + stats.red_cards },
  ]
}

export interface StatRow {
  icon: string
  label: string
  value: string | number
  highlight?: boolean
}

export function getDetailedStatRows(stats: PlayerStats): StatRow[] {
  const rows: StatRow[] = [
    { icon: '👟', label: 'Matches played', value: stats.appearances },
    { icon: '⚽', label: 'Goals', value: stats.goals, highlight: stats.goals > 0 },
    { icon: '🅰️', label: 'Assists', value: stats.assists, highlight: stats.assists > 0 },
    { icon: '⭐', label: 'Man of the match', value: stats.motm, highlight: stats.motm > 0 },
  ]

  if (stats.position === 'Goalkeeper') {
    rows.push({ icon: '🧤', label: 'Clean sheets', value: stats.clean_sheets, highlight: stats.clean_sheets > 0 })
  }

  if (stats.yellow_cards > 0) {
    rows.push({ icon: '🟨', label: 'Yellow cards', value: stats.yellow_cards })
  }
  if (stats.red_cards > 0) {
    rows.push({ icon: '🟥', label: 'Red cards', value: stats.red_cards })
  }

  const contributions = stats.goals + stats.assists + stats.motm
  if (stats.appearances > 0) {
    rows.push({
      icon: '📊',
      label: 'Contributions per match',
      value: (contributions / stats.appearances).toFixed(1),
    })
  }

  return rows
}

export function opponentShort(name: string): string {
  const clean = name.replace(/ FC$/, '').trim()
  const words = clean.split(/\s+/)
  if (words.length >= 2) return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase()
  return clean.slice(0, 3).toUpperCase()
}
