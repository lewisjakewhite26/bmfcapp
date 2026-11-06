import { isRunnerFilled, type Programme, type Race } from './raceNight'

/**
 * Race night money.
 *
 * Every bet goes into its race's pot. Winning bets share WINNERS_SHARE of
 * the pot in proportion to their stakes; the club keeps the rest (and all of
 * it if nobody backed the winner). Payouts are only worked out for races that
 * have been run, so nothing here gives a winner away early.
 */

export const WINNERS_SHARE = 0.5

export interface Bet {
  ticket: number
  raceId: string
  runner: number
  amount: number
  voided: boolean
  paidOut: boolean
  createdAt: string
}

/** Entry fees coming in, and prizes going out to the winning owner and jockey. All in £. */
export interface MoneySettings {
  horseFee: number
  ownerFee: number
  jockeyFee: number
  sponsorFee: number
  ownerPrize: number
  jockeyPrize: number
}

export const EMPTY_MONEY: MoneySettings = {
  horseFee: 0,
  ownerFee: 0,
  jockeyFee: 0,
  sponsorFee: 0,
  ownerPrize: 0,
  jockeyPrize: 0,
}

export function normaliseMoney(raw: unknown): MoneySettings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const num = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
  }
  return {
    horseFee: num(o.horseFee),
    ownerFee: num(o.ownerFee),
    jockeyFee: num(o.jockeyFee),
    sponsorFee: num(o.sponsorFee),
    ownerPrize: num(o.ownerPrize),
    jockeyPrize: num(o.jockeyPrize),
  }
}

/** Pence, to keep sums exact. */
const p = (pounds: number) => Math.round(pounds * 100)
const pounds = (pence: number) => pence / 100

/** "£12.50", or "£12" for whole pounds. */
export function money(amount: number): string {
  const v = Math.round(amount * 100) / 100
  const sign = v < 0 ? '−' : ''
  const abs = Math.abs(v)
  return `${sign}£${Number.isInteger(abs) ? abs.toString() : abs.toFixed(2)}`
}

/** Typed amounts: "2", "£2.50", "2.5" → pounds; null if not a sensible bet. */
export function parseAmount(text: string): number | null {
  const n = Number(text.replace(/[£,\s]/g, ''))
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return null
  return Math.round(n * 100) / 100
}

export function liveBets(bets: Bet[], raceId?: string): Bet[] {
  return bets.filter((b) => !b.voided && (raceId === undefined || b.raceId === raceId))
}

/** Total staked on each runner in a race. */
export function stakesByRunner(bets: Bet[], raceId: string): Map<number, { total: number; count: number }> {
  const out = new Map<number, { total: number; count: number }>()
  for (const b of liveBets(bets, raceId)) {
    const cur = out.get(b.runner) ?? { total: 0, count: 0 }
    out.set(b.runner, { total: pounds(p(cur.total) + p(b.amount)), count: cur.count + 1 })
  }
  return out
}

export interface RaceSettlement {
  raceId: string
  pot: number
  betCount: number
  /** What the winning bets share (half the pot). */
  winnersShare: number
  run: boolean
  /** Known only once the race has run and its winner is entered. */
  winners: number[]
  winningStakes: number
  /** What each £1 staked on the winner gets back (each £1 printed ticket). */
  perPound: number
  /** Ticket → amount to hand over. */
  payouts: Map<number, number>
  paidToPunters: number
  /** Of paidToPunters, how much is still to hand over. */
  outstanding: number
  /** The club's part of the pot (everything not paid to punters). */
  clubKeeps: number
}

export function settleRace(race: Race, bets: Bet[], run: boolean): RaceSettlement {
  const live = liveBets(bets, race.id)
  const potP = live.reduce((s, b) => s + p(b.amount), 0)
  const shareP = Math.floor(potP * WINNERS_SHARE)
  const winners = run ? race.runners.filter((r) => r.position === 1).map((r) => r.number) : []
  const winning = live.filter((b) => winners.includes(b.runner))
  const winStakeP = winning.reduce((s, b) => s + p(b.amount), 0)

  // Pay per £1 staked, rounded down to the penny; any odd pennies stay with the club.
  const perPoundP = winStakeP > 0 ? Math.floor((shareP * 100) / winStakeP) : 0
  const payouts = new Map<number, number>()
  let paidP = 0
  let outstandingP = 0
  if (winStakeP > 0) {
    for (const b of winning) {
      const amt = Math.round((perPoundP * p(b.amount)) / 100)
      payouts.set(b.ticket, pounds(amt))
      paidP += amt
      if (!b.paidOut) outstandingP += amt
    }
  }

  return {
    raceId: race.id,
    pot: pounds(potP),
    betCount: live.length,
    winnersShare: pounds(shareP),
    run,
    winners,
    winningStakes: pounds(winStakeP),
    perPound: pounds(perPoundP),
    payouts,
    paidToPunters: pounds(paidP),
    outstanding: pounds(outstandingP),
    clubKeeps: run && winners.length ? pounds(potP - paidP) : 0,
  }
}

