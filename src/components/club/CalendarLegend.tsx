export function CalendarLegend() {
  return (
    <div className="glass-card p-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-brand-blue" /> Upcoming match
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-teal-600" /> Win
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500" /> Draw
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500" /> Loss
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-brand-gold" /> Training
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-violet-500" /> Event
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Fundraiser
      </span>
    </div>
  )
}
