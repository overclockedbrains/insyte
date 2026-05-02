# Phase 35 — Plan 3: Step Canvas Architecture — Topology-State Split

> **Status**: COMPLETE
> **Date**: 2026-04-26
> **Scope**: Redefine the step canvas format for identity-based primitives (graph,
> tree, system-diagram). Rewrite the step-engine to maintain an entity registry.
> Update spec and Zod schemas.
>
> **Explicitly OUT OF SCOPE**:
> - Scene JSON migration (existing hand-crafted files will break — fixed in next plan)
> - AI pipeline changes (Stage 2 prompt, schemas.ts generation schemas)
> - Renderer changes (renderers receive fully-resolved state as before)
>
> **Depends on**: Plan 1 complete (stable 6-type taxonomy)
> **Blocks**: Scene JSON migration plan, AI pipeline rewrite

---

## 1. Goal

The LLM generates higher-quality complex scenes when it only writes what is
**semantically meaningful at each step** — not what is already known from
`initialState`. The failure mode today: for identity-based primitives (graph,
tree, system-diagram) the AI must re-emit `label`, `icon`, `from`, `to`,
`weight`, `children` — arbitrary topology strings — on every single step. This
is where hallucination concentrates (typos, swapped from/to, wrong weights).

The fix: **topology is declared once in `initialState` and referenced by ID
thereafter**. Steps express only what is HAPPENING at that moment — highlights,
status, active connections — plus structural changes when they genuinely occur
(new node added, edge rewired). The LLM writes less and reasons better.

This does NOT affect sequential primitives (`linear`, `map`, `grid`, `chart`).
For those, the full current state is the correct and minimal representation.

---

## 2. Core Decisions

| # | Decision |
|---|----------|
| D1 | Two primitive categories: **Sequential** (full current state per step) and **Identity-based** (topology in initialState + sparse state overlay per step) |
| D2 | Sequential primitives: `linear`, `map`, `grid`, `chart` — format UNCHANGED |
| D3 | Identity-based primitives: `graph`, `tree` (all variants), `system-diagram` |
| D4 | ONE semantic rule everywhere: each step is self-contained — "not listed = at default state" for ephemeral fields |
| D5 | Ephemeral fields (reset to default each step if not listed): `highlight`, `status`, `active` |
| D6 | Accumulated fields (persist in registry until explicitly changed): `distance`, `result` — listed in step overlay only when their value changes |
| D7 | Structural changes (new/modified entities) declared inline in the step where they occur via dedicated keys (`newNodes`, `updateNodes`, etc.) |
| D8 | Renderers are completely unaffected — they receive the same fully-resolved state shape as today |

---

## 3. Primitive Classification

### Sequential — Full Current State Per Step (No Change)

The complete current sequence/grid IS the state. Position, presence, and value
are all semantic. Nothing to extract into topology.

| Primitive | Step writes |
|-----------|------------|
| `linear` (array/stack/queue/linked-list) | `{ items: [{id, value, highlight?}] }` — complete current items |
| `map` | `{ entries: [{id, key, value, highlight?}] }` — complete current entries |
| `grid` (any variant, any size) | `{ rows, cols, cells: [[{value, highlight?}]] }` — complete current grid |
| `chart` | `{ bars: [{id, value, label?, highlight?}], maxValue? }` — complete current bars |

`FULL-SNAPSHOT` generation rule stays as-is for all four. No spec changes.
No step-engine changes for these types.

### Identity-Based — Entity Registry + State Overlay

Entities have stable IDs and rich topology (label, icon, from/to/weight,
children) that must never be re-emitted after declaration.

| Primitive | Topology (initialState only, never re-emitted in steps) | Ephemeral state (steps, resets each step) | Accumulated state (steps, persists) |
|-----------|--------------------------------------------------------|-------------------------------------------|-------------------------------------|
| `graph` nodes | `id`, `label` | `highlight` | `distance` |
| `graph` edges | `id`, `from`, `to`, `directed`, `weight`, `label` | `highlight` | — |
| `tree` nodes | `id`, `value`, `children`, `isEnd` | `highlight` | `result` |
| `system-diagram` components | `id`, `label`, `icon`, `sublabel` | `status` | — |
| `system-diagram` connections | `id`, `from`, `to`, `style`, `label` | `active` | — |

---

## 4. New Step Canvas Format — Identity-Based Primitives

### 4.1 graph