/** What one ticket is worth, for paying out at the desk. */
export type TicketCheck =
  | { kind: 'unknown' }
  | { kind: 'voided'; bet: Bet }
  | { kind: 'not-run'; bet: Bet; raceNumber: number }
  | { kind: 'no-result'; bet: Bet; raceNumber: number }
  | { kind: 'lost'; bet: Bet; raceNumber: number }
  | { kind: 'won'; bet: Bet; raceNumber: number; payout: number }

export function checkTicket(ticket: number, programme: Programme, bets: Bet[], runs: Set<string>): TicketCheck {
  const bet = bets.find((b) => b.ticket === ticket)
  if (!bet) return { kind: 'unknown' }
  if (bet.voided) return { kind: 'voided', bet }
  const index = programme.races.findIndex((r) => r.id === bet.raceId)
  const race = programme.races[index]
  if (!race) return { kind: 'unknown' }
  const raceNumber = index + 1
  if (!runs.has(race.id)) return { kind: 'not-run', bet, raceNumber }
  const s = settleRace(race, bets, true)
  if (!s.winners.length) return { kind: 'no-result', bet, raceNumber }
  const payout = s.payouts.get(ticket)
  return payout !== undefined ? { kind: 'won', bet, raceNumber, payout } : { kind: 'lost', bet, raceNumber }
}

export interface NightSummary {
  races: RaceSettlement[]
  /** All bets taken, every race. */
  betsTaken: number
  /** Entry fees (horses, owners, jockeys) and race sponsors marked as paid. */
  entries: number
  /** To winning punters, in races that have run. */
  toPunters: number
  /** To winning owners and jockeys, in races that have run. */
  prizes: number
  /** Bets on races still to run: half of this (at most) will go back out. */
  pending: number
  /** Money in so far, less what's been or will be paid out for run races. Pending bets count in full. */
  clubSoFar: number
  /** Still to hand over to punters for races already run. */
  outstanding: number
}

export function nightSummary(programme: Programme, bets: Bet[], runs: Set<string>, m: MoneySettings): NightSummary {
  const races = programme.races.map((r) => settleRace(r, bets, runs.has(r.id)))
  let entriesP = 0
  let prizesP = 0
  programme.races.forEach((race, i) => {
    if (race.sponsor.trim() && race.sponsorPaid) entriesP += p(m.sponsorFee)
    for (const r of race.runners) {
      if (!isRunnerFilled(r)) continue
      if (r.horse.trim() && r.horsePaid) entriesP += p(m.horseFee)
      if (r.owner.trim() && r.ownerPaid) entriesP += p(m.ownerFee)
      if (r.jockey.trim() && r.jockeyPaid) entriesP += p(m.jockeyFee)
    }
    const s = races[i]
    for (const r of race.runners) {
      if (!s.winners.includes(r.number)) continue
      if (r.owner.trim()) prizesP += p(m.ownerPrize)
      if (r.jockey.trim()) prizesP += p(m.jockeyPrize)
    }
  })
  const takenP = races.reduce((s, r) => s + p(r.pot), 0)
  const puntersP = races.reduce((s, r) => s + p(r.paidToPunters), 0)
  const pendingP = races.filter((r) => !r.run || !r.winners.length).reduce((s, r) => s + p(r.pot), 0)
  return {
    races,
    betsTaken: pounds(takenP),
    entries: pounds(entriesP),
    toPunters: pounds(puntersP),
    prizes: pounds(prizesP),
    pending: pounds(pendingP),
    clubSoFar: pounds(takenP + entriesP - puntersP - prizesP),
    outstanding: pounds(races.reduce((s, r) => s + p(r.outstanding), 0)),
  }
}
