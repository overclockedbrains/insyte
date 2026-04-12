# Phase 20 — Layout Engine

**Goal:** Build the deterministic layout engine layer that computes pixel positions for every visual type. Positions are computed by the layout engine — never authored by AI or stored in Scene JSON. This phase makes broken layout structurally impossible by construction, matching the architecture used by Mermaid, DiagramGPT/Eraser, and React Flow.

**Source research:** `ARCHITECTURE_RECOMMENDATIONS.md` Phase C §10–12, `layout-and-visualization.md` Parts 1–4, `ARCHITECTURE_V3.md` Part 3, `existing-tools-analysis.md` §4 (Mermaid) + §3 (React Flow)

**Estimated effort:** 6–8 days

**Prerequisite:** Phase 19 (schema redesign removes XY from JSON; layout engine fills the gap)

---

## Architecture

```
Scene JSON (no positions)
  ↓
computeLayout(visuals, currentState)
  ├── applyD3HierarchyLayout()     ← tree, recursion-tree
  ├── applyDagreLayout()           ← graph, system-diagram
  ├── applyLinearLayout()          ← array, linked-list, queue
  ├── applyStackLayout()           ← stack
  ├── applyGridLayout()            ← dp-table, grid
  ├── applyHashmapLayout()         ← hashmap
  └── applySlotLayout()            ← text-badge, counter
  ↓
LayoutResult { nodes: PositionedNode[], edges: PositionedEdge[], boundingBox }
  ↓
SVG viewBox set from boundingBox → never clipped
  ↓
Renderer draws nodes at computed positions
```

---

## What Actually Changes

### 1. Install dependencies

```bash
pnpm add @dagrejs/dagre d3-hierarchy --filter @insyte/scene-engine
```

> **Package note:** All layout engine code lives in `packages/scene-engine/src/layout/` (not `apps/web`). This satisfies the monorepo package boundary rule — Phase 21's `computeSceneGraphAtStep` (also in `@insyte/scene-engine`) can import `computeLayout` directly via `'../layout'` without any cross-package violation. `apps/web` then imports from `@insyte/scene-engine`.

Bundle impact: ~135KB total, lazy-loaded on scene mount.

**ELK.js is NOT installed here** — deferred to Phase 27 (system diagram quality upgrade). Dagre handles system-diagram in this phase.

---

### 2. `packages/scene-engine/src/layout/spacing.ts` — New file (spacing constants)

```typescript
// All spacing derived from 8px base unit — eliminates arbitrary SCALE_X/SCALE_Y constants
export const SPACING = {
  xs:  4,   // inner padding between elements
  sm:  8,   // standard gap
  md:  16,  // element gap
  lg:  24,  // section gap
  xl:  32,  // primitive separation
  xxl: 48,  // canvas padding around content
} as const

export const PRIMITIVE_SIZING = {
  array:         { cellWidth: 48, cellHeight: 48, gap: 8 },
  stack:         { itemWidth: 120, itemHeight: 40, gap: 8 },
  queue:         { itemWidth: 80,  itemHeight: 40, gap: 8 },
  linkedList:    { nodeWidth: 64,  nodeHeight: 40, gap: 32 },  // 32 for arrow room
  tree:          { nodeSize: [80, 60] as [number, number] },   // d3.tree().nodeSize
  recursionTree: { nodeSize: [72, 56] as [number, number] },
  graph:         { nodeWidth: 100, nodeHeight: 40, nodesep: 40, ranksep: 60 },
  systemDiagram: { nodeWidth: 120, nodeHeight: 48, nodesep: 60, ranksep: 80 },
  hashmap:       { bucketHeight: 40, keyWidth: 80, valueWidth: 80, rowGap: 4 },
  dpTable:       { cellWidth: 48, cellHeight: 48, gap: 2 },
  counter:       { width: 80,  height: 48 },
  textBadge:     { maxWidth: 200, padding: 12 },
} as const
```

---

### 3. `packages/scene-engine/src/layout/types.ts` — New file

