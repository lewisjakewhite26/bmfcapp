import { useId, useState, type ReactNode } from 'react'

export interface ListFilter {
  key: string
  label: string
  count: number
}

interface ListSectionProps {
  title: string
  /** One line shown in the header, e.g. "18 of 33 have a photo". */
  summary: string
  /** Optional filter buttons shown when the section is open. */
  filters?: ListFilter[]
  filter?: string
  onFilter?: (key: string) => void
  defaultOpen?: boolean
  /** Keeps the section open regardless of the toggle (e.g. while uploading). */
  forceOpen?: boolean
  children: ReactNode
}

/** A card that folds down to its title and a one-line summary, with All / Has / Missing style filters. */
export function ListSection({
  title,
  summary,
  filters,
  filter,
  onFilter,
  defaultOpen = false,
  forceOpen = false,
  children,
}: ListSectionProps) {
  const [openState, setOpen] = useState(defaultOpen)
  const open = forceOpen || openState
  const bodyId = useId()

  return (
    <section className="glass-card p-4 space-y-3">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 min-h-[44px] text-left"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!openState)}
      >
        <span className="min-w-0">
          <span className="block font-display text-lg text-brand-navy">{title}</span>
          <span className="block text-sm text-gray-500">{summary}</span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`w-5 h-5 shrink-0 text-brand-blue transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div id={bodyId} className="space-y-3">
          {filters && filters.length > 0 && onFilter && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Filter ${title.toLowerCase()}`}>
              {filters.map((f) => {
                const active = filter === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onFilter(f.key)}
                    className={`text-xs font-semibold rounded-pill border px-3 min-h-[36px] ${
                      active
                        ? 'bg-brand-navy text-white border-brand-navy'
                        : 'bg-white text-brand-navy border-brand-blue/20 hover:border-brand-blue'
                    }`}
                  >
                    {f.label} <span className={active ? 'text-white/70' : 'text-gray-400'}>{f.count}</span>
                  </button>
                )
              })}
            </div>
          )}
          {children}
        </div>
      )}
    </section>
  )
}
