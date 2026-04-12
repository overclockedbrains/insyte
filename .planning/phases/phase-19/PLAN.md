# Phase 19 — Scene JSON Schema Redesign

**Goal:** Remove AI-generated coordinates entirely from the Scene JSON schema. Add `layoutHint` and `slot` fields that communicate layout intent semantically. Simplify the action format from a discriminated union to a universal state-snapshot format. Update all 24 hand-crafted Scene JSONs. This phase creates the clean schema foundation that the layout engine (Phase 20) and ISCL parser (Phase 23) depend on.

**Source research:** `ARCHITECTURE_RECOMMENDATIONS.md` Phase C §8–9, `layout-and-visualization.md` Part 4, `ai-pipeline.md` §7, `ARCHITECTURE_V3.md` Part 1 §1.3 + Part 2

**Estimated effort:** 4–5 days

**Prerequisite:** Phase 18 (coordinate unification)

---

## Core Changes

### 1. `packages/scene-engine/src/types.ts` — Visual interface

```typescript
// BEFORE (broken — AI must hallucinate XY positions)
export interface Visual {
  id: string
  type: VisualType
  label?: string
  position?: { x: number; y: number }   // ← DELETE THIS ENTIRELY
  initialState: unknown
  showWhen?: Condition
}

// AFTER (correct — layout engine computes positions, AI sets layout intent)
export type LayoutHint =
  | 'dagre-TB'        // top-to-bottom hierarchical (dependency graphs, state machines)
  | 'dagre-LR'        // left-to-right hierarchical (system diagrams)
  | 'dagre-BT'        // bottom-to-top
  | 'tree-RT'         // Reingold-Tilford (binary trees, recursion trees)
  | 'linear-H'        // horizontal linear (arrays, queues, linked-lists)
  | 'linear-V'        // vertical linear (stacks)
  | 'grid-2d'         // 2D grid (DP tables, matrices)
  | 'hashmap-buckets' // bucket rows (hashmaps)
  | 'radial'          // circular/radial (hash rings, force-directed)

export type SlotPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'left-center'
  | 'right-center'
  | 'overlay-top'
  | 'overlay-bottom'
  | 'center'

export interface Visual {
  id: string
  type: VisualType
  label?: string
  layoutHint?: LayoutHint   // ← drives which algorithm computeLayout() uses
  slot?: SlotPosition        // ← for info primitives (text-badge, counter) positioned relative to canvas
  initialState: unknown
  showWhen?: Condition
}
```

**Mapping: VisualType → default LayoutHint**

| VisualType | Default LayoutHint |
|-----------|-------------------|
| `array` | `linear-H` |
| `linked-list` | `linear-H` |
| `queue` | `linear-H` |
| `stack` | `linear-V` |
| `tree` | `tree-RT` |
| `recursion-tree` | `tree-RT` |
| `graph` | `dagre-TB` (overridable) |
| `system-diagram` | `dagre-LR` |
| `dp-table` | `grid-2d` |
| `grid` | `grid-2d` |
| `hashmap` | `hashmap-buckets` |
| `text-badge` | slot-based (no layoutHint) |
| `counter` | slot-based (no layoutHint) |

The AI specifies `layoutHint` only when the default is wrong (e.g., a graph that should read left-to-right uses `layoutHint: 'dagre-LR'`). Otherwise the system uses the default.

---

### 2. `packages/scene-engine/src/types.ts` — Action interface (simplify)

**Remove the discriminated action union.** Replace with a single universal format:

```typescript
// BEFORE (discriminated union — fails on any wrong branch)
type Action =
  | { action: 'set';        target: string; params: Record<string, unknown> }
  | { action: 'set-value';  target: string; params: { value: unknown } }
  | { action: 'push';       target: string; params: { item: unknown } }
  | { action: 'pop';        target: string; params: {} }
  | { action: 'highlight';  target: string; params: { index: number; style: string } }

// AFTER (single universal format — full state snapshot every step)
export interface Action {
  target: string                          // visual ID — validated against visuals[]
  params: Record<string, unknown>         // complete visual state at this step (not a delta)
}

export interface Step {
  index: number
  description?: string
  actions: Action[]
}
```