```typescript
export interface PositionedNode {
  id: string
  x: number          // center x in SVG coordinate space
  y: number          // center y in SVG coordinate space
  width: number
  height: number
  // Original visual data flows through
  type: VisualType
  state: Record<string, unknown>  // visual state at current step
}

export interface PositionedEdge {
  id: string
  from: string    // source node ID
  to: string      // target node ID
  label?: string
  waypoints: { x: number; y: number }[]  // edge routing path (computed by dagre/ELK)
}

export interface LayoutResult {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  boundingBox: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  viewBox: string  // pre-computed: `${minX-pad} ${minY-pad} ${w+2pad} ${h+2pad}`
}

export interface LayoutInput {
  visual: Visual
  state: Record<string, unknown>  // current visual state (step-specific)
}
```

---

### 3b. `packages/scene-engine/src/layout/utils.ts` — New file (shared utilities)

Extracted to break the circular dependency: algorithm files (`dagre.ts`, `d3-hierarchy.ts`, `arithmetic.ts`) all call `computeLayoutResult` to build their return values. If that function lived in `index.ts` — which imports those same algorithm files — bundlers reject the circular import. Moving helpers to `utils.ts` breaks the cycle.

```typescript
import type { LayoutResult, PositionedNode, PositionedEdge } from './types'

export function computeLayoutResult(nodes: PositionedNode[], edges: PositionedEdge[]): LayoutResult {
  if (nodes.length === 0) return emptyLayoutResult()

  const minX = Math.min(...nodes.map(n => n.x - n.width / 2))
  const minY = Math.min(...nodes.map(n => n.y - n.height / 2))
  const maxX = Math.max(...nodes.map(n => n.x + n.width / 2))
  const maxY = Math.max(...nodes.map(n => n.y + n.height / 2))
  const bb = { minX, minY, maxX, maxY }

  return { nodes, edges, boundingBox: bb, viewBox: computeViewBox(bb) }
}

export function emptyLayoutResult(): LayoutResult {
  return { nodes: [], edges: [], boundingBox: { minX: 0, minY: 0, maxX: 400, maxY: 300 }, viewBox: '0 0 400 300' }
}

export function computeViewBox(bb: LayoutResult['boundingBox'], padding = 40): string {
  const w = bb.maxX - bb.minX + padding * 2
  const h = bb.maxY - bb.minY + padding * 2
  return `${bb.minX - padding} ${bb.minY - padding} ${w} ${h}`
}
```

---

### 4. `packages/scene-engine/src/layout/algorithms/dagre.ts` — New file

```typescript
import dagre from '@dagrejs/dagre'
import { PRIMITIVE_SIZING, SPACING } from '../spacing'
import { computeLayoutResult } from '../utils'
import type { LayoutInput, LayoutResult, PositionedEdge } from '../types'

export function applyDagreLayout(
  input: LayoutInput,
  rankdir: 'TB' | 'LR' | 'BT' | 'RL' = 'TB'
): LayoutResult {
  const sizing = input.visual.type === 'system-diagram'
    ? PRIMITIVE_SIZING.systemDiagram
    : PRIMITIVE_SIZING.graph
  
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir,
    nodesep: sizing.nodesep,
    ranksep: sizing.ranksep,
    marginx: SPACING.xxl,
    marginy: SPACING.xxl,
  })
  
  const state = input.state as { nodes?: any[]; edges?: any[]; components?: any[]; connections?: any[] }
  
  // Support both "nodes/edges" (graph) and "components/connections" (system-diagram)
  const nodes = state.nodes ?? state.components ?? []
  const edges = state.edges ?? state.connections ?? []
  
  nodes.forEach((n: any) => {
    g.setNode(n.id, { width: sizing.nodeWidth, height: sizing.nodeHeight, label: n.label ?? n.id })
  })
  
  edges.forEach((e: any, i: number) => {
    g.setEdge(e.from, e.to, { id: e.id ?? `e-${i}`, label: e.label })
  })
  
  dagre.layout(g)
  
  const positionedNodes = nodes.map((n: any) => {
    const pos = g.node(n.id)
    return {
      id: n.id,
      x: pos.x,
      y: pos.y,
      width: sizing.nodeWidth,
      height: sizing.nodeHeight,
      type: input.visual.type,
      state: n,
    }
  })
  
  const positionedEdges: PositionedEdge[] = edges.map((e: any, i: number) => {
    const edgeData = g.edge({ v: e.from, w: e.to })
    return {
      id: e.id ?? `e-${i}`,
      from: e.from,
      to: e.to,
      label: e.label,
      waypoints: edgeData?.points ?? [],
    }
  })
  
  return computeLayoutResult(positionedNodes, positionedEdges)
}
```

