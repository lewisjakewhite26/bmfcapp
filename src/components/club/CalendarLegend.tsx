import { CALENDAR_DOT } from '../../lib/calendarColors'

export function CalendarLegend() {
  return (
    <div className="glass-card p-3 space-y-2 text-[10px] text-gray-500">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${CALENDAR_DOT.training}`} /> Training
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${CALENDAR_DOT.match}`} /> Match
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${CALENDAR_DOT.other}`} /> Other
        </span>
      </div>
      <p className="text-center text-[10px] text-gray-400 leading-snug">
        Past match days are lightly shaded{' '}
        <span className="text-emerald-600">green</span> (win),{' '}
        <span className="text-amber-600">amber</span> (draw), or{' '}
        <span className="text-red-600">red</span> (loss) in the month view.
      </p>
    </div>
  )
}
