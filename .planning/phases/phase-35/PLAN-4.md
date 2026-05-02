# Phase 35 — Plan 4: AI Pipeline Repair for New Primitives

> **Status**: COMPLETE
> **Date**: 2026-04-26
> **Scope**: Full AI pipeline repair — prompts, schemas, validators, live-chat — for Phase 35's
> new 7-type primitive taxonomy and topology-state split. End-to-end quality hardening for
> maximum generation correctness.
>
> **Explicitly OUT OF SCOPE**:
> - Stage architecture changes (6-stage structure is correct as-is — see §0)
> - Scene JSON migration (existing hand-crafted files — separate plan)
> - `traceToScene.ts` alternative pipeline (separate prompt file, separate plan)
> - Renderer changes
>
> **Depends on**: Plan 3 complete (step-engine topology-state split live)
> **Completes**: Phase 35

---

## 0. Why No Stage Architecture Changes

The 6-stage pipeline is structurally correct for the new primitives. Stage 2 co-generates
`initialState` (topology) and steps (sparse overlays) in a single pass — the model benefits from
holding topology in context while writing the overlays. Splitting it would add a full API call
of latency with no quality gain. All gaps below are text/schema/validator content, not stage
structure.

---

## 1. Problem Surface

### 1.1 Prompt/content gaps

| # | File | Problem | Severity |
|---|------|---------|----------|
| G1 | `stage2-steps.md` | Rule 4 says "FULL STATE SNAPSHOTS" unconditionally — directly contradicts sparse overlay for graph/tree/system-diagram | **Critical** |
| G2 | `stage2-steps.md` | Checklist: "system-diagram updates must include both `components` and `connections` arrays" — wrong for new step format | **Critical** |
| G3 | `stage2-steps.md` | Checklist: "Weighted graph `edges[]` must include weight on every edge" — implies step canvas, but edges are initialState-only now | **High** |
| G4 | `stage2-steps.md` | `initialState` semantics not explained: sequential = first frame; identity-based = full topology declaration with stable IDs | **High** |
| G5 | `stage2-steps.md` | No example of sparse overlay format — only Two Sum (sequential) is shown | **High** |
| G6 | `buildPromptGuide` | "State fields: nodes, edges" for identity-based types reads as step canvas fields, not topology | **High** |
| G7 | `live-chat.ts` | `add-steps` patch docs + critical rules say "FULL STATE SNAPSHOTS" for all canvas updates | **Medium** |
| G8 | `stage0-reasoning.md` | No mention of sequential vs identity-based distinction — model picks primitives without knowing the step-writing commitment | **Medium** |

### 1.2 Schema inconsistencies in `spec.build.ts`

| # | Schema | Problem |
|---|--------|---------|
| S1 | `SystemDiagramStateSchema` | `status` is **required** on each component in `initialState` — it is an ephemeral field, should be optional |
| S2 | `SystemDiagramStateSchema` | `active` is **required** on each connection in `initialState` — it is an ephemeral field, should be optional |
| S3 | `SystemDiagramStateSchema` | `connection.id` is `z.string().optional()` — must be required; sparse overlay needs stable IDs to reference |
| S4 | `buildStepsSchema` | Returns fully loose `z.record(string, z.unknown())` for both `initialStates` and step `canvas` — topology-in-steps not rejected at Zod level; per-visual format not enforced |

---

## 2. Core Decisions

| # | Decision |
|---|----------|
| D1 | `buildStepsSchema(skeleton)` becomes skeleton-aware: builds per-visual typed schemas for `initialStates` AND step `canvas` entries — uses schemas exported from `spec.build.ts` |
| D2 | Export per-type initialState schemas and step canvas schemas from `spec.build.ts` as named exports |
| D3 | `buildPromptGuide`: for identity-based types, always show `initialState topology` label (both variant and no-variant paths); for sequential types, label as `Step canvas fields (FULL SNAPSHOT every step)` |
| D4 | `stage2-steps.md`: rewrite rules section (split sequential vs identity-based), rewrite checklist, add `initialState` semantics section, add identity-based graph example |
| D5 | `stage0-reasoning.md`: add one callout block about the two-category commitment before Section 3 |
| D6 | `validators/steps.ts`: add Check 7 (topology keys in step canvas for identity-based) and Check 8 (required topology keys in initialState for identity-based) |
| D7 | `live-chat.ts`: fix full-snapshot text for identity-based, add `variant` to `SceneContext`, update `add-steps` patch docs |
| D8 | `SystemDiagramStateSchema`: make `status`/`active` optional, make `connection.id` required |

