'use client'

import type { Scene } from '@insyte/scene-engine'
import { DotGridBackground } from '@/components/layout/DotGridBackground'
import { PlaybackControls } from './controls/PlaybackControls'

import { usePlayback } from './hooks/usePlayback'
import { computeVisualStateAtStep } from '@insyte/scene-engine'
import { PrimitiveRegistry } from './primitives'
import { ExplanationPanel } from './annotations/ExplanationPanel'
import { CodePanel } from './annotations/CodePanel'
import { StepPopup } from './annotations/StepPopup'

// ─── Layout stubs ─────────────────────────────────────────────────────────────
// Full layout components are implemented in Phase 4.
// These stubs establish the panel proportions so SceneRenderer renders correctly.

function TextLeftCanvasRight({ scene }: { scene: Scene }) {
  const { currentStep } = usePlayback()
  return (
    <div className="flex h-full w-full">
      {/* Left panel — 35% — explanation text */}
      <ExplanationPanel sections={scene.explanation} currentStep={currentStep} />

      {/* Right panel — 65% — canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        <CanvasArea scene={scene} />
      </div>
    </div>
  )
}

function CodeLeftCanvasRight({ scene }: { scene: Scene }) {
  const { currentStep } = usePlayback()
  return (
    <div className="flex h-full w-full">
      {/* Left panel — 35% — code view */}
      {scene.code ? (
        <CodePanel code={scene.code} currentStep={currentStep} />
      ) : (
        <div className="w-[35%] min-w-0 overflow-y-auto p-6 border-r border-outline-variant/20 bg-surface-container-lowest">
          <p className="text-sm text-on-surface-variant">No code attached.</p>
        </div>
      )}

      {/* Right panel — 65% — canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        <CanvasArea scene={scene} />
      </div>
    </div>
  )
}

function CanvasOnly({ scene }: { scene: Scene }) {
  return (
    <div className="w-full h-full flex flex-col">
      <CanvasArea scene={scene} />
    </div>
  )
}

// ─── Canvas area ──────────────────────────────────────────────────────────────

function CanvasArea({ scene }: { scene: Scene }) {
  const { currentStep } = usePlayback()
  
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      {/* Dot grid background */}
      <div className="absolute inset-0 pointer-events-none">
        <DotGridBackground opacity={0.3} />
      </div>

      {/* Visual primitives */}
      <div className="relative z-10 flex-1 w-full h-full p-6 pt-16 flex flex-col items-center overflow-auto justify-start">
        {scene.visuals.map((visual) => {
          const PrimitiveComponent = PrimitiveRegistry[visual.type]
          if (!PrimitiveComponent) return null

          const state = computeVisualStateAtStep(scene, visual.id, currentStep)
          
          return (
            <PrimitiveComponent
              key={visual.id}
              id={visual.id}
              state={state}
              step={currentStep}
            />
          )
        })}

        {scene.visuals.length === 0 && (
          <div className="text-sm text-on-surface-variant italic mt-10">
            No visuals defined in this scene.
          </div>
        )}
        
        {/* Render popups targeting step */}
        {scene.popups
          .filter(p => currentStep >= p.showAtStep && (p.hideAtStep === undefined || currentStep < p.hideAtStep))
          .map((popup) => (
            <StepPopup
              key={popup.id}
              text={popup.text}
              style={popup.style}
              visible={true}
            />
          ))
        }
      </div>

      {/* Playback controls */}
      <div className="relative z-10 p-4">
        <PlaybackControls />
      </div>
    </div>
  )
}

// ─── SceneRenderer ────────────────────────────────────────────────────────────

interface SceneRendererProps {
  scene: Scene
}

export function SceneRenderer({ scene }: SceneRendererProps) {
  switch (scene.layout) {
    case 'text-left-canvas-right':
      return <TextLeftCanvasRight scene={scene} />

    case 'code-left-canvas-right':
      return <CodeLeftCanvasRight scene={scene} />

    case 'canvas-only':
    default:
      return <CanvasOnly scene={scene} />
  }
}
