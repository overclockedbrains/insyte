// Scene JSON — Universal Format for insyte
// All AI-generated and hand-crafted simulations flow through these types.

export type SceneType = 'concept' | 'dsa-trace' | 'lld' | 'hld'

export type LayoutType =
  | 'canvas-only'
  | 'code-left-canvas-right'
  | 'text-left-canvas-right'

export type VisualType =
  | 'array'
  | 'hashmap'
  | 'linked-list'
  | 'tree'
  | 'graph'
  | 'stack'
  | 'queue'
  | 'dp-table'
  | 'recursion-tree'
  | 'system-diagram'
  | 'text-badge'
  | 'counter'

export type CodeLanguage = 'python' | 'javascript'

// ─── Visual Primitives ────────────────────────────────────────────────────────

export interface VisualBase {
  id: string
  type: VisualType
  label?: string
  position?: { x: number; y: number }
}

// Array cell value with optional highlight state
export interface ArrayCell {
  value: string | number | null
  highlight?: 'default' | 'active' | 'found' | 'comparing' | 'done'
}

export interface ArrayVisual extends VisualBase {
  type: 'array'
  cells: ArrayCell[]
  pointers?: Array<{ index: number; label: string }>
}

export interface HashMapEntry {
  key: string
  value: string | number
  highlight?: 'default' | 'active' | 'collision' | 'found'
}

export interface HashMapVisual extends VisualBase {
  type: 'hashmap'
  buckets: Array<HashMapEntry[]>
  capacity?: number
}

export interface LinkedListNode {
  id: string
  value: string | number
  highlight?: 'default' | 'active' | 'found'
}

export interface LinkedListVisual extends VisualBase {
  type: 'linked-list'
  nodes: LinkedListNode[]
  headPointer?: string
}

export interface TreeNode {
  id: string
  value: string | number
  leftId?: string
  rightId?: string
  highlight?: 'default' | 'active' | 'visited' | 'found'
}

export interface TreeVisual extends VisualBase {
  type: 'tree'
  nodes: TreeNode[]
  rootId?: string
}

export interface GraphNode {
  id: string
  label: string
  x?: number
  y?: number
  highlight?: 'default' | 'active' | 'visited' | 'found'
}

export interface GraphEdge {
  from: string
  to: string
  weight?: number
  directed?: boolean
  highlight?: 'default' | 'active' | 'traversed'
}

export interface GraphVisual extends VisualBase {
  type: 'graph'
  nodes: GraphNode[]
  edges: GraphEdge[]
  directed?: boolean
}

export interface StackVisual extends VisualBase {
  type: 'stack'
  items: Array<{ value: string | number; highlight?: 'default' | 'active' | 'popped' }>
}

export interface QueueVisual extends VisualBase {
  type: 'queue'
  items: Array<{ value: string | number; highlight?: 'default' | 'active' | 'dequeued' }>
}

export interface DPTableCell {
  value: string | number | null
  highlight?: 'default' | 'active' | 'computed' | 'used'
}

export interface DPTableVisual extends VisualBase {
  type: 'dp-table'
  rows: DPTableCell[][]
  rowLabels?: string[]
  colLabels?: string[]
}

export interface RecursionTreeNode {
  id: string
  call: string
  returnValue?: string | number
  highlight?: 'default' | 'active' | 'memoized' | 'resolved'
  children?: string[]
}

export interface RecursionTreeVisual extends VisualBase {
  type: 'recursion-tree'
  nodes: RecursionTreeNode[]
  rootId?: string
}

export interface SystemComponent {
  id: string
  label: string
  sublabel?: string
  x: number
  y: number
  highlight?: 'default' | 'active' | 'error' | 'processing'
}

export interface SystemFlow {
  from: string
  to: string
  label?: string
  highlight?: 'default' | 'active' | 'error'
}

export interface SystemDiagramVisual extends VisualBase {
  type: 'system-diagram'
  components: SystemComponent[]
  flows: SystemFlow[]
}

export interface TextBadgeVisual extends VisualBase {
  type: 'text-badge'
  text: string
  color?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'error'
}

export interface CounterVisual extends VisualBase {
  type: 'counter'
  value: number
  color?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'error'
}

export type Visual =
  | ArrayVisual
  | HashMapVisual
  | LinkedListVisual
  | TreeVisual
  | GraphVisual
  | StackVisual
  | QueueVisual
  | DPTableVisual
  | RecursionTreeVisual
  | SystemDiagramVisual
  | TextBadgeVisual
  | CounterVisual

// ─── Steps ────────────────────────────────────────────────────────────────────

// A patch to apply to a visual at a given step
export interface VisualPatch {
  visualId: string
  // Partial update to merge into the visual's current state
  patch: Record<string, unknown>
}

export interface Step {
  index: number
  label: string
  description?: string
  patches: VisualPatch[]
  // Which explanation section to highlight (by id)
  explanationId?: string
  // Which code line to highlight (0-based)
  codeLine?: number
}

// ─── Controls ─────────────────────────────────────────────────────────────────

export type ControlType = 'slider' | 'toggle' | 'button' | 'select'

export interface SliderControl {
  id: string
  type: 'slider'
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
}

export interface ToggleControl {
  id: string
  type: 'toggle'
  label: string
  defaultValue: boolean
}

export interface ButtonControl {
  id: string
  type: 'button'
  label: string
  action: string
}

export interface SelectControl {
  id: string
  type: 'select'
  label: string
  options: Array<{ value: string; label: string }>
  defaultValue: string
}

export type Control = SliderControl | ToggleControl | ButtonControl | SelectControl

// ─── Explanation ──────────────────────────────────────────────────────────────

export interface ExplanationSection {
  id: string
  title?: string
  body: string
  // Which step indices this section is active for
  stepRange?: [number, number]
}

// ─── Popups ───────────────────────────────────────────────────────────────────

export interface Popup {
  id: string
  targetVisualId: string
  text: string
  // Which step indices this popup is visible
  stepRange: [number, number]
  position?: 'top' | 'bottom' | 'left' | 'right'
}

// ─── Conditions ───────────────────────────────────────────────────────────────

export interface Condition {
  id: string
  expression: string
  trueLabel: string
  falseLabel: string
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export type ChallengeType = 'trace' | 'predict' | 'modify' | 'quiz'

export interface Challenge {
  id: string
  type: ChallengeType
  question: string
  hint?: string
  // For quiz type
  options?: string[]
  correctAnswer?: string | number
}

// ─── Code (DSA mode) ──────────────────────────────────────────────────────────

export interface SceneCode {
  language: CodeLanguage
  source: string
  // Line number (0-based) to highlight at each step index
  highlightByStep: number[]
}

// ─── Scene (root) ─────────────────────────────────────────────────────────────

export interface Scene {
  id: string
  title: string
  type: SceneType
  layout: LayoutType
  description?: string
  category?: string
  tags?: string[]

  // DSA mode only — the code being traced
  code?: SceneCode

  visuals: Visual[]
  steps: Step[]
  controls: Control[]
  explanation: ExplanationSection[]
  popups: Popup[]
  challenges?: Challenge[]
  conditions?: Condition[]

  // Metadata
  complexity?: {
    time?: string
    space?: string
  }
}
