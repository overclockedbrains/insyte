# Phase 35 — Plan 2: Primitive Expansion (4 Additions)

> **Status**: COMPLETE
> **Date**: 2026-04-26
> **Scope**: Add 3 new variants + 1 new top-level type. No existing scene migration needed.
>
> **Depends on**: Plan 1 complete ✓ (6-type system must be stable before this runs)
> **Blocks**: nothing — these are purely additive
>
> DO NOT KEEP ANYTHING REVERSE COMPATIBLE OR AS BACKUP — FULL CLEANUP / IMPLEMENTATION

---

## 1. Goal

Extend the 6-type primitive system with targeted additions that cover genuine content
gaps identified through analysis of the full scene library and DSA/HLD topic space.
Every addition earns its place: it enables content that the existing 6 types cannot
represent well.

**What is being added:**

| Addition | Kind | Why |
|---|---|---|
| `tree/trie` | new variant on existing type | Tries need edge-label rendering; `binary` variant name actively misleads the LLM |
| `graph/weighted` | new variant on existing type | Dijkstra/Prim/Kruskal need weight badges on edges + distance labels on nodes |
| `chart` (variant: `bar`) | new 7th top-level type | Sorting algorithms require bar height comparison — no existing type covers this |
| `ring` layoutHint | new layoutHint on `system-diagram` | Consistent hashing ring forced into free-form dagre — needs circular placement |

**What is NOT added (and why):**

- Heap/Priority Queue — covered by `linear/array` + `tree/binary` in combination; no
  new primitive needed, just good prompt guidance
- Variables panel — `linear`'s `pointers[]` covers index variables; HUD covers scalar
  state; a dedicated panel would add canvas clutter for marginal gain
- `linear/circular` — no current or near-term content use case justifies it

---

## 2. New Type Contracts

### 2.1 `tree/trie`

**Why a separate variant, not just prompt guidance under `binary`:**
Tries have two rendering differences from binary trees:
1. Edge labels (the character lives on the EDGE, not just the node)
2. End-of-word marker (a double ring on nodes that complete a valid word)

Neither is representable with the `binary` variant renderer without adding dead code
paths. The `trie` variant gets its own renderer (`TrieViz`) as an internal component.

**Canvas declaration:**
```json
{ "id": "trie", "type": "tree", "variant": "trie", "layoutHint": "dagre-TB" }
```

**State:** Same `TreeState` shape as binary — flat node array. Extended with `isEnd`.

```typescript
interface TrieNode {
  id:         string    // required
  value:      string    // required — the character at this node ('' for root)
  children:   string[]  // required — child node IDs ([] for leaves)
  highlight?: string    // optional — default | active | found
  isEnd?:     boolean   // optional — true marks a word boundary (double-ring render)
}

interface TrieState {  // same top-level shape as TreeState
  nodes:  TrieNode[]
  rootId: string
}
```

**Highlight vocabulary:** `default | active | found`
- No `end-of-word` highlight — end-of-word is structural (`isEnd: boolean`), not
  transient state. A node can be both `active` AND `isEnd` simultaneously.

**Renderer visual behaviour:**
- Nodes: circular, showing `node.value` (the character)
- Edge labels: each edge draws the character of its TARGET (child) node mid-edge
- `isEnd` nodes: double-ring border (outer ring in primary color)
- Root node: rendered as an empty circle with no character label (`value: ''`)
- Layout: dagre-TB (same as binary, wider nodeSize to fit edge labels)

**Spec changes in `spec.ts`:**
- Add `trie` variant to the `tree` entry's `variants` map
- Update `tree.description` to mention trie: "…'binary' for BST/search trees, 'trie'
  for prefix trees, 'recursion' for recursive call trees"

**Schema changes in `spec.build.ts`:**
- `FlatTreeNodeSchema`: add `isEnd: z.boolean().optional()`
- `buildCanvasVisualSchema` tree branch: `variant: z.enum(['binary', 'trie', 'recursion']).optional()`

---

### 2.2 `graph/weighted`

**Why a separate variant, not `edges[].label`:**
The existing `graph` already has `edges[].label?: string` for edge annotations. The
`weighted` variant is semantically different:
- `weight` is a number (enables visual scaling/comparison); `label` is decorative text
- Edges render a prominent weight badge (pill centered on the edge midpoint) — different
  from the small text label used in unweighted graphs
- Nodes gain a `distance` badge for Dijkstra/Bellman-Ford teaching
- Highlight vocabulary expands to cover algorithm-specific states (`relaxed`, `in-tree`,
  `rejected`) that are meaningless in unweighted graphs

The `weighted` variant shares `GraphState`'s node/edge array structure — it only adds
optional fields. This is **backwards-compatible at the schema level** (existing graph
scenes are unaffected; weighted fields are optional and ignored by the unweighted renderer).

**Canvas declaration:**
```json
{ "id": "g", "type": "graph", "variant": "weighted", "layoutHint": "dagre-TB" }
```

**State:**

