# Phase 28 — ELK Integration & System Diagram Quality

**Goal:** Upgrade `system-diagram` and complex `graph` layouts from dagre to ELK (Eclipse Layout Kernel) for orthogonal (Manhattan) edge routing, port constraints, and edge label positioning. ELK produces Lucidchart-quality layouts — right-angle connectors, clean hierarchical structure, no diagonal lines. Lazy-loaded in a Web Worker to avoid blocking the main thread with its 2MB WASM bundle. Phase 23's `useSceneRuntime` is extended to subscribe to the ELK ready signal and invalidate the scene graph cache when an upgraded layout is available.

**Source research:** `layout-and-visualization.md` §1.2 (ELK.js), §2.7 (System Diagram), §3.1 (Mermaid + ELK), `existing-tools-analysis.md` §3 (React Flow + ELK), `ARCHITECTURE_V3.md` Part 3 §3.2

**Estimated effort:** 4–5 days

**Prerequisite:** Phase 20 (layout engine — ELK replaces dagre for system-diagram type) + Phase 23 (Scene Runtime — ELK subscription wires into the cache invalidation path)

---

## Why ELK Over Dagre for System Diagrams

| Feature | Dagre | ELK |
|---------|-------|-----|
| Edge routing | Polyline (diagonal segments allowed) | Orthogonal (Manhattan — all horizontal/vertical) |
| Port constraints | None | Full (force edges to specific sides of nodes) |
| Edge labels | Basic | Correct positioning with overlap avoidance |
| Self-loops | Broken | Handled cleanly |
| Hierarchical compound nodes | None | Full support |
| Quality ceiling | Good | Lucidchart/draw.io quality |
| Bundle size | 120KB | 2MB WASM (lazy, Web Worker) |
| API | Synchronous | Promise-based (async) |

For `system-diagram` primitives (LLD, HLD scenes), orthogonal routing is a significant visual quality improvement — it looks professional vs. amateurish. The diagonal lines that dagre produces in system diagrams are the #1 visual complaint about tools like mermaid's flowchart rendering.

Dagre remains for `graph` type (faster, adequate for general directed graphs). ELK is applied specifically to `system-diagram` and optionally to complex `graph` with `layoutHint: 'elk-layered'`.

---

## What Actually Changes

### 1. Install elkjs

```bash
pnpm add elkjs --filter web
```

The `elkjs` package includes the WASM bundle. Do NOT import it on the main thread — load it in a Web Worker only.

---

### 2. `apps/web/src/engine/layout/workers/elk-worker.ts` — New file (Web Worker)

```typescript
// This file runs in a Web Worker — no DOM access, no React
import ELK from 'elkjs/lib/elk.bundled.js'

const elk = new ELK()

self.onmessage = async (event: MessageEvent) => {
  const { id, elkGraph } = event.data

  try {
    const layout = await elk.layout(elkGraph)
    self.postMessage({ id, layout, error: null })
  } catch (err: any) {
    self.postMessage({ id, layout: null, error: err.message })
  }
}
```

The Web Worker pattern keeps the 2MB ELK WASM off the main thread. Layout requests are serialized to the worker via postMessage.

---

### 3. `apps/web/src/engine/layout/elk-client.ts` — New file (worker client)

```typescript
// Singleton worker + promise-based request/response bridge
let worker: Worker | null = null
let requestIdCounter = 0
const pendingRequests = new Map<number, { resolve: Function; reject: Function }>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./workers/elk-worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent) => {
      const { id, layout, error } = event.data
      const pending = pendingRequests.get(id)
      if (!pending) return
      pendingRequests.delete(id)
      error ? pending.reject(new Error(error)) : pending.resolve(layout)
    }
  }
  return worker
}

export function runELKLayout(elkGraph: ElkNode): Promise<ElkNode> {
  return new Promise((resolve, reject) => {
    const id = ++requestIdCounter
    pendingRequests.set(id, { resolve, reject })
    getWorker().postMessage({ id, elkGraph })
  })
}
```

---

### 4. `packages/scene-engine/src/layout/algorithms/elk.ts` — New file

