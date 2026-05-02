'use client'

import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { DPTableViz } from './DPTableViz'
import { getGridCellColors, type GridCellState } from '../styles/colors'
import { useThemeSync } from '../styles/useThemeSync'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GridCell {
  highlight?: string
  value?: string | number
}

interface GridState {
  rows: number
  cols: number
  cells: GridCell[][]
  currentCell?: { row: number; col: number }
}

function resolveCellColors(highlight: string | undefined): { bg: string; border: string; text: string; shadow: string } {
  const cells = getGridCellColors()
  return cells[(highlight as GridCellState) ?? 'default'] ?? cells.default
}

// ─── GridViz ───────────────────────────────────────────────────────────────────

export function GridViz(props: PrimitiveProps) {
  // Route dp variant to its dedicated renderer
  if (props.visual?.variant === 'dp') {
    return <DPTableViz {...props} />
  }
  return <PathfindingGridViz {...props} />
}

function PathfindingGridViz({ id, state }: PrimitiveProps) {
  useThemeSync()
  const { rows, cols, cells = [], currentCell } = state as GridState

  return (
    <div className="relative flex flex-col items-center justify-center p-8 w-full overflow-auto max-h-[600px]">
      {/* Container: bg-surface-container-low — NOT lowest (pure black) */}
      <div className="relative inline-flex flex-col gap-1.5 p-3 bg-surface-container-low rounded-[12px] border border-outline-variant/30">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`gr-${rIdx}`} className="flex gap-1.5">
            {Array.from({ length: cols }).map((_, cIdx) => {
              const cell      = cells[rIdx]?.[cIdx]
              const highlight = cell?.highlight
              const value     = cell?.value
              const isCurrent = currentCell?.row === rIdx && currentCell?.col === cIdx

              const { bg, border, text, shadow } = resolveCellColors(highlight)

              return (
                <div key={`gc-${rIdx}-${cIdx}`} className="relative w-9 h-9">
                  {/* rounded-[4px] — explicit px to avoid --radius: 1rem making cells circular */}
                  <motion.div
                    layout
                    className="absolute inset-0 rounded-[4px] flex items-center justify-center font-mono text-xs font-bold border"
                    animate={{
                      backgroundColor: bg,
                      borderColor:     border,
                      boxShadow:       shadow,
                      color:           text,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    {value !== undefined ? value : ''}
                  </motion.div>

                  {/* Cursor: glow derived from this cell's own border color */}
                  {isCurrent && (
                    <motion.div
                      layoutId={`${id}-cursor`}
                      className="absolute inset-[-4px] rounded-[7px] border-2 pointer-events-none z-10"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      style={{
                        borderColor: border,
                        boxShadow: `0 0 14px ${border}99`,
                      }}
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