```typescript
interface WeightedGraphNode {
  id:         string   // required
  label:      string   // required — display label
  highlight?: string   // optional — default | active | visited | source | settled | found
  distance?:  string   // optional — current shortest distance ("∞", "0", "7")
                       // renders as a small badge below the node label
}

interface WeightedGraphEdge {
  id:        string   // required
  from:      string   // required
  to:        string   // required
  weight:    number   // REQUIRED for weighted variant — drives the weight badge
  directed?: boolean  // optional
  highlight?: string  // optional — default | active | relaxed | min-edge | in-tree | rejected
}

interface WeightedGraphState {
  nodes: WeightedGraphNode[]
  edges: WeightedGraphEdge[]
}
```

**Highlight vocabulary:**

| Target | Values |
|---|---|
| nodes | `default \| active \| visited \| source \| settled \| found` |
| edges | `default \| active \| relaxed \| min-edge \| in-tree \| rejected` |

- `source`: the algorithm's starting node (Dijkstra source, MST root)
- `settled`: node whose optimal path is finalized (Dijkstra "extracted from PQ")
- `relaxed`: edge that successfully updated a node's distance
- `min-edge`: edge currently being considered as minimum (Prim's, Kruskal's)
- `in-tree`: edge included in the MST
- `rejected`: edge considered but not used (weight too high, or creates cycle)

**Renderer visual behaviour:**
- Weight badge: small pill (rounded rect) centered on each edge with `edge.weight`
  displayed in mono font. Color: `var(--color-outline-variant)` default,
  `var(--color-secondary)` when highlight is `active` or `relaxed`
- Distance badge: small `dist: X` label below node circle, only rendered when
  `node.distance` is set. Uses secondary color when recently updated.
- All other node/edge rendering inherits from `GraphViz` unchanged.

**Schema changes in `spec.build.ts`:**
- `GraphStateSchema` nodes: add `distance: z.string().optional()`
- `GraphStateSchema` edges: add `weight: z.number().optional()`;
  expand `highlight` from `z.enum(['default', 'active'])` to `z.string().optional()`
  (variant-scoped values enforced by prompt guide, not schema — same pattern as `linear`)
- `buildCanvasVisualSchema` graph branch: add `variant: z.string().optional()`

---

### 2.3 `chart` (variant: `bar`)

**Canvas declaration:**
```json
{ "id": "bars", "type": "chart", "variant": "bar", "layoutHint": "chart-bar" }
```

**State:**

```typescript
interface ChartBar {
  id:         string          // required — stable id for keyed animation
  value:      number          // required — bar height value (raw number, auto-scaled)
  label?:     string          // optional — label shown below bar
  highlight?: string          // optional — default | active | comparing | sorted | pivot
}

interface ChartState {
  bars:      ChartBar[]
  maxValue?: number           // optional — explicit scale ceiling; auto-derived from
                              // max(bars[].value) if omitted
}
```

**Highlight vocabulary:** `default | active | comparing | sorted | pivot`
- `active`: bar currently being examined
- `comparing`: bar being compared against `active` bar in this step
- `sorted`: bar in its final correct position
- `pivot`: the pivot element (quicksort, partition schemes)

**Renderer visual behaviour:**
- Bars: vertical SVG rects; widths equal from `PRIMITIVE_SIZING.barChart.barWidth`
- Heights: scaled proportionally — `height = (value / effectiveMax) * maxBarHeight`
- `effectiveMax` = `state.maxValue ?? Math.max(...bars.map(b => b.value))`
- Value label: shown above each bar in small mono font
- Item label: shown below each bar (optional)
- Bar color driven by `highlight` via `resolveHighlight()` (same helper as all other
  renderers — no new color logic)
- Animation: framer-motion `animate={{ height }}` on each rect — height morphs between
  steps, giving the "bars shuffling" visual sorting algorithms are known for

**layoutHint:** `chart-bar` (new value — must be added to `LayoutHintSchema` in both
`packages/scene-engine/src/spec.build.ts` AND `apps/web/src/ai/schemas.ts`)

**Layout algorithm:** `applyBarChartLayout` (new function in `arithmetic.ts`).
Pure arithmetic — no library dependency.
- Positions bars left-to-right with equal width + gap
- LayoutResult `nodes` hold bar x-positions; renderer reads `state.bars` directly for heights
- `nodes[i].height` = `PRIMITIVE_SIZING.barChart.maxBarHeight` (used for viewBox sizing only,
  not for rendering — renderer computes actual heights from values)

**Registry:** Add `'chart': ChartViz` as the 7th entry in `PrimitiveRegistry`.

**Type exports:** Add `ChartVisual = Extract<CanvasVisual, { type: 'chart' }>` in
`spec.build.ts` and re-export from `types.ts`.

---

### 2.4 `ring` layoutHint for `system-diagram`

**No state changes.** `SystemDiagramState` (components + connections) is unchanged.
The `ring` hint is purely a layout concern — it arranges components in a circle instead
of dagre LR.

