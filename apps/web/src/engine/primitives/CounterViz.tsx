import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CounterState {
  value: number
  label: string
  color?: 'primary' | 'secondary' | 'error'
}

const COLOR_MAP = {
  primary:   'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  error:     'var(--color-error)',
}

// ─── CounterViz ────────────────────────────────────────────────────────────────
//
// Phase 27: typography classes applied.

export function CounterViz({ state }: PrimitiveProps) {
  const { value, label, color = 'primary' } = state as CounterState
  const numColor = COLOR_MAP[color] ?? COLOR_MAP.primary

  return (
    <div className="flex items-center gap-1.5">
      {/* Label — secondary typography */}
      <span className="viz-label-secondary uppercase tracking-wider opacity-55">
        {label}
      </span>
      {/* Value — stat typography with tick-up animation */}
      <div className="relative h-5 overflow-hidden inline-flex justify-center items-center min-w-[20px]">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="viz-stat-value"
            style={{ color: numColor, fontSize: 13 }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}
