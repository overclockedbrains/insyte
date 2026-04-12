# Phase 22 — Scene Graph Architecture

**Goal:** Build the `scene-graph/` module in `packages/scene-engine/`. This is the data layer that converts a `Scene` + step index into a fully positioned, diff-able `SceneGraph` — the structure that all renderers consume. Imports from Step Engine (Phase 21) and Layout Engine (Phase 20). Downstream: Scene Runtime (Phase 23) adds caching; ELK (Phase 28) adds async layout upgrade.

**Source research:** `ARCHITECTURE_V3.md` Part 1 §1.3–1.5 (SceneGraph types, compute contract), Part 4 §4.2 (DOMRenderer consumes SceneGraph), Phase 20 (LayoutResult shape), Phase 21 (step-engine exports)

**Estimated effort:** 3–4 days

**Prerequisite:** Phase 20 (layout engine — provides `computeLayout`, `LayoutResult`) + Phase 21 (step engine — provides `applyStepActionsUpTo`, `computeTopologyAtStep`)

---

## What the Scene Graph Is

A `SceneGraph` is a snapshot: "given this scene at this step, where is every node, what does it look like, and how are nodes connected?"

```
Scene + stepIndex
  → computeTopologyAtStep()     → which visuals are active
  → applyStepActionsUpTo()      → what state each visual has
  → computeLayout() per visual  → positions for each node
  → assemble SceneGraph         → nodes, edges, groups with bounding boxes
```

It is **pure and synchronous** — the same inputs always produce the same output. Caching belongs in Phase 23 (Scene Runtime).

---

## What Actually Changes

### 1. `packages/scene-engine/src/scene-graph/types.ts` — New file

```typescript
import type { VisualType } from '../types'

export interface SceneNode {
  id: string
  type: VisualType
  groupId: string              // parent visual ID
  x: number                   // center X (from layout engine)
  y: number                   // center Y (from layout engine)
  width: number
  height: number
  state: Record<string, unknown>   // full visual state at this step
  highlight?: string               // semantic highlight key (e.g. 'active', 'insert')
}

export interface SceneEdge {
  id: string
  from: string                 // source node ID
  to: string                   // target node ID
  label?: string
  waypoints?: { x: number; y: number }[]  // routing points; populated by ELK in Phase 28
}

export interface SceneGroup {
  id: string                   // = visual ID
  nodeIds: string[]
  bbox: { x: number; y: number; width: number; height: number }
}

export interface SceneGraph {
  nodes: Map<string, SceneNode>
  edges: Map<string, SceneEdge>
  groups: Map<string, SceneGroup>
  stepIndex: number
}

export interface SceneGraphDiff {
  added: SceneNode[]
  removed: SceneNode[]
  moved: Array<{ prev: SceneNode; next: SceneNode }>
  changed: Array<{ prev: SceneNode; next: SceneNode }>   // state changed, not position
  addedEdges: SceneEdge[]
  removedEdges: SceneEdge[]
}
```

---

### 2. `packages/scene-engine/src/scene-graph/compute.ts` — New file

```typescript
import type { Scene } from '../types'
import type { SceneGraph, SceneNode, SceneEdge, SceneGroup } from './types'
import { applyStepActionsUpTo, computeTopologyAtStep } from '../step-engine'
import { computeLayout } from '../layout'

/**
 * Compute the full scene graph at a given step index.
 * Pure and synchronous — no side effects, no caching.
 * Caching is handled by Scene Runtime (Phase 23).
 */
export function computeSceneGraphAtStep(
  scene: Scene,
  stepIndex: number
): SceneGraph {
  // 1. Which visuals exist at this step?
  const activeVisuals = computeTopologyAtStep(scene.visuals, scene.steps, stepIndex)

  // 2. What is each visual's state at this step?
  const stateMap = applyStepActionsUpTo(scene.visuals, scene.steps, stepIndex)

  const nodes = new Map<string, SceneNode>()
  const edges = new Map<string, SceneEdge>()
  const groups = new Map<string, SceneGroup>()

  for (const visual of activeVisuals) {
    const state = stateMap.get(visual.id) ?? (visual.initialState as Record<string, unknown>)

    // 3. Compute layout for this visual (synchronous)
    const layoutResult = computeLayout({
      visual,
      state,
      layoutHint: visual.layoutHint,
    })

    // 4. Register positioned nodes
    for (const posNode of layoutResult.nodes) {
      nodes.set(posNode.id, {
        id: posNode.id,
        type: visual.type,
        groupId: visual.id,
        x: posNode.x,
        y: posNode.y,
        width: posNode.width,
        height: posNode.height,
        state,
        highlight: (state as any)?.highlight,
      })
    }

    // 5. Register routed edges
    for (const posEdge of layoutResult.edges) {
      edges.set(posEdge.id, {
        id: posEdge.id,
        from: posEdge.from,
        to: posEdge.to,
        label: posEdge.label,
        waypoints: posEdge.waypoints,
      })
    }

    // 6. Register group with bounding box
    // LayoutResult.boundingBox is { minX, minY, maxX, maxY }
    // SceneGroup.bbox is { x, y, width, height } for CSS absolute positioning
    const bb = layoutResult.boundingBox
    groups.set(visual.id, {
      id: visual.id,
      nodeIds: layoutResult.nodes.map(n => n.id),
      bbox: {
        x: bb.minX,
        y: bb.minY,
        width: bb.maxX - bb.minX,
        height: bb.maxY - bb.minY,
      },
    })
  }

  return { nodes, edges, groups, stepIndex }
}
```