**Canvas declaration:**
```json
{ "id": "hash-ring", "type": "system-diagram", "layoutHint": "ring" }
```

**Layout algorithm:** `applyRingLayout` (new function in `arithmetic.ts`).
Reads `state.components` (not `state.nodes`) for ring node placement.

```
radius = max(120, n * 35)
cx = radius + NODE_W/2 + SPACING.xxl
cy = radius + NODE_H/2 + SPACING.xxl
angle[i] = (2π × i / n) − π/2   // start at 12 o'clock
x[i] = cx + radius × cos(angle[i])
y[i] = cy + radius × sin(angle[i])
```

Connections are passed through as straight-line waypoints (from.center → to.center).
No dagre routing — ring connections are always straight.

**Routing in `layout/index.ts`:**
```typescript
case 'system-diagram':
  result = hint === 'ring'
    ? applyRingLayout(input)
    : applyDagreLayout(input, 'LR')
  break
```

**layoutHint additions:** `'ring'` added to `LayoutHintSchema` (both `spec.build.ts`
and `apps/web/src/ai/schemas.ts`).

---

## 3. Highlight Standardisation — Updated Summary

Extending Plan 1's table:

| Type | Variant | Highlight field | Values |
|---|---|---|---|
| `linear` | all | `items[].highlight` | variant-scoped (Plan 1) |
| `map` | — | `entries[].highlight` | `default \| insert \| hit \| remove` |
| `tree` | `binary` | `nodes[].highlight` | `default \| active \| found \| visited` |
| `tree` | `trie` | `nodes[].highlight` | `default \| active \| found` |
| `tree` | `recursion` | `nodes[].highlight` | `default \| active \| returned \| memoized` |
| `graph` | — | `nodes[].highlight`, `edges[].highlight` | `default \| active \| visited \| found` / `default \| active` |
| `graph` | `weighted` | `nodes[].highlight`, `edges[].highlight` | nodes: `default \| active \| visited \| source \| settled \| found` / edges: `default \| active \| relaxed \| min-edge \| in-tree \| rejected` |
| `grid` | all | `cells[][].highlight` | variant-scoped (Plan 1) |
| `system-diagram` | — | `components[].status` | `normal \| active \| overloaded \| dead` |
| `chart` | `bar` | `bars[].highlight` | `default \| active \| comparing \| sorted \| pivot` |

---

## 4. Implementation Sub-Phases

Dependencies flow top to bottom. Each sub-phase must be complete before the next.

---

### Sub-Phase A — Spec & Type Contracts

**Goal:** Canonical spec updated. Zod schemas extended. All new types and variants
compile. Everything downstream derives from this.

#### A.1 — `packages/scene-engine/src/spec.ts`

- **`tree` entry:**
  - Update `description`: "…'binary' for BST/search trees, 'trie' for prefix trees,
    'recursion' for recursive call trees"
  - Add `trie` to `variants` map:
    ```typescript
    trie: {
      description: 'Prefix tree. N-ary (arbitrary children). Edge labels show characters. isEnd marks word boundaries.',
      highlightValues: ['default', 'active', 'found'],
      defaultLayoutHint: 'dagre-TB',
      generationRules: [
        'highlight values: default | active | found',
        'isEnd: true marks nodes where a valid word ends — renders a double ring.',
        'value: "" for the root node. value: single character for all other nodes.',
        'Edge label shown on each edge is the character of the child node.',
        'N-ary: children[] can have any number of IDs (one per unique next-character).',
      ],
    }
    ```

- **`graph` entry:**
  - Update `description` to mention weighted variant
  - Add `weighted` to `variants` map:
    ```typescript
    weighted: {
      description: 'Weighted graph for Dijkstra, Prim\'s, Kruskal\'s. Renders weight badges on edges and distance labels on nodes.',
      highlightValues: ['default', 'active', 'relaxed', 'min-edge', 'in-tree', 'rejected'],
      defaultLayoutHint: 'dagre-TB',
      generationRules: [
        'node highlight values: default | active | visited | source | settled | found',
        'edge highlight values: default | active | relaxed | min-edge | in-tree | rejected',
        'edges[].weight is REQUIRED (number) — drives the rendered weight badge.',
        'nodes[].distance is optional (string: "∞", "0", "7") — shown as a badge below node.',
        'source: starting node. settled: shortest path finalised. relaxed: distance updated.',
        'min-edge: currently selected minimum. in-tree: included in MST. rejected: discarded.',
      ],
    }
    ```

