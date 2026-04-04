// Scene JSON — Universal Format for insyte
// All AI-generated and hand-crafted simulations flow through these types.

// ─── Top-level type aliases ───────────────────────────────────────────────────

export type SceneType = 'concept' | 'dsa-trace' | 'lld' | 'hld'

export type SceneLayout =
  | 'canvas-only'
  | 'code-left-canvas-right'
  | 'text-left-canvas-right'

/** @deprecated Use SceneLayout */
export type LayoutType = SceneLayout

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
  | 'grid'
  | 'bezier-connector'
  | 'straight-arrow'
  | 'data-flow-dot'

export type CodeLanguage = 'python' | 'javascript'

// ─── Condition ────────────────────────────────────────────────────────────────

/** Evaluates whether a control matches a specific value — used for showWhen. */
export interface Condition {
  /** The id of the Control to evaluate */
  control: string
  /** The value the control must equal for the condition to be true */
  equals: unknown
}

// ─── Visual ───────────────────────────────────────────────────────────────────

export interface Visual {
  id: string
  type: VisualType
  label?: string
  position?: { x: number; y: number }
  /** The visual's initial data state before any actions are applied */
  initialState: unknown
  /** If present, this visual is only shown when the condition is true */
  showWhen?: Condition
}

// ─── Action ───────────────────────────────────────────────────────────────────

/** A single mutation instruction applied to a visual at a step. */
export interface Action {
  /** ID of the target Visual */
  target: string
  /** Action name — e.g. 'set-cells', 'push', 'highlight', 'set-value' */
  action: string
  /** Action-specific parameters */
  params: Record<string, unknown>
}

// ─── Step ─────────────────────────────────────────────────────────────────────

export interface Step {
  /** 0-based step index */
  index: number
  /** Actions to apply to visuals at this step */
  actions: Action[]
  /** Optional duration hint (ms) for auto-advance */
  duration?: number
}

// ─── Control ──────────────────────────────────────────────────────────────────

export type ControlType = 'slider' | 'toggle' | 'input' | 'button' | 'toggle-group'

export interface Control {
  id: string
  type: ControlType
  label: string
  /** Type-specific configuration (min/max/step/options/etc.) */
  config: Record<string, unknown>
}

// ─── Explanation ──────────────────────────────────────────────────────────────

export interface ExplanationSection {
  /** Section heading text */
  heading: string
  /** Main body — markdown string */
  body: string
  /** Step index at which this section becomes visible */
  appearsAtStep: number
  /** Optional highlighted callout text */
  callout?: string
}

// ─── Popup ────────────────────────────────────────────────────────────────────

export interface Popup {
  id: string
  /** ID of the Visual this popup is attached to */
  attachTo: string
  text: string
  /** Step at which the popup appears */
  showAtStep: number
  /** Step at which the popup disappears (if omitted, stays until end) */
  hideAtStep?: number
  /** Conditionally show based on a control value */
  showWhen?: Condition
  style?: 'info' | 'success' | 'warning' | 'insight'
}

// ─── Challenge ────────────────────────────────────────────────────────────────

export interface Challenge {
  id: string
  title: string
  description: string
  type: 'predict' | 'break-it' | 'optimize' | 'scenario'
}

// ─── Code (DSA mode) ──────────────────────────────────────────────────────────

export interface SceneCode {
  language: CodeLanguage
  source: string
  /** Line number (0-based) to highlight at each step index */
  highlightByStep: number[]
}

// ─── Scene (root) ─────────────────────────────────────────────────────────────

export interface Scene {
  id: string
  title: string
  type: SceneType
  layout: SceneLayout
  description?: string
  category?: string
  tags?: string[]

  /** DSA mode only — the code being traced */
  code?: SceneCode

  visuals: Visual[]
  steps: Step[]
  controls: Control[]
  explanation: ExplanationSection[]
  popups: Popup[]
  challenges?: Challenge[]

  complexity?: {
    time?: string
    space?: string
  }
}

// ─── VisualState ──────────────────────────────────────────────────────────────

/** The computed state of a visual after applying actions up to a given step. */
export type VisualState = Record<string, unknown>

// ─── SceneJSON namespace (convenience re-export) ──────────────────────────────

export namespace SceneJSON {
  export type Root = Scene
  export type VisualItem = Visual
  export type StepItem = Step
  export type ActionItem = Action
  export type ControlItem = Control
  export type ExplanationItem = ExplanationSection
  export type PopupItem = Popup
  export type ChallengeItem = Challenge
  export type ConditionItem = Condition
  export type Layout = SceneLayout
  export type Type = SceneType
}
