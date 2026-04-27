# Phase 35 — Plan 1: Primitive Consolidation (11 → 6 Types)

> **Status**: Ready for implementation
> **Date**: 2026-04-26
> **Scope**: Consolidate 11 canvas visual types into 6. Standardise state vocabulary.
> Does NOT include JSON payload optimisation (sparse overlays) — that is Plan 2.
>
> **Depends on**: Phase 34 complete ✓
> **Blocks**: Plan 2 (JSON optimisation needs stable type contracts first)
>
> DO NOT KEEP ANYTHING REVERSE COMPATIBLE OR AS BACKUP FULL CLEANUP / IMPLEMENTATION

---

## 1. Goal

Replace the 11-type primitive system with 6 semantically distinct types. Reduce the
AI's cognitive load in Stage 1 (fewer choices) and Stage 2 (one consistent state
pattern per type family). Standardise the `highlight` field vocabulary across all
types so the AI has one mental model for "what is this node doing right now."

**Before → After:**

| Old type | New type | Variant |
|---|---|---|
| `array` | `linear` | `"array"` |
| `stack` | `linear` | `"stack"` |
| `queue` | `linear` | `"queue"` |
| `linked-list` | `linear` | `"linked-list"` |
| `hashmap` | `map` | — |
| `tree` | `tree` | `"binary"` (default) |
| `recursion-tree` | `tree` | `"recursion"` |
| `graph` | `graph` | — |
| `dp-table` | `grid` | `"dp"` |
| `grid` | `grid` | `"pathfinding"` |
| `system-diagram` | `system-diagram` | — |

---

## 2. The `variant` Field

`variant` lives on the **canvas visual declaration** (alongside `type`, `id`,
`layoutHint`), not inside the step state. It is static — it never changes across
steps. It tells the renderer which visual style to apply to the same underlying
state shape.

Required for: `linear`, `grid`
Optional for: `tree` (defaults to `"binary"`)
Not present on: `map`, `graph`, `system-diagram`

```json
// Stage 1 canvas visual declaration — new format
{ "id": "my-stack",  "type": "linear", "variant": "stack",       "layoutHint": "linear-V" }
{ "id": "my-queue",  "type": "linear", "variant": "queue",       "layoutHint": "linear-H" }
{ "id": "my-array",  "type": "linear", "variant": "array",       "layoutHint": "linear-H" }
{ "id": "my-list",   "type": "linear", "variant": "linked-list", "layoutHint": "linear-H" }
{ "id": "my-grid",   "type": "grid",   "variant": "pathfinding", "layoutHint": "grid-2d"  }
{ "id": "my-dp",     "type": "grid",   "variant": "dp",          "layoutHint": "grid-2d"  }
{ "id": "my-tree",   "type": "tree",   "variant": "binary",      "layoutHint": "dagre-TB" }
{ "id": "my-rec",    "type": "tree",   "variant": "recursion",   "layoutHint": "tree-RT"  }
```

---

## 3. New Type Contracts

### 3.1 `linear`

One renderer (`LinearViz`), four visual styles. The state shape is identical across
all variants — only the renderer's presentation changes.

**Canvas declaration fields:** `type, variant, id, layoutHint, label?`

**State:**
```typescript
interface LinearItem {
  id:        string           // required — stable id for keyed animation
  value:     string | number  // required
  highlight?: string          // optional — variant-scoped values (see below)
}

interface LinearState {
  items:            LinearItem[]
  pointers?:        { index: number; label: string; color?: string }[]
  windowHighlight?: { start: number; end: number }
}
```

**Highlight vocabulary (prompt-guide-enforced, not schema-enforced):**

| Variant | Valid highlight values |
|---|---|
| `array` | `default \| active \| hit \| insert \| error` |
| `stack` | `default \| active \| push \| pop` |
| `queue` | `default \| active \| enqueue \| dequeue` |
| `linked-list` | `default \| active \| insert \| delete` |

**`pointers[]` and `windowHighlight` are available to ALL variants** — this is a
gain for `linked-list` (prev/curr/next cursor labels) and `queue` (sliding window).

**What is DROPPED from old types:**
- `linked-list`: `node.next` field (implicit via item order), `headId` (HEAD = `items[0]`)
- `stack`/`queue`: legacy `highlight: number` index-based field
- `array`: field rename `cells` → `items` (the spec said `items` but renderer read `cells` — this fixes the mismatch)

