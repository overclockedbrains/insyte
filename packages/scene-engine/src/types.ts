// Scene JSON — Universal Format for insyte
// Types derived from spec.build.ts (single source of truth).

// ─── Re-exports from spec.build ───────────────────────────────────────────────

export type {
  Scene,
  CanvasVisual,
  Step,
  LayoutHint,
  LinearVisual,
  MapVisual,
  TreeVisual,
  GraphVisual,
  GridVisual,
  SystemDiagramVisual,
  ChartVisual,
  TreeNode,
} from './spec.build'

// ─── Derived type aliases ─────────────────────────────────────────────────────

import type { Scene, CanvasVisual } from './spec.build'

export type VisualType   = CanvasVisual['type']
export type SceneType    = Scene['type']
export type SceneLayout  = Scene['layout']
export type CodeLanguage = NonNullable<Scene['code']>['language']
export type Control      = Scene['controls'][number]
export type Popup        = Scene['popups'][number]
export type Challenge    = NonNullable<Scene['challenges']>[number]
export type HudItem      = NonNullable<Scene['hud']>[number]
export type ActiveText   = NonNullable<Scene['activeText']>
export type SceneCode    = NonNullable<Scene['code']>

/** The computed state of a visual after applying step updates up to a given step. */
export type VisualState = Record<string, unknown>

// ─── Condition (used by step-engine and scene-graph; not in scene JSON) ───────

export type Condition =
  | { type: 'step-range';     from: number;   to: number }
  | { type: 'after-step';     after: number }
  | { type: 'before-step';    before: number }
  | { type: 'control-toggle'; controlId: string; value?: unknown }
  | { type: 'always' }