---

### 5. `packages/scene-engine/src/layout/algorithms/d3-hierarchy.ts` — New file

```typescript
import { hierarchy, tree } from 'd3-hierarchy'
import { PRIMITIVE_SIZING, SPACING } from '../spacing'
import { computeLayoutResult, emptyLayoutResult } from '../utils'
import type { LayoutInput, LayoutResult } from '../types'

export function applyD3HierarchyLayout(input: LayoutInput): LayoutResult {
  const isRecursion = input.visual.type === 'recursion-tree'
  const sizing = isRecursion ? PRIMITIVE_SIZING.recursionTree : PRIMITIVE_SIZING.tree
  const [nodeW, nodeH] = sizing.nodeSize

  const state = input.state as { root: any }
  if (!state.root) return emptyLayoutResult()

  const root = hierarchy(state.root, (d: any) => {
    if (d.left && d.right) return [d.left, d.right].filter(Boolean)
    if (d.children) return d.children
    return null
  })

  // Reingold-Tilford via d3.tree()
  const treeLayout = tree<any>().nodeSize([nodeW + SPACING.md, nodeH + SPACING.xl])
  treeLayout(root)

  const positionedNodes = root.descendants().map(d => ({
    id: d.data.id ?? String(d.data.value ?? d.depth),
    x: d.x,
    y: d.y,
    width: nodeW,
    height: nodeH,
    type: input.visual.type,
    state: d.data,
  }))

  const positionedEdges = root.links().map((link, i) => ({
    id: `tree-edge-${i}`,
    from: link.source.data.id ?? String(link.source.data.value),
    to: link.target.data.id ?? String(link.target.data.value),
    waypoints: [
      { x: link.source.x, y: link.source.y + nodeH / 2 },
      { x: link.target.x, y: link.target.y - nodeH / 2 },
    ],
  }))

  return computeLayoutResult(positionedNodes, positionedEdges)
}
```

---

### 6. `packages/scene-engine/src/layout/algorithms/arithmetic.ts` — New file (all trivial layouts)