- **`chart` entry** (new top-level entry):
  ```typescript
  chart: {
    description: 'Bar chart for quantitative comparison. Use for sorting algorithms, frequency distributions, load comparisons.',
    defaultLayoutHint: 'chart-bar',
    source: 'ai',
    state: {
      bars: {
        type: 'array',
        required: true,
        description: 'Ordered list of bars, left to right.',
        items: {
          id:        { type: 'string',  required: true,  description: 'Stable id for keyed animation.' },
          value:     { type: 'number',  required: true,  description: 'Numeric value — determines bar height.' },
          label:     { type: 'string',  required: false, description: 'Label shown below bar.' },
          highlight: { type: 'string',  required: false, description: 'Variant-scoped highlight token.' },
        },
      },
      maxValue: {
        type: 'number',
        required: false,
        description: 'Explicit scale ceiling. Auto-derived from max(bars[].value) if omitted.',
      },
    },
    generationRules: [
      'FULL-SNAPSHOT: every step canvas update must include ALL bars.',
      'bars[].id is required for stable keyed animation — use consistent IDs across steps.',
      'bars[].value is the raw number — never normalise it, the renderer scales automatically.',
      'highlight values: default | active | comparing | sorted | pivot',
      'Set maxValue in initialState to fix the scale across all steps (prevents scale jumping).',
    ],
    variants: {
      bar: {
        description: 'Vertical bar chart. Heights proportional to value, animated between steps.',
        highlightValues: ['default', 'active', 'comparing', 'sorted', 'pivot'],
        defaultLayoutHint: 'chart-bar',
        generationRules: [
          'highlight values: default | active | comparing | sorted | pivot',
          'active: bar currently being examined. comparing: being compared with active.',
          'sorted: bar in final correct position. pivot: the pivot/partition element.',
        ],
      },
    },
  }
  ```

- **`system-diagram` entry:**
  - Add note in `generationRules`:
    `'Use layoutHint "ring" for circular topologies (consistent hashing, round-robin scheduling).'`

#### A.2 — `packages/scene-engine/src/spec.build.ts`

- **`LayoutHintSchema`**: add `'chart-bar'` and `'ring'`
  ```typescript
  export const LayoutHintSchema = z.enum([
    'dagre-TB', 'dagre-LR', 'dagre-BT', 'tree-RT',
    'linear-H', 'linear-V', 'grid-2d', 'hashmap-buckets', 'radial',
    'chart-bar', 'ring',  // ← NEW
  ])
  ```

- **`FlatTreeNodeSchema`**: add `isEnd: z.boolean().optional()`

- **`GraphStateSchema`**:
  - Nodes: add `distance: z.string().optional()`
  - Edges: add `weight: z.number().optional()`; change `highlight` from
    `z.enum(['default', 'active'])` → `z.string().optional()` (variant-scoped, prompt-enforced)

- **`ChartStateSchema`** (new):
  ```typescript
  const ChartStateSchema = z.object({
    bars: z.array(z.object({
      id:        z.string(),
      value:     z.number(),
      label:     z.string().optional(),
      highlight: z.string().optional(),
    })),
    maxValue: z.number().optional(),
  })
  ```

- **`CanvasStateUnionSchema`**: add `ChartStateSchema` to union

- **`buildCanvasVisualSchema()`** discriminated union:
  - Tree branch: `variant: z.enum(['binary', 'trie', 'recursion']).optional()`
  - Graph branch: add `variant: z.string().optional()`
  - New `chart` branch:
    ```typescript
    z.object({
      ...base,
      type:         z.literal('chart'),
      variant:      z.enum(['bar']),
      initialState: ChartStateSchema,
    }),
    ```

- **Type exports** (bottom of file):
  ```typescript
  export type ChartVisual = Extract<CanvasVisual, { type: 'chart' }>
  ```

#### A.3 — `packages/scene-engine/src/types.ts`

- Add `ChartVisual` to the `export type { ... } from './spec.build'` block
- `VisualType` derives automatically from `CanvasVisual['type']` — no manual change needed

**Deliverable:** Both packages compile with 0 TypeScript errors. `buildPromptGuide()`
automatically picks up the new `chart` entry and the new `trie`/`weighted` variants from
`CANVAS_VISUAL_SPEC` — no changes to `buildPromptGuide()` itself needed (it reads the spec map).

---

### Sub-Phase B — Renderer Additions

**Goal:** Registry grows from 6 to 7. Four new renderer files. Two existing dispatcher
files updated. All new renderers pass a basic smoke test in SceneStudio.

**Architecture principle (same as Plan 1):**
```
PrimitiveRegistry['chart']  → ChartViz → reads visual.variant → BarChartViz
PrimitiveRegistry['tree']   → TreeViz  → reads visual.variant → TrieViz (new) | BinaryTreeViz | RecursionTreeViz
PrimitiveRegistry['graph']  → GraphViz → reads visual.variant → WeightedGraphViz (new) | unweighted path
```

#### B.1 — New file: `apps/web/src/engine/primitives/TrieViz.tsx`

Internal renderer routed from `TreeViz`. Reads `TreeState` (flat nodes + rootId).

Key rendering decisions:
- Layout comes from `computeLayout()` — same call as `BinaryTreeViz`, but uses `trie`
  nodeSize from `PRIMITIVE_SIZING.trie` (wider, to fit edge labels)
- Edge labels: for each layout edge, render a `<text>` element at the edge midpoint
  showing the child node's `value` (the character)
