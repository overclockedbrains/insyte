import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { resolveHighlight } from '../styles/colors'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface QueueItem {
  value: string
  /** Phase 27: semantic highlight token ('active', 'insert', 'remove', …) */
  highlight?: string
}

interface QueueState {
  /** items[0] = front of queue */
  items: (string | QueueItem)[]
  /** Legacy: index-based highlight for backward compatibility */
  highlight?: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function normaliseItem(item: string | QueueItem, idx: number, highlightIdx: number | undefined): QueueItem {
  if (typeof item === 'string') {
    return {
      value: item,
      highlight: highlightIdx === idx ? 'active' : undefined,
    }
  }
  return item
}

// ─── QueueViz ──────────────────────────────────────────────────────────────────
//
// Phase 27: stable slot-based keys. resolveHighlight() replaces inline hex colors.

export function QueueViz({ id, state }: PrimitiveProps) {
  const { items = [], highlight } = state as QueueState

  return (
    <div className="flex items-center justify-center p-4 w-full min-h-[160px]">
      <div className="text-xs font-mono font-bold text-secondary mr-4 tracking-widest uppercase flex flex-col items-center">
        <span>FRONT</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-180 mt-1" stroke="currentColor">
          <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="flex flex-row items-center justify-end border-y-2 border-outline-variant/30 w-full max-w-[600px] h-16 min-w-[64px] bg-surface-container-lowest overflow-hidden shadow-inner">
        <AnimatePresence>
          {items.map((rawItem, idx) => {
            const item = normaliseItem(rawItem, idx, highlight)
            const colors = resolveHighlight(item.highlight)
            const isHighlighted = !!item.highlight && item.highlight !== 'default'

            return (
              <motion.div
                key={`${id}-slot-${idx}`}
                layout
                initial={{ opacity: 0, scale: 0.8, x: 40 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  backgroundColor: colors.bg,
                  boxShadow: isHighlighted ? `0 0 8px ${colors.border}60` : 'none',
                }}
                exit={{ opacity: 0, x: -40, scale: 0.5, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="min-w-[56px] h-full border-l border-outline-variant/20 flex items-center justify-center font-mono text-sm font-bold first:border-l-0 shrink-0"
                style={{ color: colors.text }}
              >
                {item.value}
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
