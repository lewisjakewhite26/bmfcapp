import { describe, expect, it } from 'vitest'
import { liveEntriesToMatchEvents, type LiveLogEntry } from './liveMatchEvents'

describe('liveEntriesToMatchEvents', () => {
  it('converts goals with assists to match events', () => {
    const entries: LiveLogEntry[] = [
      {
        id: '1',
        kind: 'goal',
        minute: 55,
        scorer_id: 'p1',
        assist_id: 'p2',
      },
    ]
    const events = liveEntriesToMatchEvents('f1', entries)
    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ event_type: 'goal', player_id: 'p1', minute: 55 })
    expect(events[1]).toMatchObject({ event_type: 'assist', player_id: 'p2', minute: 55 })
  })

  it('converts substitutions with related player', () => {
    const entries: LiveLogEntry[] = [
      {
        id: '1',
        kind: 'substitution',
        minute: 70,
        player_off_id: 'p1',
        player_on_id: 'p2',
      },
    ]
    const events = liveEntriesToMatchEvents('f1', entries)
    expect(events[0]).toMatchObject({
      event_type: 'substitution',
      player_id: 'p1',
      related_player_id: 'p2',
    })
  })
})