```typescript
import { PRIMITIVE_SIZING, SPACING } from '../spacing'
import { computeLayoutResult } from '../utils'
import type { LayoutInput, LayoutResult } from '../types'

export function applyLinearLayout(input: LayoutInput): LayoutResult {
  // array, linked-list, queue — horizontal
  const type = input.visual.type  // 'array' | 'linked-list' | 'queue'

  // Normalize: each type uses different property names in PRIMITIVE_SIZING.
  // Bug note: the original used `'stack'` instead of `'linked-list'` — fixed here.
  const sz = (() => {
    if (type === 'array') {
      const s = PRIMITIVE_SIZING.array
      return { cellW: s.cellWidth, cellH: s.cellHeight, gap: s.gap }
    }
    if (type === 'linked-list') {
      const s = PRIMITIVE_SIZING.linkedList
      return { cellW: s.nodeWidth, cellH: s.nodeHeight, gap: s.gap }
    }
    const s = PRIMITIVE_SIZING.queue
    return { cellW: s.itemWidth, cellH: s.itemHeight, gap: s.gap }
  })()

  const state = input.state as { cells?: any[]; items?: any[]; nodes?: any[] }
  const items = state.cells ?? state.items ?? state.nodes ?? []

  const nodes = items.map((item: any, i: number) => ({
    id: item.id ?? `cell-${i}`,
    x: i * (sz.cellW + sz.gap) + sz.cellW / 2,
    y: sz.cellH / 2,
    width: sz.cellW,
    height: sz.cellH,
    type: input.visual.type,
    state: item,
  }))

  // Linked-list: add pointer edges between adjacent nodes
  const edges = type === 'linked-list'
    ? nodes.slice(0, -1).map((n, i) => ({
        id: `ll-edge-${i}`,
        from: n.id,
        to: nodes[i + 1].id,
        waypoints: [
          { x: n.x + sz.cellW / 2, y: n.y },
          { x: nodes[i + 1].x - sz.cellW / 2, y: nodes[i + 1].y },
        ],
      }))
    : []

  return computeLayoutResult(nodes, edges)
}

export function applyStackLayout(input: LayoutInput): LayoutResult {
  // Stack — vertical, bottom-to-top
  const s = PRIMITIVE_SIZING.stack
  const state = input.state as { items?: any[] }
  const items = [...(state.items ?? [])].reverse()  // top of stack = last item = rendered at top

  const nodes = items.map((item: any, i: number) => ({
    id: item.id ?? `stack-${i}`,
    x: s.itemWidth / 2,
    y: i * (s.itemHeight + SPACING.sm) + s.itemHeight / 2,
    width: s.itemWidth,
    height: s.itemHeight,
    type: input.visual.type,
    state: item,
  }))

  return computeLayoutResult(nodes, [])
}

export function applyGridLayout(input: LayoutInput): LayoutResult {
  // dp-table, grid — 2D grid
  const s = PRIMITIVE_SIZING.dpTable
  const state = input.state as { cells?: any[][]; rows?: any[][] }
  const rows = state.cells ?? state.rows ?? []

  const nodes = rows.flatMap((row: any[], ri: number) =>
    row.map((cell: any, ci: number) => ({
      id: cell.id ?? `cell-${ri}-${ci}`,
      x: ci * (s.cellWidth + SPACING.xs) + s.cellWidth / 2,
      y: ri * (s.cellHeight + SPACING.xs) + s.cellHeight / 2,
      width: s.cellWidth,
      height: s.cellHeight,
      type: input.visual.type,
      state: cell,
    }))
  )

  return computeLayoutResult(nodes, [])
}

export function applyHashmapLayout(input: LayoutInput): LayoutResult {
  const s = PRIMITIVE_SIZING.hashmap
  const state = input.state as { buckets?: any[][]; entries?: any[] }

  // Normalize: entries may be flat or per-bucket
  const buckets: any[][] = state.buckets ?? [state.entries ?? []]

  const nodes = buckets.flatMap((bucket: any[], bi: number) =>
    (bucket || []).map((entry: any, ei: number) => ({
      id: entry.id ?? `bucket-${bi}-entry-${ei}`,
      x: (s.keyWidth + s.valueWidth + SPACING.sm) / 2,
      y: (bi * (s.bucketHeight + SPACING.xs) + s.bucketHeight / 2) + ei * (s.bucketHeight + SPACING.xs),
      width: s.keyWidth + s.valueWidth + SPACING.sm,
      height: s.bucketHeight,
      type: input.visual.type,
      state: entry,
    }))
  )

  return computeLayoutResult(nodes, [])
}

export function applySlotLayout(
  input: LayoutInput,
  containerWidth = 800,
  containerHeight = 600
): LayoutResult {
  // text-badge, counter — named slot positions
  const SLOT_POSITIONS: Record<string, { x: number; y: number }> = {
    'top-left':       { x: 0.1, y: 0.05 },
    'top-center':     { x: 0.5, y: 0.05 },
    'top-right':      { x: 0.9, y: 0.05 },
    'bottom-left':    { x: 0.1, y: 0.95 },
    'bottom-center':  { x: 0.5, y: 0.95 },
    'bottom-right':   { x: 0.9, y: 0.95 },
    'left-center':    { x: 0.1, y: 0.5 },
    'right-center':   { x: 0.9, y: 0.5 },
    'overlay-top':    { x: 0.5, y: 0.1 },
    'overlay-bottom': { x: 0.5, y: 0.9 },
    'center':         { x: 0.5, y: 0.5 },
  }

  const slot = input.visual.slot ?? 'top-right'
  const pct = SLOT_POSITIONS[slot] ?? SLOT_POSITIONS['top-right']
  const s = input.visual.type === 'counter' ? PRIMITIVE_SIZING.counter : PRIMITIVE_SIZING.textBadge

  return {
    nodes: [{
      id: input.visual.id,
      x: pct.x * containerWidth,
      y: pct.y * containerHeight,
      width: s.width ?? s.maxWidth,
      height: s.height ?? 32,
      type: input.visual.type,
      state: input.state as Record<string, unknown>,
    }],
    edges: [],
    boundingBox: { minX: 0, minY: 0, maxX: containerWidth, maxY: containerHeight },
    viewBox: `0 0 ${containerWidth} ${containerHeight}`,
  }
}

export function applyRadialLayout(input: LayoutInput): LayoutResult {
  // Circular placement for `radial` LayoutHint (e.g., hash rings, force-directed graphs).
  // Pure arithmetic — no external library dependency.
  const state = input.state as { nodes?: any[]; edges?: any[] }
  const stateNodes = state.nodes ?? []
  const stateEdges = state.edges ?? []

  const n = stateNodes.length
  if (n === 0) return { nodes: [], edges: [], boundingBox: { minX: 0, minY: 0, maxX: 400, maxY: 300 }, viewBox: '0 0 400 300' }

  const nodeW = 80
  const nodeH = 40
  // Scale radius with node count so nodes never overlap
  const radius = Math.max(120, n * 30)
  const cx = radius + nodeW / 2 + SPACING.xxl
  const cy = radius + nodeH / 2 + SPACING.xxl

  const nodes = stateNodes.map((node: any, i: number) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2  // start at top (12 o'clock)
    return {
      id: node.id,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      width: nodeW,
      height: nodeH,
      type: input.visual.type,
      state: node,
    }
  })

  const nodeById = new Map(nodes.map(nd => [nd.id, nd]))
  const edges = stateEdges.map((e: any, i: number) => ({
    id: e.id ?? `e-${i}`,
    from: e.from,
    to: e.to,
    label: e.label,
    waypoints: (() => {
      const src = nodeById.get(e.from)
      const dst = nodeById.get(e.to)
      if (!src || !dst) return []
      return [{ x: src.x, y: src.y }, { x: dst.x, y: dst.y }]
    })(),
  }))

  return computeLayoutResult(nodes, edges)
}
```

