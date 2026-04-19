'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, FastForward, RotateCcw, ChevronDown } from 'lucide-react'
import type { SceneType } from '@insyte/scene-engine'
import { usePlayground, STAGE_NAMES, STAGE_MODEL_LABELS } from './usePlayground'
import { StageCard } from './StageCard'

// ─── Mode options ─────────────────────────────────────────────────────────────

const MODE_OPTIONS: { value: SceneType | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'concept', label: 'Concept' },
  { value: 'dsa-trace', label: 'DSA' },
  { value: 'lld', label: 'LLD' },
  { value: 'hld', label: 'HLD' },
]

// ─── Arrow between stage cards ────────────────────────────────────────────────

function StageArrow() {
  return (
    <div className="flex justify-center py-0.5">
      <ChevronDown className="h-4 w-4 text-outline-variant/40" />
    </div>
  )
}

// ─── Pipeline page ────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const router = useRouter()
  const {
    topic,
    setTopic,
    mode,
    setMode,
    stages,
    isAnyRunning,
    runAll,
    runFromLocked,
    runStage,
    toggleLock,
    saveEdit,
    resetAll,
  } = usePlayground()

  const handleOpenInStudio = useCallback(() => {
    const assemblyOutput = stages[5]?.output
    if (!assemblyOutput) return
    // Pass the assembled scene to the Scene Studio via sessionStorage
    try {
      const result = assemblyOutput as { scene?: unknown }
      sessionStorage.setItem(
        'dev:scene-studio',
        JSON.stringify(result.scene ?? assemblyOutput),
      )
    } catch {
      sessionStorage.setItem('dev:scene-studio', JSON.stringify(assemblyOutput))
    }
    router.push('/dev/scene')
  }, [stages, router])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      {/* ── Page header ── */}
      <div className="space-y-1">
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">
          Pipeline Playground
        </h1>
        <p className="text-sm text-on-surface-variant">
          Run, inspect, lock, and replay individual AI pipeline stages.
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-5 space-y-4">
        {/* Topic + Mode inputs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (e.g. Binary Search, LRU Cache, DNS Resolution)"
            className="flex-1 rounded border border-outline-variant/30 bg-surface-container-highest px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/40 focus:outline-none transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isAnyRunning && topic.trim()) runAll()
            }}
          />
          <div className="relative">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as SceneType | 'auto')}
              className="appearance-none rounded border border-outline-variant/30 bg-surface-container-highest px-4 py-2.5 pr-8 text-sm text-on-surface focus:border-primary/40 focus:outline-none transition-colors cursor-pointer"
            >
              {MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
          </div>
        </div>

        {/* Run buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            type="button"
            onClick={runAll}
            disabled={isAnyRunning || !topic.trim()}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 rounded bg-primary/10 border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4" />
            Run All
          </motion.button>

          <motion.button
            type="button"
            onClick={runFromLocked}
            disabled={isAnyRunning || !topic.trim()}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 rounded border border-outline-variant/30 bg-surface-container px-5 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FastForward className="h-4 w-4" />
            Run from Locked
          </motion.button>

          <button
            type="button"
            onClick={resetAll}
            disabled={isAnyRunning}
            className="ml-auto flex items-center gap-1.5 rounded border border-outline-variant/20 px-3 py-2.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        {/* Hint text */}
        <p className="text-[11px] text-on-surface-variant/60">
          Lock a stage to freeze its output — downstream re-runs use the locked data as input.
          Edit a locked stage to test prompt changes without re-running upstream stages.
        </p>
      </div>

      {/* ── Stage cards ── */}
      <div>
        {stages.map((stage, n) => (
          <div key={n}>
            {n > 0 && <StageArrow />}
            <StageCard
              stageNum={n}
              name={STAGE_NAMES[n] ?? `Stage ${n}`}
              model={STAGE_MODEL_LABELS[n] ?? ''}
              state={stage}
              isAnyRunning={isAnyRunning}
              upstreamValues={Object.fromEntries(
                stages.slice(0, n).map((s, i) => [i, s.editedJson ?? ''])
              )}
              onRun={() => runStage(n)}
              onToggleLock={() => toggleLock(n)}
              onSaveEdit={(json) => saveEdit(n, json)}
              onSetInput={(upstreamN, value) => saveEdit(upstreamN, value)}
              onOpenInStudio={n === 5 ? handleOpenInStudio : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