**initialState** (full topology declared once):
```json
{
  "nodes": [
    {"id": "a", "label": "A"},
    {"id": "b", "label": "B"}
  ],
  "edges": [
    {"id": "e0", "from": "a", "to": "b", "directed": true, "weight": 4}
  ]
}
```

**Step canvas — highlight-only step** (most steps):
```json
{
  "nodeStates": {
    "a": {"highlight": "active", "distance": "0"},
    "b": {"highlight": "queued"}
  },
  "edgeStates": {
    "e0": {"highlight": "relaxed"}
  }
}
```
Nodes not listed → `highlight: "default"`. Distance not listed → persists from
last assignment (or `"∞"` from initialState). Edges not listed →
`highlight: "default"`.

**Step canvas — new node/edge added**:
```json
{
  "newNodes": [{"id": "d", "label": "D"}],
  "newEdges": [{"id": "e2", "from": "b", "to": "d", "directed": true, "weight": 3}],
  "nodeStates": {
    "a": {"highlight": "visited", "distance": "0"},
    "d": {"highlight": "queued", "distance": "7"}
  },
  "edgeStates": {
    "e2": {"highlight": "relaxed"}
  }
}
```

**Step canvas — existing entity topology modified**:
```json
{
  "updateEdges": [{"id": "e0", "weight": 7}],
  "nodeStates": {"a": {"highlight": "active"}},
  "edgeStates": {"e0": {"highlight": "updated"}}
}
```

**Step canvas keys — graph**:

| Key | Persistence | Description |
|-----|-------------|-------------|
| `nodeStates` | highlight: ephemeral; distance: accumulated | Per-node state. Unlisted nodes → highlight resets to "default", distance persists. |
| `edgeStates` | highlight: ephemeral | Per-edge state. Unlisted edges → highlight resets to "default". |
| `newNodes` | structural | First-time node declaration. Added to registry. Full topology required. |
| `updateNodes` | structural | Partial topology update on existing node. |
| `newEdges` | structural | First-time edge declaration. Added to registry. Full topology required. |
| `updateEdges` | structural | Partial topology update on existing edge. |

---

### 4.2 tree (all variants: binary, trie, recursion)

**initialState**:
```json
{
  "nodes": [
    {"id": "n1", "value": "5", "children": ["n2", "n3"]},
    {"id": "n2", "value": "3", "children": []},
    {"id": "n3", "value": "8", "children": []}
  ],
  "rootId": "n1"
}
```

**Step canvas — highlight-only step**:
```json
{
  "nodeStates": {
    "n1": {"highlight": "active"},
    "n2": {"highlight": "visited"}
  }
}
```
Unlisted nodes → `highlight: "default"`. `result` persists from last assignment.

**Step canvas — structural growth (recursion variant)**:
```json
{
  "newNodes": [
    {"id": "f4", "value": "fib(4)", "children": []},
    {"id": "f3a", "value": "fib(3)", "children": []}
  ],
  "updateNodes": [
    {"id": "f5", "children": ["f4", "f3a"]}
  ],
  "nodeStates": {
    "f5": {"highlight": "active"},
    "f4": {"highlight": "active"}
  }
}
```

**Step canvas — result appears (return value computed)**:
```json
{
  "nodeStates": {
    "f2": {"highlight": "returned", "result": "= 1"},
    "f5": {"highlight": "active"}
  }
}
```
`result: "= 1"` written into registry — persists on f2 in all subsequent steps.

**Step canvas keys — tree**:

| Key | Persistence | Description |
|-----|-------------|-------------|
| `nodeStates` | highlight: ephemeral; result: accumulated | Per-node state. Unlisted → highlight resets to "default", result persists. |
| `newNodes` | structural | New node. Full `{id, value, children}` required. Register parent's children update separately via `updateNodes`. |
| `updateNodes` | structural | Partial topology update (e.g. rewire children after BST insert, rotation). |
| `updateRoot` | structural | String. Changes `rootId` in registry (e.g. after tree rotation). |

---

### 4.3 system-diagram

**initialState**:
```json
{
  "components": [
    {"id": "client", "label": "Client", "icon": "mobile", "sublabel": ":3000"},
    {"id": "server", "label": "API Server", "icon": "server", "sublabel": ":8080"}
  ],
  "connections": [
    {"id": "c0", "from": "client", "to": "server", "style": "solid", "label": "HTTPS"}
  ]
}
```

**Step canvas — standard step**:
```json
{
  "componentStates": {
    "client": {"status": "active"},
    "server": {"status": "active"}
  },
  "connectionStates": {
    "c0": {"active": true}
  }
}
```
Unlisted components → `status: "normal"`. Unlisted connections → `active: false`.

