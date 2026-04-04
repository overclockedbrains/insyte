import { cn } from '@/lib/utils'

interface PillProps {
  children: React.ReactNode
  className?: string
}

export function Pill({ children, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-primary/10 text-primary',
        className,
      )}
    >
      {children}
    </span>
  )
}
