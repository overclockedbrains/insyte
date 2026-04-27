import { z } from 'zod'
import {
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
} from '@insyte/scene-engine'

// ─── Stage 1: Scene Skeleton ──────────────────────────────────────────────────

/**
 * Stage 1 output: the structural skeleton of the scene.
 *
 * canvas[] contains visual declarations (type + variant + id + layoutHint) with NO initialState.
 * initialStates are generated in Stage 2.
 * activeText and hud are declared here (presence only); initial values come from Stage 2.
 */
export const SceneSkeletonSchema = z.object({
  title: z.string().min(2).max(100),
  type: z.enum(['concept', 'dsa-trace', 'lld', 'hld']),
  description: z.string().max(400).optional(),
  category: z.string().max(80).optional(),
  canvas: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'ID must be lowercase-hyphen (e.g. arr, seen-map)'),
    label: z.string().optional().describe('Title rendered above the visual. ALWAYS provide this for linear, map, grid, and chart primitives!'),
    type: z.enum(['linear', 'map', 'tree', 'graph', 'grid', 'system-diagram', 'chart']),
    variant: z.string().optional(),
    layoutHint: z.enum([
      'dagre-TB', 'dagre-LR', 'dagre-BT', 'tree-RT',
      'linear-H', 'linear-V', 'grid-2d', 'hashmap-buckets', 'radial',
      'chart-bar', 'ring',
    ]),
  })).min(1).max(8),
  activeText: z.boolean().optional(),
  hud: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    label: z.string(),
  })).max(3).optional(),
  stepCount: z.number().int().min(3).max(20),
})

export type SceneSkeletonParsed = z.infer<typeof SceneSkeletonSchema>

// ─── Stage 2: Steps + Initial States (skeleton-aware factory) ─────────────────

/**
 * Returns the correct initialState Zod schema for a given visual type.
 * Identity-based types (graph/tree/system-diagram) use topology schemas.
 * Sequential types (linear/map/grid/chart) use their full-snapshot schemas.
 */
function buildInitialStateSchemaForType(type: string): z.ZodType {
  switch (type) {
    case 'linear':         return LinearStateSchema
    case 'map':            return MapStateSchema
    case 'grid':           return GridStateSchema
    case 'chart':          return ChartStateSchema
    case 'tree':           return TreeStateSchema
    case 'graph':          return GraphStateSchema
    case 'system-diagram': return SystemDiagramStateSchema
    default:               return z.record(z.string(), z.unknown())
  }
}

/**
 * Returns the correct step canvas Zod schema for a given visual type.
 * Identity-based types use sparse overlay schemas (nodeStates/edgeStates etc.).
 * Sequential types use the same full-snapshot schema as initialState.
 */
function buildStepCanvasSchemaForType(type: string): z.ZodType {
  switch (type) {
    case 'graph':          return GraphStepCanvasSchema
    case 'tree':           return TreeStepCanvasSchema
    case 'system-diagram': return SystemDiagramStepCanvasSchema
    case 'linear':         return LinearStateSchema
    case 'map':            return MapStateSchema
    case 'grid':           return GridStateSchema
    case 'chart':          return ChartStateSchema
    default:               return z.record(z.string(), z.unknown())
  }
}

/**
 * buildStepsSchema creates the Stage 2 schema after Stage 1 completes.
 *
 * Takes the skeleton so it can build per-visual-type schemas for both
 * initialStates and step canvas entries. This means:
 *  - graph/tree/system-diagram initialState must have topology keys (nodes, rootId, etc.)
 *  - graph/tree/system-diagram step canvas must use sparse overlay keys (nodeStates etc.)
 *    and will be REJECTED if it contains topology keys (nodes/edges/components/connections)
 *  - sequential types enforce their full-snapshot shapes on every step canvas entry
 *
 * The strongly-typed schema feeds precise Zod validation errors into error-guided
 * retry prompts so the model is told exactly what to fix.
 */
export function buildStepsSchema(skeleton: SceneSkeletonParsed) {
  const initialStatesShape: Record<string, z.ZodType> = {}
  const canvasShape:        Record<string, z.ZodType> = {}

  for (const visual of skeleton.canvas) {
    initialStatesShape[visual.id] = buildInitialStateSchemaForType(visual.type)
    canvasShape[visual.id]        = buildStepCanvasSchemaForType(visual.type)
  }

  const stepSchema = z.object({
    index: z.number().int().min(1),
    explanation: z.object({
      heading: z.string().max(80),
      body:    z.string().max(500),
      callout: z.string().max(200).optional(),
    }),
    activeText: z.string().min(1).optional(),
    hud:        z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    canvas:     z.object(canvasShape).partial().optional(),
  })

  return z.object({
    initialStates:     z.object(initialStatesShape),
    initialActiveText: z.string().optional(),
    initialHud:        z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    steps:             z.array(stepSchema).min(1),
  })
}

export type StepsParsed = {
  initialStates: Record<string, Record<string, unknown>>
  initialActiveText?: string
  initialHud?: Record<string, string | number>
  steps: Array<{
    index: number
    explanation: { heading: string; body: string; callout?: string }
    activeText?: string
    hud?: Record<string, string | number>
    canvas?: Record<string, Record<string, unknown>>
  }>
}

// ─── Stage 3: Popups (dynamic schema factory) ─────────────────────────────────

/**
 * buildPopupsSchema constrains attachTo to valid canvas visual IDs from Stage 1.
 */
export function buildPopupsSchema(canvasVisualIds: string[]) {
  return z.object({
    popups: z.array(z.object({
      attachTo: z.enum(canvasVisualIds as [string, ...string[]]),
      showAtStep: z.number().int().min(1),
      hideAtStep: z.number().int().min(1),
      text: z.string().min(5).max(200),
      style: z.enum(['info', 'warning', 'success', 'insight']).optional(),
    })).max(6),
  })
}

export type PopupsParsed = z.infer<ReturnType<typeof buildPopupsSchema>>

// ─── Stage 4: Misc (challenges + complexity) ─────────────────────────────────

export const MiscSchema = z.object({
  challenges: z.array(z.object({
    title: z.string().min(3).max(80),
    description: z.string().min(10).max(400),
    type: z.enum(['predict', 'break-it', 'optimize', 'scenario']),
  })).min(1).max(4),
  complexity: z.object({
    time: z.string().optional(),
    space: z.string().optional(),
  }).optional(),
})

export type MiscParsed = z.infer<typeof MiscSchema>
