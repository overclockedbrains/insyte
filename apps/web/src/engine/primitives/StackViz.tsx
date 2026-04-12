import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { resolveHighlight } from '../styles/colors'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface StackItem {
  value: string
  /** Phase 27: semantic highlight token ('active', 'insert', 'remove', …) */
  highlight?: string
}

interface StackState {
  /** items[0] = bottom of stack, items[items.length-1] = top */
  items: (string | StackItem)[]
  /** Legacy: index-based highlight for backward compatibility */
  highlight?: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function normaliseItem(item: string | StackItem, idx: number, highlightIdx: number | undefined): StackItem {
  if (typeof item === 'string') {
    return {
      value: item,
      highlight: highlightIdx === idx ? 'active' : undefined,
    }
  }
  return item
}

// ─── StackViz ──────────────────────────────────────────────────────────────────
//
// Renders a vertical call stack — items[0] = bottom, last item = top.
// flex-col-reverse so pushed frames appear at the top of the container.

export function StackViz({ id, state }: PrimitiveProps) {
  const { items = [], highlight } = state as StackState

  return (
    <div className="flex flex-col items-center p-4 w-full">
      <div className="w-full max-w-[400px]">

        {/* ── Top-of-stack label ── */}
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <div className="flex-1 h-px bg-outline-variant/25" />
          <span className="text-[10px] font-mono font-bold text-primary/60 tracking-[0.14em] uppercase">
            top of stack
          </span>
          <div className="flex-1 h-px bg-outline-variant/25" />
        </div>

        {/* ── Frame container — open top, closed bottom & sides ── */}
        {/* rounded-[8px] explicit to avoid --radius:1rem making corners huge */}
        <div className="border-x-2 border-b-2 border-outline-variant/40 rounded-b-[8px] bg-surface-container-low overflow-hidden min-h-[52px]">
          <AnimatePresence>
            {items.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-3 text-center text-[11px] font-mono text-outline-variant/40 select-none"
              >
                — empty —
              </motion.div>
            )}

            {/* flex-col-reverse: items[last] appears at top, items[0] at bottom */}
            {[...items].reverse().map((rawItem, reversedIdx) => {
              const originalIdx = items.length - 1 - reversedIdx
              const item = normaliseItem(rawItem, originalIdx, highlight)
              const colors = resolveHighlight(item.highlight)
              const isHighlighted = !!item.highlight && item.highlight !== 'default'

              return (
                <motion.div
                  key={`${id}-slot-${originalIdx}`}
                  layout
                  initial={{ opacity: 0, y: -16, scaleY: 0.7 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scaleY: 1,
                    backgroundColor: colors.bg,
                    boxShadow: isHighlighted
                      ? `inset 3px 0 0 ${colors.border}, 0 1px 0 ${colors.border}20`
                      : 'inset 3px 0 0 #48474d30',
                  }}
                  exit={{ opacity: 0, x: 32, scaleY: 0.5, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="w-full h-10 border-b border-outline-variant/20 last:border-b-0 flex items-center px-3 gap-2 shrink-0"
                  style={{ color: colors.text }}
                >
                  <span className="font-mono text-xs truncate" title={item.value}>
                    {item.value}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* ── Call stack footer label ── */}
        <div className="flex items-center gap-2 mt-1 px-1">
          <div className="flex-1 h-px bg-outline-variant/15" />
          <span className="text-[10px] font-mono text-outline-variant/35 tracking-[0.12em] uppercase">
            call stack
          </span>
          <div className="flex-1 h-px bg-outline-variant/15" />
        </div>

      </div>
    </div>
  )
}
