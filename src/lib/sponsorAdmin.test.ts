import { describe, expect, it } from 'vitest'
import type { SquadMember } from '../types'
import { parseSponsorList } from './sponsorAdmin'

const member = (id: string, name: string): SquadMember => ({
  id,
  player_id: id,
  display_name: name,
  squad_number: null,
  position: null,
  joined_date: null,
  active: true,
})

const squad = [member('1', 'Jack Marley'), member('2', 'Sam Marshall'), member('3', "Logan O'Hara"), member('4', 'Jack Kell')]

describe('parseSponsorList', () => {
  it('reads the common separators and matches names loosely', () => {
    const rows = parseSponsorList(
      [
        'Jack Marley – L Brown Installations',
        'sam marshall - David Redfern Building Services',
        'Logan Ohara\tAVAILABLE',
        'Jack Kell: Aspire Accounting & Tax Ltd',
      ].join('\n'),
      squad,
    )
    expect(rows.map((r) => [r.player?.player_id, r.sponsorName])).toEqual([
      ['1', 'L Brown Installations'],
      ['2', 'David Redfern Building Services'],
      ['3', null],
      ['4', 'Aspire Accounting & Tax Ltd'],
    ])
  })

  it('flags names that are not in the squad and skips blank lines', () => {
    const rows = parseSponsorList('\nFreddie Lower – AVAILABLE\n\n', squad)
    expect(rows).toHaveLength(1)
    expect(rows[0].player).toBeNull()
    expect(rows[0].playerName).toBe('Freddie Lower')
  })

  it('keeps hyphenated names and sponsor commas intact', () => {
    const rows = parseSponsorList('Jack Marley – Smith, Jones & Co\nMary-Jane Smith – X', squad)
    expect(rows[0].sponsorName).toBe('Smith, Jones & Co')
    expect(rows[1].playerName).toBe('Mary-Jane Smith')
  })
})
