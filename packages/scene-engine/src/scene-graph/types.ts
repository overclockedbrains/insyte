import type { VisualType, Condition } from '../types'

export interface SceneNode {
  id: string
  type: VisualType
  groupId: string              // parent visual ID
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
  waypoints?: { x: number; y: number }[]  // routing points; populated by ELK in Phase 28
}

export interface SceneGroup {
  id: string                   // = visual ID
  nodeIds: string[]
  bbox: { x: number; y: number; width: number; height: number }
  // Display metadata — lifted from scene.visuals so renderers need no raw Scene access
  label?: string               // visual.label
  isHud: boolean               // true for text-badge / counter (renders in HUD zone)
  visualType: VisualType       // primitive type — for PrimitiveRegistry lookup
  // Visibility — control-toggle is true in step engine; renderer layer filters on this
  showWhen?: Condition
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
  changed: Array<{ prev: SceneNode; next: SceneNode }>   // state changed, not position
  addedEdges: SceneEdge[]
  removedEdges: SceneEdge[]
}
