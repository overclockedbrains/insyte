import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.';

interface ArrayState {
  values: (string | number)[]
  highlights?: { index: number; color: string }[]
  pointers?: { index: number; label: string; color: string }[]
  windowHighlight?: { start: number; end: number }
}

export function ArrayViz({ id, state }: PrimitiveProps) {
  const arrayState = state as ArrayState

  const { values = [], highlights = [], pointers = [], windowHighlight } = arrayState

  return (
    <div className="relative flex flex-col items-center justify-center p-8 w-full">
      {/* Window Highlight */}
      {windowHighlight && (
        <motion.div
          className="absolute h-16 rounded-xl border-2 pointer-events-none"
          style={{
            borderColor: 'rgba(183, 159, 255, 0.4)', // primary with opacity
            backgroundColor: 'rgba(183, 159, 255, 0.1)',
          }}
          initial={false}
          animate={{
            left: `calc(50% - ${(values.length * 56) / 2}px + ${windowHighlight.start * 56}px - 4px)`,
            width: `${(windowHighlight.end - windowHighlight.start + 1) * 56 + 8}px`,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}

      {/* Cells */}
      <div className="flex gap-2 relative z-10">
        {values.map((val, idx) => {
          const highlight = highlights.find((h) => h.index === idx)

          return (
            <motion.div
              key={`${id}-cell-${idx}`}
              layoutId={`${id}-cell-${idx}`}
              className="min-w-[48px] h-12 border border-outline-variant flex items-center justify-center font-mono text-sm rounded-md relative bg-surface-container"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                backgroundColor: highlight ? highlight.color : 'var(--color-surface-container)',
                boxShadow: highlight ? `0 0 12px ${highlight.color}40` : 'none',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <span className="text-on-surface font-bold">{val}</span>
            </motion.div>
          )
        })}
      </div>

      {/* Pointers */}
      <div className="relative w-full h-12 mt-2">
        {pointers.map((ptr) => {
          return (
            <motion.div
              key={`${id}-ptr-${ptr.label}`}
              layoutId={`${id}-ptr-${ptr.label}`}
              className="absolute top-0 flex flex-col items-center justify-start"
              initial={false}
              animate={{
                left: `calc(50% - ${(values.length * 56) / 2}px + ${ptr.index * 56 + 24}px)`,
                x: '-50%',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: ptr.color }}>
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
                style={{ color: ptr.color }}
              >
                {ptr.label}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
