import { z } from 'zod'
import { buildSceneSchema } from './spec.build'
import type { Scene } from './spec.build'

// ─── Re-exports from spec.build ───────────────────────────────────────────────
// LayoutHintSchema lives in spec.build to avoid a circular dependency
// (spec.build used to import it from here; now the direction is reversed).

export {
  LayoutHintSchema,
  ControlSchema,
  PopupSchema,
  ChallengeSchema,
  SceneCodeSchema,
  HudItemSchema,
  ActiveTextSchema,
} from './spec.build'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const SceneTypeSchema = z.enum(['concept', 'dsa-trace', 'lld', 'hld'])

export const SceneLayoutSchema = z.enum([
  'canvas-only',
  'code-left-canvas-right',
  'text-left-canvas-right',
])

// ─── Condition (used by step-engine and scene-graph; not part of scene JSON) ──

export const ConditionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('step-range'),     from: z.number(), to: z.number() }),
  z.object({ type: z.literal('after-step'),     after: z.number() }),
  z.object({ type: z.literal('before-step'),    before: z.number() }),
  z.object({ type: z.literal('control-toggle'), controlId: z.string(), value: z.unknown().optional() }),
  z.object({ type: z.literal('always') }),
])

// ─── Scene (root) ─────────────────────────────────────────────────────────────

export const SceneSchema = buildSceneSchema()

// ─── Parse helpers ────────────────────────────────────────────────────────────

export function parseScene(input: unknown): Scene {
  return SceneSchema.parse(input) as Scene
}

export function safeParseScene(
  input: unknown,
): { success: true; scene: Scene } | { success: false; error: z.ZodError } {
  const result = SceneSchema.safeParse(input)
  if (result.success) {
    return { success: true, scene: result.data as Scene }
  }
  return { success: false, error: result.error }
}
