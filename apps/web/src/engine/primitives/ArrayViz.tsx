import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.';

// ─── State ────────────────────────────────────────────────────────────────────
// Each cell carries its own highlight state so the parser's 'highlight' action
// (which mutates cells[index].highlight) works correctly.

interface CellItem {
  value: string | number
  highlight?: string
}

interface ArrayState {
  cells: CellItem[]
  pointers?: { index: number; label: string; color?: string }[]
  windowHighlight?: { start: number; end: number }
}

// ─── Highlight → visual token ─────────────────────────────────────────────────

function getCellStyle(highlight?: string): {
  bg: string
  shadow: string
  borderColor: string
} {
  switch (highlight) {
    case 'active':
    case 'insert':
      return {
        bg: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
        shadow: '0 0 12px color-mix(in srgb, var(--color-primary) 40%, transparent)',
        borderColor: 'var(--color-primary)',
      }
    case 'found':
    case 'hit':
      return {
        bg: 'color-mix(in srgb, var(--color-secondary) 20%, transparent)',
        shadow: '0 0 12px color-mix(in srgb, var(--color-secondary) 40%, transparent)',
        borderColor: 'var(--color-secondary)',
      }
    case 'miss':
    case 'collision':
    case 'delete':
      return {
        bg: 'color-mix(in srgb, var(--color-error) 20%, transparent)',
        shadow: '0 0 12px color-mix(in srgb, var(--color-error) 40%, transparent)',
        borderColor: 'var(--color-error)',
      }
    case 'compare':
      return {
        bg: 'color-mix(in srgb, var(--color-tertiary, #cf9fff) 20%, transparent)',
        shadow: '0 0 12px color-mix(in srgb, var(--color-tertiary, #cf9fff) 40%, transparent)',
        borderColor: 'var(--color-tertiary, #cf9fff)',
      }
    default:
      return {
        bg: 'var(--color-surface-container-highest)',
        shadow: 'none',
        borderColor: 'var(--color-outline-variant)',
      }
  }
}

// ─── ArrayViz ──────────────────────────────────────────────────────────────────

export function ArrayViz({ id, state }: PrimitiveProps) {
  const { cells = [], pointers = [], windowHighlight } = state as ArrayState

  return (
    <div className="relative flex flex-col items-center justify-center p-8 w-full">

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

      {/* Cells */}
      <div className="flex gap-2 relative z-10">
        {cells.map((cell, idx) => {
          const { bg, shadow, borderColor } = getCellStyle(cell.highlight)
          return (
            <motion.div
              key={`${id}-cell-${idx}`}
              className="min-w-[48px] h-12 border flex items-center justify-center font-mono text-sm rounded-md relative"
              initial={{ backgroundColor: bg, boxShadow: shadow, borderColor }}
              animate={{ backgroundColor: bg, boxShadow: shadow, borderColor }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <span className="text-on-surface font-bold">{cell.value}</span>
            </motion.div>
          )
        })}
      </div>

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
                className="mt-1 font-mono text-[10px] uppercase font-bold"
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