```typescript
import { PRIMITIVE_SIZING, SPACING } from '../spacing'
import type { LayoutInput, LayoutResult, PositionedNode, PositionedEdge } from '../types'
import { computeLayoutResult } from '../utils'

export async function applyELKLayout(
  input: LayoutInput,
  runELK: (graph: object) => Promise<object>  // injected by apps/web at startup
): Promise<LayoutResult> {
  const sizing = PRIMITIVE_SIZING.systemDiagram

  const state = input.state as {
    components?: any[]
    connections?: any[]
    nodes?: any[]
    edges?: any[]
  }

  const nodes = state.components ?? state.nodes ?? []
  const edges = state.connections ?? state.edges ?? []

  // Build ELK graph format
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',                    // left-to-right for system diagrams
      'elk.layered.spacing.nodeNodeBetweenLayers': String(sizing.ranksep),
      'elk.spacing.nodeNode': String(sizing.nodesep),
      'elk.edgeRouting': 'ORTHOGONAL',             // Manhattan routing
      'elk.layered.unnecessaryBendpoints': 'true', // minimize bends
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: nodes.map((n: any) => ({
      id: n.id,
      width: sizing.nodeWidth,
      height: sizing.nodeHeight,
      labels: [{ text: n.label ?? n.id }],
      ports: [
        { id: `${n.id}-left`,   properties: { 'port.side': 'WEST' } },
        { id: `${n.id}-right`,  properties: { 'port.side': 'EAST' } },
        { id: `${n.id}-top`,    properties: { 'port.side': 'NORTH' } },
        { id: `${n.id}-bottom`, properties: { 'port.side': 'SOUTH' } },
      ],
    })),
    edges: edges.map((e: any, i: number) => ({
      id: e.id ?? `e-${i}`,
      sources: [`${e.from}-right`],
      targets: [`${e.to}-left`],
      labels: e.label ? [{ text: e.label }] : [],
    })),
  }

  const layout = await runELK(elkGraph) as any

  // Convert ELK output to LayoutResult
  const positionedNodes: PositionedNode[] = (layout.children ?? []).map((elkNode: any) => ({
    id: elkNode.id,
    x: elkNode.x + elkNode.width / 2,   // ELK gives top-left, convert to center
    y: elkNode.y + elkNode.height / 2,
    width: elkNode.width,
    height: elkNode.height,
    type: input.visual.type,
    state: nodes.find((n: any) => n.id === elkNode.id) ?? {},
  }))

  const positionedEdges: PositionedEdge[] = (layout.edges ?? []).map((elkEdge: any) => ({
    id: elkEdge.id,
    from: elkEdge.sources[0].replace(/-right$|-left$|-top$|-bottom$/, ''),
    to: elkEdge.targets[0].replace(/-right$|-left$|-top$|-bottom$/, ''),
    label: elkEdge.labels?.[0]?.text,
    waypoints: buildWaypointsFromELKEdge(elkEdge),
  }))

  return computeLayoutResult(positionedNodes, positionedEdges)
}

// Convert ELK edge sections (bendpoints) to waypoints array
function buildWaypointsFromELKEdge(elkEdge: any): { x: number; y: number }[] {
  const section = elkEdge.sections?.[0]
  if (!section) return []

  const waypoints = [section.startPoint]
  if (section.bendPoints) waypoints.push(...section.bendPoints)
  waypoints.push(section.endPoint)

  return waypoints
}
```

---

### 5. Update `computeLayout()` dispatcher — `packages/scene-engine/src/layout/index.ts`

**Critical constraint:** `computeLayout()` must stay **synchronous**. `computeSceneGraphAtStep` calls it in a loop and is invoked from `useMemo` in React — you cannot `await` inside `useMemo`. Making the dispatcher async would cascade through `computeSceneGraphAtStep` → `useSceneRuntime` → `CanvasCard`, breaking the entire scene graph layer.

**Strategy: progressive enhancement (dagre first, ELK upgrade)**

1. On the first call for a `system-diagram` topology: return a dagre layout immediately (sync).
2. Concurrently fire `applyELKLayout()` in the background (async, non-blocking).
3. When ELK resolves: store the result in `elkLayoutCache` and bump an upgrade signal.
4. React re-renders: `computeLayout()` finds the ELK result in cache → returns it.

