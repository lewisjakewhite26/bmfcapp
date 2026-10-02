import { describe, expect, it } from 'vitest'
import { matchSharedLogo, withSharedSponsorLogos, type SharedLogoFile } from './sharedSponsorLogos'
import type { SquadMember } from '../types'

const file = (name: string): SharedLogoFile => ({ name, path: `sponsors/${encodeURIComponent(name)}` })

const files = [
  'Lines Valeting.png',
  'mess.png',
  'david-redfern-building-services_logo.jpg',
  '13-apparel.png',
  'APEX MOUTHGUARDS (1).png',
  'aspire-accounting-tax.png',
  'emilys-beauty.webp',
  'walker tyres ltd.png',
].map(file)

const pick = (sponsor: string) => matchSharedLogo(sponsor, files)?.name ?? null

describe('shared sponsor logo matching', () => {
  it('matches names regardless of case, dashes, Ltd, & and copy numbers', () => {
    expect(pick('Lines Valeting')).toBe('Lines Valeting.png')
    expect(pick('David Redfern Building Services')).toBe('david-redfern-building-services_logo.jpg')
    expect(pick('13 Apparel')).toBe('13-apparel.png')
    expect(pick('Apex Mouthguards')).toBe('APEX MOUTHGUARDS (1).png')
    expect(pick('Aspire Accounting & Tax Ltd')).toBe('aspire-accounting-tax.png')
    expect(pick("Emily's Beauty")).toBe('emilys-beauty.webp')
    expect(pick('Walker Tyres Ltd')).toBe('walker tyres ltd.png')
  })

  it('accepts a shorter or longer version of the name', () => {
    expect(pick('Mess Sedgefield')).toBe('mess.png')
    expect(matchSharedLogo('Lines Valeting', [file('lines-valeting-north-east.jpg')])?.name).toBe('lines-valeting-north-east.jpg')
  })

  it('prefers the closest file when several fit', () => {
    const two = [file('lines-valeting-north-east.png'), file('lines-valeting.png')]
    expect(matchSharedLogo('Lines Valeting', two)?.name).toBe('lines-valeting.png')
  })

  it("doesn't match unrelated sponsors", () => {
    expect(pick('Outrank')).toBeNull()
    expect(pick('Bishops Lodge')).toBeNull()
    expect(pick('JSC Locum')).toBeNull()
  })

  it("fills in players without their own logo and leaves uploaded ones alone", () => {
    const squad = [
      { player_id: 'a', sponsor_name: 'Lines Valeting', sponsor_logo_url: null },
      { player_id: 'b', sponsor_name: 'Lines Valeting', sponsor_logo_url: 'b/logo.png' },
      { player_id: 'c', sponsor_name: null, sponsor_logo_url: null },
    ] as SquadMember[]
    const out = withSharedSponsorLogos(squad, files)
    expect(out[0].sponsor_logo_url).toBe('sponsors/Lines%20Valeting.png')
    expect(out[0].sponsor_logo_shared_file).toBe('Lines Valeting.png')
    expect(out[1].sponsor_logo_url).toBe('b/logo.png')
    expect(out[2].sponsor_logo_url).toBeNull()
  })
})
