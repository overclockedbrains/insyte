'use client'

import { useState, useEffect, useRef } from 'react'
import type { Scene } from '@insyte/scene-engine'
import {
  createPlayerStore,
  ScenePlayerContext,
  type PlayerStoreApi,
} from '@/src/stores/player-store'

// ─── ScenePlayerProvider ──────────────────────────────────────────────────────
//
// Creates a completely isolated Zustand store per mount.
// The store is seeded synchronously in the useState initializer so that child
// effects (like AutoPlayLoop.play()) see totalSteps > 0 on their first run.
//
// The useEffect handles scene prop *changes* after mount.

interface ScenePlayerProviderProps {
  scene: Scene
  children: React.ReactNode
}

export function ScenePlayerProvider({ scene, children }: ScenePlayerProviderProps) {
  const hasMountedRef = useRef(false)

  // Create store AND seed scene synchronously — one store per mount, never shared.
  const [store] = useState<PlayerStoreApi>(() => {
    const s = createPlayerStore()
    s.getState().setScene(scene)
    s.getState().setTotalSteps(scene.steps.length)
    // Do NOT reset here — leave currentStep at 0 and isPlaying at false so
    // AutoPlayLoop.play() can start cleanly on mount.
    return s
  })

  // Re-seed if the scene prop changes (e.g. parent swaps simulation)
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    store.getState().setScene(scene)
    store.getState().setTotalSteps(scene.steps.length)
    store.getState().reset()
  }, [scene, store])

  return (
    <ScenePlayerContext.Provider value={store}>
      {children}
    </ScenePlayerContext.Provider>
  )
}