```typescript
// packages/scene-engine/src/layout/index.ts — additions in Phase 28

// Separate ELK cache — never evicted by topology changes (ELK is expensive)
const elkLayoutCache = new Map<string, LayoutResult>()

// Lightweight pub/sub: callers subscribe to be notified when ELK upgrades a layout
type ELKReadyCallback = () => void
const elkReadyListeners = new Set<ELKReadyCallback>()

export function subscribeELKReady(cb: ELKReadyCallback): () => void {
  elkReadyListeners.add(cb)
  return () => elkReadyListeners.delete(cb)  // unsubscribe
}

function notifyELKReady(): void {
  for (const cb of elkReadyListeners) cb()
}

// ELK runner injection — set at startup by apps/web to avoid browser-API dependency in package
let elkRunner: ((graph: object) => Promise<object>) | null = null

export function setELKRunner(runner: (graph: object) => Promise<object>): void {
  elkRunner = runner
}

// Updated computeLayout() switch cases — computeLayout() STAYS SYNCHRONOUS
case 'system-diagram':
  if (elkLayoutCache.has(topoHash)) {
    // ELK result available from a prior async run — use it
    result = elkLayoutCache.get(topoHash)!
  } else {
    // Return dagre immediately; kick off ELK in background
    result = applyDagreLayout(input, 'LR')
    if (elkRunner) {
      applyELKLayout(input, elkRunner).then(elkResult => {
        elkLayoutCache.set(topoHash, elkResult)
        notifyELKReady()   // signal React to re-render
      }).catch(() => {
        // ELK failed — dagre result stays in cache; no action needed
      })
    }
  }
  break

case 'graph':
  if (hint === 'elk-layered' && elkRunner) {
    if (elkLayoutCache.has(topoHash)) {
      result = elkLayoutCache.get(topoHash)!
    } else {
      result = applyDagreLayout(input, 'TB')  // dagre placeholder
      applyELKLayout(input, elkRunner).then(elkResult => {
        elkLayoutCache.set(topoHash, elkResult)
        notifyELKReady()
      }).catch(() => {})
    }
  } else {
    result = applyDagreLayout(input,
      hint === 'dagre-LR' ? 'LR' : hint === 'dagre-BT' ? 'BT' : 'TB'
    )
  }
  break
```

---

### 6. Wire ELK runner at app startup — `apps/web/src/app/layout.tsx`

```typescript
// apps/web/src/app/layout.tsx — or scene page initialization
import { setELKRunner } from '@insyte/scene-engine'
import { runELKLayout } from '../engine/layout/elk-client'

// Inject the browser-specific ELK runner once at startup
setELKRunner(runELKLayout)
```

---

### 7. Update `useSceneRuntime` — ELK subscription

Phase 23 created `useSceneRuntime`. Phase 28 extends it with the ELK subscription:

```typescript
// apps/web/src/hooks/useSceneRuntime.ts — Phase 28 addition
import { subscribeELKReady } from '@insyte/scene-engine'

// Inside useSceneRuntime, add after the prefetch effect:
const [elkVersion, setElkVersion] = useState(0)

useEffect(() => {
  const hasSystemDiagram = scene?.visuals.some(v =>
    v.type === 'system-diagram' || v.layoutHint === 'elk-layered'
  )
  if (!hasSystemDiagram) return

  return subscribeELKReady(() => {
    cache.current.clear()          // invalidate all step caches (layout upgraded)
    setElkVersion(v => v + 1)      // trigger useMemo re-run
  })
}, [scene])

// Add elkVersion to useMemo deps:
const sceneGraph = useMemo(() => {
  // ... existing logic
}, [scene, stepIndex, elkVersion])  // ← elkVersion added
```

---

### 8. Upgrade `SystemDiagramViz.tsx` — Orthogonal edge rendering

ELK provides waypoints (bendpoints) for edges. Render them as orthogonal `<polyline>` or `<path>` elements:

