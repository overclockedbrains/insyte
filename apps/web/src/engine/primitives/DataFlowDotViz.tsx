import type { PrimitiveProps } from '.'
import { DataFlowDot } from '../connectors/DataFlowDot'

// ─── DataFlowDotViz ───────────────────────────────────────────────────────────
// Registry wrapper so DataFlowDot can be used as a scene visual.
//
// State shape:
//   { pathD: string, highlight?: string, color?: string, duration?: number, repeat?: boolean }
//
// Phase 27: `highlight` (semantic token) forwarded to DataFlowDot.
// Legacy `color` prop still supported for backwards compatibility.

interface DataFlowDotState {
  pathD: string
  /** Phase 27: semantic highlight token ('active', 'hit', 'insert', …) */
  highlight?: string
  /** Legacy: raw CSS color value */
  color?: string
  duration?: number
  repeat?: boolean
}

export function DataFlowDotViz({ state }: PrimitiveProps) {
  const { pathD, highlight, color, duration, repeat } = state as DataFlowDotState
  if (!pathD) return null
  return (
    <DataFlowDot
      pathD={pathD}
      highlight={highlight}
      color={color}
      duration={duration}
      repeat={repeat}
    />
  )
}
