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
