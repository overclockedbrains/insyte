import type { PrimitiveProps } from '.'
import { BezierConnector } from '../connectors/BezierConnector'

// ─── BezierConnectorViz ───────────────────────────────────────────────────────
// Registry wrapper so BezierConnector can be used as a scene visual.
//
// State shape:
//   { from: {x,y}, to: {x,y}, highlight?: string, active?: boolean }
//
// Phase 27: `highlight` (semantic token) forwarded to BezierConnector.
// Legacy `active` boolean still supported for backwards compatibility.

interface BezierConnectorState {
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** Phase 27: semantic highlight token ('active', 'hit', 'insert', …) */
  highlight?: string
  /** Legacy: binary active/inactive state */
  active?: boolean
}

export function BezierConnectorViz({ state }: PrimitiveProps) {
  const { from, to, highlight, active } = state as BezierConnectorState
  if (!from || !to) return null
  return <BezierConnector from={from} to={to} highlight={highlight} active={active} />
}
