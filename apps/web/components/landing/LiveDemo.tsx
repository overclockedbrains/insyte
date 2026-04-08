'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { parseScene } from '@insyte/scene-engine'
import { computeVisualStateAtStep } from '@insyte/scene-engine'
import { DotGridBackground } from '@/components/layout/DotGridBackground'
import { PrimitiveRegistry } from '@/src/engine/primitives'
import { StepPopup } from '@/src/engine/annotations/StepPopup'
import hashTablesJson from '@/src/content/scenes/concepts/hash-tables.json'

// Parse once at module level — static file is always valid
const hashTableScene = parseScene(hashTablesJson)
const HERO_VISUAL_ORDER = ['bucket-array', 'hash-map'] as const

// ─── DemoCanvas ───────────────────────────────────────────────────────────────
// Renders the canvas primitives only — no PlaybackControls, no explanation panel.

function DemoCanvas({ currentStep }: { currentStep: number }) {
  const scene = hashTableScene

  const textBadges = scene.visuals.filter((v) => v.type === 'text-badge')
  const counters = scene.visuals.filter((v) => v.type === 'counter')
  const canvasVisuals = scene.visuals.filter(
    (v) => v.type !== 'text-badge' && v.type !== 'counter',
  )
  const hasHud = textBadges.length > 0 || counters.length > 0
  const useAbsoluteLayout = canvasVisuals.some((v) => v.position != null)
  const useHeroStackedLayout =
    canvasVisuals.length === HERO_VISUAL_ORDER.length &&
    HERO_VISUAL_ORDER.every((id) => canvasVisuals.some((visual) => visual.id === id))

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
        {useHeroStackedLayout ? (
          <div className="relative flex h-full flex-col items-center justify-center gap-5 px-4 pb-6 pt-5 sm:gap-6 sm:px-6 sm:pt-6">
            {HERO_VISUAL_ORDER.map((visualId) => {
              const visual = canvasVisuals.find((candidate) => candidate.id === visualId)
              if (!visual) return null

              const Comp = PrimitiveRegistry[visual.type]
              if (!Comp) return null

              const state = computeVisualStateAtStep(scene, visual.id, currentStep)
              const widthClass =
                visual.id === 'bucket-array'
                  ? 'w-full max-w-[520px]'
                  : 'w-full max-w-[320px] sm:max-w-[360px]'

              return (
                <div key={visual.id} className={`flex flex-col items-center ${widthClass}`}>
                  {visual.label && (
                    <div className="mb-1 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-on-surface-variant/55 select-none">
                      {visual.label}
                    </div>
                  )}
                  <Comp id={visual.id} state={state} step={currentStep} label={visual.label} />
                </div>
              )
            })}
          </div>
        ) : useAbsoluteLayout ? (
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
        {visiblePopups.length > 0 && (
          <div className="pointer-events-none absolute left-3 top-3 z-30 flex max-w-[200px] flex-col gap-2 sm:left-4 sm:top-4 sm:max-w-[220px]">
            {visiblePopups.map((popup) => (
              <StepPopup key={popup.id} text={popup.text} style={popup.style} visible={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── LiveDemo ─────────────────────────────────────────────────────────────────

interface LiveDemoProps {
  compact?: boolean
}

export function LiveDemo({ compact = false }: LiveDemoProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const totalSteps = hashTableScene.steps.length

  useEffect(() => {
    if (totalSteps <= 1) return

    const isLastStep = currentStep >= totalSteps - 1
    const timeoutMs = isLastStep
      ? 1200
      : Math.max(900, hashTableScene.steps[currentStep]?.duration ?? 1800)

    const timer = window.setTimeout(() => {
      setCurrentStep((step) => (step >= totalSteps - 1 ? 0 : step + 1))
    }, timeoutMs)

    return () => window.clearTimeout(timer)
  }, [currentStep, totalSteps])

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-primary/20 bg-surface-container"
      style={{ boxShadow: '0 0 40px rgba(183,159,255,0.12)' }}
    >
      {/* Canvas scaled down to fit hero column */}
      <div
        className="relative w-full overflow-hidden"
        style={compact ? { height: '200px' } : { aspectRatio: '16/11' }}
      >
        <DemoCanvas currentStep={currentStep} />
      </div>

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
