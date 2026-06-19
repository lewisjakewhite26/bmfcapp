interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-brand-blue/10 rounded-xl ${className}`} />
  )
}

export function MatchCardSkeleton() {
  return (
    <div className="glass-card p-4 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-12 w-24 rounded-2xl" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-3 w-1/2 mx-auto" />
    </div>
  )
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-2xl" />
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="glass-card p-4 space-y-3">
        <Skeleton className="h-3 w-2/3 mx-auto" />
        <Skeleton className="h-9 w-12 mx-auto" />
        <Skeleton className="h-3 w-1/3 mx-auto" />
      </div>
      <div className="glass-card p-4 space-y-3 sm:col-span-2">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function LeagueTableSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-3 py-3 border-b border-brand-blue/8">
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="divide-y divide-brand-blue/8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-3 py-3 flex items-center gap-3">
            <Skeleton className="h-4 w-6 shrink-0" />
            <Skeleton className="h-4 flex-1 max-w-[140px]" />
            <Skeleton className="h-4 w-8 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4 space-y-2">
            <Skeleton className="h-8 w-10 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4 flex gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-12 rounded-pill" />
                <Skeleton className="h-6 w-12 rounded-pill" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CalendarSkeleton({ mode = 'list' }: { mode?: 'list' | 'calendar' }) {
  if (mode === 'calendar') {
    return (
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card p-4 space-y-3">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-10 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  )
}

export function PlayerProfileSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 glass-card overflow-hidden">
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-card p-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <div className="glass-card p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