**Renderer visual behaviour by variant:**
- `array`: horizontal cells, index labels below, optional pointer arrows above, optional window bracket
- `stack`: vertical, "top of stack" / "call stack" labels, items rendered bottom-to-top
- `queue`: horizontal, "← dequeue" / "enqueue →" labels
- `linked-list`: horizontal boxes with pointer arrows between adjacent items, HEAD label on `items[0]`

**Default `layoutHint` per variant:**
- `array`: `linear-H`
- `stack`: `linear-V`
- `queue`: `linear-H`
- `linked-list`: `linear-H`

---

### 3.2 `map`

Rename of `hashmap`. Same data format, broader semantic signal.

**Canvas declaration fields:** `type, id, layoutHint, label?`

**State:**
```typescript
interface MapEntry {
  id:        string  // required — stable id (note: renderer currently keys by entry.key — this aligns them)
  key:       string  // required — always stringified
  value:     string  // required — always stringified
  highlight?: string // default | insert | hit | remove
}

interface MapState {
  entries: MapEntry[]
}
```

**Highlight vocabulary:** `default | insert | hit | remove`

**Changes from `hashmap`:**
- Type name: `hashmap` → `map`
- Renderer: `HashMapViz` → `MapViz`
- Animation key: currently uses `entry.key` — align with spec by using `entry.id`
- Drop `label?` field from `HashMapState` (undocumented, unused in scenes)
- No state format changes

---

### 3.3 `tree`

