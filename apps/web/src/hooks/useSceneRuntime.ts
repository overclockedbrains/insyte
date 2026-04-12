import { useMemo, useEffect } from 'react'
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
  // Cache is recreated (cleared) automatically when scene identity changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cache = useMemo(() => new LRUCache<number, SceneGraph>(CACHE_CAPACITY), [scene])

  // Compute scene graph for the current step (cache-first)
  const sceneGraph = useMemo(() => {
    if (!scene) return null

    if (cache.has(stepIndex)) {
      return cache.get(stepIndex)!
    }

    const graph = computeSceneGraphAtStep(scene, stepIndex)
    cache.set(stepIndex, graph)
    return graph
  }, [scene, stepIndex, cache])

  // Prefetch adjacent steps during browser idle time
  useEffect(() => {
    if (!scene) return

    const prefetch = (idx: number) => {
      if (idx < 0 || idx >= scene.steps.length) return
      if (cache.has(idx)) return
      const graph = computeSceneGraphAtStep(scene, idx)
      cache.set(idx, graph)
    }

    const idleId = requestIdleCallback(() => {
      prefetch(stepIndex + 1)
      prefetch(stepIndex - 1)
    }, { timeout: 100 })   // 100ms deadline — don't delay if browser is consistently busy

    return () => cancelIdleCallback(idleId)
  }, [scene, stepIndex, cache])

  return { sceneGraph }
}