**Step canvas — new component/connection added**:
```json
{
  "newComponents": [{"id": "cache", "label": "Redis Cache", "icon": "database", "sublabel": ":6379"}],
  "newConnections": [{"id": "c1", "from": "server", "to": "cache", "style": "solid"}],
  "componentStates": {
    "server": {"status": "active"},
    "cache": {"status": "active"}
  },
  "connectionStates": {
    "c1": {"active": true}
  }
}
```

**Step canvas keys — system-diagram**:

| Key | Persistence | Description |
|-----|-------------|-------------|
| `componentStates` | status: ephemeral | Per-component state. Unlisted → `status: "normal"`. |
| `connectionStates` | active: ephemeral | Per-connection state. Unlisted → `active: false`. |
| `newComponents` | structural | New component. Full `{id, label, icon, sublabel?}` required. |
| `updateComponents` | structural | Partial topology update on existing component. |
| `newConnections` | structural | New connection. Full `{id, from, to, style?, label?}` required. |
| `updateConnections` | structural | Partial topology update on existing connection. |

---

## 5. Step-Engine Architecture

### 5.1 New Architecture

Two independent data structures per identity-based visual:

**Entity Registry** — mutable across steps, persists topology and accumulated state:
```
registry[visualId] = {
  nodes: Map<id, {label, value, children, isEnd, distance, result, ...}>,
  edges: Map<id, {from, to, weight, directed, label, style, ...}>,
  components: Map<id, {label, icon, sublabel, ...}>,
  connections: Map<id, {from, to, style, label, ...}>,
  rootId?: string,
}
```

**State Overlay** — read from the target step only, drives ephemeral field resolution:
```
stepData[visualId] = {
  nodeStates:       Record<id, {highlight?, distance?, result?}>,
  edgeStates:       Record<id, {highlight?}>,
  componentStates:  Record<id, {status?}>,
  connectionStates: Record<id, {active?}>,
  newNodes / updateNodes / newEdges / updateEdges / ...,
}
```

### 5.2 Two-Phase Application

```
Phase 1 — Build registry (steps 1 to stepIndex, inclusive):
  For each step in order:
    process newNodes / newEdges / newComponents / newConnections → add to registry
    process updateNodes / updateEdges / updateComponents / updateConnections → mutate registry
    process updateRoot → update rootId in registry
    extract accumulated fields (distance, result) from nodeStates → write into registry

Phase 2 — Apply state overlay (target step only):
  start from registry (topology + all accumulated fields current as of stepIndex)
  reset all ephemeral fields to defaults across all registered entities
  apply nodeStates / edgeStates / componentStates / connectionStates from target step
  reconstruct output arrays: topology + accumulated + ephemeral → renderer-ready state
```

### 5.3 Output Shape (Renderer Contract — Unchanged)

The step-engine output shape is identical to today. Renderers require no changes.

```typescript
// graph output — same as renderer already expects:
{
  nodes: [{id:"a", label:"A", highlight:"active", distance:"0"}, ...],
  edges: [{id:"e0", from:"a", to:"b", weight:4, directed:true, highlight:"relaxed"}, ...]
}

// system-diagram output:
{
  components:  [{id:"client", label:"Client", icon:"mobile", sublabel:":3000", status:"active"}, ...],
  connections: [{id:"c0", from:"client", to:"server", style:"solid", label:"HTTPS", active:true}, ...]
}

// tree output:
{
  nodes:  [{id:"n1", value:"5", children:["n2","n3"], highlight:"active", result:null}, ...],
  rootId: "n1"
}
```

---

## 6. Files Changed

### `packages/scene-engine/src/spec.ts`

**`CANVAS_VISUAL_SPEC.graph`**
- Remove `generationRules` entry: `'FULL-SNAPSHOT: every step canvas update must include ALL nodes and ALL edges.'`
- Remove `generationRules` entry: `'Both nodes[] and edges[] are required even if edges is empty [].'`
- Add generation rules for new step format:
  ```
  'Step canvas uses sparse overlay — never re-emit topology fields (label, from, to, weight, directed).',
  'nodeStates: Record<nodeId, {highlight?, distance?}>. Only list nodes with non-default state.',
  'edgeStates: Record<edgeId, {highlight?}>. Only list edges with non-default state.',
  'newNodes: [{id, label, ...}] — declare only when a node first appears.',
  'updateNodes: [{id, ...partialTopology}] — declare only when topology changes.',
  'newEdges / updateEdges: same pattern as nodes.',
  'Unlisted nodes: highlight resets to "default", distance persists from last assignment.',
  'Unlisted edges: highlight resets to "default".',
  ```

