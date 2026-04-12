'use client'

/**
 * DPTableViz — Phase 27 fix: cell remounting eliminated.
 *
 * The old implementation wrapped each cell in AnimatePresence. On any step
 * change all rows/cols (up to 100+) would remount simultaneously, firing
 * hundreds of animation instances at once and causing jank.
 *
 * Fix: cells are rendered statically (no AnimatePresence). A `data-cell="row-col"`
 * attribute allows useAnimate() to target individual cells imperatively when
 * only the changed subset needs to animate.
 */

import { useEffect, useRef } from 'react'
import { useAnimate } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { resolveHighlight } from '../styles/colors'

interface DPCell {
  value: string | number
  highlight?: string
}

interface DPTableState {
  rows: number
  cols: number
  cells: DPCell[][]
  rowLabels?: string[]
  colLabels?: string[]
}

export function DPTableViz({ state }: PrimitiveProps) {
  const { rows, cols, cells = [], rowLabels, colLabels } = state as DPTableState
  const [scope, animate] = useAnimate()

  // Track previous cells to compute the diff of changed cells each step.
  const prevCellsRef = useRef<DPCell[][]>([])

  useEffect(() => {
    const prev = prevCellsRef.current
    const changedCells: { row: number; col: number; highlight: string | undefined }[] = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cur = cells[r]?.[c]
        const old = prev[r]?.[c]
        if (!cur) continue
        if (!old || old.highlight !== cur.highlight || old.value !== cur.value) {
          changedCells.push({ row: r, col: c, highlight: cur.highlight })
        }
      }
    }

    if (changedCells.length > 0 && scope.current) {
      changedCells.forEach(({ row, col, highlight }) => {
        const colors = resolveHighlight(highlight)
        animate(
          `[data-cell="${row}-${col}"]`,
          { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text },
          { duration: 0.25, ease: 'easeOut' },
        )
      })
    }

    prevCellsRef.current = cells.map(row => row.map(cell => ({ ...cell })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, rows, cols])

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full">
      <div
        ref={scope}
        className="relative inline-flex flex-col border-2 border-outline-variant/30 bg-surface-container rounded-xl overflow-hidden"
      >
        {/* Column Labels */}
        {colLabels && (
          <div className="flex bg-surface-container-highest border-b border-outline-variant/30">
            {rowLabels && <div className="w-12 border-r border-outline-variant/30" />}
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

              {/* Cells — no AnimatePresence; color transitions driven imperatively above */}
              {Array.from({ length: cols }).map((_, cIdx) => {
                const cellData = cells[rIdx]?.[cIdx]
                const val = cellData?.value ?? ''
                // Initial colors from current state (handles first render + jumps)
                const colors = resolveHighlight(cellData?.highlight)

                return (
                  <div
                    key={`cell-${rIdx}-${cIdx}`}
                    data-cell={`${rIdx}-${cIdx}`}
                    className="w-12 h-12 flex items-center justify-center border-r border-outline-variant/20 last:border-r-0 font-mono text-sm font-bold transition-none"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  >
                    {val}
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