---

## 3. Files Changed

---

### `packages/scene-engine/src/spec.build.ts`

Three changes in this file.

#### Change A — Fix `SystemDiagramStateSchema`

```typescript
// BEFORE:
const SystemDiagramStateSchema = z.object({
  components: z.array(z.object({
    id:       z.string(),
    label:    z.string(),
    icon:     z.enum(['server', 'database', 'mobile', 'web', 'compute', 'cloud', 'shield', 'layers', 'zap']),
    status:   z.enum(['normal', 'active', 'overloaded', 'dead']),    // required — WRONG
    sublabel: z.string().optional(),
  })),
  connections: z.array(z.object({
    id:     z.string().optional(),    // optional — WRONG
    from:   z.string(),
    to:     z.string(),
    active: z.boolean(),              // required — WRONG
    style:  z.enum(['solid', 'dashed']).optional(),
    label:  z.string().optional(),
  })),
})

// AFTER:
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
    style:  z.enum(['solid', 'dashed']).optional(),
    label:  z.string().optional(),
  })),
})
```

**Why**: `status` and `active` are ephemeral fields — `buildRegistry` in merge.ts always overwrites them
(`status: 'normal'`, `active: false`). The old schema forced the LLM to include them in `initialState`
when they carry no semantic meaning there. Making them optional removes confusion and aligns
`initialState` with its new role as pure topology. `connection.id` must be required because
`connectionStates` keys reference it.

---

#### Change B — Export per-type schemas

Add named exports after all const declarations so `schemas.ts` can import typed schemas:

```typescript
// ─── Named exports for pipeline schemas.ts ────────────────────────────────────

// initialState schemas (topology declarations for identity-based; full snapshots for sequential)
export { LinearStateSchema }
export { MapStateSchema }
export { GridStateSchema }
export { ChartStateSchema }
export { TreeStateSchema }
export { GraphStateSchema }
export { SystemDiagramStateSchema }

// Step canvas schemas (sparse overlay for identity-based; same as initialState for sequential)
export { GraphStepCanvas        as GraphStepCanvasSchema }
export { TreeStepCanvas         as TreeStepCanvasSchema }
export { SystemDiagramStepCanvas as SystemDiagramStepCanvasSchema }
```

---

#### Change C — `buildPromptGuide`: identity-based vs sequential labelling

Replace the `if (variant) / else` block with an identity-aware version:

```typescript
// BEFORE (else branch):
} else {
  lines.push(`  State fields: ${Object.keys(entry.state).join(', ')}`)
  lines.push('  Rules:')
  for (const rule of entry.generationRules) {
    lines.push(`    • ${rule}`)
  }
}

// AFTER (full if/else rewrite):
const isIdentityBased = type === 'graph' || type === 'tree' || type === 'system-diagram'

// Always show initialState topology label for identity-based types
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
```

**Result**: A graph/weighted visual now shows:
```
[g] (type: graph, variant: weighted)
  Description: ...
  Default layoutHint: dagre-LR
  initialState topology (declare ONCE — never re-emit in steps): nodes, edges
  Valid highlight values: default | active | relaxed | min-edge | in-tree | rejected
  Rules:
    • Step canvas uses sparse overlay — never re-emit topology fields...
    • nodeStates: Record<nodeId, {highlight?, distance?}>...
    • ... (weighted variant rules)
```

A system-diagram shows:
```
[s] (type: system-diagram)
  Description: ...
  Default layoutHint: dagre-LR
  initialState topology (declare ONCE — never re-emit in steps): components, connections
  Rules:
    • Step canvas uses sparse overlay...
    • componentStates: Record<componentId, {status?}>...
```

A linear/array shows:
```
[arr] (type: linear, variant: array)
  Description: ...
  Default layoutHint: linear-H
  Valid highlight values: default | active | found | ...
  Rules:
    • FULL-SNAPSHOT: every step canvas update must include ALL items.
    • ...
```