---

### 7. `packages/scene-engine/src/layout/index.ts` — New file (dispatcher + memoization)

```typescript
import { applyDagreLayout } from './algorithms/dagre'
import { applyD3HierarchyLayout } from './algorithms/d3-hierarchy'
import {
  applyLinearLayout, applyStackLayout, applyGridLayout,
  applyHashmapLayout, applySlotLayout, applyRadialLayout,
} from './algorithms/arithmetic'
import { emptyLayoutResult, computeViewBox } from './utils'
import type { LayoutResult, LayoutInput } from './types'
import type { Visual } from '../types'   // direct internal import — NOT '@insyte/scene-engine' (self-reference)

// Layout cache: topology hash → LayoutResult
const layoutCache = new Map<string, LayoutResult>()

/**
 * Hash only topology (node IDs + edges), not visual state (colors, highlights).
 * Same topology hash → same computed positions → cache hit.
 *
 * Bug fix: the original naively read `state.nodes` for ALL types, which always
 * returns `[]` for trees (trees have `state.root`, not `state.nodes`).
 * Each type family is now handled explicitly.
 */
function hashTopology(visual: Visual, state: Record<string, unknown>): string {
  const type = visual.type

  if (type === 'tree' || type === 'recursion-tree') {
    // Trees store structure in a `root` object, not a flat `nodes` array
    const rootHash = hashTreeNode((state as any)?.root)
    return `${visual.id}|${type}|${rootHash}`
  }

  if (type === 'array' || type === 'queue' || type === 'linked-list') {
    const items = (state as any)?.cells ?? (state as any)?.items ?? (state as any)?.nodes ?? []
    return `${visual.id}|${type}|${JSON.stringify(items.map((n: any) => n.id ?? n.value))}`
  }

  if (type === 'dp-table' || type === 'grid') {
    const rows = (state as any)?.cells ?? (state as any)?.rows ?? []
    return `${visual.id}|${type}|${rows.length}x${(rows[0] ?? []).length}`
  }

  if (type === 'hashmap') {
    const buckets = (state as any)?.buckets ?? [(state as any)?.entries ?? []]
    return `${visual.id}|${type}|${JSON.stringify(buckets.map((b: any[]) => b.length))}`
  }

  // graph, system-diagram, radial — topology = node IDs + edge pairs
  const nodes = (state as any)?.nodes ?? (state as any)?.components ?? []
  const edges = (state as any)?.edges ?? (state as any)?.connections ?? []
  return `${visual.id}|${type}|${JSON.stringify(nodes.map((n: any) => n.id))}|${JSON.stringify(edges.map((e: any) => `${e.from}→${e.to}`))}`
}

/** Recursively hash tree structure by identity (id or value), ignoring highlights/state. */
function hashTreeNode(node: any): string {
  if (!node) return 'null'
  const id = String(node.id ?? node.value ?? '?')
  // Support both binary trees (left/right) and n-ary trees (children)
  const children = node.children
    ? node.children.map(hashTreeNode).join(',')
    : `${hashTreeNode(node.left ?? null)},${hashTreeNode(node.right ?? null)}`
  return `${id}(${children})`
}

export function computeLayout(
  visual: Visual,
  state: Record<string, unknown>,
  containerWidth = 800,
  containerHeight = 600
): LayoutResult {
  const topoHash = hashTopology(visual, state)

  // Cache hit — topology unchanged, reuse layout
  if (layoutCache.has(topoHash)) return layoutCache.get(topoHash)!

  const input: LayoutInput = { visual, state }
  let result: LayoutResult

  const hint = visual.layoutHint

  switch (visual.type) {
    case 'tree':
    case 'recursion-tree':
      result = applyD3HierarchyLayout(input)
      break

    case 'graph':
      if (hint === 'radial') {
        result = applyRadialLayout(input)
      } else {
        result = applyDagreLayout(input,
          hint === 'dagre-LR' ? 'LR' :
          hint === 'dagre-BT' ? 'BT' : 'TB'
        )
      }
      break

    case 'system-diagram':
      result = applyDagreLayout(input, 'LR')  // Phase 26 upgrades this to ELK; dagre used here
      break

    case 'array':
    case 'linked-list':
    case 'queue':
      result = applyLinearLayout(input)
      break

    case 'stack':
      result = applyStackLayout(input)
      break

    case 'dp-table':
    case 'grid':
      result = applyGridLayout(input)
      break

    case 'hashmap':
      result = applyHashmapLayout(input)
      break

    case 'text-badge':
    case 'counter':
      result = applySlotLayout(input, containerWidth, containerHeight)
      break

    default:
      result = emptyLayoutResult()
  }

  layoutCache.set(topoHash, result)
  return result
}

// computeViewBox re-exported for callers that need to convert a boundingBox to SVG viewBox string
export { computeViewBox }
```

