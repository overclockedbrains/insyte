import { cn } from '@/lib/utils'

interface SkeletonCardProps {
  className?: string
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'min-w-[160px] w-[240px] rounded-2xl border border-outline-variant/20 overflow-hidden',
        className,
      )}
      aria-hidden="true"
    >
      <div className="aspect-video animate-pulse bg-surface-container-high rounded-t-2xl" />
      <div className="p-3 space-y-2 bg-surface-container-low">
        <div className="h-4 w-4/5 animate-pulse bg-surface-container-high rounded" />
        <div className="h-3 w-2/3 animate-pulse bg-surface-container-high rounded" />
      </div>
    </div>
  )
}
