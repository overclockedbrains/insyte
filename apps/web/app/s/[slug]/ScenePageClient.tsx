'use client'

import { useEffect, useCallback } from 'react'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { SimulationLayout } from '@/src/engine/SimulationLayout'
import { StreamingView } from '@/components/simulation/StreamingView'
import { DSAPipelineView } from './DSAPipelineView'

// ─── ScenePageClient ──────────────────────────────────────────────────────────
// Client boundary for the simulation page.
//
// Two modes:
//   1. scene provided  → load into store, render SimulationLayout immediately
//   2. scene = null    → start AI streaming, show skeleton → fill-in → SimulationLayout

interface ScenePageClientProps {
  scene: Scene | null
  /** Original topic text — used as the AI generation prompt (streaming mode only) */
  topic?: string
  /** The URL slug — passed through for bookmark + context */
  slug?: string
  isDSAMode?: boolean
  dsaLanguage?: 'python' | 'javascript'
}

// ─── Static mode (pre-built or cached scene) ──────────────────────────────────

function StaticScene({ scene }: { scene: Scene }) {
  const setScene = useBoundStore((s) => s.setScene)
  const clearScene = useBoundStore((s) => s.clearScene)
  const setTotalSteps = useBoundStore((s) => s.setTotalSteps)
  const setExpanded = useBoundStore((s) => s.setExpanded)
  const reset = useBoundStore((s) => s.reset)

  useEffect(() => {
    setScene(scene)
    setTotalSteps(scene.steps.length)
    reset()
    setExpanded(false)

    return () => {
      clearScene()
      setTotalSteps(0)
      reset()
      setExpanded(false)
    }
  }, [scene, setScene, clearScene, setTotalSteps, reset, setExpanded])

  return <SimulationLayout scene={scene} />
}

// ─── ScenePageClient ──────────────────────────────────────────────────────────

export function ScenePageClient({
  scene,
  topic,
  slug,
  isDSAMode = false,
  dsaLanguage = 'python',
}: ScenePageClientProps) {
  const clearScene = useBoundStore((s) => s.clearScene)
  const reset = useBoundStore((s) => s.reset)
  const setExpanded = useBoundStore((s) => s.setExpanded)
  const setTotalSteps = useBoundStore((s) => s.setTotalSteps)

  // Clean up store on unmount regardless of mode
  const cleanup = useCallback(() => {
    clearScene()
    setTotalSteps(0)
    reset()
    setExpanded(false)
  }, [clearScene, setTotalSteps, reset, setExpanded])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  if (scene) {
    return <StaticScene scene={scene} />
  }

  if (isDSAMode && slug) {
    return <DSAPipelineView slug={slug} languageHint={dsaLanguage} />
  }

  // Streaming mode: topic is the AI prompt, slug is the URL slug
  return (
    <StreamingView
      topic={topic ?? slug ?? 'unknown topic'}
      slug={slug ?? ''}
    />
  )
}
