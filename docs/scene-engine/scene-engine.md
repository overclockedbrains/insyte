# Scene Engine Reference

Quick reference for the scene JSON contract and engine subsystems in `packages/scene-engine`.

---

## Scene Root

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | `nanoid()` unique identifier |
| `title` | `string` | yes | Display title |
| `type` | `SceneType` | yes | Mode enum |
| `layout` | `SceneLayout` | yes | Which layout shell to use |
| `visuals` | `Visual[]` | yes | Canvas objects |
| `steps` | `Step[]` | yes | State-mutation sequence |
| `controls` | `Control[]` | yes | Interactive toggles/sliders/buttons |
| `explanation` | `ExplanationSection[]` | yes | Narrative panels |
| `popups` | `Popup[]` | yes | Inline per-visual callouts |
| `challenges` | `Challenge[]` | no | Quiz questions |
| `code` | `CodeBlock` | no | DSA code block with highlight map |

---

## Enums

| Kind | Values |
| --- | --- |
| `SceneType` | `concept`, `dsa-trace`, `lld`, `hld` |
| `SceneLayout` | `canvas-only`, `code-left-canvas-right`, `text-left-canvas-right` |
| `VisualType` | `array`, `hashmap`, `linked-list`, `tree`, `graph`, `stack`, `queue`, `dp-table`, `recursion-tree`, `system-diagram`, `text-badge`, `counter`, `grid`, `bezier-connector`, `straight-arrow`, `data-flow-dot` |
| `ControlType` | `slider`, `toggle`, `input`, `button`, `toggle-group` |

### LayoutHint

| Value | Algorithm | Best for |
| --- | --- | --- |
| `dagre-TB` | Dagre top-to-bottom | Dependency graphs, call graphs |
| `dagre-LR` | Dagre left-to-right | Flowcharts, system diagrams |
| `dagre-BT` | Dagre bottom-to-top | Inverted hierarchies |
| `tree-RT` | d3-hierarchy radial | Recursion trees |
| `linear-H` | Horizontal arithmetic | Arrays, queues |
| `linear-V` | Vertical arithmetic | Stacks |
| `grid-2d` | Grid arithmetic | DP tables |
| `hashmap-buckets` | Bucket arithmetic | HashMaps |
| `radial` | Radial arithmetic | Concept webs |

### SlotPosition

`top-left`, `top-center`, `top-right`, `center-left`, `center`, `center-right`, `bottom-left`, `bottom-center`, `bottom-right`, `canvas-left`, `canvas-right`

---

## Step Actions

Actions live in `Step.actions[]` as `{ target: visualId, params: Record<string, unknown> }`.

The step engine (`applyStepActionsUpTo`) replays actions from step 0 through the current step:

| Action | Effect |
| --- | --- |
| `set` | Shallow merge `params` into visual state |
| `set-value` | Set a single named field |
| `push` | Append to array field |
| `pop` | Remove last element from array field |
| `highlight` | Set `highlighted` indices/IDs |

Unknown action keys fall through to shallow-merge (safe degradation).

---

## Parse Pipeline

1. Raw JSON → `safeParseScene(json)` — Zod validates structure + all enum values.
2. `normalizeScene(scene)` — ensures arrays present, sorts steps, aligns `code.highlightByStep`.
3. Normalized scene → Zustand `scene-slice.setScene`.

---

## Scene Graph Diff

`diffSceneGraphs(prev, next)` compares successive snapshots and returns:

| Diff type | Framer Motion animation |
| --- | --- |
| Added node | `scale` from 0 |
| Removed node | `scale` to 0 |
| Changed state | `backgroundColor` transition |
| Moved position | `x`/`y` spring |
| Edge added | `pathLength` draw-in |

---

## LRU Cache

50-entry cache in `runtime/cache.ts` memoizing `SceneGraph` computations. Key: `sceneId + stepIndex + containerW + containerH`. Cleared on `setScene`. Prefetches steps ±1 from current on play start.
