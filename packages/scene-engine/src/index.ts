// Public API of @insyte/scene-engine
// Pure TypeScript + Zod — zero React dependency

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Scene,
  SceneType,
  SceneLayout,
  VisualType,
  CanvasVisual,
  CodeLanguage,
  Control,
  Popup,
  Challenge,
  Condition,
  SceneCode,
  VisualState,
  LayoutHint,
  HudItem,
  ActiveText,
  Step,
  // Per-type canvas visual aliases
  LinearVisual,
  MapVisual,
  TreeVisual,
  GraphVisual,
  GridVisual,
  SystemDiagramVisual,
  TreeNode,
} from './types'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
export {
  SceneSchema,
  SceneLayoutSchema,
  SceneTypeSchema,
  LayoutHintSchema,
  ControlSchema,
  PopupSchema,
  ChallengeSchema,
  ConditionSchema,
  SceneCodeSchema,
  HudItemSchema,
  ActiveTextSchema,
  // Schema-level parse helpers (throw/safe variants, no normalization)
  parseScene as parseSceneSchema,
  safeParseScene as safeParseSceneSchema,
} from './schema'

// ─── Spec builders (for AI pipeline) ─────────────────────────────────────────
export {
  buildCanvasVisualSchema,
  buildStepSchema,
  buildSceneSchema,
  buildPromptGuide,
  buildJsonSchema,
  // Per-type state schemas (used by apps/web/src/ai/schemas.ts to build typed Stage 2 validation)
  LinearStateSchema,
  MapStateSchema,
  GridStateSchema,
  ChartStateSchema,
  TreeStateSchema,
  GraphStateSchema,
  SystemDiagramStateSchema,
  GraphStepCanvasSchema,
  TreeStepCanvasSchema,
  SystemDiagramStepCanvasSchema,
} from './spec.build'

// ─── Parser ───────────────────────────────────────────────────────────────────
export {
  parseScene,
  safeParseScene,
  normalizeScene,
  computeVisualStateAtStep,
  SceneParseError,
  tryParseScene,
} from './parser'

// ─── Layout Engine ────────────────────────────────────────────────────────────
export { computeLayout, computeViewBox } from './layout/index'
export type { LayoutResult, PositionedNode, PositionedEdge } from './layout/types'

// ─── Step Engine ──────────────────────────────────────────────────────────────
export {
  applyStepActionsUpTo,
  getVisualStateAtStep,
  applyOverlaysAtStep,
  computeTopologyAtStep,
  hashTopologyAtStep,
  evaluateCondition,
  validateStepSequence,
} from './step-engine'
export type { StepValidationResult } from './step-engine'

// ─── Scene Graph ──────────────────────────────────────────────────────────────
export {
  computeSceneGraphAtStep,
  diffSceneGraphs,
} from './scene-graph'
export type {
  SceneNode,
  SceneEdge,
  SceneGroup,
  SceneGraph,
  SceneGraphDiff,
} from './scene-graph'

// ─── Runtime ──────────────────────────────────────────────────────────────────
export { LRUCache } from './runtime'
