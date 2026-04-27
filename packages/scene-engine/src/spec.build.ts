import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { CANVAS_VISUAL_SPEC, ACTIVE_TEXT_SPEC, HUD_SPEC, STEP_SPEC } from './spec'
import type { CanvasVisualSpecEntry } from './spec'

// ─── LayoutHintSchema (defined here to avoid circular dependency with schema.ts) ─

export const LayoutHintSchema = z.enum([
  'dagre-TB', 'dagre-LR', 'dagre-BT', 'tree-RT',
  'linear-H', 'linear-V', 'grid-2d', 'hashmap-buckets', 'radial',
  'chart-bar', 'ring',
])

export type LayoutHint = z.infer<typeof LayoutHintSchema>

// ─── Per-type initialState schemas ────────────────────────────────────────────

const LinearStateSchema = z.object({
  items: z.array(z.object({
    id:        z.string(),
    value:     z.unknown(),
    highlight: z.string().optional(),
  })),
  pointers: z.array(z.object({
    index: z.number(),
    label: z.string().optional(),
    color: z.string().optional(),
  })).optional(),
  windowHighlight: z.object({
    start: z.number(),
    end:   z.number(),
  }).optional(),
})

const MapStateSchema = z.object({
  entries: z.array(z.object({
    id:        z.string(),
    key:       z.string(),
    value:     z.string(),
    highlight: z.enum(['default', 'insert', 'hit', 'remove']).optional(),
  })),
})

export interface TreeNode {
  id: string
  value: string
  children: string[]
  highlight?: string
  result?: string
}

const FlatTreeNodeSchema = z.object({
  id:        z.string(),
  value:     z.string(),
  children:  z.array(z.string()),
  highlight: z.string().optional(),
  result:    z.string().optional(),
  isEnd:     z.boolean().optional(),
})

const TreeStateSchema = z.object({
  nodes:  z.array(FlatTreeNodeSchema),
  rootId: z.string().nullable().optional(),
})

const GraphStateSchema = z.object({
  nodes: z.array(z.object({
    id:        z.string(),
    label:     z.string(),
    highlight: z.string().optional(),
    distance:  z.string().optional(),
  })),
  edges: z.array(z.object({
    id:        z.string(),
    from:      z.string(),
    to:        z.string(),
    label:     z.string().optional(),
    directed:  z.boolean().optional(),
    highlight: z.string().optional(),
    weight:    z.number().optional(),
  })),
})

const GridStateSchema = z.object({
  rows:    z.number(),
  cols:    z.number(),
  cells:   z.array(z.array(z.object({
    value:     z.unknown(),
    highlight: z.string().optional(),
  }))),
  rowLabels:   z.array(z.string()).optional(),
  colLabels:   z.array(z.string()).optional(),
  currentCell: z.object({ row: z.number(), col: z.number() }).optional(),
})

const SystemDiagramStateSchema = z.object({
  components: z.array(z.object({
    id:       z.string(),
    label:    z.string(),
    icon:     z.enum(['server', 'database', 'mobile', 'web', 'compute', 'cloud', 'shield', 'layers', 'zap']),
    status:   z.enum(['normal', 'active', 'overloaded', 'dead']).optional(),  // ephemeral — step-engine initialises to 'normal'
    sublabel: z.string().optional(),
  })),
  connections: z.array(z.object({
    id:     z.string(),               // required — sparse overlay references connections by id
    from:   z.string(),
    to:     z.string(),
    active: z.boolean().optional(),   // ephemeral — step-engine initialises to false
    style:  z.enum(['solid', 'dashed', 'dotted']).optional(),
    label:  z.string().optional(),
  })),
})

const ChartStateSchema = z.object({
  bars: z.array(z.object({
    id:        z.string(),
    value:     z.number(),
    label:     z.string().optional(),
    highlight: z.string().optional(),
  })),
  maxValue: z.number().optional(),
})

// ─── Step canvas schemas for identity-based primitives ────────────────────────
// These replace the full-snapshot schemas in step canvas validation.
// initialState schemas (above) are unchanged — topology declared once there.

const GraphStepCanvas = z.object({
  nodeStates: z.record(z.object({
    highlight: z.string().optional(),
    distance:  z.string().optional(),
  })).optional(),
  edgeStates: z.record(z.object({
    highlight: z.string().optional(),
  })).optional(),
  newNodes:    z.array(z.object({ id: z.string(), label: z.string() }).passthrough()).optional(),
  updateNodes: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  newEdges:    z.array(z.object({ id: z.string(), from: z.string(), to: z.string() }).passthrough()).optional(),
  updateEdges: z.array(z.object({ id: z.string() }).passthrough()).optional(),
}).strict()

