import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import {
  RACE_ALREADY_RUN,
  addRaceNightBet,
  fetchRaceNight,
  fetchRaceNightBook,
  payRaceNightBet,
  saveRaceNightMoney,
  setRaceNightRun,
  voidRaceNightBet,
  type RaceNightBook,
} from '../lib/clubApi'
import { pageContainerClass } from '../lib/layout'
import { isRunnerFilled, type Programme, type Race } from '../lib/raceNight'
import {
  WINNERS_SHARE,
  checkTicket,
  money,
  nightSummary,
  parseAmount,
  stakesByRunner,
  type Bet,
  type MoneySettings,
} from '../lib/raceNightBets'

/**
 * Betting desk, on phones. Pick a race, tap the horse, type the stake, take
 * it: the bet gets a ticket number to write on the slip. Several phones can
 * take bets at once; everything syncs every few seconds.
 *
 * Money shows the night's takings and what's owed. Winners and payouts only
 * appear for races that have been run (the TV show marks them when the video
 * ends), so nothing here gives a winner away early.
 */

const REFRESH_MS = 4000
const QUICK = [1, 2, 5, 10]

type Tab = 'bets' | 'money'

function useRaceNightData() {
  const [programme, setProgramme] = useState<Programme | null>(null)
  const [book, setBook] = useState<RaceNightBook | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [doc, b] = await Promise.all([fetchRaceNight(), fetchRaceNightBook()])
      setProgramme(doc.programme)
      setBook(b)
      setError(null)
    } catch (e) {
      setError(e instanceof Error && e.message === 'Unauthorized' ? 'Admins and committee only.' : "Couldn't load. Check the signal and try again.")
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  return { programme, book, error, refresh, setBook }
}

function runnerLabel(race: Race, n: number): string {
  const r = race.runners.find((x) => x.number === n)
  return r?.horse.trim() || r?.owner.trim() || `Runner ${n}`
}

/* ------------------------------------------------------------------ */

