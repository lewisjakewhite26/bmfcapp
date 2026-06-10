import type { ReactNode } from 'react'

interface AdminSectionProps {
  title: string
  description?: string
  headerExtra?: ReactNode
  children: ReactNode
}

export function AdminSection({ title, description, headerExtra, children }: AdminSectionProps) {
  return (
    <section className="admin-section min-w-0">
      <div className={`flex flex-col gap-3 ${headerExtra ? 'sm:flex-row sm:items-start sm:justify-between' : ''} mb-4`}>
        <div className="min-w-0">
          <h2 className="admin-section-heading">
            <span className="admin-section-heading-accent" aria-hidden />
            <span className="flex items-center min-h-[1.25rem]">{title}</span>
          </h2>
          {description && (
            <p className="text-sm text-gray-500 mt-2 ml-4">{description}</p>
          )}
        </div>
        {headerExtra && <div className="shrink-0 w-full sm:w-auto">{headerExtra}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
