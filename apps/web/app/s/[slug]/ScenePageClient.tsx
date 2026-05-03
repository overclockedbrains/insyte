'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { SimulationLayout } from '@/src/engine/SimulationLayout'
import { StreamingView } from '@/components/simulation/StreamingView'
import { PreGenView } from '@/components/simulation/PreGenView'
import type { PreGenState } from '@/components/simulation/PreGenView'
import type { GenerationConfig } from '@/src/engine/hooks/useStreamScene'
import { DSAPipelineView } from './DSAPipelineView'

// ─── ScenePageClient ──────────────────────────────────────────────────────────

interface ScenePageClientProps {
  scene: Scene | null
  topic?: string
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
    setTotalSteps(scene.steps.length + 1)
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

// ─── Streaming mode with pre-gen gate ────────────────────────────────────────

function StreamingGate({ topic, slug }: { topic: string; slug: string }) {
  const [preGenState, setPreGenState] = useState<PreGenState>({
    status: 'loading',
    mode: null,
    questions: [],
    depth: 'standard',
    familiarity: 'basics',
    answers: [],
  })
  const [genConfig, setGenConfig] = useState<GenerationConfig | null>(null)
  const hasFetchedRef = useRef(false)

  // Fire pre-gen on mount
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    void fetch('/api/pre-gen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    })
      .then((r) => r.json())
      .then((data: { mode: 'concept' | 'dsa-trace' | 'lld' | 'hld'; questions: string[] }) => {
        setPreGenState((prev) => ({
          ...prev,
          status: 'ready',
          mode: data.mode ?? 'concept',
          questions: data.questions ?? [],
        }))
      })
      .catch(() => {
        // Pre-gen failed gracefully — show no questions, default mode
        setPreGenState((prev) => ({ ...prev, status: 'ready', mode: 'concept', questions: [] }))
      })
  }, [topic])

  const handleGenerate = useCallback(() => {
    const config: GenerationConfig = {
      mode: preGenState.mode ?? 'concept',
      depth: preGenState.depth,
      familiarity: preGenState.familiarity,
      answers: preGenState.answers.filter(Boolean),
    }
    setGenConfig(config)
  }, [preGenState])

  // Once user confirms — show StreamingView with the locked config
  if (genConfig) {
    return <StreamingView topic={topic} slug={slug} config={genConfig} />
  }

  return (
    <PreGenView
      topic={topic}
      state={preGenState}
      onDepthChange={(depth) => setPreGenState((s) => ({ ...s, depth }))}
      onFamiliarityChange={(familiarity) => setPreGenState((s) => ({ ...s, familiarity }))}
      onAnswerChange={(index, value) =>
        setPreGenState((s) => {
          const answers = [...s.answers]
          answers[index] = value
          return { ...s, answers }
        })
      }
      onModeChange={(mode) => setPreGenState((s) => ({ ...s, mode }))}
      onGenerate={handleGenerate}
    />
  )
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

  // No cached scene and not DSA — always show PreGenView so the user can configure
  // depth/familiarity before generation, whether they arrived fresh or via direct URL.
  return (
    <StreamingGate
      topic={topic ?? slug ?? 'unknown topic'}
      slug={slug ?? ''}
    />
  )
}
