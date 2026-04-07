'use client'

import type { Scene } from '@insyte/scene-engine'
import { CanvasCard } from './CanvasCard'

// ─── CanvasOnly ───────────────────────────────────────────────────────────────
// Full-width canvas layout for HLD system diagrams.
// No left panel. StepPopup components provide floating explanation anchored
// to specific canvas primitives (handled inside CanvasCard/StepPopup).

interface Props {
  scene: Scene
}

export function CanvasOnly({ scene }: Props) {
  return (
    <div className="w-full h-full min-h-0 flex flex-col p-0 md:p-4">
      <CanvasCard scene={scene} />
    </div>
  )
}
