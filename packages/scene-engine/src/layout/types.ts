import type { VisualType } from '../types'

export interface PositionedNode {
  id: string
  x: number          // center x in SVG coordinate space
  y: number          // center y in SVG coordinate space
  width: number
  height: number
  // Original visual data flows through
  type: VisualType
  state: Record<string, unknown>  // visual state at current step
}

export interface PositionedEdge {
  id: string
  from: string    // source node ID
  to: string      // target node ID
  label?: string
  waypoints: { x: number; y: number }[]  // edge routing path (computed by dagre/ELK)
}

export interface LayoutResult {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  boundingBox: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  viewBox: string  // pre-computed: `${minX-pad} ${minY-pad} ${w+2pad} ${h+2pad}`
}

export interface LayoutInput {
  visual: import('../types').Visual
  state: Record<string, unknown>  // current visual state (step-specific)
}
