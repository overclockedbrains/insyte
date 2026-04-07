import { cn } from '@/lib/utils'

interface SkeletonTextProps {
  lines?: number
  className?: string
}

const WIDTHS = ['w-full', 'w-5/6', 'w-3/4', 'w-2/3', 'w-1/2']

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-3 rounded animate-pulse bg-surface-container-high',
            WIDTHS[index % WIDTHS.length],
          )}
        />
      ))}
    </div>
  )
}
