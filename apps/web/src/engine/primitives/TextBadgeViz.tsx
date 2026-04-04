import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface TextBadgeState {
  text: string
  style?: 'default' | 'highlight' | 'success' | 'error'
}

export function TextBadgeViz({ state }: PrimitiveProps) {
  const { text, style = 'default' } = state as TextBadgeState

  let bgColor = 'rgba(25, 25, 31, 0.6)' // glass-panel base
  let borderColor = 'rgba(72, 71, 77, 0.8)' // outline-variant
  const textColor = 'var(--color-on-surface)' // on-surface
  let shadow = 'none'

  if (style === 'highlight') {
    bgColor = 'rgba(183, 159, 255, 0.1)'
    borderColor = 'var(--color-primary)'
    shadow = '0 0 15px rgba(183, 159, 255, 0.2)'
  } else if (style === 'success') {
    bgColor = 'rgba(58, 223, 250, 0.1)'
    borderColor = 'var(--color-secondary)'
    shadow = '0 0 15px rgba(58, 223, 250, 0.2)'
  } else if (style === 'error') {
    bgColor = 'rgba(255, 110, 132, 0.1)'
    borderColor = 'var(--color-error)'
    shadow = '0 0 15px rgba(255, 110, 132, 0.2)'
  }

  return (
    <div className="relative inline-flex z-20">
      <AnimatePresence mode="wait">
        <motion.div
          key={text}
          initial={{ opacity: 0, scale: 0.9, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -5 }}
          transition={{ duration: 0.15 }}
          className="px-4 py-2 rounded-full border backdrop-blur-md"
          style={{
            backgroundColor: bgColor,
            borderColor,
            boxShadow: shadow,
            color: textColor,
          }}
        >
          <span className="font-mono text-sm tracking-wide font-medium">{text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
