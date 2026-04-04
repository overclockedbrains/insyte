import type { PrimitiveProps } from '.'
import { StraightArrow } from '../connectors/StraightArrow'

// ─── StraightArrowViz ─────────────────────────────────────────────────────────
// Registry wrapper so StraightArrow can be used as a scene visual.
// State shape: { from: {x,y}, to: {x,y}, color?: string, label?: string, active?: boolean }

interface StraightArrowState {
  from: { x: number; y: number }
  to: { x: number; y: number }
  color?: string
  label?: string
  active?: boolean
}

export function StraightArrowViz({ state }: PrimitiveProps) {
  const { from, to, color, label, active } = state as StraightArrowState
  if (!from || !to) return null
  return <StraightArrow from={from} to={to} color={color} label={label} active={active} />
}