---

### `apps/web/src/ai/schemas.ts`

#### Change — Make `buildStepsSchema` skeleton-aware

```typescript
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

// ... (SceneSkeletonSchema unchanged) ...

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

function buildStepCanvasSchemaForType(type: string): z.ZodType {
  switch (type) {
    // Identity-based: sparse overlay schemas
    case 'graph':          return GraphStepCanvasSchema
    case 'tree':           return TreeStepCanvasSchema
    case 'system-diagram': return SystemDiagramStepCanvasSchema
    // Sequential: full-snapshot schemas (same shape as initialState)
    case 'linear':         return LinearStateSchema
    case 'map':            return MapStateSchema
    case 'grid':           return GridStateSchema
    case 'chart':          return ChartStateSchema
    default:               return z.record(z.string(), z.unknown())
  }
}

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
```

**Update call site in `pipeline.ts`** (one line):
```typescript
// Before:
buildStepsSchema()
// After:
buildStepsSchema(skeleton)
```

**Why this matters**: The schema now rejects at Zod level (before even reaching the semantic
validator) if the LLM puts `nodes[]` in a graph step canvas, or forgets `nodes[]` in a tree
initialState. Precise Zod validation errors feed directly into error-guided retry prompts —
the model is told exactly which field is wrong and why.

---

### `apps/web/src/ai/validators/steps.ts`

Add two checks after the existing six. Import the skeleton canvas to get visual types.

#### Check 7 — No topology keys in step canvas for identity-based types

```typescript
const IDENTITY_BASED = new Set(['graph', 'tree', 'system-diagram'])
const TOPOLOGY_KEYS: Record<string, string[]> = {
  'graph':          ['nodes', 'edges'],
  'tree':           ['nodes'],       // rootId is scalar, less likely to be misused
  'system-diagram': ['components', 'connections'],
}

for (const step of steps.steps) {
  if (!step.canvas) continue
  for (const [target, params] of Object.entries(step.canvas)) {
    const visual = skeleton.canvas.find(v => v.id === target)
    if (!visual || !IDENTITY_BASED.has(visual.type)) continue
    const forbidden = TOPOLOGY_KEYS[visual.type] ?? []
    for (const key of forbidden) {
      if (key in (params as Record<string, unknown>)) {
        errors.push(
          `Step ${step.index}: canvas["${target}"] contains topology key "${key}". ` +
          `${visual.type} uses sparse overlay in steps — use nodeStates/edgeStates/` +
          `componentStates/connectionStates instead. Move topology to initialStates["${target}"].`,
        )
      }
    }
  }
}
```

#### Check 8 — Required topology keys present in initialState for identity-based types

```typescript
const REQUIRED_TOPOLOGY: Record<string, { key: string; label: string }[]> = {
  'graph':          [{ key: 'nodes', label: 'nodes[] with id + label' }],
  'tree':           [{ key: 'nodes', label: 'nodes[] with id + value + children' }, { key: 'rootId', label: 'rootId string' }],
  'system-diagram': [{ key: 'components', label: 'components[] with id + label + icon' }],
}

for (const visual of skeleton.canvas) {
  if (!IDENTITY_BASED.has(visual.type)) continue
  const state = steps.initialStates[visual.id]
  if (!state) continue  // already caught by Check 2
  const required = REQUIRED_TOPOLOGY[visual.type] ?? []
  for (const { key, label } of required) {
    if (!(key in state)) {
      errors.push(
        `initialStates["${visual.id}"] (${visual.type}) is missing required topology key ` +
        `"${key}". Identity-based primitives declare full topology here: ${label}.`,
      )
    } else if (Array.isArray(state[key]) && (state[key] as unknown[]).length === 0) {
      errors.push(
        `initialStates["${visual.id}"].${key} is an empty array — ` +
        `declare all ${key} with stable IDs in initialState.`,
      )
    }
  }
}
```

**Also add tests in `validators/validators.test.ts`**:
- topology-in-steps: graph step canvas with `nodes[]` → error
- topology-in-steps: system-diagram step canvas with `components[]` → error
- initialState topology: graph initialState without `nodes` → error
- initialState topology: tree initialState with empty `nodes[]` → error
- Happy path: graph initialState with nodes + graph step with nodeStates → valid

