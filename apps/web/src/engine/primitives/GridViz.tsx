import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'

// ─── Types ─────────────────────────────────────────────────────────────────────
type CellState = 'empty' | 'wall' | 'visited' | 'path' | 'start' | 'end' | 'active'

interface GridCell {
  state: CellState
  value?: string | number
}

interface GridState {
  rows: number
  cols: number
  cells: GridCell[][]
  currentCell?: { row: number; col: number }
}

// ─── Grid-specific cell colors ────────────────────────────────────────────────
//
// Grid cells represent PERSISTENT structural data states — they need much
// higher contrast than transient highlight overlays (which use 0.10 opacity
// for brief flashes). Using resolveHighlight() here makes land/water
// indistinguishable, so we maintain a dedicated color table at appropriate
// opacity levels.
//
//   empty    → dark resting surface
//   wall     → very dark / blocked (water, barrier)
//   start    → green ~40% opacity  (unvisited land — clearly visible as "land")
//   visited  → cyan ~25% opacity   (flood-filled / explored land)
//   active   → cyan ~40% opacity   (currently active DFS cell)
//   path     → green ~55% opacity  (solution path — most vivid)
//   end      → amber ~35% opacity  (target destination)

const GRID_CELL_COLORS: Record<CellState, { bg: string; border: string; text: string; shadow: string }> = {
  empty:   { bg: '#19191f',                    border: '#48474d',  text: '#6b7280', shadow: 'none' },
  wall:    { bg: '#0c0c14',                    border: '#1c1c26',  text: '#2a2a38', shadow: 'none' },
  start:   { bg: 'rgba(34, 197, 94, 0.40)',    border: '#22c55e',  text: '#e2e8f0', shadow: '0 0 10px rgba(34,197,94,0.30)' },
  visited: { bg: 'rgba(58, 223, 250, 0.22)',   border: '#3adffa',  text: '#3adffa', shadow: '0 0 8px rgba(58,223,250,0.20)' },
  active:  { bg: 'rgba(58, 223, 250, 0.40)',   border: '#3adffa',  text: '#e2e8f0', shadow: '0 0 12px rgba(58,223,250,0.40)' },
  path:    { bg: 'rgba(34, 197, 94, 0.55)',    border: '#22c55e',  text: '#e2e8f0', shadow: '0 0 12px rgba(34,197,94,0.45)' },
  end:     { bg: 'rgba(245, 158, 11, 0.35)',   border: '#f59e0b',  text: '#f59e0b', shadow: '0 0 10px rgba(245,158,11,0.30)' },
}

function resolveCellColors(cellState: CellState): { bg: string; border: string; text: string; shadow: string } {
  return GRID_CELL_COLORS[cellState] ?? GRID_CELL_COLORS.empty
}

// ─── GridViz ───────────────────────────────────────────────────────────────────
//
// Phase 27: resolveHighlight() maps grid cell states to the shared semantic
// color system. Wall cells keep their structural dark style.

export function GridViz({ id, state }: PrimitiveProps) {
  const { rows, cols, cells = [], currentCell } = state as GridState

  return (
    <div className="relative flex flex-col items-center justify-center p-8 w-full overflow-auto max-h-[600px]">
      <div className="relative inline-flex flex-col gap-1 p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`gr-${rIdx}`} className="flex gap-1">
            {Array.from({ length: cols }).map((_, cIdx) => {
              const cell      = cells[rIdx]?.[cIdx]
              const cellState = (cell?.state ?? 'empty') as CellState
              const value     = cell?.value
              const isCurrent = currentCell?.row === rIdx && currentCell?.col === cIdx

              const { bg, border, text, shadow } = resolveCellColors(cellState)

              return (
                <div key={`gc-${rIdx}-${cIdx}`} className="relative w-8 h-8">
                  <motion.div
                    layout
                    className="absolute inset-0 rounded flex items-center justify-center font-mono text-xs font-bold border"
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

                  {/* Current-cell cursor — FLIP-animated as it moves */}
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
