import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface DPTableState {
  rows: number
  cols: number
  cells: {
    value: string | number
    highlight?: 'current' | 'dependency' | 'filled'
  }[][]
  rowLabels?: string[]
  colLabels?: string[]
}

export function DPTableViz({ state }: PrimitiveProps) {
  const { rows, cols, cells = [], rowLabels, colLabels } = state as DPTableState

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full">
      <div className="relative inline-flex flex-col border-2 border-outline-variant/30 bg-surface-container rounded-xl overflow-hidden">
        {/* Column Labels */}
        {colLabels && (
          <div className="flex bg-surface-container-highest border-b border-outline-variant/30">
            {rowLabels && <div className="w-12 border-r border-outline-variant/30" />} {/* Empty corner */}
            {colLabels.map((lbl, idx) => (
              <div
                key={`col-lbl-${idx}`}
                className="w-12 h-8 flex items-center justify-center border-r border-outline-variant/20 last:border-r-0 font-mono text-[10px] font-bold text-on-surface-variant overflow-hidden"
              >
                {lbl}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div key={`row-${rIdx}`} className="flex border-b border-outline-variant/20 last:border-b-0">
              {/* Row Label */}
              {rowLabels && (
                <div className="w-12 h-12 flex items-center justify-center bg-surface-container-highest border-r border-outline-variant/30 font-mono text-[10px] font-bold text-on-surface-variant overflow-hidden">
                  {rowLabels[rIdx]}
                </div>
              )}

              {/* Cells */}
              {Array.from({ length: cols }).map((_, cIdx) => {
                const cellData = cells[rIdx]?.[cIdx]
                const val = cellData?.value ?? ''
                const highlight = cellData?.highlight

                let bgColor = 'rgba(0, 0, 0, 0)'
                let color = 'var(--color-on-surface)' // on-surface
                let scaleIn = false
                let shadow = 'none'

                if (highlight === 'current') {
                  bgColor = 'rgba(183, 159, 255, 0.2)' // primary
                  color = 'var(--color-primary)'
                  scaleIn = true
                  shadow = '0 0 12px rgba(183,159,255,0.6)'
                } else if (highlight === 'dependency') {
                  bgColor = 'rgba(58, 223, 250, 0.15)' // secondary
                  color = 'var(--color-secondary)'
                } else if (highlight === 'filled') {
                  bgColor = 'var(--color-surface-container-highest)' // surface-container-highest
                }

                return (
                  <div
                    key={`cell-${rIdx}-${cIdx}`}
                    className="w-12 h-12 flex items-center justify-center border-r border-outline-variant/20 last:border-r-0 relative"
                  >
                    <AnimatePresence>
                      {val !== '' && (
                        <motion.div
                          initial={scaleIn ? { scale: 0 } : false}
                          animate={{
                            scale: 1,
                            backgroundColor: bgColor,
                            color,
                            boxShadow: shadow,
                          }}
                          className="absolute inset-[2px] rounded flex items-center justify-center font-mono text-sm font-bold"
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          {val}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