---

### `apps/web/src/ai/prompts/stage0-reasoning.md`

Add a callout block between Section 2 (VISUALS) and Section 3 (TEACHING MOMENTS):

```markdown
   Variants:
     linear → array | stack | queue | linked-list (required)
     tree   → binary | trie | recursion (optional; default: binary)
     graph  → weighted (optional; omit for unweighted)
     grid   → pathfinding | dp (required)
     chart  → bar (required)

IDENTITY-BASED vs SEQUENTIAL — your step-writing commitment differs by type:
- Sequential (linear, map, grid, chart): each step re-emits the COMPLETE current state
  (all items, entries, cells, bars). Simple: just show what the structure looks like now.
- Identity-based (graph, tree, system-diagram): Section 4 must declare ALL nodes/edges/
  components with short stable IDs (e.g. "a","b","e0","c1"). Steps then write only what
  changed (nodeStates, edgeStates, componentStates, connectionStates — sparse overlay).
  Plan your topology in Section 4 if you choose an identity-based type.

3. TEACHING MOMENTS — What are the 5–10 key steps a learner MUST experience, in order?
```

---

### `apps/web/src/ai/prompts/stage2-steps.md`

Full replacement. Differences from current version are annotated with `← CHANGED` / `← NEW`:

```markdown
<canvas-ids>
The following are the ONLY valid canvas visual IDs. Use these exact strings as both canvas update keys and initialStates keys:
{canvasIdsList}
</canvas-ids>

<prompt-guide>
{promptGuide}
</prompt-guide>

<skeleton>
{skeletonJson}
</skeleton>

<instructions>
INITIALSTATE SEMANTICS — read this before writing initialStates:         ← NEW SECTION
  Sequential (linear, map, grid, chart):
    initialState = the first frame of the animation. Provide real starting values.
    Steps re-emit the COMPLETE current state on every canvas update.
  Identity-based (graph, tree, system-diagram):
    initialState = complete topology declaration. Assign short stable IDs to EVERY
    node/edge/component/connection (e.g. "a","b","e0","c1"). This is the ONLY place
    topology fields appear. Steps reference these IDs via sparse overlay keys.

For each step, write the EXPLANATION FIRST — what should this step teach?
Then decide what changes on screen (canvas updates, activeText, hud) to show that teaching moment.
The explanation drives the animation. Not the other way around.

Rules:
1. `initialStates` must contain every canvas visual ID above as a top-level key. No other keys allowed.
2. Steps must be numbered 1 through {stepCount} with no gaps. Step 0 is always implicit (the initial state).
3. Every canvas update key must be one of the canvas visual IDs listed above — no others.
4a. Sequential primitives (linear, map, grid, chart): canvas updates are FULL STATE SNAPSHOTS — include every item/entry/cell/bar, not just changed ones. Every item and entry must include its `id` field.    ← CHANGED
4b. Identity-based primitives (graph, tree, system-diagram): canvas updates use SPARSE OVERLAY — write only nodeStates/edgeStates/componentStates/connectionStates for what changes THIS step. Never include topology keys (nodes/edges/components/connections) in steps.    ← NEW
5. `activeText` in a step: a short string describing the current operation (e.g. "i=0, num=2, need=7 → miss"). Omit if unchanged.
6. `hud` in a step: object keyed by hud item id with updated value. Omit if unchanged.
7. Explanations: heading up to 80 chars (active voice, present tense), body up to 500 chars (explain WHY this step matters), callout (optional) up to 200 chars (surprising insight or invariant).    ← CHANGED
8. ONE EVENT PER STEP — each step teaches exactly one discrete thing. Split cause and effect into separate steps.
9. EXPLANATION-CANVAS SYNC — if your explanation mentions a visual, that visual must have a canvas update in that step.
10. Every linear `items[]` entry and map `entries[]` entry must include a stable `id` string field in every step snapshot.    ← NEW
11. For identity-based types: every ID referenced in step canvas (nodeStates keys, newNodes ids, etc.) must be declared in initialStates topology. Never reference an undeclared ID.    ← NEW
</instructions>

⚠ VALIDATION CHECKLIST — your output WILL be rejected if any of these fail:
- `initialStates` must have a key for EVERY canvas visual ID listed above
- Every initialState value must be a real state object ({"items":[...]} not {})
- Identity-based initialState must have topology: graph → nodes[]+edges[], tree → nodes[]+rootId, system-diagram → components[]+connections[]    ← NEW
- graph/tree/system-diagram: step canvas must use nodeStates/edgeStates/componentStates/connectionStates — NEVER nodes/edges/components/connections in steps    ← NEW (replaces system-diagram full-snapshot rule)
- graph initialState: every node needs id+label; every edge needs id+from+to
- graph/weighted initialState: edges[].weight (number) REQUIRED on every edge in initialStates (not in steps)    ← CHANGED (clarifies "in initialStates")
- graph/weighted nodes[].distance: optional string in initialStates only ("∞" for unreached nodes)    ← CHANGED
- tree initialState: every node needs id+value+children (children:[] for leaves); rootId must match a node id
- Trie nodes use isEnd: true/false (boolean) to mark word boundaries; root node has value: ""
- system-diagram initialState: every component needs id+label+icon; every connection needs id+from+to
- system-diagram with layoutHint "ring" uses the same state format as all other system-diagrams
- Sequential canvas updates must use correct field names per the prompt-guide above
- Every visual mentioned in an explanation must appear in that step's canvas updates
- `activeText` must never be an empty string — omit it instead

<planning-context>
{reasoning}
</planning-context>

Before writing the JSON, list your {stepCount} teaching moments in order (one line each).
Then output the JSON.

<example>
EXAMPLE 1 — Sequential primitives (linear + map full-snapshot pattern)
Topic: "Two Sum"
Canvas visuals: arr (linear, variant: array), seen-map (map)
HUD: hud-i (label: "i")

Teaching moments:
1. Scan first element, check complement, store in seen
2. Hit — complement found, return the pair

{
  "initialStates": {
    "arr": { "items": [{"id":"i0","value":2},{"id":"i1","value":7},{"id":"i2","value":11},{"id":"i3","value":15}] },
    "seen-map": { "entries": [] }
  },
  "initialActiveText": "Start scan from left",
  "initialHud": { "hud-i": 0 },
  "steps": [
    {
      "index": 1,
      "explanation": {
        "heading": "Lookup Before Insert",
        "body": "For each number, check if its complement is in seen before inserting. Lookup-first avoids reusing the same element.",
        "callout": "O(1) lookup per step → O(n) total."
      },
      "activeText": "i=0, num=2, need=7 → miss, store 2:0",
      "hud": { "hud-i": 0 },
      "canvas": {
        "arr": { "items": [{"id":"i0","value":2,"highlight":"active"},{"id":"i1","value":7},{"id":"i2","value":11},{"id":"i3","value":15}] },
        "seen-map": { "entries": [{"id":"e0","key":"2","value":"0","highlight":"insert"}] }
      }
    },
    {
      "index": 2,
      "explanation": {
        "heading": "Hit Means Answer",
        "body": "At i=1, complement 2 is present in seen — return the pair immediately."
      },
      "activeText": "i=1, num=7, need=2 → HIT in seen",
      "hud": { "hud-i": 1 },
      "canvas": {
        "arr": { "items": [{"id":"i0","value":2,"highlight":"hit"},{"id":"i1","value":7,"highlight":"active"},{"id":"i2","value":11},{"id":"i3","value":15}] },
        "seen-map": { "entries": [{"id":"e0","key":"2","value":"0","highlight":"hit"}] }
      }
    }
  ]
}
</example>

<example>
EXAMPLE 2 — Identity-based primitive (graph sparse overlay pattern)
Topic: "Graph BFS"
Canvas visuals: g (graph, no variant)

Key rules demonstrated:
- initialState declares ALL nodes and edges with stable IDs — never repeated in steps
- Step canvas uses nodeStates/edgeStates (NOT nodes/edges)
- Unlisted nodes reset to highlight:"default"; unlisted edges reset to highlight:"default"
- Only nodes/edges with non-default state need to appear in nodeStates/edgeStates

Teaching moments:
1. Enqueue start node A, mark its neighbours
2. Visit B — dequeue next, A is fully done

{
  "initialStates": {
    "g": {
      "nodes": [
        {"id": "a", "label": "A"},
        {"id": "b", "label": "B"},
        {"id": "c", "label": "C"}
      ],
      "edges": [
        {"id": "e0", "from": "a", "to": "b", "directed": true},
        {"id": "e1", "from": "a", "to": "c", "directed": true}
      ]
    }
  },
  "steps": [
    {
      "index": 1,
      "explanation": {
        "heading": "Enqueue Start",
        "body": "Visit A and enqueue its neighbours B and C.",
        "callout": "BFS explores all neighbours before going deeper."
      },
      "activeText": "queue=[A] → visit A, enqueue B C",
      "canvas": {
        "g": {
          "nodeStates": {
            "a": {"highlight": "active"},
            "b": {"highlight": "queued"},
            "c": {"highlight": "queued"}
          },
          "edgeStates": {
            "e0": {"highlight": "active"},
            "e1": {"highlight": "active"}
          }
        }
      }
    },
    {
      "index": 2,
      "explanation": {
        "heading": "Visit B",
        "body": "Dequeue B — mark it visited. A is already done. edgeStates omitted → edges reset to default."
      },
      "activeText": "queue=[C] → visit B",
      "canvas": {
        "g": {
          "nodeStates": {
            "a": {"highlight": "visited"},
            "b": {"highlight": "active"},
            "c": {"highlight": "queued"}
          }
        }
      }
    }
  ]
}
</example>

Do NOT copy any values from the examples above. Generate entirely new values for your topic.

---
Now generate for the actual topic below.

Topic: {topic}
```

