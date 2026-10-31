import { describe, expect, it } from 'vitest'
import { bundledSponsorLogos, isLightVariant, matchSharedLogo, mergeSharedLogos, sponsorChoices, withSharedSponsorLogos, type SharedLogoFile } from './sharedSponsorLogos'
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

  it('picks up a light-design version named "<sponsor> light"', () => {
    expect(isLightVariant('Chris Ford Sliding Wardrobes light.png')).toBe(true)
    expect(isLightVariant('l-brown-installations-light.jpg')).toBe(true)
    expect(isLightVariant('Lines Valeting.png')).toBe(false)
    expect(isLightVariant('Lightfoot Plumbing.png')).toBe(false)

    const folder = [
      file('Chris Ford Sliding Wardrobes.png'),
      file('Chris Ford Sliding Wardrobes light.png'),
      file('Martin Gray FA.png'),
    ]
    const squad = [
      { player_id: 'w', sponsor_name: 'Chris Ford Sliding Wardrobes', sponsor_logo_url: null },
      { player_id: 'm', sponsor_name: 'Martin Gray FA', sponsor_logo_url: null },
    ] as SquadMember[]
    const [will, dougie] = withSharedSponsorLogos(squad, folder)
    expect(will.sponsor_logo_shared_file).toBe('Chris Ford Sliding Wardrobes.png')
    expect(will.sponsor_logo_light_url).toBe('sponsors/Chris%20Ford%20Sliding%20Wardrobes%20light.png')
    expect(dougie.sponsor_logo_shared_file).toBe('Martin Gray FA.png')
    expect(dougie.sponsor_logo_light_url).toBeNull()
  })
})

describe('bundled sponsor logos', () => {
  it("builds full URLs to the app's own files", () => {
    expect(bundledSponsorLogos('https://bmfcapp.co.uk', '/')).toContainEqual({
      name: 'Three Horseshoes.png',
      path: 'https://bmfcapp.co.uk/sponsors/Three%20Horseshoes.png',
    })
  })

  it('adds them after Supabase files, letting Supabase win on a name clash', () => {
    const supabase = [{ name: 'three-horseshoes.jpg', path: 'sponsors/three-horseshoes.jpg' }]
    const bundled = [
      { name: 'Three Horseshoes.png', path: 'https://x/sponsors/Three%20Horseshoes.png' },
      { name: 'Corner Shop.png', path: 'https://x/sponsors/Corner%20Shop.png' },
    ]
    expect(mergeSharedLogos(supabase, bundled)).toEqual([supabase[0], bundled[1]])
  })

  it('lets a sponsor with no logo pick up the bundled file', () => {
    const files = mergeSharedLogos([], bundledSponsorLogos('https://x'))
    expect(matchSharedLogo('Three Horseshoes', files)?.name).toBe('Three Horseshoes.png')
  })
})

describe('home game sponsor choices', () => {
  it('lists each sponsor once, A to Z, with its light logo when there is one', () => {
    const choices = sponsorChoices(['Three Horseshoes.png', 'Sqew.png', 'Sqew light.png', 'Lines Valeting.png'].map(file))
    expect(choices.map((c) => c.name)).toEqual(['Lines Valeting', 'Sqew', 'Three Horseshoes'])
    expect(choices.find((c) => c.name === 'Sqew')).toMatchObject({
      logoPath: 'sponsors/Sqew.png',
      lightLogoPath: 'sponsors/Sqew%20light.png',
    })
    expect(choices.find((c) => c.name === 'Lines Valeting')?.lightLogoPath).toBeNull()
  })

  it('ships the Sqew logo with the app', () => {
    expect(bundledSponsorLogos('https://x').map((f) => f.name)).toContain('Sqew.png')
  })
})
