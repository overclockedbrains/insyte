import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface GridCell {
  state: 'empty' | 'wall' | 'visited' | 'path' | 'start' | 'end' | 'active'
  value?: string | number
}

interface GridState {
  rows: number
  cols: number
  cells: GridCell[][]
  currentCell?: { row: number; col: number }
}

export function GridViz({ id, state }: PrimitiveProps) {
  const { rows, cols, cells = [], currentCell } = state as GridState

  return (
    <div className="relative flex flex-col items-center justify-center p-8 w-full overflow-auto max-h-[600px]">
      <div className="relative inline-flex flex-col gap-1 p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`gr-${rIdx}`} className="flex gap-1">
            {Array.from({ length: cols }).map((_, cIdx) => {
              const cell = cells[rIdx]?.[cIdx]
              const cellState = cell?.state || 'empty'
              const value = cell?.value

              let bgColor = 'var(--color-surface-container)' // empty (surface-container)
              let borderColor = 'color-mix(in srgb, var(--color-outline-variant) 20%, transparent)'
              let shadow = 'none'
              let textColor = 'var(--color-on-surface-variant)'

              if (cellState === 'wall') {
                bgColor = 'var(--color-surface-container-highest)' // surface-container-highest
                borderColor = 'var(--color-outline-variant)'
                textColor = 'var(--color-outline-variant)'
              } else if (cellState === 'visited') {
                bgColor = 'color-mix(in srgb, var(--color-primary) 20%, transparent)' // primary/20
                borderColor = 'color-mix(in srgb, var(--color-primary) 30%, transparent)'
                textColor = 'var(--color-primary)'
              } else if (cellState === 'path') {
                bgColor = 'color-mix(in srgb, var(--color-secondary) 40%, transparent)' // secondary/40
                borderColor = 'var(--color-secondary)'
                shadow = '0 0 10px color-mix(in srgb, var(--color-secondary) 60%, transparent)'
                textColor = 'var(--color-inverse-surface)'
              } else if (cellState === 'start') {
                bgColor = 'var(--color-primary)' // primary
                borderColor = 'var(--color-primary-fixed)'
                textColor = 'var(--color-on-primary)' // on-primary
              } else if (cellState === 'end') {
                bgColor = 'var(--color-secondary)' // secondary
                borderColor = 'var(--color-secondary-dim)'
                textColor = 'var(--color-on-secondary)' // on-secondary
              } else if (cellState === 'active') {
                bgColor = 'color-mix(in srgb, var(--color-primary) 60%, transparent)' // pulsing primary
                borderColor = 'var(--color-primary)'
                textColor = 'var(--color-on-surface)'
              }

              const isCurrent = currentCell?.row === rIdx && currentCell?.col === cIdx

              return (
                <div key={`gc-${rIdx}-${cIdx}`} className="relative w-8 h-8">
                  <motion.div
                    layout
                    className="absolute inset-0 rounded flex items-center justify-center font-mono text-xs font-bold border"
                    animate={{
                      backgroundColor: bgColor,
                      borderColor: borderColor,
                      boxShadow: shadow,
                      color: textColor,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    {value !== undefined ? value : ''}
                  </motion.div>

                  {/* Current Cell Indicator Overlay */}
                  {isCurrent && (
                    <motion.div
                      layoutId={`${id}-cursor`}
                      className="absolute inset-[-4px] rounded-lg border-2 border-primary pointer-events-none z-10"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      style={{ boxShadow: '0 0 12px color-mix(in srgb, var(--color-primary) 80%, transparent)' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
