import type { PrimitiveProps } from '.'
import { DataFlowDot } from '../connectors/DataFlowDot'

// ─── DataFlowDotViz ───────────────────────────────────────────────────────────
// Registry wrapper so DataFlowDot can be used as a scene visual.
// State shape: { pathD: string, color?: string, duration?: number, repeat?: boolean }

interface DataFlowDotState {
  pathD: string
  color?: string
  duration?: number
  repeat?: boolean
}

export function DataFlowDotViz({ state }: PrimitiveProps) {
  const { pathD, color, duration, repeat } = state as DataFlowDotState
  if (!pathD) return null
  return <DataFlowDot pathD={pathD} color={color} duration={duration} repeat={repeat} />
}
