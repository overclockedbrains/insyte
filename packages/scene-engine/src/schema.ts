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

// A permissive type trick to allow dynamic structured values without structured generation dropping them
const DynamicObjectSchema = z.record(z.string(), z.any())

export const VisualSchema = z.object({
  id: z.string(),
  type: VisualTypeSchema,
  label: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  initialState: DynamicObjectSchema.optional().describe('Visual-specific initial configuration, e.g. { "entries": [] } or { "text": "foo" }'),
  showWhen: ConditionSchema.optional(),
}).describe('A visual primitive representing a core data structure or graphic element on the canvas (e.g. array, hashmap, tree, text-badge).')

// ─── Action ───────────────────────────────────────────────────────────────────

const BaseActionSchema = z.object({
  target: z.string(),
})

// Typed state shapes for the "set" action, one per visual type.
// Using a union means the JSON Schema becomes anyOf with required fields —
// the model cannot emit {} because it satisfies none of the branches.
export const ActionSchema = z.discriminatedUnion('action', [
  BaseActionSchema.extend({
    action: z.literal('set'),
    // z.record keeps the schema simple enough for Gemini's constrained decoding.
    // Content correctness is enforced by the system prompt + post-generation validation.
    params: z.record(z.string(), z.any()).describe('Visual state object. Must include the required field for the target visual type: text-badge→text, hashmap→entries[], linked-list→nodes[], array→cells[], stack/queue→items[], counter→value, tree→root, graph→nodes[]+edges[].'),
  }),
  BaseActionSchema.extend({
    action: z.literal('set-value'),
    params: z.object({
      value: z.any().describe('The primitive scalar value to set (e.g. text string, counter number, or boolean).'),
    }),
  }),
  BaseActionSchema.extend({
    action: z.literal('push'),
    params: z.object({
      field: z.string().optional().describe('Target array field name (e.g. "items", "cells", "entries")'),
      item: z.any().describe('The item to append to the array'),
    }),
  }),
  BaseActionSchema.extend({
    action: z.literal('pop'),
    params: z.object({
      field: z.string().optional(),
    }),
  }),
  BaseActionSchema.extend({
    action: z.literal('highlight'),
    params: z.object({
      field: z.string().optional(),
      index: z.number().describe('Array index to target'),
      value: z.any().optional().describe('The highlight payload (e.g. "hit", "miss", "active", or full object)'),
    }),
  }),
]).describe('A mutation or animation mapping to a specific visual on the canvas during a particular step.')

// ─── Step ─────────────────────────────────────────────────────────────────────

export const StepSchema = z.object({
  index: z.number().int().nonnegative(),
  actions: z.array(ActionSchema),
  duration: z.number().positive().optional(),
}).describe('A sequential animation step representing one meaningful moment in the execution. Contains multiple synchronous actions.')

// ─── Control ──────────────────────────────────────────────────────────────────

const BaseControlSchema = z.object({
  id: z.string(),
  label: z.string(),
})

export const ControlSchema = z.discriminatedUnion('type', [
  BaseControlSchema.extend({
    type: z.literal('slider'),
    config: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional(),
      defaultValue: z.number(),
    }).describe('Slider config. Must include defaultValue.'),
  }),
  BaseControlSchema.extend({
    type: z.literal('toggle'),
    config: z.object({
      defaultValue: z.boolean(),
    }).describe('Toggle config. Must include defaultValue.'),
  }),
  BaseControlSchema.extend({
    type: z.literal('input'),
    config: z.object({
      placeholder: z.string().optional(),
      defaultValue: z.string(),
    }).describe('Input config. Must include defaultValue.'),
  }),
  BaseControlSchema.extend({
    type: z.literal('toggle-group'),
    config: z.object({
      options: z.array(z.string()),
      defaultValue: z.string(),
    }).describe('Toggle-group config. Must include options and defaultValue.'),
  }),
  BaseControlSchema.extend({
    type: z.literal('button'),
    config: z.record(z.string(), z.any()).optional().describe('Button config (usually empty).'),
  }),
]).describe('An interactive, user-facing UI control (slider, toggle, input) that allows users to mutate or explore sandbox states.')

// ─── Explanation ──────────────────────────────────────────────────────────────

export const ExplanationSectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
  appearsAtStep: z.number().int().nonnegative(),
  callout: z.string().optional(),
}).describe('A single narrative block teaching the user about what is happening on screen, mapped chronologically to a specific step.')

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
}).describe('A transient, contextual annotation popup that briefly attaches to a visual element to warn or inform the user mid-animation.')

// ─── Challenge ────────────────────────────────────────────────────────────────

export const ChallengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['predict', 'break-it', 'optimize', 'scenario']),
}).describe('An engaging thought-exercise or mini-puzzle requiring the user to apply knowledge they learned.')

// ─── Code (DSA mode) ─────────────────────────────────────────────────────────

export const SceneCodeSchema = z.object({
  language: z.enum(['python', 'javascript']),
  source: z.string(),
  highlightByStep: z.array(z.number().int().nonnegative()),
}).describe('Source code block shown on the left panel when using code-left-canvas-right mode, tracking execution line-by-line via steps.')

// ─── Scene (root) ─────────────────────────────────────────────────────────────

// Helper: accepts T | null | undefined, outputs T | undefined.
// Gemini sometimes emits explicit `null` for optional fields; Zod's .optional()
// rejects null (only accepts undefined), so we coerce null → undefined here.
const nullish = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().or(z.null().transform((): undefined => undefined))

export const SceneSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: SceneTypeSchema,
  layout: SceneLayoutSchema,
  description: nullish(z.string()),
  category: nullish(z.string()),
  tags: nullish(z.array(z.string())),
  code: nullish(SceneCodeSchema),
  visuals: z.array(VisualSchema),
  steps: z.array(StepSchema),
  controls: z.array(ControlSchema),
  explanation: z.array(ExplanationSectionSchema),
  popups: z.array(PopupSchema),
  challenges: nullish(z.array(ChallengeSchema)),
  complexity: nullish(
    z.object({ time: z.string().optional(), space: z.string().optional() }),
  ),
}).describe(
  'A complete Insyte scene representing an interactive, playback-based educational visualization. Contains declarations for UI controls, layout nodes, explanations, actions, and the full timeline of steps required to animate it.',
)

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
