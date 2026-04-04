import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: React.ReactNode
  className?: string
  valueClassName?: string
}

export function StatCard({ label, value, className, valueClassName }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10',
        className,
      )}
    >
      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">
        {label}
      </p>
      <p className={cn('text-xl font-headline font-bold text-on-surface', valueClassName)}>
        {value}
      </p>
    </div>
  )
}