---

### `apps/web/src/ai/prompts/live-chat.ts`

Three targeted changes.

#### Change A — Add `variant` to `SceneContext`

```typescript
// BEFORE:
export interface SceneContext {
  title: string
  type: string
  currentStep: number
  currentExplanation?: string
  visualSummary: Array<{ id: string; type: string; label?: string }>
}

// AFTER:
export interface SceneContext {
  title: string
  type: string
  currentStep: number
  currentExplanation?: string
  visualSummary: Array<{ id: string; type: string; variant?: string; label?: string }>
}
```

#### Change B — Update `buildChatContextBlock` to show `type/variant`

```typescript
// BEFORE:
const visualList = ctx.visualSummary
  .map((v) => `  - id="${v.id}" type="${v.type}"${v.label ? ` label="${v.label}"` : ''}`)
  .join('\n')

// AFTER:
const visualList = ctx.visualSummary
  .map((v) => {
    const typeLabel = v.variant ? `${v.type}/${v.variant}` : v.type
    return `  - id="${v.id}" type="${typeLabel}"${v.label ? ` label="${v.label}"` : ''}`
  })
  .join('\n')
```

#### Change C — Fix `CHAT_SYSTEM_PROMPT` for identity-based canvas updates

In the `add-steps` section, replace the canvas line and the two critical-rules lines:

