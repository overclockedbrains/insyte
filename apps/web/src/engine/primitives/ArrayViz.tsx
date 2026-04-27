import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { resolveHighlight } from '../styles/colors'

// ─── State ────────────────────────────────────────────────────────────────────
interface LinearItem {
  id?: string
  value: string | number
  highlight?: string
}

interface LinearState {
  items: LinearItem[]
  pointers?: { index: number; label: string; color?: string }[]
  windowHighlight?: { start: number; end: number }
}

// ─── ArrayViz ──────────────────────────────────────────────────────────────────
//
// Phase 27: stable slot-based keys so that value changes at a slot animate
// in-place (no remount). layoutId enables FLIP when the array grows/shrinks.

export function ArrayViz({ id, state }: PrimitiveProps) {
  const { items = [], pointers = [], windowHighlight } = state as LinearState

  const hasPointers = pointers.length > 0

  // Helper to find pointer(s) at a given index
  const pointersAt = (idx: number) => pointers.filter(p => p.index === idx)

  return (
    <div className="relative flex flex-col items-center justify-center p-4 w-full">
      <div className="relative flex flex-col items-center justify-center p-4 border border-outline-variant/20 rounded-2xl shadow-md bg-surface-container-low min-w-[160px]">



        {/* Pointer labels above cells — one column per slot */}
        {hasPointers && (
          <div className="flex gap-2 mb-2 relative z-10 items-end">
            {items.map((_, idx) => {
              const slotPtrs = pointersAt(idx)
              return (
                <div
                  key={`${id}-ptrtop-${idx}`}
                  className="min-w-[48px] flex flex-col items-center justify-end"
                >
                  {slotPtrs.map(ptr => (
                    <motion.div
                      key={ptr.label}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center"
                    >
                      <span
                        className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none"
                        style={{ color: ptr.color ?? 'var(--color-primary)' }}
                      >
                        {ptr.label}
                      </span>
                      {/* Downward arrow */}
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        className="mt-0.5"
                        style={{ color: ptr.color ?? 'var(--color-primary)' }}
                      >
                        <path
                          d="M12 4v16m0 0l-6-6m6 6l6-6"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </motion.div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Items — window highlight bracket sits inside here so it positions relative to the cells, not the container */}
        <div className="flex gap-2 relative z-10">
          {windowHighlight && (
            <motion.div
              className="absolute rounded-2xl border-2 pointer-events-none"
              style={{
                borderColor: 'rgba(183, 159, 255, 0.45)',
                backgroundColor: 'rgba(183, 159, 255, 0.07)',
                top: '-6px',
                bottom: '-6px',
                zIndex: 0,
              }}
              initial={false}
              animate={{
                left: `${windowHighlight.start * 56 - 4}px`,
                width: `${(windowHighlight.end - windowHighlight.start + 1) * 56}px`,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          {items.map((item, idx) => {
            const colors = resolveHighlight(item.highlight)
            const isHighlighted = !!item.highlight && item.highlight !== 'default'
            return (
              <motion.div
                key={`${id}-slot-${idx}`}
                layout
                className="min-w-[48px] h-12 border flex items-center justify-center rounded-md relative"
                initial={false}
                animate={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  boxShadow: isHighlighted ? `0 0 8px ${colors.border}60` : 'none',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <span className="viz-label-primary" style={{ color: colors.text }}>
                  {item.value}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Index labels below cells */}
        {items.length > 0 && (
          <div className="flex gap-2 mt-1.5 relative z-10">
            {items.map((_, idx) => (
              <div
                key={`${id}-idx-${idx}`}
                className="min-w-[48px] flex items-center justify-center"
              >
                <span className="viz-index-label">{idx}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

