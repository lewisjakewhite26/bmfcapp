import { paymentTotals, programmeTotals, raceSummary, type Programme } from '../../../lib/raceNight'

interface OverviewProps {
  programme: Programme
  onOpenRace: (raceId: string) => void
  onAddRace: () => void
  onShowTv: () => void
  onPrint: () => void
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card py-3 text-center">
      <p className="font-display text-2xl font-bold text-brand-navy leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">{label}</p>
    </div>
  )
}

const BAR = { complete: 'bg-emerald-500', partial: 'bg-amber-400', empty: 'bg-slate-300' } as const

/** The landing screen: how ready each race is, at a glance. */
export function Overview({ programme, onOpenRace, onAddRace, onShowTv, onPrint }: OverviewProps) {
  const totals = programmeTotals(programme)
  const pay = paymentTotals(programme)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Races" value={totals.races} />
        <Stat label="Runners" value={totals.runners} />
        <Stat label="Horses" value={totals.horses} />
        <Stat label="Sponsors" value={totals.sponsors} />
      </div>

      {pay.dueCount > 0 && (
        <div className="glass-card p-3">
          <div className="flex items-baseline justify-between text-sm">
            <b className="text-brand-navy">Payments</b>
            <span className={pay.unpaid === 0 ? 'text-emerald-700 font-semibold' : 'text-amber-800 font-semibold'}>
              {pay.unpaid === 0 ? 'All paid' : `${pay.paid} of ${pay.dueCount} paid · ${pay.unpaid} to collect`}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden" aria-hidden>
            <div className="h-full bg-emerald-500" style={{ width: `${(pay.paid / pay.dueCount) * 100}%` }} />
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {programme.races.map((race, i) => {
          const s = raceSummary(race)
          return (
            <li key={race.id}>
              <button
                type="button"
                onClick={() => onOpenRace(race.id)}
                className="w-full glass-card px-4 py-3 text-left flex items-center gap-3 min-h-[72px]"
              >
                <span className="shrink-0 w-10 h-10 rounded-full bg-brand-blue text-white font-extrabold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-brand-navy truncate">{race.sponsor.trim() || 'No sponsor yet'}</b>
                  <span className="block text-xs text-gray-500">
                    {s.filled} of {s.total} runners · {s.horses} {s.horses === 1 ? 'horse' : 'horses'} named
                    {s.unpaid > 0 && <span className="text-amber-700 font-semibold"> · {s.unpaid} to collect</span>}
                  </span>
                  <span className="mt-1.5 block h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-hidden>
                    <span
                      className={`block h-full ${BAR[s.state]}`}
                      style={{ width: `${s.total ? (s.filled / s.total) * 100 : 0}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {s.state === 'empty' ? (
                    <span className="text-xs font-semibold text-gray-500">Empty</span>
                  ) : s.free > 0 ? (
                    <span className="text-xs font-semibold text-amber-700">{s.free} free</span>
                  ) : null}
                  <span className="block text-gray-300 text-lg leading-none" aria-hidden>
                    ›
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={onAddRace}
        className="w-full min-h-[48px] rounded-card border border-dashed border-brand-blue/40 text-brand-blue font-semibold"
      >
        + Add a race
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onShowTv}
          disabled={programme.races.length === 0}
          className="btn-primary flex-1 min-h-[48px] disabled:opacity-40"
        >
          Show on TV
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="flex-1 min-h-[48px] rounded-pill border border-brand-blue/15 bg-white text-sm font-semibold text-brand-navy"
        >
          Print programme
        </button>
      </div>
    </div>
  )
}