```typescript
// BEFORE (add-steps inner canvas doc):
'           "<existing-canvas-id>": { <full state snapshot matching visual type> }',

// AFTER:
'           "<existing-canvas-id>": {',
'             // sequential (linear/map/grid/chart): full state snapshot with ALL items/entries/cells/bars',
'             // identity-based (graph/tree/system-diagram): sparse overlay with nodeStates/edgeStates/',
'             //   componentStates/connectionStates — NEVER nodes/edges/components/connections in steps',
'           }',

// BEFORE (critical rules):
'   - Each canvas value is a FULL STATE SNAPSHOT — include ALL items, not just changed ones',
// and:
'- canvas updates must be FULL STATE SNAPSHOTS — never partial/delta.',

// AFTER:
'   - Sequential visuals (linear/map/grid/chart): canvas value is FULL STATE SNAPSHOT — ALL items/entries/cells/bars',
'   - Identity-based visuals (graph/tree/system-diagram): canvas value is SPARSE OVERLAY — nodeStates/edgeStates/componentStates/connectionStates only',
// and:
'- Sequential visual (linear/map/grid/chart) canvas updates: FULL STATE SNAPSHOT — never partial.',
'- Identity-based visual (graph/tree/system-diagram) canvas updates: SPARSE OVERLAY — use the overlay keys, not topology arrays.',
```