**`CANVAS_VISUAL_SPEC.tree`**
- Remove `generationRules` entry: `'FULL-SNAPSHOT: every step canvas update must include ALL nodes.'`
- Add generation rules for new step format:
  ```
  'Step canvas uses sparse overlay — never re-emit topology fields (value, children, isEnd).',
  'nodeStates: Record<nodeId, {highlight?, result?}>. Only list nodes with non-default state.',
  'newNodes: [{id, value, children}] — declare only when a node first appears. children: [] for leaves.',
  'updateNodes: [{id, children?, ...}] — declare only when topology changes (e.g. rewire after insert).',
  'updateRoot: newRootId — use only when rootId changes (e.g. tree rotation).',
  'Unlisted nodes: highlight resets to "default", result persists from last assignment.',
  ```

**`CANVAS_VISUAL_SPEC['system-diagram']`**
- Remove `generationRules` entry: `'FULL-SNAPSHOT: every step canvas update must include ALL components and ALL connections.'`
- Remove `generationRules` entry: `'Both components[] and connections[] are required even if connections is [].'`
- Update CHOREOGRAPHY RULE to reference new format:
  ```
  'CHOREOGRAPHY RULE: when a call travels A→B→C, all three components must appear in componentStates
   with status "active" AND all edges in connectionStates with active:true simultaneously in that step.',
  ```
- Add generation rules for new step format:
  ```
  'Step canvas uses sparse overlay — never re-emit topology fields (label, icon, sublabel, from, to, style).',
  'componentStates: Record<componentId, {status?}>. Unlisted → status: "normal".',
  'connectionStates: Record<connectionId, {active?}>. Unlisted → active: false.',
  'newComponents / updateComponents: same pattern as graph nodes.',
  'newConnections / updateConnections: same pattern as graph edges.',
  ```

**`STEP_SPEC.rules`**
- Replace: `'canvas entries must be FULL STATE SNAPSHOTS — never delta/partial. Every item in the visual must be present.'`
- With:
  ```
  'Sequential primitives (linear, map, grid, chart): canvas entries must be FULL STATE SNAPSHOTS.',
  'Identity-based primitives (graph, tree, system-diagram): canvas entries use topology-state split.
   Write nodeStates/edgeStates/componentStates/connectionStates for state. Use newNodes/updateNodes
   etc. only when structure changes. Never re-emit topology fields in steps.',
  ```

**Add `ENTITY_STEP_FIELD_SEMANTICS` constant** (new export):
```typescript
export const ENTITY_STEP_FIELD_SEMANTICS = {
  ephemeral: {
    description: 'Resets to default each step if not listed in step overlay.',
    fields: {
      'graph.nodes.highlight':             { default: 'default' },
      'graph.edges.highlight':             { default: 'default' },
      'tree.nodes.highlight':              { default: 'default' },
      'system-diagram.components.status':  { default: 'normal'  },
      'system-diagram.connections.active': { default: false      },
    },
  },
  accumulated: {
    description: 'Persists in registry from last assignment. Write only when the value changes.',
    fields: {
      'graph.nodes.distance': { initialDefault: '∞'   },
      'tree.nodes.result':    { initialDefault: null   },
    },
  },
} as const
```

---

### `packages/scene-engine/src/spec.build.ts`

Replace the existing `state`-derived Zod schemas for graph, tree, system-diagram
step canvas with the new sparse overlay schemas. The `initialState` Zod schemas
(what goes in `canvas[].initialState`) are UNCHANGED — topology shape stays the same.

New step canvas schemas:

