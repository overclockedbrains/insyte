import { useMemo, useEffect, useState } from 'react'
import { computeSceneGraphAtStep, LRUCache, subscribeELKReady } from '@insyte/scene-engine'
import type { Scene, SceneGraph } from '@insyte/scene-engine'

const CACHE_CAPACITY = 50   // 50 steps ~ typical visualization length

/**
 * Cached scene graph access for a scene at a given step.
 *
 * - LRU cache (50 entries): avoids recomputing steps already visited.
 * - requestIdleCallback prefetch: pre-computes steps N+1 and N-1 during idle time.
 * - Cache is cleared when the scene identity changes (new generation).
 * - elkVersion (Phase 28): when the ELK worker finishes upgrading a layout,
 *   this bumps elkVersion which forces a new LRU cache instance, invalidating
 *   all cached scene graphs so they are recomputed with the ELK layout.
 */
export function useSceneRuntime(
  scene: Scene | null,
  stepIndex: number
): { sceneGraph: SceneGraph | null } {
  // Phase 28: ELK layout upgrade signal.
  // Bumped by subscribeELKReady; causes the cache and sceneGraph to recompute.
  const [elkVersion, setElkVersion] = useState(0)

  // LRU cache: stepIndex → SceneGraph
  // Recreated when scene identity OR ELK version changes.
  // Keying on elkVersion means the cache is silently discarded (and all steps
  // recomputed) whenever the ELK worker delivers a higher-quality layout.
  const cache = useMemo(
    () => new LRUCache<number, SceneGraph>(CACHE_CAPACITY),
    // elkVersion is intentionally in the dep array to invalidate on ELK upgrade
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene, elkVersion],
  )

  // Subscribe to ELK layout upgrades for scenes that contain system-diagram
  // or elk-layered graph visuals.  When ELK resolves, clear step cache and
  // re-render with orthogonal-routed layout.
  useEffect(() => {
    const hasELKVisual = scene?.visuals.some(
      v => v.type === 'system-diagram' || v.layoutHint === 'elk-layered' || v.layoutHint === 'elk-radial'
    )
    if (!hasELKVisual) return

    return subscribeELKReady(() => setElkVersion(v => v + 1))
  }, [scene])

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
