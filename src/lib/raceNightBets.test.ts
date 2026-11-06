import { describe, expect, it } from 'vitest'
import { normaliseProgramme, type Programme } from './raceNight'
import { EMPTY_MONEY, checkTicket, money, nightSummary, parseAmount, settleRace, stakesByRunner, type Bet } from './raceNightBets'

function programme(winner: number | null = 3): Programme {
  return normaliseProgramme({
    title: 'Race Night',
    races: [
      {
        id: 'r1',
        sponsor: 'DGS',
        sponsorPaid: true,
        runners: [1, 2, 3, 4].map((n) => ({
          id: `r1-${n}`,
          number: n,
          horse: `Horse ${n}`,
          owner: `Owner ${n}`,
          jockey: `Jockey ${n}`,
          horsePaid: true,
          ownerPaid: n !== 4,
          jockeyPaid: true,
          position: n === winner ? 1 : null,
        })),
      },
      { id: 'r2', sponsor: '', runners: [{ id: 'r2-1', number: 1, horse: 'Solo', owner: '', jockey: '', position: null }] },
    ],
  })
}

let t = 0
const bet = (runner: number, amount: number, extra: Partial<Bet> = {}): Bet => ({
  ticket: ++t,
  raceId: 'r1',
  runner,
  amount,
  voided: false,
  paidOut: false,
  createdAt: '',
  ...extra,
})

describe('settling a race', () => {
  it('shares half the pot between winning bets by stake', () => {
    const bets = [bet(3, 2), bet(3, 6), bet(1, 10), bet(2, 2)] // pot £20, winners' share £10
    const s = settleRace(programme().races[0], bets, true)
    expect(s.pot).toBe(20)
    expect(s.winnersShare).toBe(10)
    expect(s.winners).toEqual([3])
    expect(s.payouts.get(bets[0].ticket)).toBe(2.5)
    expect(s.payouts.get(bets[1].ticket)).toBe(7.5)
    expect(s.payouts.has(bets[2].ticket)).toBe(false)
    expect(s.paidToPunters).toBe(10)
    expect(s.clubKeeps).toBe(10)
  })

  it('rounds payouts down to the penny and the club keeps the odd pennies', () => {
    const bets = [bet(3, 1), bet(3, 1), bet(3, 1), bet(1, 7)] // pot £10, share £5 over 3 tickets
    const s = settleRace(programme().races[0], bets, true)
    expect([...s.payouts.values()]).toEqual([1.66, 1.66, 1.66])
    expect(s.paidToPunters).toBe(4.98)
    expect(s.clubKeeps).toBe(5.02)
  })

  it('lets the club keep it all when nobody backed the winner', () => {
    const s = settleRace(programme().races[0], [bet(1, 5), bet(2, 5)], true)
    expect(s.payouts.size).toBe(0)
    expect(s.clubKeeps).toBe(10)
  })

  it('never works out a winner before the race has run', () => {
    const s = settleRace(programme().races[0], [bet(3, 5)], false)
    expect(s.winners).toEqual([])
    expect(s.payouts.size).toBe(0)
    expect(s.pot).toBe(5)
  })

  it('leaves voided bets out of the pot', () => {
    const s = settleRace(programme().races[0], [bet(3, 5), bet(1, 5, { voided: true })], true)
    expect(s.pot).toBe(5)
    expect(s.payouts.get(t - 1)).toBe(2.5)
  })

  it('tracks what is still to hand over', () => {
    const bets = [bet(3, 4, { paidOut: true }), bet(3, 4), bet(1, 8)]
    expect(settleRace(programme().races[0], bets, true).outstanding).toBe(4)
  })
})

describe('checking a ticket at the desk', () => {
  const runs = new Set(['r1'])
  it('says what a winning ticket gets', () => {
    const bets = [bet(3, 2), bet(1, 2)]
    expect(checkTicket(bets[0].ticket, programme(), bets, runs)).toMatchObject({ kind: 'won', payout: 2, raceNumber: 1 })
    expect(checkTicket(bets[1].ticket, programme(), bets, runs)).toMatchObject({ kind: 'lost' })
  })

  it("won't say before the race has run", () => {
    const bets = [bet(3, 2)]
    expect(checkTicket(bets[0].ticket, programme(), bets, new Set())).toMatchObject({ kind: 'not-run' })
  })

  it('copes with unknown and voided tickets, and a run race with no result yet', () => {
    const bets = [bet(3, 2, { voided: true })]
    expect(checkTicket(99999, programme(), bets, runs)).toEqual({ kind: 'unknown' })
    expect(checkTicket(bets[0].ticket, programme(), bets, runs)).toMatchObject({ kind: 'voided' })
    const b2 = [bet(3, 2)]
    expect(checkTicket(b2[0].ticket, programme(null), b2, runs)).toMatchObject({ kind: 'no-result' })
  })
})

describe('the night', () => {
  it('adds up money in and out', () => {
    const bets = [bet(3, 10), bet(1, 10), bet(1, 5, { raceId: 'r2' })]
    const m = { ...EMPTY_MONEY, horseFee: 1, ownerFee: 5, jockeyFee: 2, sponsorFee: 20, ownerPrize: 10, jockeyPrize: 5 }
    const s = nightSummary(programme(), bets, new Set(['r1']), m)
    expect(s.betsTaken).toBe(25)
    // Sponsor £20; 4 horses £4; 3 paid owners £15; 4 jockeys £8 (race 2 runner unpaid)
    expect(s.entries).toBe(47)
    expect(s.toPunters).toBe(10)
    expect(s.prizes).toBe(15)
    expect(s.pending).toBe(5)
    expect(s.outstanding).toBe(10)
    expect(s.clubSoFar).toBe(25 + 47 - 10 - 15)
  })

  it('totals stakes per horse', () => {
    const bets = [bet(3, 2), bet(3, 3), bet(1, 1, { voided: true })]
    expect(stakesByRunner(bets, 'r1').get(3)).toEqual({ total: 5, count: 2 })
    expect(stakesByRunner(bets, 'r1').has(1)).toBe(false)
  })
})

describe('amounts', () => {
  it('reads what sellers type', () => {
    expect(parseAmount('2')).toBe(2)
    expect(parseAmount('£2.50')).toBe(2.5)
    expect(parseAmount('0')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('5000')).toBeNull()
  })

  it('shows pounds neatly', () => {
    expect(money(12)).toBe('£12')
    expect(money(12.5)).toBe('£12.50')
    expect(money(-3)).toBe('−£3')
  })
})
