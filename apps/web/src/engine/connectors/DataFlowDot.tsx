import { resolveHighlight } from '../styles/colors'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DataFlowDotProps {
  pathD: string
  /** Phase 27: semantic highlight token — overrides `color` when provided */
  highlight?: string
  /** Legacy: raw CSS color value for the dot */
  color?: string
  duration?: number
  repeat?: boolean
}

// ─── DataFlowDot ──────────────────────────────────────────────────────────────
//
// Phase 27: resolveHighlight() drives dot color when `highlight` is provided.
// Falls back to legacy `color` prop, then the secondary design token.

export function DataFlowDot({
  pathD,
  highlight,
  color = 'var(--color-secondary)',
  duration = 1.5,
  repeat = false,
}: DataFlowDotProps) {
  // Resolve dot color: semantic token > legacy color
  const dotColor = highlight ? resolveHighlight(highlight).border : color

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-10">
      <path d={pathD} fill="none" stroke="none" />
      <circle r={4} fill={dotColor} style={{ filter: `drop-shadow(0 0 6px ${dotColor})` }}>
        <animateMotion
          dur={`${duration}s`}
          repeatCount={repeat ? 'indefinite' : '1'}
          path={pathD}
        />
      </circle>
    </svg>
  )
}