const TreeStepCanvas = z.object({
  nodeStates: z.record(z.object({
    highlight: z.string().optional(),
    result:    z.string().nullable().optional(),
  })).optional(),
  newNodes:    z.array(z.object({
    id: z.string(), value: z.string(), children: z.array(z.string()),
  }).passthrough()).optional(),
  updateNodes: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  updateRoot:  z.string().nullable().optional(),
}).strict()

const SystemDiagramStepCanvas = z.object({
  componentStates:  z.record(z.object({ status: z.string().optional() })).optional(),
  connectionStates: z.record(z.object({ active: z.boolean().optional() })).optional(),
  newComponents:    z.array(z.object({
    id: z.string(), label: z.string(), icon: z.string(),
  }).passthrough()).optional(),
  updateComponents:  z.array(z.object({ id: z.string() }).passthrough()).optional(),
  newConnections:    z.array(z.object({
    id: z.string(), from: z.string(), to: z.string(),
  }).passthrough()).optional(),
  updateConnections: z.array(z.object({ id: z.string() }).passthrough()).optional(),
}).strict()

// Union of all canvas step-update shapes
const CanvasStateUnionSchema = z.union([
  LinearStateSchema,
  MapStateSchema,
  GridStateSchema,
  ChartStateSchema,
  GraphStepCanvas,
  TreeStepCanvas,
  SystemDiagramStepCanvas,
])

// ─── buildCanvasVisualSchema ──────────────────────────────────────────────────

export function buildCanvasVisualSchema() {
  const base = {
    id:         z.string().regex(/^[a-z][a-z0-9-]*$/),
    label:      z.string().optional(),
    variant:    z.string().optional(),
    layoutHint: LayoutHintSchema,
  }

  return z.discriminatedUnion('type', [
    z.object({
      ...base,
      type:         z.literal('linear'),
      variant:      z.enum(['array', 'stack', 'queue', 'linked-list']),
      initialState: LinearStateSchema,
    }),
    z.object({ ...base, type: z.literal('map'),            initialState: MapStateSchema }),
    z.object({
      ...base,
      type:         z.literal('tree'),
      variant:      z.enum(['binary', 'trie', 'recursion']).optional(),
      initialState: TreeStateSchema,
    }),
    z.object({
      ...base,
      type:         z.literal('graph'),
      variant:      z.string().optional(),
      initialState: GraphStateSchema,
    }),
    z.object({
      ...base,
      type:         z.literal('grid'),
      variant:      z.enum(['pathfinding', 'dp']),
      initialState: GridStateSchema,
    }),
    z.object({ ...base, type: z.literal('system-diagram'), initialState: SystemDiagramStateSchema }),
    z.object({
      ...base,
      type:         z.literal('chart'),
      variant:      z.enum(['bar']),
      initialState: ChartStateSchema,
    }),
  ])
}

// ─── buildStepSchema ──────────────────────────────────────────────────────────

export function buildStepSchema(canvasIds: string[], hudIds: string[]) {
  const canvasRecord = canvasIds.length > 0
    ? z.record(z.enum(canvasIds as [string, ...string[]]), CanvasStateUnionSchema)
    : z.record(z.string(), CanvasStateUnionSchema)

  const hudRecord = hudIds.length > 0
    ? z.record(z.enum(hudIds as [string, ...string[]]), z.union([z.string(), z.number()]))
    : z.record(z.string(), z.union([z.string(), z.number()]))

  return z.object({
    index: z.number().int().min(1),
    explanation: z.object({
      heading: z.string().max(80),
      body:    z.string().max(500),
      callout: z.string().max(200).optional(),
    }),
    activeText: z.string().min(1).optional(),
    hud:        hudRecord.optional(),
    canvas:     canvasRecord.optional(),
  })
}

// ─── Supporting schemas (used inside buildSceneSchema) ────────────────────────

export const HudItemSchema = z.object({
  id:           z.string().regex(/^[a-z][a-z0-9-]*$/),
  label:        z.string(),
  initialValue: z.union([z.string(), z.number()]),
})

export const ActiveTextSchema = z.object({
  initialValue: z.string().min(1),
})

