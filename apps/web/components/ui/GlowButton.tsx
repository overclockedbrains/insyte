import { cn } from '@/lib/utils'

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
  asChild?: false
}

export function GlowButton({ children, className, ...props }: GlowButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'px-6 py-3 rounded-full',
        'neon-gradient text-on-primary font-medium text-sm',
        'hover:scale-[1.02] active:scale-95 transition-transform duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
