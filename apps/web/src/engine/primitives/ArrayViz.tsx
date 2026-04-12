import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { resolveHighlight } from '../styles/colors'

// ─── State ────────────────────────────────────────────────────────────────────
interface CellItem {
  value: string | number
  highlight?: string
}

interface ArrayState {
  cells: CellItem[]
  pointers?: { index: number; label: string; color?: string }[]
  windowHighlight?: { start: number; end: number }
}

// ─── ArrayViz ──────────────────────────────────────────────────────────────────
//
// Phase 27: stable slot-based keys so that value changes at a slot animate
// in-place (no remount). layoutId enables FLIP when the array grows/shrinks.

export function ArrayViz({ id, state }: PrimitiveProps) {
  const { cells = [], pointers = [], windowHighlight } = state as ArrayState

  return (
    <div className="relative flex flex-col items-center justify-center p-4 w-full">

      {/* Window highlight bracket */}
      {windowHighlight && (
        <motion.div
          className="absolute h-16 rounded-xl border-2 pointer-events-none"
          style={{
            borderColor: 'rgba(183, 159, 255, 0.4)',
            backgroundColor: 'rgba(183, 159, 255, 0.1)',
          }}
          initial={false}
          animate={{
            left: `calc(50% - ${(cells.length * 56) / 2}px + ${windowHighlight.start * 56}px - 4px)`,
            width: `${(windowHighlight.end - windowHighlight.start + 1) * 56 + 8}px`,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}

      {/* Cells
       * Phase 27: key = "${id}-slot-${idx}" (slot identity, not value).
       * When the value at slot i changes, the div stays mounted and animates
       * backgroundColor / borderColor in-place. No remount = no flash.
       * layoutId enables FLIP when the array is resized across steps.
       */}
      <div className="flex gap-2 relative z-10">
        {cells.map((cell, idx) => {
          const colors = resolveHighlight(cell.highlight)
          const isHighlighted = !!cell.highlight && cell.highlight !== 'default'
          return (
            <motion.div
              key={`${id}-slot-${idx}`}
              layoutId={`${id}-slot-${idx}`}
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
                {cell.value}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Index labels */}
      {cells.length > 0 && (
        <div className="flex gap-2 mt-1 relative z-10">
          {cells.map((_, idx) => (
            <div
              key={`${id}-idx-${idx}`}
              className="min-w-[48px] flex items-center justify-center"
            >
              <span className="viz-index-label">{idx}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pointers (e.g. i, j, lo, hi) */}
      {pointers.length > 0 && (
        <div className="relative w-full h-12 mt-2">
          {pointers.map((ptr) => (
            <motion.div
              key={`${id}-ptr-${ptr.label}`}
              layoutId={`${id}-ptr-${ptr.label}`}
              className="absolute top-0 flex flex-col items-center justify-start"
              initial={false}
              animate={{
                left: `calc(50% - ${(cells.length * 56) / 2}px + ${ptr.index * 56 + 24}px)`,
                x: '-50%',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                style={{ color: ptr.color ?? 'var(--color-primary)' }}
              >
                <path
                  d="M12 4L12 20M12 4L6 10M12 4L18 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                className="mt-1 viz-index-label uppercase font-bold"
                style={{ color: ptr.color ?? 'var(--color-primary)' }}
              >
                {ptr.label}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