---

### 3. `packages/scene-engine/src/scene-graph/diff.ts` — New file

```typescript
import type { SceneGraph, SceneGraphDiff, SceneNode, SceneEdge } from './types'

/**
 * Diff two scene graphs to produce an add/remove/move/change set.
 * Used by the DOMRenderer (Phase 27) to drive targeted animations:
 *   added → scale-in animation
 *   removed → scale-out animation
 *   moved → FLIP position animation
 *   changed → color/highlight in-place animation
 */
export function diffSceneGraphs(prev: SceneGraph, next: SceneGraph): SceneGraphDiff {
  const added: SceneNode[] = []
  const removed: SceneNode[] = []
  const moved: SceneGraphDiff['moved'] = []
  const changed: SceneGraphDiff['changed'] = []

  for (const [id, nextNode] of next.nodes) {
    const prevNode = prev.nodes.get(id)
    if (!prevNode) {
      added.push(nextNode)
      continue
    }

    const positionChanged = prevNode.x !== nextNode.x || prevNode.y !== nextNode.y
    // State compare: JSON is fast for the small state objects we carry
    const stateChanged = JSON.stringify(prevNode.state) !== JSON.stringify(nextNode.state)

    if (positionChanged) {
      moved.push({ prev: prevNode, next: nextNode })
    } else if (stateChanged) {
      changed.push({ prev: prevNode, next: nextNode })
    }
  }

  for (const [id, prevNode] of prev.nodes) {
    if (!next.nodes.has(id)) {
      removed.push(prevNode)
    }
  }

  const addedEdges: SceneEdge[] = [...next.edges.values()].filter(e => !prev.edges.has(e.id))
  const removedEdges: SceneEdge[] = [...prev.edges.values()].filter(e => !next.edges.has(e.id))

  return { added, removed, moved, changed, addedEdges, removedEdges }
}
```

---

### 4. `packages/scene-engine/src/scene-graph/index.ts` — New file

```typescript
export { computeSceneGraphAtStep } from './compute'
export { diffSceneGraphs } from './diff'
export type {
  SceneNode,
  SceneEdge,
  SceneGroup,
  SceneGraph,
  SceneGraphDiff,
} from './types'
```

---

### 5. `packages/scene-engine/src/index.ts` — Edit: export scene-graph

```typescript
// Scene Graph
export {
  computeSceneGraphAtStep,
  diffSceneGraphs,
} from './scene-graph'
export type {
  SceneNode,
  SceneEdge,
  SceneGroup,
  SceneGraph,
  SceneGraphDiff,
} from './scene-graph'
```

---

### 6. `apps/web/src/hooks/useSceneGraph.ts` — New file

A thin React wrapper. Caching and ELK subscriptions are added in Phase 23 and Phase 28 respectively. At this phase, the hook is a plain `useMemo`.

```typescript
import { useMemo } from 'react'
import { computeSceneGraphAtStep } from '@insyte/scene-engine'
import type { Scene, SceneGraph } from '@insyte/scene-engine'

/**
 * Compute the scene graph at the current step index.
 * Phase 23 wraps this in useSceneRuntime() with LRU caching + prefetch.
 * Phase 28 adds ELK-ready subscription to invalidate cache on layout upgrade.
 */
export function useSceneGraph(scene: Scene | null, stepIndex: number): SceneGraph | null {
  return useMemo(() => {
    if (!scene) return null
    return computeSceneGraphAtStep(scene, stepIndex)
  }, [scene, stepIndex])
}
```

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `packages/scene-engine/src/scene-graph/types.ts` | New | SceneNode, SceneEdge, SceneGroup, SceneGraph, SceneGraphDiff |
| `packages/scene-engine/src/scene-graph/compute.ts` | New | `computeSceneGraphAtStep` — imports from step-engine + layout |
| `packages/scene-engine/src/scene-graph/diff.ts` | New | `diffSceneGraphs` — add/remove/move/change categorization |
| `packages/scene-engine/src/scene-graph/index.ts` | New | Barrel exports |
| `packages/scene-engine/src/index.ts` | Edit | Export scene-graph module |
| `apps/web/src/hooks/useSceneGraph.ts` | New | React wrapper (plain useMemo; caching added Phase 23) |

---

## Design Notes

**Pure synchronous contract.** `computeSceneGraphAtStep` has no async operations, no side effects, no caching. This makes it trivially testable and composable. Phase 23 (Scene Runtime) adds LRU caching on top. Phase 28 (ELK) adds an async layout upgrade signal. Neither change touches the core `compute.ts`.

**Node ID stability.** Node IDs come from the layout engine's `PositionedNode.id`, which tracks from the visual's data IDs (e.g., array slot indices, tree node IDs). These must be stable across steps for Framer Motion `layoutId` FLIP animations to work. The layout engine (Phase 20) is responsible for generating stable IDs.

**Group-level rendering.** The DOMRenderer (Phase 27) renders one `<motion.div>` per **group**, not per node. The group's `bbox` provides the absolute position. Inside the group, the primitive component handles internal layout (SVG viewBox for graph/tree, DOM for array/stack/etc.).

**Diff is optional.** `diffSceneGraphs` is used by the animation system (Phase 27) only. Renderers that don't animate can consume `SceneGraph` directly without diffing.
