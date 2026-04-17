import { z } from 'zod'

// ─── Stage 1: Scene Skeleton ──────────────────────────────────────────────────

/**
 * Stage 1 output: the structural skeleton of the scene.
 *
 * `layout` here is the visual layout algorithm (LayoutHint), NOT the page
 * layout. Assembly maps it to a default layoutHint for visuals and derives
 * the Scene.layout (page layout) from the skeleton type.
 */
export const SceneSkeletonSchema = z.object({
  title: z.string().min(2).max(100),
  type: z.enum(['concept', 'dsa', 'lld', 'hld']),
  layout: z.enum([
    'dagre-TB', 'dagre-LR', 'dagre-BT',
    'tree-RT', 'linear-H', 'linear-V',
    'grid-2d', 'hashmap-buckets', 'radial',
  ]),
  visuals: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'ID must be lowercase-hyphen (e.g. arr, left-ptr)'),
    type: z.enum([
      'array', 'hashmap', 'linked-list', 'tree', 'graph',
      'stack', 'queue', 'dp-table', 'recursion-tree',
      'system-diagram', 'text-badge', 'counter',
    ]),
    hint: z.string().optional(),
    slot: z.enum([
      'top-left', 'top-center', 'top-right',
      'bottom-left', 'bottom-center', 'bottom-right',
      'left-center', 'right-center',
      'overlay-top', 'overlay-bottom', 'center',
    ]).optional(),
  })).min(1).max(8),
  stepCount: z.number().int().min(3).max(20),
})

export type SceneSkeletonParsed = z.infer<typeof SceneSkeletonSchema>

// ─── Stage 2: Steps + Explanations (dynamic schema factory) ──────────────────

// z.record(z.string(), z.any()) avoids additionalProperties:false in JSON Schema,
// which Gemini's structured output API does not support.
const VisualParamsSchema = z.record(z.string(), z.any())

/**
 * buildStepsSchema creates the Stage 2 schema after Stage 1 completes.
 *
 * The dynamic z.enum([...visualIds]) on `target` is the primary
 * anti-hallucination layer: generateObject cannot physically produce an
 * action.target that isn't a valid visual ID from Stage 1.
 *
 * Schema field ordering (explanation BEFORE actions) mirrors the pedagogical
 * intent: the AI must commit to WHY before deciding WHAT to animate.
 *
 * `initialStates` uses z.record(z.string(), ...) rather than z.record(visualIdEnum, ...)
 * because an enum-keyed record generates additionalProperties:false in JSON Schema,
 * which Gemini's structured output rejects. Visual ID constraints on initialStates
 * are enforced downstream by validateSteps (Checks 1 & 2).
 */
export function buildStepsSchema(visualIds: string[]) {
  const visualIdEnum = z.enum(visualIds as [string, ...string[]])
  return z.object({
    initialStates: z.record(z.string(), VisualParamsSchema),
    steps: z.array(z.object({
      index: z.number().int().min(1),
      explanation: z.object({
        heading: z.string().max(80),
        body: z.string().max(400),
      }),
      actions: z.array(z.object({
        target: visualIdEnum,
        params: VisualParamsSchema,
      })),
    })).min(1),
  })
}

export type StepsParsed = {
  initialStates: Record<string, Record<string, unknown>>
  steps: Array<{
    index: number
    explanation: { heading: string; body: string }
    actions: Array<{ target: string; params: Record<string, unknown> }>
  }>
}

// ─── Stage 3: Popups (dynamic schema factory) ─────────────────────────────────

/**
 * buildPopupsSchema constrains attachTo to valid visual IDs from Stage 1.
 * Style values match the existing Scene Popup type enum exactly.
 */
export function buildPopupsSchema(visualIds: string[]) {
  return z.object({
    popups: z.array(z.object({
      attachTo: z.enum(visualIds as [string, ...string[]]),
      showAtStep: z.number().int().min(1),
      hideAtStep: z.number().int().min(1),
      text: z.string().min(5).max(200),
      style: z.enum(['info', 'warning', 'success', 'insight']).optional(),
    })).max(6),
  })
}

export type PopupsParsed = z.infer<ReturnType<typeof buildPopupsSchema>>

// ─── Stage 4: Misc (challenges + optional controls) ──────────────────────────

/**
 * MCQ-style challenges with question/options/answer fields.
 * Assembly maps these to the existing Scene Challenge shape (title + description).
 */
export const MiscSchema = z.object({
  challenges: z.array(z.object({
    question: z.string().min(10).max(300),
    options: z.array(z.string().min(1).max(100)).min(2).max(4),
    answer: z.number().int().min(0).max(3),
    type: z.enum(['predict', 'break-it', 'optimize']).optional(),
  })).max(3),
  controls: z.array(z.object({
    id: z.string(),
    label: z.string(),
    action: z.string(),
  })).optional(),
})

export type MiscParsed = z.infer<typeof MiscSchema>
