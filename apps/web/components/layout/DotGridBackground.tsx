interface DotGridBackgroundProps {
  opacity?: number
  className?: string
}

export function DotGridBackground({ opacity = 1, className }: DotGridBackgroundProps) {
  return (
    <div
      className={`absolute inset-0 dot-grid pointer-events-none ${className ?? ''}`}
      style={{ opacity }}
      aria-hidden="true"
    />
  )
}
