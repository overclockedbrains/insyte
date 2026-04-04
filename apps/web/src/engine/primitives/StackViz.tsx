import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface StackState {
  items: string[]
  highlight?: number // index to highlight
}

export function StackViz({ id, state }: PrimitiveProps) {
  const { items = [], highlight } = state as StackState

  return (
    <div className="flex flex-col items-center justify-end p-8 h-[300px] w-full">
      <div className="text-xs font-mono font-bold text-primary mb-2 tracking-widest uppercase">
        TOP
      </div>
      <div className="flex flex-col-reverse justify-start border-x-4 border-b-4 border-outline-variant/30 rounded-b-xl w-32 relative bg-surface-container-lowest overflow-hidden min-h-[48px]">
        <AnimatePresence>
          {items.map((item, idx) => {
            const isHighlight = highlight === idx
            return (
              <motion.div
                key={`${id}-item-${item}-${idx}`} // Use idx to differentiate same items
                layout
                initial={{ opacity: 0, scale: 0, y: -40 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  backgroundColor: isHighlight ? 'color-mix(in srgb, var(--color-secondary) 20%, transparent)' : 'var(--color-surface-container)',
                  boxShadow: isHighlight ? '0 0 12px rgba(58,223,250,0.6)' : 'none',
                }}
                exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-full h-12 border-b border-outline-variant/20 flex items-center justify-center font-mono text-sm font-bold text-on-surface first:border-b-0"
              >
                {item}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
