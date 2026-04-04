'use client'

import { useEffect } from 'react'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { SimulationLayout } from '@/src/engine/SimulationLayout'

// ─── ScenePageClient ──────────────────────────────────────────────────────────
// Client boundary for the simulation page.
// Responsibilities:
//   1. Load the scene into the global store on mount
//   2. Set totalSteps so PlaybackControls knows the range
//   3. Clean up (clearScene + reset expand) on unmount
//   4. Render SimulationLayout (the Phase 4 orchestrator)

interface ScenePageClientProps {
  scene: Scene
  slug: string
}

export function ScenePageClient({ scene, slug }: ScenePageClientProps) {
  const setScene = useBoundStore((s) => s.setScene)
  const clearScene = useBoundStore((s) => s.clearScene)
  const setTotalSteps = useBoundStore((s) => s.setTotalSteps)
  const setExpanded = useBoundStore((s) => s.setExpanded)
  const reset = useBoundStore((s) => s.reset)

  useEffect(() => {
    setScene(scene)
    setTotalSteps(scene.steps.length)
    reset()         // reset currentStep → 0, isPlaying → false
    setExpanded(false)

    return () => {
      clearScene()
      setTotalSteps(0)  // show "— / —" immediately after unmount
      reset()
      setExpanded(false)
    }
  }, [scene, setScene, clearScene, setTotalSteps, reset, setExpanded])

  return <SimulationLayout scene={scene} slug={slug} />
}
