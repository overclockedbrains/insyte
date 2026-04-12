// Public API of @insyte/scene-engine
// Pure TypeScript + Zod — zero React dependency

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Scene,
  SceneType,
  SceneLayout,
  VisualType,
  CodeLanguage,
  Visual,
  Action,
  Step,
  Control,
  ControlType,
  ExplanationSection,
  Popup,
  Challenge,
  Condition,
  SceneCode,
  VisualState,
  LayoutHint,
  SlotPosition,
} from './types'

// SceneJSON namespace
export type { SceneJSON } from './types'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
export {
  SceneSchema,
  SceneLayoutSchema,
  SceneTypeSchema,
  VisualSchema,
  VisualTypeSchema,
  ActionSchema,
  StepSchema,
  ControlSchema,
  ControlTypeSchema,
  ExplanationSectionSchema,
  PopupSchema,
  ChallengeSchema,
  ConditionSchema,
  SceneCodeSchema,
  LayoutHintSchema,
  SlotPositionSchema,
  // Schema-level parse helpers (throw/safe variants)
  parseScene as parseSceneSchema,
  safeParseScene as safeParseSceneSchema,
} from './schema'

// ─── Parser ───────────────────────────────────────────────────────────────────
export {
  // Main API — validates + normalizes in one call
  parseScene,
  safeParseScene,
  // Utilities
  normalizeScene,
  computeVisualStateAtStep,
  // Errors
  SceneParseError,
  // Legacy (deprecated)
  tryParseScene,
} from './parser'

// ─── Layout Engine ────────────────────────────────────────────────────────────
export { computeLayout, computeViewBox } from './layout/index'
export type { LayoutResult, PositionedNode, PositionedEdge } from './layout/types'
