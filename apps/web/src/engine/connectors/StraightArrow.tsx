import { motion } from 'framer-motion'
import { resolveHighlight } from '../styles/colors'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface StraightArrowProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** Phase 27: semantic highlight token ('active', 'hit', 'insert', …) */
  highlight?: string
  /** Legacy: raw CSS color value — overridden by `highlight` when provided */
  color?: string
  label?: string
  active?: boolean
}

// ─── StraightArrow ────────────────────────────────────────────────────────────
//
// Phase 27: resolveHighlight() drives stroke color when `highlight` is provided.
// Priority: highlight token > legacy active boolean > legacy color prop > default.
// viz-label-secondary applied to the optional label.

export function StraightArrow({
  from,
  to,
  highlight,
  color = 'var(--color-outline-variant)',
  label,
  active,
}: StraightArrowProps) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const angle    = Math.atan2(dy, dx) * (180 / Math.PI)
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Resolve stroke color: semantic token > legacy active > legacy color
  let strokeColor: string
  let glowColor: string | null

  if (highlight) {
    const colors = resolveHighlight(highlight)
    strokeColor = colors.border
    glowColor   = colors.border
  } else if (active) {
    strokeColor = 'var(--color-secondary)'
    glowColor   = 'var(--color-secondary)'
  } else {
    strokeColor = color
    glowColor   = null
  }

  return (
    <div
      className="absolute z-0 pointer-events-none origin-left flex items-center justify-center"
      style={{
        left:      from.x,
        top:       from.y,
        width:     distance,
        transform: `rotate(${angle}deg)`,
      }}
    >
      <motion.div
        className="w-full relative h-[2px]"
        style={{
          backgroundColor: strokeColor,
          boxShadow: glowColor ? `0 0 8px ${glowColor}` : 'none',
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1, backgroundColor: strokeColor }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Arrowhead */}
        <motion.div
          className="absolute right-[-4px] top-[-3px] w-2 h-2"
          style={{
            borderTop:   `2px solid ${strokeColor}`,
            borderRight: `2px solid ${strokeColor}`,
            transform:   'rotate(45deg)',
          }}
          animate={active || highlight ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={active || highlight ? { repeat: Infinity, duration: 1 } : {}}
        />
      </motion.div>

      {label && (
        <span
          className="absolute -top-5 viz-label-secondary font-bold transition-colors select-none"
          style={{ transform: `rotate(${-angle}deg)` }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