The move to "full state on every step" eliminates delta-accumulation bugs. Applying the same state twice gives the same result (idempotent). The renderer just renders whatever state the step provides — no action-type routing.

---

### 3. `packages/scene-engine/src/types.ts` — Graph/tree initialState

Remove `x`, `y` from node definitions in graph/tree/system-diagram initialState:

```typescript
// Graph node (BEFORE)
export interface GraphNode {
  id: string
  label: string
  x: number    // ← DELETE
  y: number    // ← DELETE
  highlighted?: boolean
}

// Graph node (AFTER)
export interface GraphNode {
  id: string
  label: string
  highlighted?: boolean
  // Positions computed by layout engine at render time — NEVER in JSON
}

// Tree node (BEFORE)
export interface TreeNode {
  id?: string
  value: string | number
  x?: number   // ← DELETE
  y?: number   // ← DELETE
  left?: TreeNode
  right?: TreeNode
}

// Tree node (AFTER — positions computed from recursive structure)
export interface TreeNode {
  id?: string
  value: string | number
  left?: TreeNode | null
  right?: TreeNode | null
  highlighted?: boolean
}
```

---

### 4. `packages/scene-engine/src/schema.ts` — Zod schema update

```typescript
export const LayoutHintSchema = z.enum([
  'dagre-TB', 'dagre-LR', 'dagre-BT', 'tree-RT',
  'linear-H', 'linear-V', 'grid-2d', 'hashmap-buckets', 'radial'
])

export const SlotPositionSchema = z.enum([
  'top-left', 'top-center', 'top-right',
  'bottom-left', 'bottom-center', 'bottom-right',
  'left-center', 'right-center',
  'overlay-top', 'overlay-bottom', 'center'
])

export const VisualSchema = z.object({
  id: z.string().min(1),
  type: VisualTypeSchema,
  label: z.string().optional(),
  layoutHint: LayoutHintSchema.optional(),
  slot: SlotPositionSchema.optional(),
  initialState: z.unknown(),
  showWhen: ConditionSchema.optional(),
  // position field REMOVED — will break if present in old JSON
})

export const ActionSchema = z.object({
  target: z.string(),
  params: z.record(z.string(), z.unknown()),
})

// GraphNodeSchema — no x/y
export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  highlighted: z.boolean().optional(),
  type: z.string().optional(),
  icon: z.string().optional(),
})
```

---

### 5. Update all 24 hand-crafted Scene JSONs

Each JSON file in `apps/web/src/content/scenes/` needs:

**Remove:**
- `position: { x: ..., y: ... }` from every `Visual` object
- `x: ..., y: ...` from every graph/tree node in `initialState`

**Add:**
- `layoutHint` to graph/tree/system-diagram visuals (appropriate value)
- `slot` to text-badge and counter visuals
- Convert multi-action steps from discriminated format to universal `{ target, params }` format

**Affected files (24 total):**
```
src/content/scenes/concepts/
  hash-tables.json, js-event-loop.json, load-balancer.json, dns-resolution.json, git-branching.json

src/content/scenes/dsa/
  two-sum.json, valid-parentheses.json, binary-search.json, reverse-linked-list.json,
  climbing-stairs.json, merge-sort.json, level-order-bfs.json, number-of-islands.json,
  sliding-window-max.json, fibonacci-recursive.json

src/content/scenes/lld/
  lru-cache-lld.json, rate-limiter.json, min-stack.json, trie.json, design-hashmap.json

src/content/scenes/hld/
  url-shortener.json, twitter-feed.json, consistent-hashing.json, chat-system.json
```

