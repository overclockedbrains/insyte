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

/** Normalise items array: accept both plain strings and {value, highlight} objects */
function normaliseItem(item: string | StackItem, fallbackHighlightIdx: number, highlightIdx: number | undefined): StackItem {
  if (typeof item === 'string') {
    return {
      value: item,
      highlight: highlightIdx === fallbackHighlightIdx ? 'active' : undefined,
    }
  }
  return item
}

// ─── StackViz ──────────────────────────────────────────────────────────────────
//
// Phase 27: stable slot-based keys (index-only) so duplicate values don't
// cause keying collisions. resolveHighlight() replaces inline hex colors.

export function StackViz({ id, state }: PrimitiveProps) {
  const { items = [], highlight } = state as StackState

  return (
    <div className="flex flex-col items-center justify-end p-4 h-[260px] w-full">
      <div className="text-xs font-mono font-bold text-primary mb-2 tracking-widest uppercase">
        TOP
      </div>
      <div className="flex flex-col-reverse justify-start border-x-2 border-b-2 border-outline-variant/30 rounded-b-xl w-[200px] relative bg-surface-container-lowest overflow-hidden min-h-[48px]">
        <AnimatePresence>
          {items.map((rawItem, idx) => {
            const item = normaliseItem(rawItem, idx, highlight)
            const colors = resolveHighlight(item.highlight)
            const isHighlighted = !!item.highlight && item.highlight !== 'default'

            return (
              <motion.div
                key={`${id}-slot-${idx}`}
                layout
                initial={{ opacity: 0, scale: 0, y: -40 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  boxShadow: isHighlighted ? `0 0 8px ${colors.border}60` : 'none',
                }}
                exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-full h-12 border-b border-outline-variant/20 flex items-center justify-center font-mono text-sm font-bold first:border-b-0"
                style={{ color: colors.text }}
              >
                <span className="truncate px-2" title={item.value}>{item.value}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
