'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { parseScene } from '@insyte/scene-engine'
import { computeVisualStateAtStep } from '@insyte/scene-engine'
import { DotGridBackground } from '@/components/layout/DotGridBackground'
import { ScenePlayerProvider } from '@/components/engine/ScenePlayerProvider'
import { PrimitiveRegistry } from '@/src/engine/primitives'
import { StepPopup } from '@/src/engine/annotations/StepPopup'
import { usePlayerStore } from '@/src/stores/player-store'
import { usePlaybackTick } from '@/src/engine/hooks/usePlayback'
import hashTablesJson from '@/src/content/scenes/concepts/hash-tables.json'

// Parse once at module level — static file is always valid
const hashTableScene = parseScene(hashTablesJson)

// ─── AutoPlayLoop ─────────────────────────────────────────────────────────────
// Must live inside ScenePlayerProvider so it reads from the isolated context.

function AutoPlayLoop() {
  const play = usePlayerStore((s) => s.play)
  const reset = usePlayerStore((s) => s.reset)
  const currentStep = usePlayerStore((s) => s.currentStep)
  const totalSteps = usePlayerStore((s) => s.totalSteps)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  // Start playing on mount
  useEffect(() => {
    play()
  }, [play])

  // Loop back when we reach the last step
  useEffect(() => {
    if (totalSteps > 0 && currentStep >= totalSteps - 1 && !isPlaying) {
      const timer = setTimeout(() => {
        reset()
        play()
      }, 1200) // brief pause before looping
      return () => clearTimeout(timer)
    }
  }, [currentStep, totalSteps, isPlaying, reset, play])

  // Drive the tick
  usePlaybackTick()

  return null
}

// ─── DemoCanvas ───────────────────────────────────────────────────────────────
// Renders the canvas primitives only — no PlaybackControls, no explanation panel.
// Must live inside ScenePlayerProvider to read from the isolated store.

function DemoCanvas() {
  const currentStep = usePlayerStore((s) => s.currentStep)
  const scene = hashTableScene

  const textBadges = scene.visuals.filter((v) => v.type === 'text-badge')
  const counters = scene.visuals.filter((v) => v.type === 'counter')
  const canvasVisuals = scene.visuals.filter(
    (v) => v.type !== 'text-badge' && v.type !== 'counter',
  )
  const hasHud = textBadges.length > 0 || counters.length > 0
  const useAbsoluteLayout = canvasVisuals.some((v) => v.position != null)

  const visiblePopups = scene.popups.filter(
    (p) =>
      currentStep >= p.showAtStep &&
      (p.hideAtStep === undefined || currentStep < p.hideAtStep),
  )

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Dot grid background */}
      <div className="absolute inset-0 pointer-events-none">
        <DotGridBackground opacity={0.25} />
      </div>

      {/* HUD row — text badges + counters */}
      {hasHud && (
        <div className="relative z-20 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pt-2 pb-1.5 pointer-events-none flex-shrink-0 border-b border-outline-variant/10">
          {textBadges.map((visual) => {
            const Comp = PrimitiveRegistry[visual.type]
            if (!Comp) return null
            const state = computeVisualStateAtStep(scene, visual.id, currentStep)
            return <Comp key={visual.id} id={visual.id} state={state} step={currentStep} label={visual.label} />
          })}
          {counters.length > 0 && (
            <div className="flex items-center gap-3 ml-auto">
              {counters.map((visual) => {
                const Comp = PrimitiveRegistry[visual.type]
                if (!Comp) return null
                const state = computeVisualStateAtStep(scene, visual.id, currentStep)
                return <Comp key={visual.id} id={visual.id} state={state} step={currentStep} label={visual.label} />
              })}
            </div>
          )}
        </div>
      )}

      {/* Main canvas area */}
      <div className="relative flex-1 min-h-0 overflow-hidden z-10">
        {useAbsoluteLayout ? (
          <div className="relative w-full h-full min-h-[200px]">
            {canvasVisuals.map((visual) => {
              const Comp = PrimitiveRegistry[visual.type]
              if (!Comp) return null
              const state = computeVisualStateAtStep(scene, visual.id, currentStep)
              const pos = visual.position ?? { x: 50, y: 50 }
              return (
                <div
                  key={visual.id}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    maxWidth: '260px',
                    width: '100%',
                  }}
                >
                  {visual.label && (
                    <div className="text-[9px] font-mono uppercase tracking-widest text-on-surface-variant/50 mb-0.5 text-center select-none">
                      {visual.label}
                    </div>
                  )}
                  <Comp id={visual.id} state={state} step={currentStep} label={visual.label} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="relative w-full h-full p-3 flex flex-col items-center justify-center gap-3">
            {canvasVisuals.map((visual) => {
              const Comp = PrimitiveRegistry[visual.type]
              if (!Comp) return null
              const state = computeVisualStateAtStep(scene, visual.id, currentStep)
              return (
                <div key={visual.id} className="flex flex-col items-center w-full">
                  {visual.label && (
                    <div className="text-[9px] font-mono uppercase tracking-widest text-on-surface-variant/50 mb-0.5 text-center select-none">
                      {visual.label}
                    </div>
                  )}
                  <Comp id={visual.id} state={state} step={currentStep} label={visual.label} />
                </div>
              )
            })}
          </div>
        )}

        {/* Step popups */}
        {visiblePopups.map((popup) => {
          const pos = popup.anchor ?? { x: 50, y: 70 }
          return (
            <div
              key={popup.id}
              className="absolute z-30 pointer-events-none"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)' }}
            >
              <StepPopup text={popup.text} style={popup.style} visible={true} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── LiveDemo ─────────────────────────────────────────────────────────────────

interface LiveDemoProps {
  compact?: boolean
}

export function LiveDemo({ compact = false }: LiveDemoProps) {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-primary/20 bg-surface-container"
      style={{ boxShadow: '0 0 40px rgba(183,159,255,0.12)' }}
    >
      <ScenePlayerProvider scene={hashTableScene}>
        {/* Drives auto-play + loop */}
        <AutoPlayLoop />

        {/* Canvas scaled down to fit hero column */}
        <div
          className="relative w-full overflow-hidden"
          style={compact ? { height: '200px' } : { aspectRatio: '16/11' }}
        >
          <DemoCanvas />
        </div>
      </ScenePlayerProvider>

      {/* CTA overlay — bottom-right */}
      <div className="absolute bottom-3 right-3 z-20">
        <Link
          href="/s/hash-tables"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-highest/90 border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-150 backdrop-blur-sm"
        >
          Try it yourself →
        </Link>
      </div>

      {/* Top label */}
      <div className="absolute top-3 left-3 z-20">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-surface-container-high/80 border border-outline-variant/20 text-on-surface-variant backdrop-blur-sm">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
          </span>
          Live Demo
        </span>
      </div>
    </div>
  )
}