---

### 8. Wire layout engine into primitive components

Each complex primitive component (GraphViz, TreeViz, RecursionTreeViz, SystemDiagramViz) now calls `computeLayout()` instead of reading positions from Scene JSON:

```typescript
// GraphViz.tsx — import from @insyte/scene-engine (apps/web never imports from packages/ directly)
import { computeLayout } from '@insyte/scene-engine'
const layout = useMemo(() => computeLayout(visual, currentState, dims.w, dims.h), [visual, currentState, dims])

// Use layout.nodes for positions, layout.edges for path waypoints
// Use layout.viewBox for the SVG viewBox attribute
```

The `useMemo` dependency on `currentState` means layout re-runs only when the visual state changes. The topology hash cache inside `computeLayout()` ensures dagre only runs when nodes are added or removed — not on every state change (e.g., color changes don't trigger re-layout).

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `packages/scene-engine/package.json` | Edit | Add @dagrejs/dagre, d3-hierarchy |
| `packages/scene-engine/src/layout/spacing.ts` | New | SPACING + PRIMITIVE_SIZING constants |
| `packages/scene-engine/src/layout/types.ts` | New | PositionedNode, PositionedEdge, LayoutResult, LayoutInput |
| `packages/scene-engine/src/layout/utils.ts` | New | computeLayoutResult, emptyLayoutResult, computeViewBox (breaks circular dep) |
| `packages/scene-engine/src/layout/algorithms/dagre.ts` | New | Dagre adapter (graph, system-diagram) |
| `packages/scene-engine/src/layout/algorithms/d3-hierarchy.ts` | New | D3-hierarchy adapter (tree, recursion-tree) |
| `packages/scene-engine/src/layout/algorithms/arithmetic.ts` | New | Linear, stack, grid, hashmap, slot, radial |
| `packages/scene-engine/src/layout/index.ts` | New | Dispatcher + topology-hash memoization |
| `packages/scene-engine/src/index.ts` | Edit | Export computeLayout, LayoutResult, computeViewBox for apps/web |
| `apps/web/src/components/primitives/GraphViz.tsx` | Edit | Use computeLayout() from @insyte/scene-engine |
| `apps/web/src/components/primitives/TreeViz.tsx` | Edit | Use computeLayout() from @insyte/scene-engine |
| `apps/web/src/components/primitives/RecursionTreeViz.tsx` | Edit | Use computeLayout() from @insyte/scene-engine |
| `apps/web/src/components/primitives/SystemDiagramViz.tsx` | Edit | Use computeLayout() from @insyte/scene-engine |
| `apps/web/src/components/primitives/ArrayViz.tsx` | Edit | Use computeLayout() from @insyte/scene-engine |
| `apps/web/src/components/primitives/LinkedListViz.tsx` | Edit | Use computeLayout() from @insyte/scene-engine |
| `apps/web/src/components/primitives/StackViz.tsx` | Edit | Use computeLayout() from @insyte/scene-engine |
| `apps/web/src/components/primitives/QueueViz.tsx` | Edit | Use computeLayout() from @insyte/scene-engine |
| `apps/web/src/components/primitives/DPTableViz.tsx` | Edit | Use computeLayout() from @insyte/scene-engine |
| `apps/web/src/components/primitives/HashMapViz.tsx` | Edit | Use computeLayout() from @insyte/scene-engine |

> **Package boundary rule:** All layout engine code lives in `packages/scene-engine/src/layout/`. `apps/web` primitive components import only from `@insyte/scene-engine`. Never import from `packages/` directly inside `apps/web`, and never import from `apps/` inside `packages/`.

---

## Expected Impact

| Issue | Before | After |
|-------|--------|-------|
| Graph nodes overlapping | Common (AI can't do layout) | Impossible — dagre guarantees no overlap |
| Tree nodes misaligned | Present | Perfect Reingold-Tilford layout |
| Arrays/stacks unsized | Fixed SCALE_X heuristics | Precise 8px-grid spacing |
| Content clipped in SVG | Frequent | Impossible — auto-fit viewBox |
| AI position hallucinations | 40% of graph/tree scenes | Impossible — AI produces no positions |
| Different sizes on different screens | Present | Correct — relative viewBox |
