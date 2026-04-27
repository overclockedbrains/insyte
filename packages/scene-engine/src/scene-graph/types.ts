import type { VisualType, CanvasVisual } from '../types'

export interface SceneNode {
  id: string
  type: VisualType
  groupId: string              // parent canvas visual ID
  x: number                   // center X (from layout engine)
  y: number                   // center Y (from layout engine)
  width: number
  height: number
  state: Record<string, unknown>   // full visual state at this step
  highlight?: string               // semantic highlight key (e.g. 'active', 'insert')
}

export interface SceneEdge {
  id: string
  from: string                 // source node ID
  to: string                   // target node ID
  label?: string
  waypoints?: { x: number; y: number }[]
}

export interface SceneGroup {
  id: string                   // = canvas visual ID
  nodeIds: string[]
  bbox: { x: number; y: number; width: number; height: number }
  label?: string               // visual.label
  isHud: false                 // always false — text-badge/counter removed from canvas
  visualType: VisualType       // primitive type for PrimitiveRegistry lookup
  state?: Record<string, unknown> // full visual state at this step
  visual?: CanvasVisual        // the original visual definition
}

export interface SceneGraph {
  nodes: Map<string, SceneNode>
  edges: Map<string, SceneEdge>
  groups: Map<string, SceneGroup>
  stepIndex: number
}

export interface SceneGraphDiff {
  added: SceneNode[]
  removed: SceneNode[]
  moved: Array<{ prev: SceneNode; next: SceneNode }>
  changed: Array<{ prev: SceneNode; next: SceneNode }>
  addedEdges: SceneEdge[]
  removedEdges: SceneEdge[]
}
