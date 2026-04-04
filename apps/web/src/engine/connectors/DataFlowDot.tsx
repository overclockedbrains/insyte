
interface DataFlowDotProps {
  pathD: string
  color?: string
  duration?: number
  repeat?: boolean
}

export function DataFlowDot({
  pathD,
  color = 'var(--color-secondary)',
  duration = 1.5,
  repeat = false,
}: DataFlowDotProps) {
  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-10">
      <path id="flowPath" d={pathD} fill="none" stroke="none" />
      <circle r={4} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
        <animateMotion
          dur={`${duration}s`}
          repeatCount={repeat ? 'indefinite' : '1'}
          path={pathD}
        />
      </circle>
    </svg>
  )
}