export const SceneCodeSchema = z.object({
  language:        z.enum(['python', 'javascript']),
  source:          z.string(),
  highlightByStep: z.array(z.number().int().nonnegative()),
})

export const PopupSchema = z.object({
  id:          z.string(),
  attachTo:    z.string(),
  text:        z.string(),
  showAtStep:  z.number().int().min(1),
  hideAtStep:  z.number().int().min(1),
  style:       z.enum(['info', 'warning', 'success', 'insight']).optional(),
})

export const ChallengeSchema = z.object({
  id:          z.string(),
  title:       z.string(),
  description: z.string(),
  type:        z.enum(['predict', 'break-it', 'optimize', 'scenario']),
})

const BaseControlSchema = z.object({ id: z.string(), label: z.string() })

export const ControlSchema = z.discriminatedUnion('type', [
  BaseControlSchema.extend({
    type:   z.literal('button'),
    config: z.record(z.string(), z.unknown()).optional(),
  }),
  BaseControlSchema.extend({
    type:   z.literal('toggle'),
    config: z.object({ defaultValue: z.boolean() }),
  }),
  BaseControlSchema.extend({
    type:   z.literal('slider'),
    config: z.object({
      min:          z.number().optional(),
      max:          z.number().optional(),
      step:         z.number().optional(),
      defaultValue: z.number(),
    }),
  }),
  BaseControlSchema.extend({
    type:   z.literal('toggle-group'),
    config: z.object({
      options:      z.array(z.string()),
      defaultValue: z.string(),
    }),
  }),
])

// Generic step (no canvas-id / hud-id restriction) — used inside buildSceneSchema
const GenericStepSchema = buildStepSchema([], [])

// ─── buildSceneSchema ─────────────────────────────────────────────────────────

export function buildSceneSchema() {
  return z.object({
    id:          z.string(),
    title:       z.string(),
    type:        z.enum(['concept', 'dsa-trace', 'lld', 'hld']),
    layout:      z.enum(['canvas-only', 'code-left-canvas-right', 'text-left-canvas-right']),
    description: z.string().optional(),
    category:    z.string().optional(),
    code:        SceneCodeSchema.optional(),
    canvas:      z.array(buildCanvasVisualSchema()),
    activeText:  ActiveTextSchema.optional(),
    hud:         z.array(HudItemSchema).max(3).optional(),
    controls:    z.array(ControlSchema),
    steps:       z.array(GenericStepSchema),
    popups:      z.array(PopupSchema),
    challenges:  z.array(ChallengeSchema).optional(),
    complexity:  z.object({
      time:  z.string().optional(),
      space: z.string().optional(),
    }).optional(),
  }).superRefine((scene, ctx) => {
    const canvasIds = new Set(scene.canvas.map(v => v.id))

    // popup.attachTo must reference a declared canvas visual ID
    scene.popups.forEach((popup, i) => {
      if (canvasIds.size > 0 && !canvasIds.has(popup.attachTo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['popups', i, 'attachTo'],
          message: `"${popup.attachTo}" is not a declared canvas visual ID. Declared IDs: ${[...canvasIds].join(', ')}`,
        })
      }
    })

    // step.canvas keys must reference declared canvas visual IDs
    scene.steps.forEach((step, si) => {
      if (step.canvas) {
        Object.keys(step.canvas).forEach(key => {
          if (!canvasIds.has(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['steps', si, 'canvas', key],
              message: `Canvas update key "${key}" is not a declared canvas visual ID. Declared IDs: ${[...canvasIds].join(', ')}`,
            })
          }
        })
      }
    })

    // step.hud keys must reference declared hud item IDs
    const hudIds = new Set((scene.hud ?? []).map(h => h.id))
    scene.steps.forEach((step, si) => {
      if (step.hud) {
        Object.keys(step.hud).forEach(key => {
          if (hudIds.size > 0 && !hudIds.has(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['steps', si, 'hud', key],
              message: `HUD update key "${key}" is not a declared hud item ID. Declared IDs: ${[...hudIds].join(', ')}`,
            })
          }
        })
      }
    })
  })
}

// ─── buildPromptGuide ─────────────────────────────────────────────────────────