- End-of-word marker: when `rawNode.isEnd === true`, render a second concentric circle
  (outer ring) inside the `foreignObject`, using `border-4` or double-border CSS
- Root node: `value === ''` renders as an empty circle (no text)
- Highlight colors: `resolveHighlight(raw?.highlight)` — same helper as all other renderers

```tsx
export function TrieViz({ id, state, visual }: PrimitiveProps) {
  // Uses BinaryTreeViz layout path — trie nodeSize in PRIMITIVE_SIZING.trie
  // Edge label: midpoint text showing child.value character
  // isEnd: double-ring on nodes where rawNode.isEnd === true
}
```

#### B.2 — New file: `apps/web/src/engine/primitives/WeightedGraphViz.tsx`

Internal renderer routed from `GraphViz`. Extends `GraphViz` rendering with:

- **Weight badge:** For each edge, render a `<rect>` + `<text>` at the edge midpoint.
  - Badge width: ~24px, height: ~18px, rounded corners
  - Text: `edge.weight.toString()`
  - Background color: `var(--color-surface-container)` default;
    `var(--color-secondary-container)` when `edge.highlight` is `active` or `relaxed`

- **Distance badge:** When `node.distance` is set, render below the node circle:
  - Small `<text>` element: `dist: {node.distance}` in 8px mono font
  - Position: `posNode.y + nodeH/2 + 10`

- **Edge highlight colors** (extended from GraphViz):
  - `active`, `relaxed`, `min-edge`: secondary color with glow
  - `in-tree`: primary color (solid — this edge is chosen)
  - `rejected`: error/dim color (strikethrough effect via dasharray)
  - `default`: outline-variant (same as GraphViz)

