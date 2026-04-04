import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface QueueState {
  items: string[]
  highlight?: number // index to highlight
}

export function QueueViz({ id, state }: PrimitiveProps) {
  const { items = [], highlight } = state as QueueState

  return (
    <div className="flex items-center justify-center p-8 w-full min-h-[160px]">
      <div className="text-xs font-mono font-bold text-secondary mr-4 tracking-widest uppercase flex flex-col items-center">
        <span>FRONT</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-180 mt-1" stroke="currentColor">
          <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="flex flex-row items-center justify-end border-y-4 border-outline-variant/30 w-full max-w-[600px] h-16 min-w-[64px] bg-surface-container-lowest overflow-hidden shadow-inner">
        <AnimatePresence>
          {items.map((item, idx) => {
            const isHighlight = highlight === idx
            return (
              <motion.div
                key={`${id}-item-${item}-${idx}`} // Allow duplicate items using idx
                layout
                initial={{ opacity: 0, scale: 0.8, x: 40 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  backgroundColor: isHighlight ? 'color-mix(in srgb, var(--color-secondary) 20%, transparent)' : 'var(--color-surface-container)',
                  boxShadow: isHighlight ? '0 0 12px rgba(58,223,250,0.6)' : 'none',
                }}
                exit={{ opacity: 0, x: -40, scale: 0.5, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="min-w-[56px] h-full border-l border-outline-variant/20 flex items-center justify-center font-mono text-sm font-bold text-on-surface first:border-l-0 shrink-0"
              >
                {item}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="text-xs font-mono font-bold text-primary ml-4 tracking-widest uppercase flex flex-col items-center">
        <span>BACK</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-180 mt-1" stroke="currentColor">
          <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}
