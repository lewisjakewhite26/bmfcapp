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
