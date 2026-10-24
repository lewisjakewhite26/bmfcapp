import { describe, expect, it } from 'vitest'
import type { SquadMember } from '../types'
import { logoBackdrop, reelSponsors } from './sponsorReel'

const player = (sponsor_name: string | null, sponsor_logo_url: string | null = null, sponsor_logo_light_url: string | null = null) =>
  ({ sponsor_name, sponsor_logo_url, sponsor_logo_light_url }) as SquadMember

describe('reelSponsors', () => {
  it('lists each sponsor once, alphabetically, skipping players without one', () => {
    const list = reelSponsors([
      player('Mess Sedgefield', 'a.png'),
      player(null),
      player('  '),
      player('Lines Valeting Ltd'),
      player('lines valeting', 'sponsors/Lines%20Valeting.png', 'sponsors/Lines%20Valeting%20light.png'),
      player('Mess Sedgefield', 'b.png'),
    ])
    expect(list).toEqual([
      { name: 'Lines Valeting Ltd', logo: 'sponsors/Lines%20Valeting.png', logoLight: 'sponsors/Lines%20Valeting%20light.png' },
      { name: 'Mess Sedgefield', logo: 'a.png', logoLight: null },
    ])
  })

  it('keeps sponsors with no logo so nobody is missed', () => {
    expect(reelSponsors([player('Corner Shop')])).toEqual([{ name: 'Corner Shop', logo: null, logoLight: null }])
  })
})

/** 10×10 image: `bg` everywhere, then `art` painted over the middle 6×6 block in rows. */
function image(bg: number[], art: number[][]): Uint8ClampedArray {
  const w = 10
  const data = new Uint8ClampedArray(w * w * 4)
  for (let i = 0; i < w * w; i++) data.set(bg, i * 4)
  let n = 0
  for (let y = 2; y < 8; y++) {
    for (let x = 2; x < 8; x++) data.set(art[n++ % art.length], (y * w + x) * 4)
  }
  return data
}

const CLEAR = [0, 0, 0, 0]
const WHITE = [255, 255, 255, 255]
const BLACK = [10, 10, 10, 255]
const RED = [200, 20, 40, 255]
const NAVY = [13, 27, 75, 255]

describe('logoBackdrop', () => {
  it('puts white artwork made for dark backgrounds straight on the navy', () => {
    expect(logoBackdrop(image(CLEAR, [WHITE]), 10, 10)).toBe('none')
  })

  it('puts logos with their own white background on the white card', () => {
    expect(logoBackdrop(image(WHITE, [RED]), 10, 10)).toBe('white')
  })

  it('keeps coloured and dark clear logos on the white card', () => {
    expect(logoBackdrop(image(CLEAR, [RED]), 10, 10)).toBe('white')
    expect(logoBackdrop(image(CLEAR, [NAVY]), 10, 10)).toBe('white')
  })

  it('puts clear logos with white lettering on the navy', () => {
    expect(logoBackdrop(image(CLEAR, [RED, WHITE]), 10, 10)).toBe('none')
  })

  it('uses the blue card for clear logos mixing white and black', () => {
    expect(logoBackdrop(image(CLEAR, [WHITE, BLACK]), 10, 10)).toBe('blue')
  })
})