```typescript
const GraphStepCanvas = z.object({
  nodeStates:  z.record(z.object({
    highlight: z.string().optional(),
    distance:  z.string().optional(),
  })).optional(),
  edgeStates:  z.record(z.object({
    highlight: z.string().optional(),
  })).optional(),
  newNodes:    z.array(z.object({ id: z.string(), label: z.string() }).passthrough()).optional(),
  updateNodes: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  newEdges:    z.array(z.object({ id: z.string(), from: z.string(), to: z.string() }).passthrough()).optional(),
  updateEdges: z.array(z.object({ id: z.string() }).passthrough()).optional(),
})

const TreeStepCanvas = z.object({
  nodeStates:  z.record(z.object({
    highlight: z.string().optional(),
    result:    z.string().nullable().optional(),
  })).optional(),
  newNodes:    z.array(z.object({
    id: z.string(), value: z.string(), children: z.array(z.string()),
  }).passthrough()).optional(),
  updateNodes: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  updateRoot:  z.string().optional(),
})

const SystemDiagramStepCanvas = z.object({
  componentStates:  z.record(z.object({ status: z.string().optional() })).optional(),
  connectionStates: z.record(z.object({ active: z.boolean().optional() })).optional(),
  newComponents:    z.array(z.object({
    id: z.string(), label: z.string(), icon: z.string(),
  }).passthrough()).optional(),
  updateComponents: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  newConnections:   z.array(z.object({
    id: z.string(), from: z.string(), to: z.string(),
  }).passthrough()).optional(),
  updateConnections: z.array(z.object({ id: z.string() }).passthrough()).optional(),
})
```

Update `StepCanvasValue` union (the per-visual-id value type in `step.canvas`):
```typescript
// Was: z.union([LinearStepCanvas, MapStepCanvas, ...])
// Now also includes:
const StepCanvasValue = z.union([
  LinearStepCanvas,
  MapStepCanvas,
  GridStepCanvas,
  ChartStepCanvas,
  GraphStepCanvas,           // replaces old graph full-snapshot schema
  TreeStepCanvas,            // replaces old tree full-snapshot schema
  SystemDiagramStepCanvas,   // replaces old system-diagram full-snapshot schema
])
```

---

### `packages/scene-engine/src/step-engine/apply.ts`

Full rewrite of `applyStepActionsUpTo`:

```typescript
import { buildRegistry, applyStructural, resolveState } from './merge'

export function applyStepActionsUpTo(
  canvas: CanvasVisual[],
  steps: Step[],
  stepIndex: number,
): Map<string, Record<string, unknown>> {
  const stateMap = new Map<string, Record<string, unknown>>()

  for (const visual of canvas) {
    if (isIdentityBased(visual.type)) {
      // Phase 1: build entity registry across all steps up to stepIndex
      const registry = buildRegistry(visual)
      for (const step of steps) {
        if (step.index > stepIndex) break
        const stepData = step.canvas?.[visual.id]
        if (stepData) applyStructural(registry, stepData, visual.type)
      }
      // Phase 2: apply state overlay at target step only
      const targetData = steps.find(s => s.index === stepIndex)?.canvas?.[visual.id]
      stateMap.set(visual.id, resolveState(registry, targetData, visual.type))
    } else {
      // Sequential: seed from initialState, latest snapshot wins
      stateMap.set(visual.id, { ...(visual.initialState as Record<string, unknown>) })
    }
  }

  // Apply sequential snapshots
  for (const step of steps) {
    if (step.index > stepIndex) break
    if (!step.canvas) continue
    for (const [id, stepData] of Object.entries(step.canvas)) {
      const visual = canvas.find(v => v.id === id)
      if (visual && !isIdentityBased(visual.type)) {
        stateMap.set(id, { ...(stepData as Record<string, unknown>) })
      }
    }
  }

  return stateMap
}

function isIdentityBased(type: string): boolean {
  return type === 'graph' || type === 'tree' || type === 'system-diagram'
}
```

`applyOverlaysAtStep` is **unchanged** — activeText and hud already use the
correct accumulate semantics.

---

### `packages/scene-engine/src/step-engine/merge.ts` (NEW FILE)

Three exported functions:

**`buildRegistry(visual: CanvasVisual): Registry`**

Reads `visual.initialState` and populates the entity map. For graph: parses
`nodes[]` and `edges[]` arrays into `Map<id, entity>`. For tree: parses
`nodes[]` into `Map<id, node>` and stores `rootId`. For system-diagram: parses
`components[]` and `connections[]`.

Sets all accumulated fields to their initial defaults (`distance: "∞"`,
`result: null`) on each entity.

**`applyStructural(registry: Registry, stepData: unknown, type: string): void`**

Mutates the registry. Processes (in order):
1. `newNodes` / `newComponents` → add entity to map with full topology
2. `updateNodes` / `updateComponents` → merge partial topology into existing entity
3. `newEdges` / `newConnections` → add edge to map
4. `updateEdges` / `updateConnections` → merge partial edge topology
5. `updateRoot` (tree only) → update `registry.rootId`
6. Accumulated field extraction from `nodeStates`: if `distance` or `result`
   is present on a node state entry, write it into the registry entity so it
   persists across steps

