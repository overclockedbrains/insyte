'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBoundStore } from '@/src/stores/store'
import { useStreamScene } from '@/src/engine/hooks/useStreamScene'
import { SimulationLayout } from '@/src/engine/SimulationLayout'
import { StreamingError } from './StreamingError'
import { StreamingSkeleton } from './StreamingSkeleton'

// ─── StreamingView ────────────────────────────────────────────────────────────
// Orchestrates the AI streaming flow for a slug page.
//
// States (in order of priority):
//   error   → StreamingError   (generation failed, no scene)
//   scene   → SimulationLayout (at least a partial scene is ready)
//   default → StreamingSkeleton (waiting for first fields to arrive)

interface StreamingViewProps {
  topic: string
  slug: string
}

export function StreamingView({ topic, slug }: StreamingViewProps) {
  const { isStreaming, streamedFields, error, startStreaming, retry, abort } = useStreamScene()
  const activeScene = useBoundStore((s) => s.activeScene)
  const setTotalSteps = useBoundStore((s) => s.setTotalSteps)
  const reset = useBoundStore((s) => s.reset)

  // Start streaming on mount; abort on unmount to prevent stale completions
  // from a cancelled stream (e.g. StrictMode double-invoke) calling setScene.
  useEffect(() => {
    startStreaming(topic, slug)
    return () => abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, slug])

  // Sync step count to playback store whenever steps are promoted
  useEffect(() => {
    if (activeScene?.steps?.length) {
      setTotalSteps(activeScene.steps.length)
      reset()
    }
  }, [activeScene?.steps?.length, setTotalSteps, reset])

  if (error && !isStreaming && !activeScene) {
    return <StreamingError topic={topic} error={error} onRetry={retry} />
  }

  if (activeScene) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="simulation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <SimulationLayout scene={activeScene} />

          {/* Subtle retrying banner — shown when a retry is in-flight over an existing scene */}
          {isStreaming && error && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-container-high border border-outline-variant/30 text-xs text-on-surface-variant">
              {error}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <StreamingSkeleton
      topic={topic}
      isStreaming={isStreaming}
      streamedFields={streamedFields}
      error={error}
    />
  )
}