export function buildPromptGuide(
  canvasVisuals: Array<{ id: string; type: keyof typeof CANVAS_VISUAL_SPEC; variant?: string }>,
  hudItems: Array<{ id: string; label: string }>,
): string {
  const lines: string[] = []

  lines.push('=== CANVAS VISUAL PARAMS REFERENCE ===\n')

  for (const { id, type, variant } of canvasVisuals) {
    const entry = CANVAS_VISUAL_SPEC[type] as CanvasVisualSpecEntry | undefined
    if (!entry) continue

    const variantLabel = variant ? `, variant: ${variant}` : ''
    lines.push(`[${id}] (type: ${type}${variantLabel})`)
    lines.push(`  Description: ${entry.description}`)
    lines.push(`  Default layoutHint: ${entry.defaultLayoutHint}`)

    const isIdentityBased = type === 'graph' || type === 'tree' || type === 'system-diagram'

    // Identity-based types always show the initialState topology label first
    if (isIdentityBased) {
      lines.push(`  initialState topology (declare ONCE — never re-emit in steps): ${Object.keys(entry.state).join(', ')}`)
    }

    if (variant && entry.variants?.[variant]) {
      const variantSpec = entry.variants[variant]!
      lines.push(`  Valid highlight values: ${variantSpec.highlightValues.join(' | ')}`)
      if (variantSpec.generationRules && variantSpec.generationRules.length > 0) {
        lines.push('  Rules:')
        for (const rule of entry.generationRules) {
          lines.push(`    • ${rule}`)
        }
        for (const rule of variantSpec.generationRules) {
          lines.push(`    • ${rule}`)
        }
      }
    } else {
      if (!isIdentityBased) {
        lines.push(`  Step canvas fields (FULL SNAPSHOT every step): ${Object.keys(entry.state).join(', ')}`)
      }
      lines.push('  Rules:')
      for (const rule of entry.generationRules) {
        lines.push(`    • ${rule}`)
      }
    }
    lines.push('')
  }

  if (hudItems.length > 0) {
    lines.push('=== HUD ITEMS ===\n')
    lines.push(`Max HUD items: ${HUD_SPEC.maxItems}`)
    for (const { id, label } of hudItems) {
      lines.push(`  [${id}] label: "${label}"`)
    }
    lines.push('\nHUD Rules:')
    for (const rule of HUD_SPEC.generationRules) {
      lines.push(`  • ${rule}`)
    }
    lines.push('')
  }

  lines.push('=== ACTIVE TEXT ===\n')
  lines.push(`Position: ${ACTIVE_TEXT_SPEC.position}`)
  lines.push('Rules:')
  for (const rule of ACTIVE_TEXT_SPEC.generationRules) {
    lines.push(`  • ${rule}`)
  }
  lines.push('')

  lines.push('=== STEP RULES ===\n')
  for (const rule of STEP_SPEC.rules) {
    lines.push(`  • ${rule}`)
  }

  return lines.join('\n')
}

// ─── buildJsonSchema ──────────────────────────────────────────────────────────

export function buildJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(buildSceneSchema(), {
    name: 'InsyteScene',
  }) as Record<string, unknown>
}

// ─── Named schema exports for pipeline (schemas.ts) ──────────────────────────
// initialState schemas — topology declarations (identity-based) / full snapshots (sequential)
export { LinearStateSchema }
export { MapStateSchema }
export { GridStateSchema }
export { ChartStateSchema }
export { TreeStateSchema }
export { GraphStateSchema }
export { SystemDiagramStateSchema }
// Step canvas schemas — sparse overlay (identity-based) / reuse initialState shape (sequential)
export { GraphStepCanvas        as GraphStepCanvasSchema }
export { TreeStepCanvas         as TreeStepCanvasSchema }
export { SystemDiagramStepCanvas as SystemDiagramStepCanvasSchema }

// ─── TypeScript type exports ──────────────────────────────────────────────────

export type CanvasVisual = z.infer<ReturnType<typeof buildCanvasVisualSchema>>
export type Scene        = z.infer<ReturnType<typeof buildSceneSchema>>
export type Step         = z.infer<typeof GenericStepSchema>

export type LinearVisual        = Extract<CanvasVisual, { type: 'linear' }>
export type MapVisual           = Extract<CanvasVisual, { type: 'map' }>
export type TreeVisual          = Extract<CanvasVisual, { type: 'tree' }>
export type GraphVisual         = Extract<CanvasVisual, { type: 'graph' }>
export type GridVisual          = Extract<CanvasVisual, { type: 'grid' }>
export type SystemDiagramVisual = Extract<CanvasVisual, { type: 'system-diagram' }>
export type ChartVisual         = Extract<CanvasVisual, { type: 'chart' }>
