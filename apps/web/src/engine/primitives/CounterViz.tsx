import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface CounterState {
  value: number
  label: string
  color?: 'primary' | 'secondary' | 'error'
}

export function CounterViz({ state }: PrimitiveProps) {
  const { value, label, color = 'primary' } = state as CounterState

  let numColor = 'var(--color-primary)'
  if (color === 'secondary') numColor = 'var(--color-secondary)'
  if (color === 'error') numColor = 'var(--color-error)'

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 min-w-[100px]">
      <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">
        {label}
      </span>
      <div className="relative h-8 overflow-hidden inline-flex justify-center items-center">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="text-2xl font-headline font-bold"
            style={{ color: numColor, textShadow: `0 0 10px ${numColor}50` }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}
