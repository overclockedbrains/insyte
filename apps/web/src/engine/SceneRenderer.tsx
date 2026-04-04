'use client'

import type { Scene } from '@insyte/scene-engine'
import { DotGridBackground } from '@/components/layout/DotGridBackground'
import { PlaybackControls } from './controls/PlaybackControls'

// ─── Layout stubs ─────────────────────────────────────────────────────────────
// Full layout components are implemented in Phase 4.
// These stubs establish the panel proportions so SceneRenderer renders correctly.

function TextLeftCanvasRight({ scene }: { scene: Scene }) {
  return (
    <div className="flex h-full w-full">
      {/* Left panel — 35% — explanation text */}
      <div className="w-[35%] min-w-0 overflow-y-auto p-6 border-r border-outline-variant/20">
        <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4">
          Explanation
        </p>
        {scene.explanation.map((section, i) => (
          <div key={i} className="mb-6">
            <h3 className="text-sm font-bold text-on-surface mb-1">{section.heading}</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{section.body}</p>
            {section.callout && (
              <p className="mt-2 text-xs text-primary border-l-2 border-primary/40 pl-3 italic">
                {section.callout}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Right panel — 65% — canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        <CanvasArea scene={scene} />
      </div>
    </div>
  )
}

function CodeLeftCanvasRight({ scene }: { scene: Scene }) {
  return (
    <div className="flex h-full w-full">
      {/* Left panel — 35% — code view placeholder */}
      <div className="w-[35%] min-w-0 overflow-y-auto p-6 border-r border-outline-variant/20 bg-surface-container-lowest">
        <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4">
          Code
        </p>
        {scene.code ? (
          <pre className="font-mono text-xs text-on-surface leading-relaxed whitespace-pre-wrap break-all">
            {scene.code.source}
          </pre>
        ) : (
          <p className="text-sm text-on-surface-variant">No code attached.</p>
        )}
      </div>

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
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Dot grid background */}
      <div className="absolute inset-0 pointer-events-none">
        <DotGridBackground opacity={0.3} />
      </div>

      {/* Visual placeholders */}
      <div className="relative z-10 flex-1 flex flex-wrap gap-4 p-6 content-start">
        {scene.visuals.map((visual) => (
          <div
            key={visual.id}
            className="px-4 py-3 rounded-xl bg-surface-container border border-secondary/20 text-sm font-mono text-on-surface-variant"
          >
            <span className="text-secondary font-bold">{visual.type}</span>
            {visual.label && (
              <span className="ml-2 text-on-surface-variant">{visual.label}</span>
            )}
          </div>
        ))}

        {scene.visuals.length === 0 && (
          <div className="text-sm text-on-surface-variant italic">
            No visuals defined in this scene.
          </div>
        )}
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
