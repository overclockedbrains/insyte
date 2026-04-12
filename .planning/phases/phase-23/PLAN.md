# Phase 23 — Scene Runtime & Caching

**Goal:** Add a caching and coordination layer between the scene graph computation (Phase 22) and React. Introduces `LRUCache<K, V>`, a `useSceneRuntime()` hook that caches scene graphs per step with `requestIdleCallback` prefetch for adjacent steps, and `useCanvasDimensions()` for a stable canvas size reference. Prevents redundant `computeSceneGraphAtStep` calls on every render while keeping the step engine and scene graph layers pure.

**Source research:** `ARCHITECTURE_V3.md` Part 1 §1.4 (caching strategy), Phase 22 (SceneGraph compute — pure sync function to wrap), Phase 26 (ELK subscription wires into this layer in Phase 28)

**Estimated effort:** 2–3 days

**Prerequisite:** Phase 22 (scene graph — `computeSceneGraphAtStep` must exist before runtime can cache it)

---

## Why a Runtime Layer

`computeSceneGraphAtStep` is pure and fast (~1–5ms per call), but it runs on every React render. Under playback, the `stepIndex` changes 10–20× per second. Without caching:

1. At 2× speed: `computeSceneGraphAtStep` runs 20× per second × N visuals × M layout calls — measurable jank on complex scenes.
2. Scrubbing (user drags the step slider): rapid non-sequential step changes without caching means layout is recomputed for every intermediate step the slider passes through.
3. Adjacent steps (N±1) are always likely to be visited next — prefetching them in idle time makes step transitions imperceptibly fast.

The runtime layer solves all three by caching computed graphs in an LRU structure and pre-computing ±1 steps during idle time.

---

## What Actually Changes

### 1. `packages/scene-engine/src/runtime/cache.ts` — New file

```typescript
/**
 * LRU cache with a fixed capacity.
 * On access, the entry is moved to the "most recently used" end.
 * When capacity is exceeded, the least recently used entry is evicted.
 *
 * Uses a single Map — Map maintains insertion order, so the first entry
 * is always the LRU entry.
 */
export class LRUCache<K, V> {
  private readonly capacity: number
  private readonly map: Map<K, V>

  constructor(capacity: number) {
    this.capacity = capacity
    this.map = new Map()
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined
    // Move to end: delete then re-insert
    const value = this.map.get(key)!
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      // Update existing — move to end
      this.map.delete(key)
    } else if (this.map.size >= this.capacity) {
      // Evict LRU (first entry)
      const lruKey = this.map.keys().next().value as K
      this.map.delete(lruKey)
    }
    this.map.set(key, value)
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}
```

---

### 2. `packages/scene-engine/src/runtime/index.ts` — New file

```typescript
export { LRUCache } from './cache'
```

---

### 3. `packages/scene-engine/src/index.ts` — Edit: export runtime

```typescript
// Runtime
export { LRUCache } from './runtime'
```

---

### 4. `apps/web/src/hooks/useSceneRuntime.ts` — New file

```typescript
import { useRef, useMemo, useEffect } from 'react'
import { computeSceneGraphAtStep, LRUCache } from '@insyte/scene-engine'
import type { Scene, SceneGraph } from '@insyte/scene-engine'

const CACHE_CAPACITY = 50   // 50 steps ~ typical visualization length

/**
 * Cached scene graph access for a scene at a given step.
 *
 * - LRU cache (50 entries): avoids recomputing steps already visited.
 * - requestIdleCallback prefetch: pre-computes steps N+1 and N-1 during idle time.
 * - Cache is cleared when the scene identity changes (new generation).
 *
 * Phase 28 (ELK) adds ELK-ready subscription: when the ELK worker finishes
 * upgrading a layout, this hook clears the cache and bumps elkVersion state
 * to trigger a re-render with the higher-quality layout.
 */
export function useSceneRuntime(
  scene: Scene | null,
  stepIndex: number
): { sceneGraph: SceneGraph | null } {
  // LRU cache: stepIndex → SceneGraph
  const cache = useRef(new LRUCache<number, SceneGraph>(CACHE_CAPACITY))

  // Clear cache when scene identity changes (new generation completed)
  const prevSceneRef = useRef<Scene | null>(null)
  if (prevSceneRef.current !== scene) {
    cache.current.clear()
    prevSceneRef.current = scene
  }

  // Compute scene graph for the current step (cache-first)
  const sceneGraph = useMemo(() => {
    if (!scene) return null

    if (cache.current.has(stepIndex)) {
      return cache.current.get(stepIndex)!
    }

    const graph = computeSceneGraphAtStep(scene, stepIndex)
    cache.current.set(stepIndex, graph)
    return graph
  }, [scene, stepIndex])

  // Prefetch adjacent steps during browser idle time
  useEffect(() => {
    if (!scene) return

    const prefetch = (idx: number) => {
      if (idx < 0 || idx >= scene.steps.length) return
      if (cache.current.has(idx)) return
      const graph = computeSceneGraphAtStep(scene, idx)
      cache.current.set(idx, graph)
    }

    const idleId = requestIdleCallback(() => {
      prefetch(stepIndex + 1)
      prefetch(stepIndex - 1)
    }, { timeout: 100 })   // 100ms deadline — don't delay if browser is consistently busy

    return () => cancelIdleCallback(idleId)
  }, [scene, stepIndex])

  return { sceneGraph }
}
```

