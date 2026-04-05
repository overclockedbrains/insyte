import { z } from 'zod'
import type { Scene } from './types'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const SceneTypeSchema = z.enum(['concept', 'dsa-trace', 'lld', 'hld'])

export const SceneLayoutSchema = z.enum([
  'canvas-only',
  'code-left-canvas-right',
  'text-left-canvas-right',
])

export const VisualTypeSchema = z.enum([
  'array',
  'hashmap',
  'linked-list',
  'tree',
  'graph',
  'stack',
  'queue',
  'dp-table',
  'recursion-tree',
  'system-diagram',
  'text-badge',
  'counter',
  'grid',
  'bezier-connector',
  'straight-arrow',
  'data-flow-dot',
])

export const ControlTypeSchema = z.enum([
  'slider',
  'toggle',
  'input',
  'button',
  'toggle-group',
])

// ─── Condition ────────────────────────────────────────────────────────────────

export const ConditionSchema = z.object({
  control: z.string(),
  equals: z.unknown(),
})

// ─── Visual ───────────────────────────────────────────────────────────────────

export const VisualSchema = z.object({
  id: z.string(),
  type: VisualTypeSchema,
  label: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  initialState: z.unknown(),
  showWhen: ConditionSchema.optional(),
})

// ─── Action ───────────────────────────────────────────────────────────────────

export const ActionSchema = z.object({
  target: z.string(),
  action: z.string(),
  params: z.record(z.unknown()),
})

// ─── Step ─────────────────────────────────────────────────────────────────────

export const StepSchema = z.object({
  index: z.number().int().nonnegative(),
  actions: z.array(ActionSchema),
  duration: z.number().positive().optional(),
})

// ─── Control ──────────────────────────────────────────────────────────────────

export const ControlSchema = z.object({
  id: z.string(),
  type: ControlTypeSchema,
  label: z.string(),
  config: z.record(z.unknown()),
})

// ─── Explanation ──────────────────────────────────────────────────────────────

export const ExplanationSectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
  appearsAtStep: z.number().int().nonnegative(),
  callout: z.string().optional(),
})

// ─── Popup ────────────────────────────────────────────────────────────────────

export const PopupSchema = z.object({
  id: z.string(),
  attachTo: z.string(),
  text: z.string(),
  showAtStep: z.number().int().nonnegative(),
  hideAtStep: z.number().int().nonnegative().optional(),
  showWhen: ConditionSchema.optional(),
  style: z.enum(['info', 'success', 'warning', 'insight']).optional(),
  anchor: z.object({ x: z.number(), y: z.number() }).optional(),
  targetPoint: z.object({ x: z.number(), y: z.number() }).optional(),
})

// ─── Challenge ────────────────────────────────────────────────────────────────

export const ChallengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['predict', 'break-it', 'optimize', 'scenario']),
})

// ─── Code (DSA mode) ─────────────────────────────────────────────────────────

export const SceneCodeSchema = z.object({
  language: z.enum(['python', 'javascript']),
  source: z.string(),
  highlightByStep: z.array(z.number().int().nonnegative()),
})

// ─── Scene (root) ─────────────────────────────────────────────────────────────

export const SceneSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: SceneTypeSchema,
  layout: SceneLayoutSchema,
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  code: SceneCodeSchema.optional(),
  visuals: z.array(VisualSchema),
  steps: z.array(StepSchema),
  controls: z.array(ControlSchema),
  explanation: z.array(ExplanationSectionSchema),
  popups: z.array(PopupSchema),
  challenges: z.array(ChallengeSchema).optional(),
  complexity: z
    .object({ time: z.string().optional(), space: z.string().optional() })
    .optional(),
})

// ─── Parse helpers ────────────────────────────────────────────────────────────

/**
 * Validates raw input as a Scene. Throws a ZodError on failure.
 * Use this when you want strict validation with full error details.
 */
export function parseScene(input: unknown): Scene {
  return SceneSchema.parse(input) as Scene
}

/**
 * Safely validates raw input as a Scene without throwing.
 * Returns { success: true, scene } or { success: false, error }.
 * Used in streaming scenarios where partial data may arrive incrementally.
 */
export function safeParseScene(
  input: unknown,
): { success: true; scene: Scene } | { success: false; error: z.ZodError } {
  const result = SceneSchema.safeParse(input)
  if (result.success) {
    return { success: true, scene: result.data as Scene }
  }
  return { success: false, error: result.error }
}