**`resolveState(registry: Registry, stepData: unknown, type: string): Record<string, unknown>`**

Produces the fully-resolved output for the renderer:
1. Clone all entities from registry (topology + current accumulated fields)
2. Reset all ephemeral fields to defaults on every entity
3. Apply `nodeStates` / `edgeStates` / `componentStates` / `connectionStates`
   — overwrite ephemeral fields on listed entities
4. Return `{ nodes: [...], edges: [...] }` / `{ components: [...], connections: [...] }` /
   `{ nodes: [...], rootId }` matching the exact shape renderers already expect

---

### `packages/scene-engine/src/step-engine/merge.test.ts` (NEW FILE)

```
graph — highlight reset
  step 1: nodeStates {a: {highlight: active}, b: {highlight: queued}}
  step 2: nodeStates {b: {highlight: active}}
  at step 2: a.highlight = "default", b.highlight = "active"

graph — distance persists
  step 1: nodeStates {a: {highlight: active, distance: "0"}}
  step 2: nodeStates {b: {highlight: active, distance: "5"}}
  at step 2: a.distance = "0" (persisted from step 1), b.distance = "5"

graph — distance NOT overwritten when absent
  step 1: nodeStates {a: {distance: "0"}}
  step 3: nodeStates {a: {highlight: active}}  (no distance key)
  at step 3: a.distance = "0" still

graph — structural addition
  initialState: nodes [a, b], edges [e0]
  step 3: newNodes [{id: c, label: C}], newEdges [{id: e1, from: b, to: c}]
  at step 2: output does NOT include c or e1
  at step 3: output includes c and e1

graph — structural update
  initialState: edges [e0 weight:4]
  step 2: updateEdges [{id: e0, weight: 9}]
  at step 1: e0.weight = 4
  at step 2: e0.weight = 9

tree — children rewire
  initialState: n1.children = []
  step 2: updateNodes [{id: n1, children: [n2, n3]}]
  at step 1: n1.children = []
  at step 2: n1.children = [n2, n3]

tree — result persists
  step 4: nodeStates {f2: {highlight: returned, result: "= 1"}}
  step 5: nodeStates {f3: {highlight: active}}
  at step 5: f2.result = "= 1" (persisted), f2.highlight = "default"

tree — updateRoot
  initialState: rootId = n1
  step 3: updateRoot = n2
  at step 2: rootId = n1
  at step 3: rootId = n2

system-diagram — ephemeral reset
  initialState: c0, c1, c2 connections
  step 1: connectionStates {c0: {active: true}}
  at step 1: c0.active = true, c1.active = false, c2.active = false
  step 2: connectionStates {c2: {active: true}}
  at step 2: c0.active = false, c1.active = false, c2.active = true

mixed scene — linear + graph together
  linear visual: correct items[] snapshot returned
  graph visual: entity registry path used
  both resolve at same stepIndex with no interference
```

---

## 7. Implementation Order

Execute in this order within a single implementation pass:

1. `spec.ts` — update generation rules, add `ENTITY_STEP_FIELD_SEMANTICS`
2. `spec.build.ts` — replace identity-based step canvas Zod schemas
3. `step-engine/merge.ts` — implement `buildRegistry`, `applyStructural`, `resolveState`
4. `step-engine/merge.test.ts` — write and pass all test cases above
5. `step-engine/apply.ts` — rewrite `applyStepActionsUpTo` using merge.ts

---

## 8. Acceptance Criteria

- [ ] `spec.ts` documents new step format for graph, tree, system-diagram — no FULL-SNAPSHOT rule on these types
- [ ] `spec.ts` retains FULL-SNAPSHOT rule on linear, map, grid, chart
- [ ] `ENTITY_STEP_FIELD_SEMANTICS` exported from spec.ts with correct ephemeral/accumulated classification
- [ ] New Zod schemas in `spec.build.ts` validate correctly-formed new-format step data
- [ ] Old-format step data (nodes[], components[] arrays in steps) no longer validates — scenes will break, expected
- [ ] All test cases in `merge.test.ts` pass
- [ ] A hand-crafted test scene written in new format for each identity-based type renders correctly
- [ ] `applyOverlaysAtStep` unchanged
- [ ] No renderer files modified
- [ ] No existing scene JSON files modified
- [ ] No AI pipeline files modified (`schemas.ts`, `prompts/`)
