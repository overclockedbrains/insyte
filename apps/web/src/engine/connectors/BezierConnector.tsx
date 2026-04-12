import { motion } from 'framer-motion'
import { resolveHighlight } from '../styles/colors'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface BezierConnectorProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** Phase 27: semantic highlight token ('active', 'hit', 'insert', …) */
  highlight?: string
  /** Legacy: whether the connector is in its active/highlighted state */
  active?: boolean
}

// ─── BezierConnector ───────────────────────────────────────────────────────────
//
// Phase 27: resolveHighlight() drives stroke color when `highlight` is provided.
// Falls back to legacy `active` boolean → secondary / outline-variant.

export function BezierConnector({ from, to, highlight, active }: BezierConnectorProps) {
  const dx = Math.abs(to.x - from.x)
  const cp1 = { x: from.x + dx / 2, y: from.y }
  const cp2 = { x: to.x - dx / 2, y: to.y }

  const pathD = `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`

  // Resolve stroke color: semantic token > legacy active > default
  let stroke: string
  let glowColor: string | null

  if (highlight) {
    const colors = resolveHighlight(highlight)
    stroke    = colors.border
    glowColor = colors.border
  } else if (active) {
    stroke    = 'var(--color-secondary)'
    glowColor = 'var(--color-secondary)'
  } else {
    stroke    = 'var(--color-outline-variant)'
    glowColor = null
  }

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-0">
      <motion.path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        style={{
          filter: glowColor ? `drop-shadow(0 0 8px ${glowColor})` : 'none',
        }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1, stroke }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </svg>
  )
}