Absorbs `recursion-tree`. Both variants use the **flat node array** format (which is
what the renderers have always used — the spec's recursive nested object was wrong).

**Canvas declaration fields:** `type, variant?, id, layoutHint, label?`

**State:**
```typescript
interface TreeNode {
  id:        string    // required
  value:     string    // required — display label (was `label` in recursion-tree, now unified to `value`)
  children:  string[]  // required — array of child node IDs ([] for leaves, never omit)
  highlight?: string   // optional — variant-scoped values (see below)
  result?:   string    // optional — only used in "recursion" variant (e.g. "= 3")
}

interface TreeState {
  nodes:  TreeNode[]
  rootId: string
}
```

**Highlight vocabulary (prompt-guide-enforced):**

| Variant | Valid highlight values |
|---|---|
| `binary` | `default \| active \| found \| visited` |
| `recursion` | `default \| active \| returned \| memoized` |

**What is DROPPED / CHANGED from old types:**
- `tree` spec: recursive nested `root { left?, right? }` format — replaced by flat `{ nodes[], rootId }`
  (the renderer was always flat; the spec was incorrect)
- `recursion-tree`: `label` field renamed → `value` (consistency with all other types)
- `recursion-tree`: `status: 'pending' | 'computing' | 'memoized' | 'complete'` replaced by `highlight`
  enum above. Renderer's `statusToHighlight()` function removed; AI writes `highlight` directly.
- `recursion-tree`: `children?: string[]` becomes `children: string[]` (required, same rule as before)

**Renderer behaviour by variant:**
- `binary`: circular nodes, max 2 children per node enforced by prompt guide, Reingold-Tilford layout
- `recursion`: same layout, renders `result` below node value, `memoized` highlight shows strikethrough
  and dashed edges, no child count limit

---

### 3.4 `graph`

Minimal changes — standardise edge highlight field.

**Canvas declaration fields:** `type, id, layoutHint, label?`

**State:**
```typescript
interface GraphNode {
  id:        string  // required
  label:     string  // required — display label
  highlight?: string // default | active | visited | found
}

interface GraphEdge {
  id:        string   // required — unique edge id
  from:      string   // required
  to:        string   // required
  label?:    string   // optional — edge weight or annotation
  directed?: boolean  // optional — defaults to false
  highlight?: string  // default | active   ← was `highlighted: boolean` before
}

interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
```

**Changes from old `graph`:**
- `edges[].highlighted: boolean` → `edges[].highlight: 'default' | 'active'` (standardised field name and type)
- Remove legacy `nodes[].color?: string` (raw hex — was a backwards-compat field)
- Add `edges[].id` as required (renderer currently keys by `from-to` — this formalises it)

---

### 3.5 `grid`

Absorbs `dp-table`. Both variants use the same 2D cell structure.

**Canvas declaration fields:** `type, variant, id, layoutHint, label?`

**State:**
```typescript
interface GridCell {
  value:     string | number | null  // required
  highlight?: string                 // variant-scoped values (see below)
}

interface GridState {
  rows:          number      // required — row count
  cols:          number      // required — column count
  cells:         GridCell[][] // required — cells[row][col], NO per-cell id (positional keying)
  rowLabels?:    string[]    // optional — used in "dp" variant
  colLabels?:    string[]    // optional — used in "dp" variant
  currentCell?:  { row: number; col: number }  // optional — cursor, used in "pathfinding" variant
}
```

**Highlight vocabulary (prompt-guide-enforced):**

| Variant | Valid highlight values |
|---|---|
| `pathfinding` | `default \| active \| visited \| wall \| path \| start \| end` |
| `dp` | `default \| active \| filled \| source` |

**Changes from old types:**
- `grid` (old): `cells[][].state` field renamed → `cells[][].highlight` (standardised)
  — old enum `'empty' | 'wall' | 'visited' | 'path' | 'start' | 'end' | 'active'` maps to new:
  `'empty'` → omit highlight (default), rest map 1:1
- `dp-table`: no state format changes — already used `cells[][].highlight`
- Per-cell `id` field dropped from `dp-table` spec (renderer never used it, keyed positionally)
- Renderer: `GridViz` absorbs `DPTableViz`'s diff-based imperative animation for `dp` variant
  (the `useAnimate()` cell diff optimisation from `DPTableViz` is the right approach for large tables)

---

### 3.6 `system-diagram`

No changes to the state contract in Plan 1. Connection `id` field is pre-noted here
as a Plan 2 requirement (needed for sparse overlay format).

**Canvas declaration fields:** `type, id, layoutHint, label?`

**State:** Unchanged from Phase 34. Components use `status` enum (not `highlight`),
connections use `active: boolean`. These are semantically appropriate for this type
and worth keeping distinct.

**Minor additions for Plan 2 readiness (non-breaking):**
- Add optional `id?` to connections in spec (renderer ignores it, but scenes can start
  adding it so Plan 2 migration is incremental)

---

## 4. Highlight Standardisation Summary

| Type | State field | Approach |
|---|---|---|
| `linear` | `items[].highlight` | String, variant-scoped values in prompt guide |
| `map` | `entries[].highlight` | String: `default \| insert \| hit \| remove` |
| `tree` | `nodes[].highlight` | String, variant-scoped values in prompt guide |
| `graph` | `nodes[].highlight`, `edges[].highlight` | String enum |
| `grid` | `cells[][].highlight` | String, variant-scoped values in prompt guide |
| `system-diagram` | `components[].status` (not highlight) | Kept distinct — semantic difference |

---

## 5. Scene Migration Table

26 scenes across 4 categories. All need `type` renamed; some need field changes.

### DSA (10 scenes)

| Scene | Old canvas types | New canvas types | Field changes |
|---|---|---|---|
| `two-sum` | array + hashmap | linear/array + map | rename type fields |
| `merge-sort` | array | linear/array | rename type field |
| `binary-search` | array | linear/array | rename type field |
| `valid-parentheses` | array + stack | linear/array + linear/stack | rename type fields |
| `sliding-window-max` | array + queue | linear/array + linear/queue | rename type fields |
| `reverse-linked-list` | linked-list | linear/linked-list | rename type + drop `node.next` + drop `headId` |
| `level-order-bfs` | queue + tree | linear/queue + tree/binary | rename type fields |
| `number-of-islands` | grid + queue | grid/pathfinding + linear/queue | rename + `state`→`highlight` on cells |
| `climbing-stairs` | dp-table | grid/dp | rename + add `variant` |
| `fibonacci-recursive` | recursion-tree | tree/recursion | rename + `label`→`value` + `status`→`highlight` |

### Concepts (4 scenes)

| Scene | Old canvas types | New canvas types | Field changes |
|---|---|---|---|
| `hash-tables` | array + hashmap | linear/array + map | rename type fields |
| `load-balancer` | system-diagram | system-diagram | none |
| `dns-resolution` | system-diagram | system-diagram | none |
| `js-event-loop` | queue + stack + system-diagram | linear/queue + linear/stack + system-diagram | rename type fields |
| `git-branching` | graph | graph | `highlighted`→`highlight` on edges |

### HLD (5 scenes)

| Scene | Old canvas types | New canvas types | Field changes |
|---|---|---|---|
| `chat-system` | system-diagram | system-diagram | none |
| `twitter-feed` | system-diagram | system-diagram | none |
| `url-shortener` | system-diagram | system-diagram | none |
| `consistent-hashing` | system-diagram | system-diagram | none |
| `copilot-agent-architecture` | stack + system-diagram | linear/stack + system-diagram | rename type field |

### LLD (5 scenes)

| Scene | Old canvas types | New canvas types | Field changes |
|---|---|---|---|
| `lru-cache` | hashmap + linked-list | map + linear/linked-list | rename + drop `node.next` + drop `headId` |
| `design-hashmap` | array + hashmap | linear/array + map | rename type fields |
| `rate-limiter` | array + system-diagram | linear/array + system-diagram | rename type field |
| `min-stack` | stack | linear/stack | rename type field |
| `trie` | tree | tree/binary | add `variant: "binary"` field |

---

## 6. Implementation Sub-Phases

Dependencies flow top to bottom. Each sub-phase must be complete before the next.

---

### Sub-Phase A — Spec & Type Contracts

**Goal:** Rewrite the canonical spec to reflect the 6-type system. Everything else
derives from this.

**Files:**
- `packages/scene-engine/src/spec.ts`
  - Replace 11-entry `CANVAS_VISUAL_SPEC` with 6 entries
  - Add `variants` field to `CanvasVisualSpecEntry` type for types that have variants
  - Add `variantGenerationRules` per variant for highlight vocabulary
  - Update `STEP_SPEC` — remove "FULL STATE SNAPSHOTS" blanket rule (Plan 2 will
    define per-type step format; for now keep full-snapshot but note it's interim)
- `packages/scene-engine/src/types.ts`
  - Update `VisualType` union: 11 strings → 6 strings
  - Add `CanvasVisualVariant` type for `variant` field
  - Update `CanvasVisual` interface to include optional `variant?: string`
  - Update `TreeNode` (flat format, add `result?`, unify `children: string[]`)
  - Update `LinearItem` (unified interface for all 4 linear variants)
  - Update `GridCell` (`state` → `highlight`)
  - Update `GraphEdge` (`highlighted: boolean` → `highlight: string`)
- `packages/scene-engine/src/spec.build.ts`
  - Rebuild Zod schemas for all 6 types
  - `CanvasVisualSchema`: `type` enum now 6 values + `variant` optional string
  - Per-type initialState schemas
  - `buildPromptGuide()`: emit variant-scoped highlight documentation
  - **Rename/remove exported type aliases** (lines 414–421): `HashmapVisual` → `MapVisual`,
    `LinkedListVisual` → remove (absorbed into `LinearVisual`), `RecursionTreeVisual` → remove
    (absorbed into `TreeVisual`), `DpTableVisual` → remove (absorbed into `GridVisual`).
    Add new aliases: `LinearVisual`, `MapVisual`, `TreeVisual`, `GridVisual` extracted from
    the new 6-type union.

**Deliverable:** `spec.ts` and `types.ts` compile. `spec.build.ts` generates correct
Zod schemas. `buildPromptGuide()` output covers all 6 types with variant sections.

---

### Sub-Phase B — Renderer Consolidation

**Goal:** Registry shrinks from 11 entries to 6. Existing component files are kept as
internal implementations — no working UI code is deleted. The consolidation is at the
API/registry level only. New wrapper components dispatch to the existing ones by variant.

**Architecture principle:**
```
PrimitiveRegistry['linear'] → LinearViz → reads visual.variant → ArrayViz | StackViz | QueueViz | LinkedListViz
PrimitiveRegistry['map']    → MapViz    (renamed from HashMapViz)
PrimitiveRegistry['tree']   → TreeViz   → reads visual.variant → binary path | recursion path (via RecursionTreeViz)
PrimitiveRegistry['grid']   → GridViz   → reads visual.variant → pathfinding path | dp path (via DPTableViz)
PrimitiveRegistry['graph']  → GraphViz
PrimitiveRegistry['system-diagram'] → SystemDiagramViz
```

**New file to create:**
- `apps/web/src/engine/primitives/LinearViz.tsx`
  - Thin dispatcher — reads `visual.variant`, renders the appropriate sub-component
  - Passes through `{ id, state, step, label, visual, onHover }` unchanged
  - All variants receive `pointers[]` and `windowHighlight` from the shared state contract
  ```tsx
  export function LinearViz(props: PrimitiveProps) {
    switch (props.visual?.variant) {
      case 'stack':       return <StackViz {...props} />
      case 'queue':       return <QueueViz {...props} />
      case 'linked-list': return <LinkedListViz {...props} />
      default:            return <ArrayViz {...props} />  // 'array' + fallback
    }
  }
  ```

**Files to FIX (targeted changes only — not rewrites):**
- `apps/web/src/engine/primitives/ArrayViz.tsx`
  - **Fix:** rename internal field `cells` → `items` (renderer read `cells`, spec says `items` — align them)
  - **Add:** render `pointers[]` overlay (already exists in ArrayViz — verify LinkedListViz gets it via passthrough)
  - No other changes
- `apps/web/src/engine/primitives/StackViz.tsx`
  - **Remove:** legacy `highlight?: number` index-based field from `StackState` interface and `normaliseItem()`
  - No other changes
- `apps/web/src/engine/primitives/QueueViz.tsx`
  - **Remove:** legacy `highlight?: number` index-based field from `QueueState` interface and `normaliseItem()`
  - No other changes
- `apps/web/src/engine/primitives/LinkedListViz.tsx`
  - **Remove:** `node.next` field from `LinkedListNode` interface (edges drawn between ALL adjacent items)
  - **Remove:** `headId` from `LinkedListState` (HEAD label always shown on first node in `nodes[]`)
  - **Change:** edge rendering — currently uses `node.next` to decide if arrow is drawn; change to draw
    arrow after every node except the last (implicit sequential ordering)
  - **Add:** render `pointers[]` overlay (same component as ArrayViz uses — can share a small helper)
- `apps/web/src/engine/primitives/RecursionTreeViz.tsx`
  - **Rename field:** `node.label` → `node.value` in `RecursionNode` interface (read `node.value` directly — no fallback)
  - **Replace:** `status: 'pending' | 'computing' | 'memoized' | 'complete'` + `statusToHighlight()` with
    direct `highlight` field reading. Map:
    - `highlight: 'active'` → was `computing`
    - `highlight: 'returned'` → was `complete`
    - `highlight: 'memoized'` → was `memoized`
    - no highlight → was `pending`
  - Keep all rendering logic (strikethrough, dashed edges, result display) — only state field changes
- `apps/web/src/engine/primitives/TreeViz.tsx`
  - **Add:** `variant` read from `visual.variant`
  - **Route:** `variant === 'recursion'` → delegate to `RecursionTreeViz` component directly
  - Existing binary behaviour unchanged

- `apps/web/src/engine/primitives/DPTableViz.tsx`
  - No state format changes needed (already uses `cells[][]` with `highlight`)
  - No changes in Plan 1
- `apps/web/src/engine/primitives/GridViz.tsx`
  - **Add:** `variant` read from `visual.variant`
  - **Route:** `variant === 'dp'` → delegate to `DPTableViz` component directly
  - **Fix:** `cells[][].state` → `cells[][].highlight` in `GridCell` interface and all render references
    (`highlight: 'empty'` treated as default/no-highlight; all other values map 1:1)
  - Existing pathfinding behaviour otherwise unchanged

- `apps/web/src/engine/primitives/HashMapViz.tsx` → **rename file to `MapViz.tsx`**
  - Export renamed: `HashMapViz` → `MapViz`
  - **Fix:** animation key from `entry.key` → `entry.id`
  - **Remove:** `label?` from `HashMapState` interface
  - All rendering logic unchanged

- `apps/web/src/engine/primitives/GraphViz.tsx`
  - **Fix:** `edge.highlighted: boolean` → `edge.highlight: string`; update render check to `edge.highlight === 'active'`
  - **Remove:** legacy `node.color?: string` fallback path (raw hex colours)
  - No other changes

**File to update:**
- `apps/web/src/engine/primitives/index.ts`
  - Remove 5 individual imports (ArrayViz, StackViz, QueueViz, LinkedListViz, HashMapViz)
  - Remove 3 absorbed-type imports (DPTableViz, RecursionTreeViz — kept as files, not registered)
  - Add imports: LinearViz, MapViz
  - Registry: 11 entries → 6 entries
  - Retained files but NOT in registry: ArrayViz, StackViz, QueueViz, LinkedListViz,
    RecursionTreeViz, DPTableViz (used internally via their parent dispatchers)

**Files NOT deleted (complete list of what stays):**
- `ArrayViz.tsx` — internal impl for LinearViz/array
- `StackViz.tsx` — internal impl for LinearViz/stack
- `QueueViz.tsx` — internal impl for LinearViz/queue
- `LinkedListViz.tsx` — internal impl for LinearViz/linked-list
- `RecursionTreeViz.tsx` — internal impl for TreeViz/recursion
- `DPTableViz.tsx` — internal impl for GridViz/dp

**Deliverable:** `PrimitiveRegistry` has exactly 6 entries. All 6 public renderers
dispatch correctly. Existing component logic is preserved with only targeted field-level
fixes. Scene JSONs still use old type names — migration is deferred to the Final
Migration Step after Plan 2.

---

### Sub-Phase C — AI Pipeline Update

**Goal:** Stage 1 offers 6 types + variant. Stage 2 prompt guide teaches variant-scoped
highlight vocabulary. Schemas updated.

**Files:**
- `apps/web/src/ai/schemas.ts`
  - `VisualTypeSchema`: `z.enum([...11...])` → `z.enum(['linear','map','tree','graph','grid','system-diagram'])`
  - `CanvasVisualSchema`: add `variant: z.string().optional()` field
  - Update per-type initialState schemas to match new contracts
  - `buildStepsSchema()`: update canvas entry types
- `apps/web/src/ai/prompts/stage1-skeleton.md`
  - Update type list: 11 → 6
  - Add `variant` field documentation with valid values per type
  - Update example to show `variant` field in canvas declaration
- `apps/web/src/ai/prompts/stage2-steps.md`
  - Update state format examples for `linear`, `tree`, `grid`
  - Remove recursion-tree, dp-table, array/stack/queue/linked-list separate sections
  - Add variant-specific highlight sections
- `apps/web/src/ai/prompts/builders.ts`
  - `buildPromptGuide()`: generates per-type guide with variant subsections
  - For scene with `linear/stack`: emits stack-specific highlight docs only, not all variants
  - For scene with `tree/recursion`: emits recursion highlight docs
- `apps/web/src/ai/prompts/stage0-reasoning.md`
  - Line 9: update allowed types list from 11 names → 6 names + note variant field
- `apps/web/src/ai/prompts/trace-to-scene.md`
  - Update `recursion state -> 'recursion-tree'` → `recursion state -> tree/recursion variant`

**Deliverable:** AI pipeline compiles and generates valid Stage 1 skeletons with 6
types. `buildPromptGuide()` output is correct per type+variant combo.

---

### Sub-Phase D — Step Engine, Layout Engine & Tests

**Goal:** Update `apply.ts`, the full layout engine, and all test files to use the new
6-type system. This is the final compilation-fixing pass — after this, `tsc` is clean.

#### D.1 — Step Engine

- `packages/scene-engine/src/step-engine/apply.ts`
  - No logic changes (still full-snapshot semantics for all types)
  - Update any type narrowing that references old type strings

#### D.2 — Layout Engine (variant-aware dispatch)

This is the most involved part of Sub-Phase D. The layout engine dispatches on `type`
in multiple places and two algorithms read the old type name directly to determine
behaviour. All must change to read `variant` instead.

- `packages/scene-engine/src/layout/index.ts`
  - **Cache key function (lines 21–55)**: update all type string checks:
    - `type === 'tree' || type === 'recursion-tree'` → `type === 'tree'`
    - `type === 'array' || type === 'queue' || type === 'linked-list'` → `type === 'linear'`
    - `type === 'dp-table' || type === 'grid'` → `type === 'grid'`
    - `type === 'hashmap'` → `type === 'map'`
  - **`computeLayout` switch (line 85+)**: update all case strings to new 6 names.
    Cases `'recursion-tree'`, `'linked-list'`, `'dp-table'`, `'hashmap'` are removed;
    their parent types (`'tree'`, `'linear'`, `'grid'`, `'map'`) replace them.
  - **Pass `variant` through to algorithm functions**: `LayoutInput` must carry
    `visual.variant` so sub-algorithms can read it. Verify `LayoutInput` type includes
    `visual: CanvasVisual` (which now has `variant?` from Sub-Phase A).

- `packages/scene-engine/src/layout/algorithms/d3-hierarchy.ts`
  - **Line 7**: `input.visual.type === 'recursion-tree'`
    → `input.visual.variant === 'recursion'`
  - This controls `isRecursion` (node sizing, layout params). No other logic changes.

- `packages/scene-engine/src/layout/algorithms/arithmetic.ts`
  - **Line 14**: `if (type === 'linked-list')` → `if (variant === 'linked-list')`
    (controls whether pointer-style edges are generated between nodes)
  - **Line 36**: same pattern — update to read `visual.variant`
  - Extract `variant` from `input.visual.variant` at the top of the function alongside
    the existing `type` extraction.

- `packages/scene-engine/src/layout/spacing.ts`
  - `PRIMITIVE_SIZING.hashmap` key → rename to `PRIMITIVE_SIZING.map`
  - Update any references to `PRIMITIVE_SIZING.recursionTree` if the key changes
    (check — may stay as-is since it's an internal sizing label, not a type name)

#### D.3 — Test Files

All test files below reference old type names. Update each to use the new type +
variant format. This is mechanical — change `type: 'array'` to
`type: 'linear', variant: 'array'` etc.

- `packages/scene-engine/src/spec.test.ts`
  - Large file — update all `type: 'hashmap'`, `type: 'linked-list'`,
    `type: 'recursion-tree'`, `type: 'dp-table'` references throughout
  - Update `expect(types).toContain('hashmap')` etc. to new 6-type names
  - Update `buildPromptGuide()` test that checks for `'hashmap'` in output
  - Update the full-scene validation test at line ~505 that asserts all 11 types exist
- `packages/scene-engine/src/step-engine/apply.test.ts`
  - `type: 'hashmap'` → `type: 'map'`
- `packages/scene-engine/src/layout/algorithms/arithmetic.test.ts`
  - `type: 'linked-list'` → `type: 'linear', variant: 'linked-list'`
- `packages/scene-engine/src/scene-graph/compute.test.ts`
  - Update any old type name references (verify file)
- `apps/web/src/ai/assembly.test.ts`
  - `type: 'array'` → `type: 'linear', variant: 'array'`
- `apps/web/src/ai/pipeline.test.ts`
  - `type: 'array'` → `type: 'linear', variant: 'array'`
- `apps/web/src/ai/validators/validators.test.ts`
  - `type: 'array'` → `type: 'linear', variant: 'array'` (2 occurrences)

#### D.4 — Scene Validator

- `apps/web/scripts/validate-scenes.ts`
  - Update to use new Zod schemas (will correctly flag old scenes as invalid —
    expected behaviour until Final Migration Step)

**Deliverable:** `tsc` reports 0 errors across both packages. All tests pass (or are
explicitly skipped with a note if they depend on scene JSONs not yet migrated).
Scene JSON migration is NOT part of this deliverable — that comes in the Final
Migration Step.

---

## 7. Files Affected — Complete List

```
packages/scene-engine/src/
  spec.ts                                      ← A  (rewrite CANVAS_VISUAL_SPEC, 6 entries)
  spec.build.ts                                ← A  (Zod schemas, rename exported type aliases)
  types.ts                                     ← A  (VisualType union, CanvasVisual.variant, interfaces)
  step-engine/apply.ts                         ← D1 (type guard updates only)
  layout/index.ts                              ← D2 (variant-aware dispatch, cache key, switch cases)
  layout/algorithms/d3-hierarchy.ts            ← D2 (type→variant for isRecursion flag)
  layout/algorithms/arithmetic.ts              ← D2 (type→variant for linked-list pointer edges)
  layout/spacing.ts                            ← D2 (rename PRIMITIVE_SIZING.hashmap → .map)
  spec.test.ts                                 ← D3 (update all old type name references)
  step-engine/apply.test.ts                    ← D3 (hashmap → map)
  layout/algorithms/arithmetic.test.ts         ← D3 (linked-list → linear/linked-list)
  scene-graph/compute.test.ts                  ← D3 (verify + update old type refs)

apps/web/src/engine/primitives/
  index.ts                                     ← B  (registry: 11→6)
  LinearViz.tsx                                ← B  (NEW — thin dispatcher for 4 linear variants)
  MapViz.tsx                                   ← B  (renamed from HashMapViz.tsx)
  TreeViz.tsx                                  ← B  (add variant routing → RecursionTreeViz)
  GridViz.tsx                                  ← B  (add variant routing → DPTableViz, fix state→highlight)
  GraphViz.tsx                                 ← B  (edge highlight field fix)
  SystemDiagramViz.tsx                         ← B  (add optional connection id? for Plan 2 prep)
  ArrayViz.tsx                                 ← B  (fix: cells→items)
  StackViz.tsx                                 ← B  (fix: remove legacy highlight:number)
  QueueViz.tsx                                 ← B  (fix: remove legacy highlight:number)
  LinkedListViz.tsx                            ← B  (fix: drop node.next/headId, add pointers[])
  RecursionTreeViz.tsx                         ← B  (fix: label→value, status→highlight, no compat fallback)
  DPTableViz.tsx                               ← B  (no changes)
  HashMapViz.tsx                               ← B  (DELETE — replaced by MapViz.tsx)

apps/web/src/ai/
  schemas.ts                                   ← C  (6-type enum, variant field, initialState schemas)
  prompts/stage1-skeleton.md                   ← C  (6 types + variant docs)
  prompts/stage2-steps.md                      ← C  (variant-scoped state format examples)
  prompts/builders.ts                          ← C  (buildPromptGuide variant subsections)
  prompts/stage0-reasoning.md                  ← C  (update allowed types list)
  prompts/trace-to-scene.md                    ← C  (recursion-tree → tree/recursion)
  assembly.test.ts                             ← D3 (array → linear/array)
  pipeline.test.ts                             ← D3 (array → linear/array)
  validators/validators.test.ts                ← D3 (array → linear/array ×2)

apps/web/scripts/validate-scenes.ts            ← D4 (schema updated; old scenes fail — expected)

apps/web/src/content/scenes/                   ← DEFERRED — Final Migration Step (after Plan 2)
```

---

## 8. Acceptance Criteria

- [ ] `packages/scene-engine` compiles with 0 TypeScript errors
- [ ] `apps/web` compiles with 0 TypeScript errors
- [ ] `PrimitiveRegistry` has exactly 6 entries
- [ ] All 6 renderers render correctly via the SceneStudio dev tool (manual spot-check)
- [ ] AI Stage 1 generates valid 6-type skeletons with `variant` field (manual test: 2 prompts)
- [ ] AI Stage 2 uses correct highlight values per type+variant (manual test)
- [ ] `buildPromptGuide()` emits variant-scoped highlight docs for all 6 types
- [ ] `validate-scenes.ts` schema updated to accept new 6-type format (old scenes will
  fail validation — that is expected and acceptable until the Final Migration Step)
- [ ] `visual-types-survey.md` updated to reflect the new 6-type system

---

## 9. Out of Scope

### Plan 2 (JSON Payload Optimisation)
- Sparse overlay / topology-split step format for Group A types (`system-diagram`, `graph`, etc.)
- Connection IDs on `system-diagram` (pre-noted in §3.6 but not implemented here)
- `connectionDefaults` in `initialState` (Layer 2 optimisation)
- Step engine merge logic changes (still full-snapshot in Plan 1)
- New scene JSONs or new primitives

### Final Migration Step (after Plan 2 is complete)
All 26 hand-crafted scene JSONs are migrated **once** in a single pass that applies
both Plan 1 type renames AND Plan 2 sparse overlay format together. Migration rules
are documented in §5 (Scene Migration Table) above — those rules remain valid, they
are simply executed later.

Until the Final Migration Step runs, existing scenes will fail `validate-scenes.ts`
and will not render in the browser. This is expected and acceptable — the dev
pipeline (AI-generated scenes) will work correctly against the new schemas.

