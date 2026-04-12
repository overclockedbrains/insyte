import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { resolveHighlight } from '../styles/colors'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface HashMapEntry {
  key: string
  value: string
  /** Phase 27: semantic token ('insert', 'hit', 'miss', 'delete', 'remove', …) */
  highlight?: string
}

interface HashMapState {
  entries: HashMapEntry[]
  label?: string
}

// ─── HashMapViz ────────────────────────────────────────────────────────────────
//
// Phase 27: resolveHighlight() replaces per-entry inline hex color strings.
// Stable key = entry.key so rows survive value updates without remounting.

export function HashMapViz({ id, state }: PrimitiveProps) {
  const { entries = [] } = state as HashMapState

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full flex-col flex rounded border border-outline-variant/25 overflow-hidden">
        {/* Header row */}
        <div className="flex w-full bg-surface-container border-b border-outline-variant/30 text-[11px] font-mono text-on-surface-variant/70 uppercase tracking-wider">
          <div className="flex-1 px-3 py-1.5 border-r border-outline-variant/20">Key</div>
          <div className="flex-1 px-3 py-1.5">Value</div>
        </div>

        {/* Rows */}
        <div className="relative flex flex-col w-full min-h-[40px] bg-surface">
          <AnimatePresence initial={false}>
            {entries.length === 0 ? (
              <motion.div
                key="empty"
                className="flex items-center justify-center py-4 text-on-surface-variant/40 font-mono text-sm italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {'{ }'}
              </motion.div>
            ) : (
              entries.map((entry, i) => {
                const colors = resolveHighlight(entry.highlight)
                const isHighlighted = !!entry.highlight && entry.highlight !== 'default'
                const isDelete = entry.highlight === 'delete' || entry.highlight === 'remove'

                const bgColor = isHighlighted
                  ? `${colors.bg}`
                  : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0)'

                const borderLeft = isHighlighted
                  ? `3px solid ${colors.border}`
                  : '3px solid transparent'

                return (
                  <motion.div
                    key={`${id}-entry-${entry.key}`}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{
                      opacity: isDelete ? 0.45 : 1,
                      x: 0,
                      backgroundColor: bgColor,
                    }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="flex w-full border-b border-outline-variant/10 last:border-b-0 font-mono text-sm"
                    style={{ borderLeft }}
                  >
                    <div
                      className="flex-1 px-3 py-2 border-r border-outline-variant/10 text-[13px]"
                      style={{ color: isHighlighted ? colors.text : 'var(--color-on-surface)' }}
                    >
                      {entry.key}
                    </div>
                    <div
                      className={`flex-1 px-3 py-2 text-[13px] truncate ${isDelete ? 'line-through' : ''}`}
                      style={{ color: isDelete ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface)' }}
                    >
                      {entry.value}
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
