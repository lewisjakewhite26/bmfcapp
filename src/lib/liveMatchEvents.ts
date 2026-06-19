import type { MatchEventType } from '../types'

export type LiveLogKind = 'goal' | 'card' | 'substitution'

export interface LiveLogEntry {
  id: string
  kind: LiveLogKind
  minute: number
  scorer_id?: string
  assist_id?: string | null
  player_id?: string
  card_type?: 'yellow_card' | 'red_card'
  player_off_id?: string
  player_on_id?: string
}

export interface LiveMatchDraft {
  fixture_id: string
  entries: LiveLogEntry[]
  goals_for: number
  goals_against: number
  updated_at?: string
}

export interface MatchEventInput {
  fixture_id: string
  player_id: string
  event_type: MatchEventType
  minute: number | null
  related_player_id?: string | null
}

export function liveEntriesToMatchEvents(fixtureId: string, entries: LiveLogEntry[]): MatchEventInput[] {
  const out: MatchEventInput[] = []

  for (const entry of entries) {
    if (entry.kind === 'goal' && entry.scorer_id) {
      out.push({
        fixture_id: fixtureId,
        player_id: entry.scorer_id,
        event_type: 'goal',
        minute: entry.minute,
      })
      if (entry.assist_id) {
        out.push({
          fixture_id: fixtureId,
          player_id: entry.assist_id,
          event_type: 'assist',
          minute: entry.minute,
        })
      }
    } else if (entry.kind === 'card' && entry.player_id && entry.card_type) {
      out.push({
        fixture_id: fixtureId,
        player_id: entry.player_id,
        event_type: entry.card_type,
        minute: entry.minute,
      })
    } else if (entry.kind === 'substitution' && entry.player_off_id && entry.player_on_id) {
      out.push({
        fixture_id: fixtureId,
        player_id: entry.player_off_id,
        event_type: 'substitution',
        minute: entry.minute,
        related_player_id: entry.player_on_id,
      })
    }
  }

  return out
}

export function describeLiveEntry(
  entry: LiveLogEntry,
  nameFor: (playerId: string) => string,
): string {
  switch (entry.kind) {
    case 'goal': {
      const scorer = entry.scorer_id ? nameFor(entry.scorer_id) : 'Unknown'
      const assist = entry.assist_id ? ` (assist: ${nameFor(entry.assist_id)})` : ''
      return `⚽ ${scorer}${assist} · ${entry.minute}'`
    }
    case 'card': {
      const icon = entry.card_type === 'red_card' ? '🟥' : '🟨'
      const player = entry.player_id ? nameFor(entry.player_id) : 'Unknown'
      return `${icon} ${player} · ${entry.minute}'`
    }
    case 'substitution':
      return `🔄 ${nameFor(entry.player_off_id!)} → ${nameFor(entry.player_on_id!)} · ${entry.minute}'`
  }
}
