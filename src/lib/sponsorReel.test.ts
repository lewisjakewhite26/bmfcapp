import { describe, expect, it } from 'vitest'
import type { SquadMember } from '../types'
import { reelSponsors } from './sponsorReel'

const player = (sponsor_name: string | null, sponsor_logo_url: string | null = null) =>
  ({ sponsor_name, sponsor_logo_url }) as SquadMember

describe('reelSponsors', () => {
  it('lists each sponsor once, alphabetically, skipping players without one', () => {
    const list = reelSponsors([
      player('Mess Sedgefield', 'a.png'),
      player(null),
      player('  '),
      player('Lines Valeting Ltd'),
      player('lines valeting', 'sponsors/Lines%20Valeting.png'),
      player('Mess Sedgefield', 'b.png'),
    ])
    expect(list).toEqual([
      { name: 'Lines Valeting Ltd', logo: 'sponsors/Lines%20Valeting.png' },
      { name: 'Mess Sedgefield', logo: 'a.png' },
    ])
  })

  it('keeps sponsors with no logo so nobody is missed', () => {
    expect(reelSponsors([player('Corner Shop')])).toEqual([{ name: 'Corner Shop', logo: null }])
  })
})