```typescript
function orthogonalEdgePath(waypoints: { x: number; y: number }[]): string {
  if (waypoints.length < 2) return ''
  
  const parts = [`M ${waypoints[0].x} ${waypoints[0].y}`]
  for (let i = 1; i < waypoints.length; i++) {
    parts.push(`L ${waypoints[i].x} ${waypoints[i].y}`)
  }
  return parts.join(' ')
}

// Render with SVG path — sharp corners for orthogonal look
{edges.map(e => (
  <motion.path
    key={e.id}
    d={orthogonalEdgePath(e.waypoints ?? [])}
    stroke="#7c3aed"
    strokeWidth={1.5}
    fill="none"
    strokeLinejoin="round"
    markerEnd="url(#arrowhead)"
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 0.5 }}
  />
))}
```

---

### 9. Add `LayoutHint` values for ELK

Add to `packages/scene-engine/src/types.ts`:
```typescript
export type LayoutHint =
  | 'dagre-TB' | 'dagre-LR' | 'dagre-BT'
  | 'tree-RT'
  | 'linear-H' | 'linear-V'
  | 'grid-2d'
  | 'hashmap-buckets'
  | 'radial'
  | 'elk-layered'    // ← new: ELK for high-quality system/complex graphs
  | 'elk-radial'     // ← new: ELK radial layout
```

Update Zod schema and ISCL valid values accordingly.

---

### 10. Component type icons for system diagram nodes

```typescript
const SYSTEM_ICONS: Record<string, React.ComponentType> = {
  client:          MonitorIcon,
  server:          ServerIcon,
  database:        DatabaseIcon,
  'load-balancer': LayersIcon,
  cache:           ZapIcon,
  queue:           ListIcon,
  'cdn':           GlobeIcon,
}

// In SystemDiagramViz node body:
const Icon = SYSTEM_ICONS[node.state.icon as string] ?? BoxIcon
```

Icons from `lucide-react` (already in the project).

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `apps/web/package.json` | Edit | Add elkjs (browser-specific WASM; stays in apps/web) |
| `apps/web/src/engine/layout/workers/elk-worker.ts` | New | ELK in Web Worker (browser runtime — lives in apps/web) |
| `apps/web/src/engine/layout/elk-client.ts` | New | Promise bridge to ELK worker (browser runtime — lives in apps/web) |
| `packages/scene-engine/src/layout/algorithms/elk.ts` | New | ELK layout adapter (async, pure — injected runner) |
| `packages/scene-engine/src/layout/index.ts` | Edit | Progressive enhancement: dagre sync → ELK async upgrade; `subscribeELKReady`; `setELKRunner` |
| `apps/web/src/app/layout.tsx` | Edit | Inject `runELKLayout` as ELK runner at startup |
| `apps/web/src/hooks/useSceneRuntime.ts` | Edit | Subscribe to ELK ready signal; invalidate cache; bump `elkVersion` |
| `apps/web/src/components/primitives/SystemDiagramViz.tsx` | Edit | Orthogonal edges, icons, ELK waypoints |
| `packages/scene-engine/src/types.ts` | Edit | Add `elk-layered`/`elk-radial` to `LayoutHint` |
| `packages/scene-engine/src/iscl/parser.ts` | Edit | Add ELK hints to valid set |
| `apps/web/src/content/scenes/hld/*.json` | Edit (4 files) | Switch to `elk-layered` layoutHint |
| `apps/web/src/content/scenes/lld/*.json` | Edit (5 files) | Add layoutHint to system-diagram visuals |

> **Package boundary note:** `applyELKLayout()` lives in `packages/scene-engine/src/layout/algorithms/elk.ts` (pure layout logic, no browser APIs). The Web Worker, elk-client, and WASM bundle live in `apps/web` (browser-specific runtime). The layout engine uses a `runELK` callback parameter injected via `setELKRunner()` at startup — this avoids any cross-package import of browser APIs.

---

## Performance Considerations

**Worker initialization:** First ELK call initializes the WASM module (~200ms). Subsequent calls are fast. Pre-warm the worker when the scene page loads:

```typescript
// apps/web/src/app/s/[slug]/page.tsx
useEffect(() => {
  if (scene.visuals.some(v => v.type === 'system-diagram')) {
    getWorker()  // Trigger worker creation and WASM init early
  }
}, [scene])
```

**Caching:** ELK layouts are expensive. The topology hash cache from Phase 20 prevents ELK from running on every step change (only runs when nodes/edges change topology). The `elkLayoutCache` is separate from the step-level LRU cache in `useSceneRuntime` — ELK results persist for the lifetime of the session.