**Migration script** (run once to automate the tedious parts):
```typescript
// scripts/migrate-scene-json.ts
// Removes position fields, removes x/y from graph nodes, adds default layoutHint
import fs from 'fs'
import path from 'path'
import glob from 'glob'

const sceneFiles = glob.sync('apps/web/src/content/scenes/**/*.json')

const DEFAULT_LAYOUT_HINTS: Record<string, string> = {
  array: 'linear-H',
  'linked-list': 'linear-H',
  queue: 'linear-H',
  stack: 'linear-V',
  tree: 'tree-RT',
  'recursion-tree': 'tree-RT',
  graph: 'dagre-TB',
  'system-diagram': 'dagre-LR',
  'dp-table': 'grid-2d',
  grid: 'grid-2d',
  hashmap: 'hashmap-buckets',
}

for (const file of sceneFiles) {
  const scene = JSON.parse(fs.readFileSync(file, 'utf-8'))
  
  // Remove position from visuals, add layoutHint
  scene.visuals = scene.visuals.map((v: any) => {
    const { position, ...rest } = v  // remove position
    const layoutHint = DEFAULT_LAYOUT_HINTS[v.type]
    return layoutHint ? { ...rest, layoutHint } : rest
  })
  
  // Remove x/y from graph nodes in initialState
  scene.visuals = scene.visuals.map((v: any) => {
    if (['graph', 'system-diagram'].includes(v.type) && v.initialState?.nodes) {
      v.initialState.nodes = v.initialState.nodes.map(({ x, y, ...node }: any) => node)
    }
    return v
  })
  
  // Migrate action format
  scene.steps = scene.steps.map((step: any) => ({
    ...step,
    actions: step.actions.map((a: any) => ({
      target: a.target,
      params: a.params ?? {},
    }))
  }))
  
  fs.writeFileSync(file, JSON.stringify(scene, null, 2))
  console.log(`Migrated: ${path.basename(file)}`)
}
```

**After migration, manually review each scene** to:
- Verify layout makes sense with the assigned `layoutHint`
- Add `slot` to info primitives that need positioning
- Check that step params contain complete state (not deltas)

---

### 6. `packages/scene-engine/src/parser.ts` — Update for new schema

The parser's `normalizeScene()` function needs to:
- Accept scenes WITHOUT `position` field (no longer an error)
- Accept scenes WITH `layoutHint` and `slot`
- Handle universal action format (`{ target, params }`)
- Handle tree/graph nodes without x/y

Add a migration shim for legacy scenes that still have `position` fields (for backwards compatibility during transition):
```typescript
function normalizeVisual(v: any): Visual {
  const { position, ...rest } = v  // silently drop position if present
  return rest as Visual
}
```

---

### 7. `apps/web/src/ai/prompts/scene-generation.md` — Update system prompt

**Remove:** All XY coordinate examples from the visual type table.

**Add:** `layoutHint` and `slot` fields to the visual type table with their valid values.

**Add explicit rule block:**
```
LAYOUT RULES (mandatory):
- NEVER include x, y, or position fields on ANY visual or graph node
- For graph/system-diagram visuals: include layoutHint from: [dagre-TB, dagre-LR, tree-RT, linear-H, linear-V, grid-2d, hashmap-buckets, radial]
- For text-badge/counter visuals: include slot from: [top-left, top-center, top-right, bottom-left, bottom-center, bottom-right, overlay-top, overlay-bottom, center]
- Positions are computed by the layout engine automatically

ACTION FORMAT (mandatory):
- Every action must be: { "target": "<visual-id>", "params": { ...complete-state... } }
- params must contain the COMPLETE visual state at that step (not just the changed fields)
- NEVER use the old discriminated action format (set/push/pop/highlight)
```

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `packages/scene-engine/src/types.ts` | Edit | Remove position, add layoutHint/slot, simplify Action |
| `packages/scene-engine/src/schema.ts` | Edit | Zod schema matches new types |
| `packages/scene-engine/src/parser.ts` | Edit | Handle new format, migration shim |
| `packages/scene-engine/src/index.ts` | Edit | Export new types |
| `apps/web/src/content/scenes/**/*.json` | Migrate (24 files) | Remove positions, add hints |
| `scripts/migrate-scene-json.ts` | New | One-time migration automation |
| `apps/web/src/ai/prompts/scene-generation.md` | Edit | Remove XY examples, add layoutHint/slot docs |

---

## Breaking Change Warning

Removing `position` from the Visual schema is a breaking change for any hand-authored or AI-generated scenes that still have `position` fields. The migration shim in the parser (`silently drop position if present`) handles this gracefully during the transition. Once Phase 20 (layout engine) is live and Phase 21 (scene graph) is live, old scenes without positions will render correctly via the layout engine.
