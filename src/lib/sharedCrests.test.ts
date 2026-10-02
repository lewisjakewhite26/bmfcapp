import { describe, expect, it } from 'vitest'
import { badgeForOpponent, type OpponentBadge } from './graphicsApi'

// The club's real crest folder and fixture list (2026/27).
const crests = [
  'Birtley The Hanlon FC.jpg', 'Durham City Drunken Duck FC.jpg', 'Durham Rangers FC.jpg', 'Ferryhill The Ivorson FC.jpg',
  'Kelloe FC.jpg', 'Newton Aycliffe Iron Horse FC.jpg', 'Sacriston Colliery Cricket Club FC.jpg', "Sedgefield St Edmund's FC.png",
  'Tow Law Newmarket FC.jpg', 'Waldridge FC.jpg', 'Bearpark Community FC.jpg', 'Bede Lodge FC.jpg',
  'Bishop Auckland Green Tree FC.jpg', 'Brandon Sports Club.jpg', 'Cherry Tree FC.jpg', 'Chilton Club FC.jpg',
  'Crook Town Miners FC.jpg', 'Dubmire FC.png', 'Ferryhill Dynamos.jpg', 'Ferryhill Miners United.jpg', 'Half Moon.jpg',
  'Houghton Glendale FC.jpg', 'Houghton Town FC.jpg', 'Langley Park FC.jpg', 'Middlestone Moor FC.jpg',
  'New Brancepeth WMC FC.png', 'Newhouse Club and Institute FC.jpg', 'Newton Aycliffe Juniors FC.png',
  'Newton Aycliffe Sports Club FC.jpg', 'Newton Aycliffe WMC FC.jpg', 'OSC The Ranch.jpg', 'Ouston United FC.png',
  'Pelton Buffs FC.png', 'Quebec Park Rangers.jpg', 'Royal George Tavern.jpg', 'Sherburn Village FC.jpg',
  'The Footballers Endeavour FC.png', 'The Miners Arms FC.jpg', 'The Sticky Wicket RAR FC.jpg', 'The Voltigeur FC.jpg',
  'West Rainton FC.jpg', 'Willington Club FC.jpg', 'Witton Gilbert WMC.jpg', 'Witton Park Rose and Crown.jpg',
].map((name) => ({ name, path: `crests/${encodeURIComponent(name)}` }))

const crestFor = (opponent: string, badges: OpponentBadge[] = []) =>
  badgeForOpponent(badges, opponent, crests)?.shared_file ?? null

describe('crests folder matching', () => {
  it('matches every fixture opponent that has a crest, despite spacing, case and apostrophes', () => {
    expect(crestFor('Birtley The Hanlon FC')).toBe('Birtley The Hanlon FC.jpg')
    expect(crestFor('Durham  Rangers Fc')).toBe('Durham Rangers FC.jpg')
    expect(crestFor('Durham City Drunken Duck Fc')).toBe('Durham City Drunken Duck FC.jpg')
    expect(crestFor('Ferryhill The Ivorson FC')).toBe('Ferryhill The Ivorson FC.jpg')
    expect(crestFor('Kelloe FC')).toBe('Kelloe FC.jpg')
    expect(crestFor('Newton Aycliffe Iron horse FC')).toBe('Newton Aycliffe Iron Horse FC.jpg')
    expect(crestFor('Sacriston Colliery Cricket Club Fc')).toBe('Sacriston Colliery Cricket Club FC.jpg')
    expect(crestFor("Sedgefield St Edmund's FC")).toBe("Sedgefield St Edmund's FC.png")
    expect(crestFor('Tow Law Newmarket FC')).toBe('Tow Law Newmarket FC.jpg')
    expect(crestFor('Waldridge Fc')).toBe('Waldridge FC.jpg')
  })

  it('finds clubs written differently in a future fixture', () => {
    expect(crestFor('Dubmire')).toBe('Dubmire FC.png')
    expect(crestFor('Houghton Town')).toBe('Houghton Town FC.jpg')
    expect(crestFor('Pelton Buffs AFC')).toBe('Pelton Buffs FC.png')
  })

  it("leaves clubs without a crest alone instead of guessing", () => {
    expect(crestFor('Duke of Wellington FC')).toBeNull()
    expect(crestFor('Hartlepool Stag and Monkey FC')).toBeNull()
    expect(crestFor('Kirk Merrington FC')).toBeNull()
    expect(crestFor("Sedgefield O40's FC")).toBeNull()
    expect(crestFor('Wingate Constitutional FC')).toBeNull()
  })

  it('keeps similar clubs apart', () => {
    expect(crestFor('Newton Aycliffe WMC FC')).toBe('Newton Aycliffe WMC FC.jpg')
    expect(crestFor('Newton Aycliffe Juniors FC')).toBe('Newton Aycliffe Juniors FC.png')
    expect(crestFor('Houghton Glendale FC')).toBe('Houghton Glendale FC.jpg')
    expect(crestFor('Ferryhill Dynamos')).toBe('Ferryhill Dynamos.jpg')
  })

  it('prefers a badge uploaded in the app', () => {
    const uploaded: OpponentBadge = {
      id: 'b1',
      opponent_key: 'kelloe fc',
      opponent_name: 'Kelloe FC',
      badge_path: 'badges/kelloe.png',
      updated_at: '',
    }
    const badge = badgeForOpponent([uploaded], 'Kelloe FC', crests)
    expect(badge?.id).toBe('b1')
    expect(badge?.shared_file).toBeUndefined()
  })
})
