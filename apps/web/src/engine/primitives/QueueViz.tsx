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
  /** items[0] = front of queue (dequeued first) */
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
// Horizontal queue: items[0] = front (left, exits first), last = back (right, enters last).
// Items enter from the right (enqueue) and exit from the left (dequeue).

export function QueueViz({ id, state }: PrimitiveProps) {
  const { items = [], highlight } = state as QueueState

  return (
    <div className="flex flex-col items-center p-4 w-full">
      <div className="w-full max-w-[560px]">

        {/* ── Direction labels ── */}
        <div className="flex justify-between mb-1.5 px-0.5">
          <span className="text-[10px] font-mono font-bold text-secondary/65 tracking-[0.12em] uppercase">
            ← dequeue
          </span>
          <span className="text-[10px] font-mono text-outline-variant/35 tracking-[0.12em] uppercase">
            queue
          </span>
          <span className="text-[10px] font-mono font-bold text-primary/55 tracking-[0.12em] uppercase">
            enqueue →
          </span>
        </div>

        {/* ── Queue body — full border, explicit rounded-[8px] ── */}
        <div className="flex flex-row items-stretch border-2 border-outline-variant/40 rounded-[8px] bg-surface-container-low overflow-hidden min-h-[56px]">
          <AnimatePresence>
            {items.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center text-[11px] font-mono text-outline-variant/40 select-none py-3"
              >
                — empty —
              </motion.div>
            )}

            {items.map((rawItem, idx) => {
              const item = normaliseItem(rawItem, idx, highlight)
              const colors = resolveHighlight(item.highlight)
              const isHighlighted = !!item.highlight && item.highlight !== 'default'

              return (
                <motion.div
                  key={`${id}-slot-${idx}`}
                  layout
                  initial={{ opacity: 0, x: 32, scaleX: 0.75 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scaleX: 1,
                    backgroundColor: colors.bg,
                    // Top accent stripe mirrors StackViz's left stripe convention
                    boxShadow: isHighlighted
                      ? `inset 0 3px 0 ${colors.border}, 0 0 8px ${colors.border}20`
                      : 'inset 0 3px 0 #48474d30',
                  }}
                  exit={{ opacity: 0, x: -32, scaleX: 0.5, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="flex-1 min-w-[90px] border-r border-outline-variant/20 last:border-r-0 flex items-center justify-center px-3 py-2 shrink-0"
                  style={{ color: colors.text }}
                >
                  <span className="font-mono text-xs text-center leading-tight break-words" title={item.value}>
                    {item.value}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* ── FRONT / BACK footer ── */}
        <div className="flex justify-between mt-1 px-0.5">
          <span className="text-[10px] font-mono text-secondary/40 tracking-[0.1em] uppercase">
            front
          </span>
          <span className="text-[10px] font-mono text-primary/30 tracking-[0.1em] uppercase">
            back
          </span>
        </div>

      </div>
    </div>
  )
}
