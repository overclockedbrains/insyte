import type { PrimitiveProps } from '.'
import { BezierConnector } from '../connectors/BezierConnector'

// ─── BezierConnectorViz ───────────────────────────────────────────────────────
// Registry wrapper so BezierConnector can be used as a scene visual.
// State shape: { from: {x,y}, to: {x,y}, active?: boolean }

interface BezierConnectorState {
  from: { x: number; y: number }
  to: { x: number; y: number }
  active?: boolean
}

export function BezierConnectorViz({ state }: PrimitiveProps) {
  const { from, to, active } = state as BezierConnectorState
  if (!from || !to) return null
  return <BezierConnector from={from} to={to} active={active} />
}
