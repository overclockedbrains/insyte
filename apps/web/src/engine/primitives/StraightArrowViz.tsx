import type { PrimitiveProps } from '.'
import { StraightArrow } from '../connectors/StraightArrow'

// ─── StraightArrowViz ─────────────────────────────────────────────────────────
// Registry wrapper so StraightArrow can be used as a scene visual.
//
// State shape:
//   { from: {x,y}, to: {x,y}, highlight?: string, color?: string, label?: string, active?: boolean }
//
// Phase 27: `highlight` (semantic token) forwarded to StraightArrow.
// Legacy `color` and `active` props still supported for backwards compatibility.

interface StraightArrowState {
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** Phase 27: semantic highlight token ('active', 'hit', 'insert', …) */
  highlight?: string
  /** Legacy: raw CSS color value */
  color?: string
  label?: string
  active?: boolean
}

export function StraightArrowViz({ state }: PrimitiveProps) {
  const { from, to, highlight, color, label, active } = state as StraightArrowState
  if (!from || !to) return null
  return (
    <StraightArrow
      from={from}
      to={to}
      highlight={highlight}
      color={color}
      label={label}
      active={active}
    />
  )
}
