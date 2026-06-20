import type { LiveLogEntry } from './liveMatchEvents'
import { parseLiveDraftEntries } from './liveMatchDraftStorage'
import type { FixtureWithResult, Lineup, LineupSlotAssignment, SquadMember } from '../types'

export type CleanSheetSource = 'live' | 'lineup' | 'manual'

export interface CleanSheetResolution {
  keeperIds: string[]
  source: CleanSheetSource | null
}

export interface CleanSheetAuditRow {
  fixtureId: string
  opponent: string
  matchDate: string
  goalsAgainst: number
  source: CleanSheetSource | null
  missingGoalkeeperData: boolean
}

export function lineupGoalkeeperId(slots: LineupSlotAssignment[] | null | undefined): string | null {
  return slots?.find((s) => s.position === 'GK')?.player_id ?? null
}

/**
 * Keepers who were in goal during a live-logged match.
 * Credits every keeper who played in goal on a shutout (starter + any GK sub).
 */
export function goalkeepersFromLiveLog(
  entries: LiveLogEntry[],
  lineupGkId: string | null,
  isGoalkeeper: (playerId: string) => boolean,
): string[] {
  const keepers = new Set<string>()
  let current = lineupGkId

  if (current) keepers.add(current)

  const subs = entries
    .filter((e) => e.kind === 'substitution' && e.player_off_id && e.player_on_id)
    .sort((a, b) => a.minute - b.minute)

  for (const sub of subs) {
    const off = sub.player_off_id!
    const on = sub.player_on_id!

    if (current === off) {
      current = on
      keepers.add(on)
      continue
    }

    if (isGoalkeeper(on) && (isGoalkeeper(off) || current === off)) {
      current = on
      keepers.add(on)
    }
  }

  return Array.from(keepers)
}

export function resolveCleanSheetGoalkeepers(input: {
  liveLogEntries?: LiveLogEntry[] | null
  lineupSlots?: LineupSlotAssignment[] | null
  manualGoalkeeperId?: string | null
  squad: Pick<SquadMember, 'player_id' | 'position'>[]
}): CleanSheetResolution {
  const isGoalkeeper = (playerId: string) =>
    input.squad.some((m) => m.player_id === playerId && m.position === 'Goalkeeper')

  const lineupGk = lineupGoalkeeperId(input.lineupSlots)
  const liveEntries = input.liveLogEntries?.filter(Boolean) ?? []

  if (liveEntries.length > 0) {
    const keeperIds = goalkeepersFromLiveLog(liveEntries, lineupGk, isGoalkeeper)
    if (keeperIds.length > 0) {
      return { keeperIds, source: 'live' }
    }
  }

  if (lineupGk) {
    return { keeperIds: [lineupGk], source: 'lineup' }
  }

  if (input.manualGoalkeeperId) {
    return { keeperIds: [input.manualGoalkeeperId], source: 'manual' }
  }

  return { keeperIds: [], source: null }
}

function liveLogFromResult(raw: unknown[] | LiveLogEntry[] | null | undefined): LiveLogEntry[] {
  if (!raw?.length) return []
  return parseLiveDraftEntries(raw)
}

export function auditCleanSheetFixtures(
  squad: SquadMember[],
  fixtures: FixtureWithResult[],
  lineupsByFixtureId: Map<string, Lineup | null>,
): CleanSheetAuditRow[] {
  const rows: CleanSheetAuditRow[] = []

  for (const fixture of fixtures) {
    if (fixture.status !== 'completed' || !fixture.result) continue
    if (fixture.result.goals_against !== 0) continue

    const lineup = lineupsByFixtureId.get(fixture.id) ?? null
    const resolution = resolveCleanSheetGoalkeepers({
      liveLogEntries: liveLogFromResult(fixture.result.live_log_entries),
      lineupSlots: lineup?.slots ?? null,
      manualGoalkeeperId: fixture.result.goalkeeper_player_id ?? null,
      squad,
    })

    rows.push({
      fixtureId: fixture.id,
      opponent: fixture.opponent,
      matchDate: fixture.match_date,
      goalsAgainst: fixture.result.goals_against,
      source: resolution.source,
      missingGoalkeeperData: resolution.keeperIds.length === 0,
    })
  }

  return rows
}

export function applyCleanSheetCredits(
  stats: Map<string, { clean_sheets: number }>,
  squad: SquadMember[],
  fixtures: FixtureWithResult[],
  lineupsByFixtureId: Map<string, Lineup | null>,
): string[] {
  const missing: string[] = []

  for (const fixture of fixtures) {
    if (fixture.status !== 'completed' || !fixture.result) continue
    if (fixture.result.goals_against !== 0) continue

    const lineup = lineupsByFixtureId.get(fixture.id) ?? null
    const resolution = resolveCleanSheetGoalkeepers({
      liveLogEntries: liveLogFromResult(fixture.result.live_log_entries),
      lineupSlots: lineup?.slots ?? null,
      manualGoalkeeperId: fixture.result.goalkeeper_player_id ?? null,
      squad,
    })

    if (resolution.keeperIds.length === 0) {
      missing.push(fixture.id)
      continue
    }

    for (const keeperId of resolution.keeperIds) {
      const player = stats.get(keeperId)
      if (player) player.clean_sheets += 1
    }
  }

  return missing
}