- **Node highlight colors** (extended from GraphViz):
  - `source`: primary color (the algorithm's starting node — stays colored throughout)
  - `settled`: surface-variant with checkmark feel (dimmed, decided)
  - All others: standard `resolveHighlight()` output

```tsx
export function WeightedGraphViz({ id, state, visual }: PrimitiveProps) {
  // Inherits computeLayout() call from GraphViz pattern
  // Adds weight badge SVG elements on edges
  // Adds distance label SVG elements below nodes
  // Extends edge/node color logic for weighted highlight vocabulary
}
```

#### B.3 — New file: `apps/web/src/engine/primitives/ChartViz.tsx`

Top-level dispatcher for the `chart` type. Only one variant for now (`bar`).

```tsx
export function ChartViz(props: PrimitiveProps) {
  // Only 'bar' variant exists — route directly
  return <BarChartViz {...props} />
}
```

#### B.4 — New file: `apps/web/src/engine/primitives/BarChartViz.tsx`

The actual bar chart renderer.

```typescript
// State types
interface ChartBar { id: string; value: number; label?: string; highlight?: string }
interface ChartState { bars: ChartBar[]; maxValue?: number }
```

Rendering:
- Container: `<div className="flex items-end justify-center gap-2 w-full min-h-[240px]">`
- Each bar: `<motion.div>` with `animate={{ height: barHeight }}` for smooth step transitions
- Bar width: `PRIMITIVE_SIZING.barChart.barWidth` (40px)
- Bar height computed: `(bar.value / effectiveMax) * PRIMITIVE_SIZING.barChart.maxBarHeight`
- `effectiveMax`: `state.maxValue ?? Math.max(...bars.map(b => b.value), 1)`
- Background color: `resolveHighlight(bar.highlight).bg` — consistent with all renderers
- Value label: `<div>` above bar, small mono text
- Item label: `<div>` below bar, small secondary text
- Stable key: `bar.id` for keyed re-ordering animation (bars swap positions correctly)

#### B.5 — Updated: `apps/web/src/engine/primitives/TreeViz.tsx`

Add trie routing before the binary path:

```tsx
export function TreeViz(props: PrimitiveProps) {
  if (props.visual?.variant === 'recursion') return <RecursionTreeViz {...props} />
  if (props.visual?.variant === 'trie')      return <TrieViz {...props} />          // NEW
  return <BinaryTreeViz {...props} />
}
```

Import `TrieViz` at top of file.

#### B.6 — Updated: `apps/web/src/engine/primitives/GraphViz.tsx`

Add weighted routing at the top of `GraphViz`:

```tsx
export function GraphViz(props: PrimitiveProps) {
  if (props.visual?.variant === 'weighted') return <WeightedGraphViz {...props} />  // NEW
  return <UnweightedGraphViz {...props} />
}
```

Refactor current `GraphViz` body into `UnweightedGraphViz` (internal function, not
exported, not in registry). This is the cleanest split — avoids prop threading and
keeps the unweighted path unchanged.

Import `WeightedGraphViz` at top of file.

#### B.7 — Updated: `apps/web/src/engine/primitives/index.ts`

```typescript
import { ChartViz } from './ChartViz'  // NEW import

export const PrimitiveRegistry: Record<string, React.ComponentType<PrimitiveProps>> = {
  'linear':         LinearViz,
  'map':            MapViz,
  'tree':           TreeViz,
  'graph':          GraphViz,
  'grid':           GridViz,
  'system-diagram': SystemDiagramViz,
  'chart':          ChartViz,           // NEW — 7th entry
}
```

**Files NOT deleted:** All existing renderer files unchanged except the two dispatcher
updates above. `SystemDiagramViz.tsx` has no changes — ring layout is handled entirely
in the layout engine.

**Deliverable:** `PrimitiveRegistry` has exactly 7 entries. All 4 new renderers render
without errors in SceneStudio smoke test. Existing 6 renderers are unaffected.

---

### Sub-Phase C — AI Pipeline Update

**Goal:** Stage 0 reasoning + Stage 1 skeleton + Stage 2 steps updated for all 4
additions. AI can generate valid scenes using `chart/bar`, `tree/trie`,
`graph/weighted`, and `system-diagram` with `ring` layout.

#### C.1 — `apps/web/src/ai/schemas.ts`

- `SceneSkeletonSchema.canvas[].type` enum: add `'chart'`
  ```typescript
  type: z.enum(['linear', 'map', 'tree', 'graph', 'grid', 'system-diagram', 'chart']),
  ```

- `SceneSkeletonSchema.canvas[].layoutHint` enum: add `'chart-bar'` and `'ring'`
  ```typescript
  layoutHint: z.enum([
    'dagre-TB', 'dagre-LR', 'dagre-BT', 'tree-RT',
    'linear-H', 'linear-V', 'grid-2d', 'hashmap-buckets', 'radial',
    'chart-bar', 'ring',  // ← NEW
  ]),
  ```

#### C.2 — `apps/web/src/ai/prompts/stage0-reasoning.md`

Update section 2 (VISUALS):

```
2. VISUALS — Which 2–4 visual primitives best represent it, and why?
   Allowed types: linear · map · tree · graph · grid · system-diagram · chart
   Variants:
     linear → array | stack | queue | linked-list (required)
     tree   → binary | trie | recursion (optional; default: binary)
     graph  → weighted (optional; omit for unweighted)
     grid   → pathfinding | dp (required)
     chart  → bar (required)
   Layout hints: dagre-TB/LR for graphs/trees, linear-H for arrays, tree-RT for binary trees,
                 grid-2d for DP, chart-bar for bar charts, ring for circular system diagrams
```

#### C.3 — `apps/web/src/ai/prompts/stage1-skeleton.md`

Update rule 3 (Allowed types and variants):

```
3. Allowed types and their required/optional variants:
   - `linear` → variant required: "array" | "stack" | "queue" | "linked-list"
   - `map` → no variant
   - `tree` → variant optional: "binary" (default), "trie" for prefix trees, "recursion" for call trees
   - `graph` → variant optional: "weighted" for Dijkstra/MST algorithms
   - `grid` → variant required: "pathfinding" | "dp"
   - `system-diagram` → no variant
   - `chart` → variant required: "bar"
4. Choose layoutHint:
   - dagre-TB/LR for graphs/trees | linear-H for array/queue/linked-list | linear-V for stacks
   - tree-RT for recursion trees | grid-2d for grids | hashmap-buckets for maps
   - chart-bar for bar charts | ring for circular system-diagrams (consistent hashing etc)
```

Update example comment to show that `chart/bar` uses `chart-bar` layoutHint.

#### C.4 — `apps/web/src/ai/prompts/stage2-steps.md`

Add chart state format in the VALIDATION CHECKLIST or examples section:

```
- chart canvas updates must include the "bars" array with all bars
- chart bars[].value is always a raw number (never pre-scaled)
- Weighted graph edges[] must include weight (number) on every edge
- Trie nodes use isEnd: true/false (boolean) to mark word boundaries
- system-diagram with layoutHint "ring" uses the same state format as all other system-diagrams
```

**Note on `buildPromptGuide()`:** This function in `spec.build.ts` automatically reads
`CANVAS_VISUAL_SPEC` — since Sub-Phase A adds `chart` to the spec and adds `trie`/
`weighted` variants to `tree`/`graph`, the prompt guide output is correct automatically.
No changes to `builders.ts` or `buildPromptGuide()` needed.

**Deliverable:** AI Stage 1 generates valid skeletons with `chart/bar`, `tree/trie`,
`graph/weighted`, and `system-diagram` with `ring` hint. Stage 2 prompt guide includes
the correct highlight vocabulary for each new variant.

---

### Sub-Phase D — Layout Engine, Spacing & Tests

**Goal:** All 4 additions have working layout algorithms. Spacing constants defined.
`tsc` is clean. Key layout paths covered by tests.

#### D.1 — `packages/scene-engine/src/layout/spacing.ts`

Add three new entries:

```typescript
export const PRIMITIVE_SIZING = {
  // ... existing entries ...
  trie:         { nodeSize: [96, 64] as [number, number] },  // wider than tree (72,56) for edge labels
  barChart:     { barWidth: 40, barGap: 8, maxBarHeight: 200 },
  weightedGraph: { nodeWidth: 100, nodeHeight: 40, nodesep: 60, ranksep: 80 },
                // extra space for weight badges on edges + distance labels below nodes
} as const
```

#### D.2 — `packages/scene-engine/src/layout/algorithms/d3-hierarchy.ts`

The `isRecursion` flag already drives different nodeSize for recursion vs binary trees
(line 7). Extend this to also handle `trie`:

```typescript
const variant = input.visual.variant as string | undefined
const isRecursion = variant === 'recursion'
const isTrie      = variant === 'trie'

const nodeSize = isRecursion
  ? PRIMITIVE_SIZING.recursionTree.nodeSize
  : isTrie
    ? PRIMITIVE_SIZING.trie.nodeSize
    : PRIMITIVE_SIZING.tree.nodeSize
```

No other changes — dagre-TB layout works for tries as-is.

#### D.3 — `packages/scene-engine/src/layout/algorithms/arithmetic.ts`

Add two new exported functions:

**`applyBarChartLayout`:**
```typescript
export function applyBarChartLayout(input: LayoutInput): LayoutResult {
  const s = PRIMITIVE_SIZING.barChart
  const state = input.state as { bars?: any[] }
  const bars = state.bars ?? []

  const nodes = bars.map((bar: any, i: number) => ({
    id:     bar.id ?? `bar-${i}`,
    x:      i * (s.barWidth + s.barGap) + s.barWidth / 2,
    y:      s.maxBarHeight / 2,      // viewBox y-center; actual height rendered by component
    width:  s.barWidth,
    height: s.maxBarHeight,          // max possible height for viewBox sizing
    type:   input.visual.type,
    state:  bar as Record<string, unknown>,
  }))

  return computeLayoutResult(nodes, [])
}
```

**`applyRingLayout`:**
```typescript
export function applyRingLayout(input: LayoutInput): LayoutResult {
  // System-diagram ring layout — components placed on a circle
  const s = { nodeW: 120, nodeH: 48 }   // matches PRIMITIVE_SIZING.systemDiagram
  const state = input.state as { components?: any[]; connections?: any[] }
  const components = state.components ?? []
  const connections = state.connections ?? []

  const n = components.length
  if (n === 0) return { nodes: [], edges: [], boundingBox: { minX: 0, minY: 0, maxX: 400, maxY: 300 }, viewBox: '0 0 400 300' }

  const radius = Math.max(150, n * 40)
  const cx = radius + s.nodeW / 2 + SPACING.xxl
  const cy = radius + s.nodeH / 2 + SPACING.xxl

  const nodes = components.map((comp: any, i: number) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2   // start at 12 o'clock
    return {
      id:     comp.id,
      x:      cx + radius * Math.cos(angle),
      y:      cy + radius * Math.sin(angle),
      width:  s.nodeW,
      height: s.nodeH,
      type:   input.visual.type,
      state:  comp as Record<string, unknown>,
    }
  })

  const nodeById = new Map(nodes.map(nd => [nd.id, nd]))
  const edges = connections.map((conn: any, i: number) => ({
    id:    conn.id ?? `ring-edge-${i}`,
    from:  conn.from,
    to:    conn.to,
    label: conn.label,
    waypoints: (() => {
      const src = nodeById.get(conn.from)
      const dst = nodeById.get(conn.to)
      if (!src || !dst) return []
      return [{ x: src.x, y: src.y }, { x: dst.x, y: dst.y }]
    })(),
  }))

  return computeLayoutResult(nodes, edges)
}
```

#### D.4 — `packages/scene-engine/src/layout/index.ts`

**`hashTopology`:** Add chart case:
```typescript
if (type === 'chart') {
  const s = state as any
  const bars: any[] = s.bars ?? []
  return `${visual.id}|chart|${bars.map((b: any) => b.id).join(',')}`
}
```

**`computeLayout` switch:** Two changes:
```typescript
case 'chart':
  result = applyBarChartLayout(input)
  break

case 'system-diagram':
  result = hint === 'ring'
    ? applyRingLayout(input)      // NEW branch
    : applyDagreLayout(input, 'LR')
  break
```

Import `applyBarChartLayout` and `applyRingLayout` from `./algorithms/arithmetic`.

#### D.5 — Test Files

**`packages/scene-engine/src/spec.test.ts`:**
- Add test: `VisualType` includes `'chart'`
- Add test: `LayoutHintSchema` includes `'chart-bar'` and `'ring'`
- Add test: `buildCanvasVisualSchema()` accepts `{ type: 'chart', variant: 'bar', layoutHint: 'chart-bar' }`
- Add test: `buildCanvasVisualSchema()` accepts `{ type: 'tree', variant: 'trie', layoutHint: 'dagre-TB' }`
- Add test: `buildCanvasVisualSchema()` accepts `{ type: 'graph', variant: 'weighted', layoutHint: 'dagre-TB' }`
- Add test: `buildCanvasVisualSchema()` accepts `{ type: 'system-diagram', layoutHint: 'ring' }`
- Add test: `buildPromptGuide()` emits `trie` and `weighted` variant sections when those canvas visuals are present

**`packages/scene-engine/src/layout/algorithms/arithmetic.test.ts`:**
- Add test: `applyBarChartLayout` with 5 bars produces 5 nodes, x-positions increase left-to-right
- Add test: `applyRingLayout` with 6 components produces 6 nodes placed in a circle (verify no two nodes at the same x,y)
- Add test: `applyBarChartLayout` with 0 bars produces empty layout (no crash)
- Add test: `applyRingLayout` with 0 components produces empty layout (no crash)

**Deliverable:** `tsc` 0 errors across both packages. All new layout tests pass.
SceneStudio manual spot-check: all 7 registry types render without errors.

---

## 5. Files Affected — Complete List

```
packages/scene-engine/src/
  spec.ts                                      ← A  (tree/trie variant, graph/weighted variant, chart entry)
  spec.build.ts                                ← A  (LayoutHintSchema, FlatTreeNodeSchema, GraphStateSchema,
                                                      ChartStateSchema, buildCanvasVisualSchema, ChartVisual export)
  types.ts                                     ← A  (ChartVisual re-export)
  layout/index.ts                              ← D4 (chart case, ring dispatch for system-diagram, hashTopology)
  layout/spacing.ts                            ← D1 (trie, barChart, weightedGraph sizing)
  layout/algorithms/arithmetic.ts              ← D3 (applyBarChartLayout, applyRingLayout)
  layout/algorithms/d3-hierarchy.ts            ← D2 (trie nodeSize branch)
  spec.test.ts                                 ← D5 (new type/variant/layout tests)
  layout/algorithms/arithmetic.test.ts         ← D5 (barChart + ring layout tests)

apps/web/src/engine/primitives/
  index.ts                                     ← B7 (add 'chart': ChartViz)
  ChartViz.tsx                                 ← B3 (NEW — dispatcher for chart type)
  BarChartViz.tsx                              ← B4 (NEW — bar chart renderer)
  TrieViz.tsx                                  ← B1 (NEW — trie renderer, internal to TreeViz)
  WeightedGraphViz.tsx                         ← B2 (NEW — weighted graph renderer, internal to GraphViz)
  TreeViz.tsx                                  ← B5 (add trie routing)
  GraphViz.tsx                                 ← B6 (refactor to dispatcher + add weighted routing)

apps/web/src/ai/
  schemas.ts                                   ← C1 (type enum + layoutHint enum)
  prompts/stage0-reasoning.md                  ← C2 (chart type, trie/weighted/ring additions)
  prompts/stage1-skeleton.md                   ← C3 (allowed types/variants/hints update)
  prompts/stage2-steps.md                      ← C4 (validation checklist additions)

apps/web/src/content/scenes/                   ← NOT TOUCHED — no existing scenes use new types
```

**Total new files: 4**
**Total modified files: 13**
**Deleted files: 0**

---

## 6. Acceptance Criteria

- [ ] `packages/scene-engine` compiles with 0 TypeScript errors
- [ ] `apps/web` compiles with 0 TypeScript errors
- [ ] `PrimitiveRegistry` has exactly 7 entries
- [ ] `LayoutHintSchema` includes `'chart-bar'` and `'ring'`
- [ ] SceneStudio smoke test: `chart/bar` renders bars with animated heights
- [ ] SceneStudio smoke test: `tree/trie` renders edge labels and double-ring on `isEnd` nodes
- [ ] SceneStudio smoke test: `graph/weighted` renders weight badges on edges and distance labels on nodes
- [ ] SceneStudio smoke test: `system-diagram` with `ring` layout arranges components in a circle
- [ ] All new layout tests pass (`arithmetic.test.ts`)
- [ ] All new schema/spec tests pass (`spec.test.ts`)
- [ ] AI Stage 1 generates valid skeleton with `chart/bar` and correct `chart-bar` layoutHint (manual test: "Bubble Sort" topic)
- [ ] AI Stage 1 generates valid skeleton with `tree/trie` (manual test: "Trie / Autocomplete" topic)
- [ ] AI Stage 1 generates valid skeleton with `graph/weighted` (manual test: "Dijkstra's Algorithm" topic)
- [ ] `buildPromptGuide()` emits trie-specific and weighted-specific rules when those visuals are in the scene

---

## 7. Out of Scope

- `variables` display primitive — deferred. `linear`'s `pointers[]` covers index vars;
  HUD covers scalar state. No current scene gap justifies the canvas space cost.
- `linear/circular` — no current content use case.
- `chart/line` variant — not needed until time-series content exists.
- `tree/heap` — heap content covered by `linear/array` + `tree/binary` in combination.
- Existing scene JSON migration — no existing scenes use any of the new types. No
  migration pass needed.
- Scene JSON optimisation (sparse overlays) — that is Plan 2 of a future phase,
  blocked by Plan 1 of this phase.
