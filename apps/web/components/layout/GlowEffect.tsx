import { cn } from '@/lib/utils'

type Intensity = 'subtle' | 'normal' | 'strong'

interface GlowEffectProps {
  className?: string
  intensity?: Intensity
}

const blobColors: Record<Intensity, { primary: string; secondary: string }> = {
  subtle:  { primary: 'bg-primary/5',  secondary: 'bg-secondary/5'  },
  normal:  { primary: 'bg-primary/10', secondary: 'bg-secondary/10' },
  strong:  { primary: 'bg-primary/20', secondary: 'bg-secondary/20' },
}

export function GlowEffect({ className, intensity = 'normal' }: GlowEffectProps) {
  const { primary, secondary } = blobColors[intensity]

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)} aria-hidden="true">
      {/* Purple blob — top-left */}
      <div
        className={cn(
          'absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none',
          primary,
        )}
      />
      {/* Cyan blob — bottom-right */}
      <div
        className={cn(
          'absolute bottom-[20%] right-[-5%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none',
          secondary,
        )}
      />
    </div>
  )
}
