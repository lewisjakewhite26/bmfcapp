import { useEffect, useRef } from 'react'
import { raceSummary, type Programme } from '../../../lib/raceNight'

const DOT = {
  complete: 'bg-emerald-500',
  partial: 'bg-amber-400',
  empty: 'bg-slate-300',
} as const

interface RaceStripProps {
  programme: Programme
  activeId: string
  onSelect: (raceId: string) => void
  onAdd: () => void
}

/** Race 1 2 3… chips: jump between races, with a dot showing how complete each is. */
export function RaceStrip({ programme, activeId, onSelect, onAdd }: RaceStripProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
  }, [activeId])

  return (
    <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Races">
      {programme.races.map((race, i) => {
        const s = raceSummary(race)
        const active = race.id === activeId
        return (
          <button
            key={race.id}
            ref={active ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`Race ${i + 1}, ${s.filled} of ${s.total} runners entered`}
            onClick={() => onSelect(race.id)}
            className={`relative shrink-0 min-w-[46px] h-[50px] px-2 rounded-2xl border flex flex-col items-center justify-center font-extrabold text-base transition-colors ${
              active ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-brand-navy border-brand-blue/15'
            }`}
          >
            <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${DOT[s.state]}`} />
            {i + 1}
            <small className={`text-[9px] font-semibold leading-none mt-0.5 ${active ? 'text-white/80' : 'text-gray-500'}`}>
              {s.filled}/{s.total}
            </small>
          </button>
        )
      })}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add a race"
        className="shrink-0 min-w-[46px] h-[50px] rounded-2xl border border-dashed border-brand-blue/40 text-brand-blue text-xl"
      >
        +
      </button>
    </div>
  )
}