function TakeBets({
  programme,
  book,
  raceIndex,
  setRaceIndex,
  refresh,
}: {
  programme: Programme
  book: RaceNightBook
  raceIndex: number
  setRaceIndex: (i: number) => void
  refresh: () => Promise<void>
}) {
  const race = programme.races[raceIndex]
  const runs = new Set(book.runs)
  const run = race ? runs.has(race.id) : false
  const [runner, setRunner] = useState<number | null>(null)
  const [amountText, setAmountText] = useState('')
  const [busy, setBusy] = useState(false)
  const [taken, setTaken] = useState<Bet | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [confirmVoid, setConfirmVoid] = useState<number | null>(null)

  useEffect(() => {
    setRunner(null)
    setAmountText('')
    setTaken(null)
    setProblem(null)
  }, [raceIndex])

  if (!race) return null

  const stakes = stakesByRunner(book.bets, race.id)
  const pot = [...stakes.values()].reduce((s, x) => s + x.total, 0)
  const amount = parseAmount(amountText)
  const runners = race.runners.filter(isRunnerFilled)
  const recent = book.bets.filter((b) => b.raceId === race.id).slice(-12).reverse()

  const take = async () => {
    if (runner === null || amount === null || busy) return
    setBusy(true)
    setProblem(null)
    try {
      const ticket = await addRaceNightBet(race.id, runner, amount)
      setTaken({ ticket, raceId: race.id, runner, amount, voided: false, paidOut: false, createdAt: '' })
      setRunner(null)
      setAmountText('')
      void refresh()
    } catch (e) {
      setProblem(
        e instanceof Error && e.message === RACE_ALREADY_RUN
          ? 'This race has already been run. No more bets.'
          : "That bet didn't go through. Check the signal and try again.",
      )
    } finally {
      setBusy(false)
    }
  }

  const undo = async (ticket: number, voided: boolean) => {
    setConfirmVoid(null)
    try {
      await voidRaceNightBet(ticket, voided)
      if (taken?.ticket === ticket) setTaken(null)
      void refresh()
    } catch {
      setProblem("Couldn't change that bet. Try again.")
    }
  }

  return (
    <div className="space-y-3">
      <RaceChips programme={programme} book={book} raceIndex={raceIndex} setRaceIndex={setRaceIndex} />

      <div className="glass-card p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl text-brand-navy">Race {raceIndex + 1}</p>
          {race.sponsor.trim() ? <p className="text-xs text-gray-500 truncate">{race.sponsor}</p> : null}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500">Pot</p>
          <p className="font-display text-2xl text-brand-navy">{money(pot)}</p>
          <p className="text-[11px] text-gray-500">{money(Math.floor(pot * WINNERS_SHARE * 100) / 100)} to winners</p>
        </div>
      </div>

      {run ? (
        <div className="glass-card p-4 border border-amber-300 bg-amber-50 text-amber-900 text-sm font-semibold">
          This race has been run. Betting is closed.
        </div>
      ) : null}

      {taken ? (
        <div className="rounded-card p-4 text-white text-center shadow-lg" style={{ background: '#0D1B4B' }}>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-gold font-bold">Write on the slip</p>
          <p className="font-display text-5xl mt-1">Ticket {taken.ticket}</p>
          <p className="text-lg mt-1">
            Race {raceIndex + 1} · #{taken.runner} {runnerLabel(race, taken.runner)} · <b>{money(taken.amount)}</b>
          </p>
          <button type="button" onClick={() => setTaken(null)} className="mt-3 text-sm underline text-white/80 min-h-[44px]">
            Next bet
          </button>
        </div>
      ) : null}

      {!run ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {runners.map((r) => {
              const s = stakes.get(r.number)
              const on = runner === r.number
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRunner(on ? null : r.number)
                    setTaken(null)
                  }}
                  className={`rounded-card p-3 text-left min-h-[76px] border-2 transition-colors ${
                    on ? 'bg-brand-blue border-brand-blue text-white' : 'bg-white/90 border-transparent text-brand-navy'
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <span
                      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-display text-lg ${
                        on ? 'bg-white text-brand-blue' : 'bg-brand-blue text-white'
                      }`}
                    >
                      {r.number}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight line-clamp-2">{r.horse.trim() || r.owner.trim() || `Runner ${r.number}`}</span>
                      <span className={`block text-xs mt-0.5 ${on ? 'text-white/80' : 'text-gray-500'}`}>
                        {s ? `${money(s.total)} · ${s.count} bet${s.count === 1 ? '' : 's'}` : 'No bets yet'}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-display text-brand-navy">£</span>
              <input
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="Stake"
                className="input-field text-2xl flex-1"
                aria-label="Stake in pounds"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmountText(String((amount ?? 0) + q))}
                  className="rounded-pill bg-brand-blue/10 text-brand-blue font-bold min-h-[44px]"
                >
                  +£{q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={runner === null || amount === null || busy}
                onClick={() => void take()}
                className="btn-primary flex-1 min-h-[56px] text-lg disabled:opacity-40"
              >
                {busy
                  ? 'Taking…'
                  : runner === null
                    ? 'Tap a horse'
                    : amount === null
                      ? 'Enter the stake'
                      : `Take ${money(amount)} on #${runner}`}
              </button>
              {amountText ? (
                <button type="button" onClick={() => setAmountText('')} className="px-4 text-sm font-semibold text-gray-500 min-h-[56px]">
                  Clear
                </button>
              ) : null}
            </div>
            {problem ? <p className="text-sm text-red-700 font-semibold">{problem}</p> : null}
          </div>
        </>
      ) : null}

      {recent.length ? (
        <div className="glass-card p-4">
          <p className="text-sm font-semibold text-brand-navy mb-2">Latest bets on this race</p>
          <ul className="divide-y divide-gray-100">
            {recent.map((b) => (
              <li key={b.ticket} className={`flex items-center justify-between gap-2 py-2 text-sm ${b.voided ? 'opacity-50 line-through' : ''}`}>
                <span className="min-w-0 truncate">
                  <b>#{b.ticket}</b> · {b.runner} {runnerLabel(race, b.runner)}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <b>{money(b.amount)}</b>
                  {!run && !b.paidOut ? (
                    confirmVoid === b.ticket ? (
                      <>
                        <button type="button" onClick={() => void undo(b.ticket, !b.voided)} className="text-red-700 font-semibold min-h-[36px] px-1 no-underline">
                          {b.voided ? 'Restore' : 'Cancel bet'}
                        </button>
                        <button type="button" onClick={() => setConfirmVoid(null)} className="text-gray-500 min-h-[36px] px-1">
                          Keep
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirmVoid(b.ticket)} className="text-brand-blue min-h-[36px] px-1">
                        {b.voided ? 'Restore' : 'Undo'}
                      </button>
                    )
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function RaceChips({
  programme,
  book,
  raceIndex,
  setRaceIndex,
}: {
  programme: Programme
  book: RaceNightBook
  raceIndex: number
  setRaceIndex: (i: number) => void
}) {
  const runs = new Set(book.runs)
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {programme.races.map((r, i) => {
        const on = i === raceIndex
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => setRaceIndex(i)}
            className={`shrink-0 rounded-pill px-4 min-h-[44px] font-bold text-sm ${
              on ? 'bg-brand-navy text-white' : runs.has(r.id) ? 'bg-gray-200 text-gray-500' : 'bg-white/90 text-brand-navy'
            }`}
          >
            Race {i + 1}
            {runs.has(r.id) ? ' ✓' : ''}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Stat({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`rounded-card p-3 ${strong ? 'bg-brand-navy text-white' : 'bg-white/90 text-brand-navy'}`}>
      <p className={`text-xs ${strong ? 'text-white/70' : 'text-gray-500'}`}>{label}</p>
      <p className="font-display text-2xl leading-tight">{value}</p>
      {note ? <p className={`text-[11px] ${strong ? 'text-white/70' : 'text-gray-500'}`}>{note}</p> : null}
    </div>
  )
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(value ? String(value) : '')
  useEffect(() => setText(value ? String(value) : ''), [value])
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        £
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const n = Number(text.replace(/[£,\s]/g, ''))
            onChange(Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0)
          }}
          className="input-field w-24 text-right"
          placeholder="0"
        />
      </span>
    </label>
  )
}

function MoneyTab({
  programme,
  book,
  refresh,
  setBook,
}: {
  programme: Programme
  book: RaceNightBook
  refresh: () => Promise<void>
  setBook: (b: RaceNightBook) => void
}) {
  const runs = useMemo(() => new Set(book.runs), [book.runs])
  const summary = useMemo(() => nightSummary(programme, book.bets, runs, book.money), [programme, book, runs])
  const [ticketText, setTicketText] = useState('')
  const [confirmRun, setConfirmRun] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const ticket = Number(ticketText)
  const check = ticketText && Number.isInteger(ticket) && ticket > 0 ? checkTicket(ticket, programme, book.bets, runs) : null

  const pay = async (t: number, paid: boolean) => {
    try {
      await payRaceNightBet(t, paid)
      void refresh()
    } catch {
      setProblem("Couldn't save that. Try again.")
    }
  }

  const markRun = async (raceId: string, run: boolean) => {
    setConfirmRun(null)
    try {
      await setRaceNightRun(raceId, run)
      void refresh()
    } catch {
      setProblem("Couldn't save that. Try again.")
    }
  }

  const saveMoney = async (m: MoneySettings) => {
    setBook({ ...book, money: m })
    try {
      await saveRaceNightMoney(m)
    } catch {
      setProblem("Couldn't save the fees. Try again.")
    }
  }

  return (
    <div className="space-y-4">
      {problem ? <p className="text-sm text-red-700 font-semibold">{problem}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Bets taken" value={money(summary.betsTaken)} note={`${book.bets.filter((b) => !b.voided).length} bets`} />
        <Stat label="Entries & sponsors" value={money(summary.entries)} note="marked as paid" />
        <Stat label="Paid to punters" value={money(summary.toPunters)} note={summary.outstanding ? `${money(summary.outstanding)} still to hand over` : 'races run so far'} />
        <Stat label="Owner & jockey prizes" value={money(summary.prizes)} note="races run so far" />
        <div className="col-span-2">
          <Stat
            strong
            label="Club so far"
            value={money(summary.clubSoFar)}
            note={summary.pending ? `Includes ${money(summary.pending)} on races still to run (up to half goes back out)` : 'All races settled'}
          />
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        <p className="font-semibold text-brand-navy">Pay out a ticket</p>
        <input
          inputMode="numeric"
          value={ticketText}
          onChange={(e) => setTicketText(e.target.value.replace(/\D/g, ''))}
          placeholder="Ticket number"
          className="input-field text-2xl w-full"
          aria-label="Ticket number"
        />
        {check ? (
          check.kind === 'unknown' ? (
            <p className="text-sm text-gray-600">No ticket with that number.</p>
          ) : check.kind === 'voided' ? (
            <p className="text-sm text-gray-600">That bet was cancelled.</p>
          ) : check.kind === 'not-run' ? (
            <p className="text-sm text-gray-600">Race {check.raceNumber} hasn't been run yet.</p>
          ) : check.kind === 'no-result' ? (
            <p className="text-sm text-gray-600">Race {check.raceNumber} has run but its winner isn't entered yet.</p>
          ) : check.kind === 'lost' ? (
            <p className="text-sm font-semibold text-gray-700">
              Not a winner. Race {check.raceNumber}, #{check.bet.runner}, {money(check.bet.amount)}.
            </p>
          ) : (
            <div className="rounded-card p-3 bg-emerald-50 border border-emerald-300 space-y-2">
              <p className="text-emerald-900">
                <b className="text-2xl font-display">Pay {money(check.payout)}</b>
                <br />
                <span className="text-sm">
                  Race {check.raceNumber}, #{check.bet.runner}, staked {money(check.bet.amount)}
                </span>
              </p>
              {check.bet.paidOut ? (
                <p className="text-sm font-semibold text-emerald-900">
                  Already paid.{' '}
                  <button type="button" className="underline" onClick={() => void pay(check.bet.ticket, false)}>
                    Undo
                  </button>
                </p>
              ) : (
                <button type="button" onClick={() => void pay(check.bet.ticket, true)} className="btn-primary w-full min-h-[48px]">
                  Mark as paid
                </button>
              )}
            </div>
          )
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="font-semibold text-brand-navy px-1">Race by race</p>
        {programme.races.map((race, i) => {
          const s = summary.races[i]
          const run = runs.has(race.id)
          const winner = s.winners.length ? race.runners.find((r) => r.number === s.winners[0]) : null
          const winningBets = book.bets.filter((b) => s.payouts.has(b.ticket))
          return (
            <div key={race.id} className="glass-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-lg text-brand-navy">Race {i + 1}</p>
                <p className="text-sm">
                  Pot <b>{money(s.pot)}</b> · {s.betCount} bet{s.betCount === 1 ? '' : 's'}
                </p>
              </div>
              {!run ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-500">Not run yet. Payouts show once it has.</p>
                  {confirmRun === race.id ? (
                    <span className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => void markRun(race.id, true)} className="text-sm font-semibold text-red-700 min-h-[40px]">
                        Yes, it's run
                      </button>
                      <button type="button" onClick={() => setConfirmRun(null)} className="text-sm text-gray-500 min-h-[40px]">
                        No
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmRun(race.id)} className="text-sm text-brand-blue font-semibold shrink-0 min-h-[40px]">
                      Mark as run
                    </button>
                  )}
                </div>
              ) : !winner ? (
                <p className="text-sm text-gray-600">Run. Enter the winner in Race night → Results to see payouts.</p>
              ) : (
                <>
                  <p className="text-sm">
                    Winner <b>#{winner.number} {winner.horse.trim() || winner.owner.trim()}</b>
                  </p>
                  {winningBets.length ? (
                    <ul className="text-sm divide-y divide-gray-100">
                      {winningBets.map((b) => (
                        <li key={b.ticket} className="flex items-center justify-between gap-2 py-1.5">
                          <span>
                            Ticket <b>{b.ticket}</b> · staked {money(b.amount)}
                          </span>
                          <span className="flex items-center gap-2">
                            <b>{money(s.payouts.get(b.ticket) ?? 0)}</b>
                            <button
                              type="button"
                              onClick={() => void pay(b.ticket, !b.paidOut)}
                              className={`rounded-pill px-3 min-h-[36px] text-xs font-bold ${b.paidOut ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-blue text-white'}`}
                            >
                              {b.paidOut ? 'Paid ✓' : 'Pay'}
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">Nobody backed the winner: the club keeps the pot.</p>
                  )}
                  <div className="text-sm text-gray-700 space-y-0.5">
                    {book.money.ownerPrize && winner.owner.trim() ? (
                      <p>
                        Owner {winner.owner.trim()}: <b>{money(book.money.ownerPrize)}</b>
                      </p>
                    ) : null}
                    {book.money.jockeyPrize && winner.jockey.trim() ? (
                      <p>
                        Jockey {winner.jockey.trim()}: <b>{money(book.money.jockeyPrize)}</b>
                      </p>
                    ) : null}
                    <p>
                      Club keeps <b>{money(s.clubKeeps)}</b> of the pot
                    </p>
                  </div>
                  <button type="button" onClick={() => void markRun(race.id, false)} className="text-xs text-gray-400 underline">
                    Not run after all? Undo
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="glass-card p-4 space-y-3">
        <button type="button" onClick={() => setShowSettings((v) => !v)} className="w-full flex items-center justify-between font-semibold text-brand-navy min-h-[40px]">
          Entry fees and prizes
          <span className="text-brand-blue text-sm">{showSettings ? 'Hide' : 'Edit'}</span>
        </button>
        {showSettings ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Money in, per entry marked as paid in the programme:</p>
            <MoneyField label="Horse name" value={book.money.horseFee} onChange={(v) => void saveMoney({ ...book.money, horseFee: v })} />
            <MoneyField label="Owner" value={book.money.ownerFee} onChange={(v) => void saveMoney({ ...book.money, ownerFee: v })} />
            <MoneyField label="Jockey" value={book.money.jockeyFee} onChange={(v) => void saveMoney({ ...book.money, jockeyFee: v })} />
            <MoneyField label="Race sponsor" value={book.money.sponsorFee} onChange={(v) => void saveMoney({ ...book.money, sponsorFee: v })} />
            <p className="text-xs text-gray-500 pt-2">Money out, per race won:</p>
            <MoneyField label="Winning owner gets" value={book.money.ownerPrize} onChange={(v) => void saveMoney({ ...book.money, ownerPrize: v })} />
            <MoneyField label="Winning jockey gets" value={book.money.jockeyPrize} onChange={(v) => void saveMoney({ ...book.money, jockeyPrize: v })} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function AdminRaceNightBets() {
  const { programme, book, error, refresh, setBook } = useRaceNightData()
  const [tab, setTab] = useState<Tab>('bets')
  const [raceIndex, setRaceIndex] = useState(0)

  // Start on the first race that hasn't been run.
  const [placed, setPlaced] = useState(false)
  useEffect(() => {
    if (placed || !programme || !book) return
    const first = programme.races.findIndex((r) => !book.runs.includes(r.id))
    setRaceIndex(first < 0 ? 0 : first)
    setPlaced(true)
  }, [placed, programme, book])

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <div className="space-y-3 pb-10">
          <Link to="/admin/race-night" className="text-brand-blue text-sm font-medium min-h-[44px] inline-flex items-center">
            ← Race night
          </Link>
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-2xl text-brand-navy">Betting desk</h1>
            <div className="flex rounded-pill bg-white/80 p-1">
              {(['bets', 'money'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-pill px-4 min-h-[40px] text-sm font-bold ${tab === t ? 'bg-brand-blue text-white' : 'text-brand-navy'}`}
                >
                  {t === 'bets' ? 'Take bets' : 'Money'}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="glass-card p-6 text-center space-y-3">
              <p className="text-gray-600">{error}</p>
              <button type="button" onClick={() => void refresh()} className="btn-primary">
                Try again
              </button>
            </div>
          ) : null}

          {!programme || !book ? (
            !error ? <div className="glass-card h-40 animate-pulse" /> : null
          ) : tab === 'bets' ? (
            <TakeBets programme={programme} book={book} raceIndex={raceIndex} setRaceIndex={setRaceIndex} refresh={refresh} />
          ) : (
            <MoneyTab programme={programme} book={book} refresh={refresh} setBook={setBook} />
          )}
        </div>
      </div>
    </PageShell>
  )
}
