'use client'

import { useEffect } from 'react'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { SceneRenderer } from '@/src/engine/SceneRenderer'

// ─── SimulationPageClient ─────────────────────────────────────────────────────
// Owns the store wiring: loads the scene into the global store on mount
// and cleans up on unmount.

interface Props {
  scene: Scene
}

export function SimulationPageClient({ scene }: Props) {
  const setScene = useBoundStore((s) => s.setScene)
  const clearScene = useBoundStore((s) => s.clearScene)
  const setTotalSteps = useBoundStore((s) => s.setTotalSteps)

  useEffect(() => {
    setScene(scene)
    setTotalSteps(scene.steps.length)
    return () => clearScene()
  }, [scene, setScene, clearScene, setTotalSteps])

  return (
    <div className="w-full h-full">
      <SceneRenderer scene={scene} />
    </div>
  )
}