---

### 5. `apps/web/src/hooks/useCanvasDimensions.ts` — New file

```typescript
import { useState, useEffect, useRef } from 'react'

interface CanvasDimensions {
  width: number
  height: number
}

/**
 * Track the pixel dimensions of the canvas container via ResizeObserver.
 * Returns a ref to attach to the container element + the current dimensions.
 *
 * Used by:
 *   - ViewportControls (Phase 29): zoom-to-fit needs container size.
 *   - useAutoFit (Phase 29): determines whether content overflows at 1x scale.
 *   - ELK layout (Phase 28): container size informs initial zoom level.
 */
export function useCanvasDimensions(): {
  ref: React.RefObject<HTMLDivElement>
  width: number
  height: number
} {
  const ref = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<CanvasDimensions>({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Capture initial size immediately
    setDims({ width: el.clientWidth, height: el.clientHeight })

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDims({ width, height })
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, ...dims }
}
```

---

### 6. Replace `useSceneGraph` with `useSceneRuntime` in `CanvasCard`

Phase 22 created a plain `useSceneGraph` hook. Phase 23 supersedes it with `useSceneRuntime`:

```typescript
// apps/web/src/components/CanvasCard.tsx — Phase 23 update
import { useSceneRuntime } from '../hooks/useSceneRuntime'
import { useCanvasDimensions } from '../hooks/useCanvasDimensions'
import { usePlaybackStore } from '../stores/playback-store'

export function CanvasCard({ scene }: { scene: Scene | null }) {
  const { stepIndex } = usePlaybackStore()
  const { ref: canvasRef, width, height } = useCanvasDimensions()
  const { sceneGraph } = useSceneRuntime(scene, stepIndex)

  return (
    <div ref={canvasRef} className="relative w-full h-full overflow-hidden">
      {sceneGraph && (
        <DOMRenderer sceneGraph={sceneGraph} stepIndex={stepIndex} />
      )}
    </div>
  )
}
```

`useSceneGraph.ts` from Phase 22 can be deleted or left as an internal utility — `useSceneRuntime` is the public-facing hook for components.

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `packages/scene-engine/src/runtime/cache.ts` | New | `LRUCache<K, V>` — 50-entry LRU with move-to-end on access |
| `packages/scene-engine/src/runtime/index.ts` | New | Barrel export |
| `packages/scene-engine/src/index.ts` | Edit | Export `LRUCache` from runtime |
| `apps/web/src/hooks/useSceneRuntime.ts` | New | Cached scene graph hook + `requestIdleCallback` prefetch |
| `apps/web/src/hooks/useCanvasDimensions.ts` | New | `ResizeObserver`-based canvas size tracking |
| `apps/web/src/components/CanvasCard.tsx` | Edit | Switch from `useSceneGraph` to `useSceneRuntime` |

---

## Design Notes

**`requestIdleCallback` timeout.** The `{ timeout: 100 }` option forces the callback to run within 100ms even if the browser is busy. Without it, a CPU-heavy animation frame could delay prefetch indefinitely, defeating the purpose for fast-click users.

**LRU capacity = 50.** A typical visualization has 8–12 steps; 50 covers 4× the longest expected visualization. Scrubbing generates at most `O(steps)` unique cache entries, so the LRU never evicts useful entries during a session.

**Phase 28 integration point.** When ELK upgrades a layout, `useSceneRuntime` must clear its cache and re-render. Phase 28 adds this by calling `cache.current.clear()` via a `subscribeELKReady` subscription, then incrementing an `elkVersion` state to trigger `useMemo` re-evaluation. The hook signature does not change — Phase 28 adds the subscription inside the hook body.

**`useCanvasDimensions` is a one-time stable ref.** The ResizeObserver is set up once on mount and cleaned up on unmount. Dimensions are in React state so re-renders propagate correctly to children that need the size (viewport fit, ELK layout constraints).
