import { useState, type ReactNode } from 'react'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  )
}

interface CollapsibleCardProps {
  title: string
  summary?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function CollapsibleCard({
  title,
  summary,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: CollapsibleCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = controlledOpen ?? internalOpen

  const toggle = () => {
    const next = !open
    if (controlledOpen === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }

  return (
    <section className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-5 sm:p-6 text-left min-h-[56px] hover:bg-white/40 transition-colors"
      >
        <div className="min-w-0">
          <h2 className="font-display text-lg text-brand-navy">{title}</h2>
          {summary && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{summary}</p>
          )}
        </div>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 border-t border-brand-blue/10 space-y-4">
          {children}
        </div>
      )}
    </section>
  )
}