---

### `apps/web/src/ai/liveChat.ts`

Update `buildSceneContext` to populate `variant` in the visual summary:

```typescript
// BEFORE:
visualSummary: scene.canvas.map((v) => ({
  id: v.id,
  type: v.type,
  label: v.label,
})),

// AFTER:
visualSummary: scene.canvas.map((v) => ({
  id: v.id,
  type: v.type,
  ...(v.variant !== undefined && { variant: v.variant }),
  label: v.label,
})),
```

---

## 4. Implementation Order

Execute strictly in this order. Steps 1–3 form the schema chain; steps 4–7 are independent
once schema exports exist.

1. `spec.build.ts` — Change A (fix SystemDiagramStateSchema), Change B (exports), Change C (buildPromptGuide)
2. `schemas.ts` — skeleton-aware `buildStepsSchema(skeleton)`
3. `pipeline.ts` — pass `skeleton` to `buildStepsSchema`
4. `validators/steps.ts` — add Check 7 and Check 8
5. `validators/validators.test.ts` — add test cases for new checks
6. `stage0-reasoning.md` — add identity-based callout
7. `stage2-steps.md` — full rewrite per §3.5
8. `live-chat.ts` + `liveChat.ts` — SceneContext variant + system prompt fixes

---

## 5. Acceptance Criteria

**Schema layer:**
- [ ] `buildStepsSchema(skeleton)` with a graph visual rejects `nodes[]` in a step canvas entry (Zod validation fails with clear message)
- [ ] `buildStepsSchema(skeleton)` with a graph visual rejects step canvas entry missing from skeleton
- [ ] `buildStepsSchema(skeleton)` with a system-diagram visual rejects `components[]` in a step canvas entry
- [ ] `buildStepsSchema(skeleton)` with a tree visual rejects a step canvas entry with `nodes[]` instead of `nodeStates`
- [ ] `buildStepsSchema(skeleton)` with a linear visual rejects step canvas entry missing `items[]`
- [ ] `SystemDiagramStateSchema` accepts `components` without `status` field
- [ ] `SystemDiagramStateSchema` accepts `connections` without `active` field
- [ ] `SystemDiagramStateSchema` rejects `connections` entries missing `id`

**Validator layer:**
- [ ] `validateSteps` returns error when graph step canvas contains key `"nodes"` (Check 7)
- [ ] `validateSteps` returns error when system-diagram step canvas contains key `"components"` (Check 7)
- [ ] `validateSteps` returns error when graph initialState is missing `"nodes"` (Check 8)
- [ ] `validateSteps` returns error when tree initialState has empty `nodes[]` (Check 8)
- [ ] All existing validator tests still pass

**Prompt guide layer:**
- [ ] `buildPromptGuide` output for a graph visual (no variant) shows "initialState topology" label, not "State fields"
- [ ] `buildPromptGuide` output for a graph/weighted visual shows "initialState topology" label before highlight values
- [ ] `buildPromptGuide` output for a system-diagram shows "initialState topology" label
- [ ] `buildPromptGuide` output for a linear/array visual shows "Step canvas fields (FULL SNAPSHOT every step)"

**Prompt content:**
- [ ] `stage2-steps.md` contains no unconditional "FULL STATE SNAPSHOTS" rule
- [ ] `stage2-steps.md` contains distinct 4a (sequential) and 4b (identity-based) rules
- [ ] `stage2-steps.md` contains INITIALSTATE SEMANTICS section
- [ ] `stage2-steps.md` contains graph BFS sparse overlay example (Example 2)
- [ ] `stage2-steps.md` checklist contains no reference to "components and connections arrays" in steps
- [ ] `stage0-reasoning.md` contains identity-based vs sequential callout

**Live chat:**
- [ ] `SceneContext.visualSummary` includes `variant` field
- [ ] `buildChatContextBlock` renders `type/variant` (e.g. `graph/weighted`) in visual list
- [ ] `CHAT_SYSTEM_PROMPT` correctly distinguishes sequential vs identity-based for `add-steps` patches
- [ ] `CHAT_SYSTEM_PROMPT` critical rules do not say "FULL STATE SNAPSHOTS" unconditionally
