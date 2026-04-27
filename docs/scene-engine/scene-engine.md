# Scene Engine Reference

Quick reference for the Scene JSON v2 contract and engine subsystems in `packages/scene-engine`.

---

## Scene Root

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique identifier |
| `title` | `string` | yes | Display title |
| `type` | `SceneType` | yes | Mode enum |
| `layout` | `SceneLayout` | yes | Which layout shell to use |
| `canvas` | `CanvasVisual[]` | yes | Visual data structures to render |
| `activeText` | `{ initialValue: string }` | no | Narration badge (replaces `text-badge` visual) |
| `hud` | `HudItem[]` | no | Stat counters — max 3 (replaces `counter` visuals) |
| `steps` | `Step[]` | yes | State-mutation sequence |
| `controls` | `Control[]` | yes | Interactive toggles/sliders/buttons |
| `popups` | `Popup[]` | yes | Per-visual callout bubbles |
| `challenges` | `Challenge[]` | no | Quiz questions |
| `code` | `SceneCode` | no | DSA code block with highlight map |
| `description` | `string` | no | Short description |
| `category` | `string` | no | Explore category |
| `complexity` | `{ time?, space? }` | no | Big-O annotations |

---

## Enums

| Kind | Values |
| --- | --- |
| `SceneType` | `concept`, `dsa-trace`, `lld`, `hld` |
| `SceneLayout` | `canvas-only`, `code-left-canvas-right`, `text-left-canvas-right` |
| `VisualType` | `array`, `hashmap`, `linked-list`, `tree`, `graph`, `stack`, `queue`, `dp-table`, `recursion-tree`, `system-diagram`, `grid` |
| `ControlType` | `slider`, `toggle`, `button`, `toggle-group` |

### LayoutHint

| Value | Algorithm | Best for |
| --- | --- | --- |
| `dagre-TB` | Dagre top-to-bottom | Dependency graphs, call graphs |
| `dagre-LR` | Dagre left-to-right | Flowcharts, system diagrams |
| `dagre-BT` | Dagre bottom-to-top | Inverted hierarchies |
| `tree-RT` | d3-hierarchy radial | Recursion trees |
| `linear-H` | Horizontal arithmetic | Arrays, queues |
| `linear-V` | Vertical arithmetic | Stacks |
| `grid-2d` | Grid arithmetic | DP tables, grids |
| `hashmap-buckets` | Bucket arithmetic | HashMaps |
| `radial` | Radial arithmetic | Concept webs |

---

## Canvas Visuals

Each entry in `canvas[]` has `{ id, type, layoutHint, label?, initialState }`.

`initialState` shape per type:

| Type | State shape |
| --- | --- |
| `array` | `{ items: [{ value, id?, highlight? }] }` |
| `hashmap` | `{ entries: [{ id, key, value, highlight? }] }` |
| `stack` | `{ items: [{ id, value, highlight? }] }` |
| `queue` | `{ items: [{ id, value, highlight? }] }` |
| `linked-list` | `{ nodes: [{ id, value, highlight? }] }` |
| `tree` | `{ root: TreeNode \| null }` (recursive: `{ id, value, highlight?, left?, right? }`) |
| `recursion-tree` | `{ root: RecursionNode \| null }` (recursive: `{ id, value, highlight?, children[] }`) |
| `graph` | `{ nodes: [{ id, label, highlight? }], edges: [{ id, from, to, label?, highlight? }] }` |
| `dp-table` | `{ cells: [[{ id, value, highlight? }]] }` (2-D) |
| `system-diagram` | `{ components: [{ id, label, icon, status, sublabel? }], connections: [{ from, to, active, label?, style? }] }` |
| `grid` | `{ cells: [[{ id, value, highlight? }]] }` (2-D) |

---

## Steps

```json
{
  "index": 1,
  "explanation": { "heading": "...", "body": "...", "callout"?: "..." },
  "activeText": "New narration text",
  "hud": { "my-counter": 5 },
  "canvas": { "my-array": { "items": [...] } }
}
```

- `index` starts at 1 (step 0 is implicit — the `initialState` of each visual).
- `canvas` maps visual IDs to **full state snapshots** (last write wins per step).
- `activeText` and `hud` updates are also last-write-wins per step.
- `explanation` is optional; for `canvas-only` scenes it appears as a floating card overlay.

---

## HudItem

```json
{ "id": "my-counter", "label": "Comparisons", "initialValue": 0 }
```

Step updates: `"hud": { "my-counter": 5 }` sets the value at that step.

---

## Popups

```json
{
  "id": "pop-1",
  "attachTo": "my-array",
  "text": "Pivot chosen here",
  "showAtStep": 2,
  "hideAtStep": 5,
  "style": "info"
}
```

`style` values: `info`, `warning`, `success`, `insight`.

`showAtStep` and `hideAtStep` are both required (≥ 1).

---

## Step Engine

```typescript
import { applyStepActionsUpTo, applyOverlaysAtStep } from '@insyte/scene-engine'

// Canvas state at a given step:
const stateMap = applyStepActionsUpTo(scene.canvas, scene.steps, stepIndex)
// Returns Map<visualId, state>

// activeText + hud values at a given step:
const { activeText, hud } = applyOverlaysAtStep(scene, stepIndex)
```

---

## Parse Pipeline

1. Raw JSON → `safeParseScene(json)` — Zod validates structure + all enum values.
2. `normalizeScene(scene)` — ensures arrays present, sorts steps, aligns `code.highlightByStep`.
3. Normalized scene → Zustand `scene-slice.setScene`.

---

## Scene Graph

`computeSceneGraphAtStep(scene, stepIndex)` returns a `SceneGraph`:

```typescript
interface SceneGraph {
  nodes: Map<string, SceneNode>
  edges: Map<string, SceneEdge>
  groups: Map<string, SceneGroup>  // keyed by canvas visual ID
  stepIndex: number
}
```

`SceneGroup.isHud` is always `false` (text-badge/counter no longer in canvas).

---

## JSON Schema

The JSON Schema for validating scene files is generated at `public/scene-schema.json`:

```
pnpm --filter web export-schema
```

---

## LRU Cache

50-entry cache in `runtime/cache.ts` memoizing `SceneGraph` computations.
Cleared on `setScene`. Prefetches steps ±1 from current on play start.
