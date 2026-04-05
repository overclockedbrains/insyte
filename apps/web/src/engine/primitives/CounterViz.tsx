import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface CounterState {
  value: number
  label: string
  color?: 'primary' | 'secondary' | 'error'
}

const COLOR_MAP = {
  primary: '#b79fff',
  secondary: '#3adffa',
  error: '#ff6e84',
}

export function CounterViz({ state }: PrimitiveProps) {
  const { value, label, color = 'primary' } = state as CounterState
  const numColor = COLOR_MAP[color] ?? COLOR_MAP.primary

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/55">
        {label}
      </span>
      <div className="relative h-4 overflow-hidden inline-flex justify-center items-center min-w-[20px]">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="text-[13px] font-mono font-semibold"
            style={{ color: numColor }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}
