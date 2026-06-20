import { applyCleanSheetCredits } from './cleanSheet'
import type { FixtureWithResult, Lineup, PlayerStats, SquadMember } from '../types'

export interface AggregatePlayerStatsOptions {
  lineupsByFixtureId?: Map<string, Lineup | null>
}

export interface AggregatePlayerStatsResult {
  stats: PlayerStats[]
  cleanSheetMissingFixtureIds: string[]
}

/** Aggregate squad stats from completed fixtures and match events (live + mock). */
export function aggregatePlayerStats(
  squad: SquadMember[],
  fixtures: FixtureWithResult[],
  options?: AggregatePlayerStatsOptions,
): AggregatePlayerStatsResult {
  const stats = new Map<string, PlayerStats>()
  const lineupsByFixtureId = options?.lineupsByFixtureId ?? new Map<string, Lineup | null>()

  for (const member of squad) {
    stats.set(member.player_id, {
      player_id: member.player_id,
      display_name: member.display_name,
      squad_number: member.squad_number,
      position: member.position,
      appearances: 0,
      goals: 0,
      assists: 0,
      motm: 0,
      yellow_cards: 0,
      red_cards: 0,
      clean_sheets: 0,
    })
  }

  const completedFixtures = fixtures.filter((f) => f.status === 'completed' && f.result)
  const appearanceFixtures = new Map<string, Set<string>>()

  for (const fixture of completedFixtures) {
    for (const event of fixture.events ?? []) {
      const player = stats.get(event.player_id)
      if (!player) continue

      if (!appearanceFixtures.has(event.player_id)) {
        appearanceFixtures.set(event.player_id, new Set())
      }
      appearanceFixtures.get(event.player_id)!.add(fixture.id)

      if (event.event_type === 'goal') player.goals++
      if (event.event_type === 'assist') player.assists++
      if (event.event_type === 'motm') player.motm++
      if (event.event_type === 'yellow_card') player.yellow_cards++
      if (event.event_type === 'red_card') player.red_cards++
    }
  }

  for (const [playerId, fixtureIds] of appearanceFixtures) {
    const player = stats.get(playerId)
    if (player) player.appearances = fixtureIds.size
  }

  const cleanSheetMissingFixtureIds = applyCleanSheetCredits(
    stats,
    squad,
    fixtures,
    lineupsByFixtureId,
  )

  return {
    stats: Array.from(stats.values()).sort(
      (a, b) => b.goals - a.goals || a.display_name.localeCompare(b.display_name),
    ),
    cleanSheetMissingFixtureIds,
  }
}
