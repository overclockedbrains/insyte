'use client'

import { useCanvas } from '@/src/engine/CanvasContext'
import { StepPopup } from '@/src/engine/annotations/StepPopup'
import type { ResolvedPopup } from '../types'

interface PopupsLayerProps {
  popups: ResolvedPopup[]
}

/**
 * Positions and renders all active popups in canvas-space.
 * Anchors are 0–100 % values from the scene JSON; toPx() converts to px
 * using the live container dimensions from CanvasContext.
 */
export function PopupsLayer({ popups }: PopupsLayerProps) {
  const { toPx } = useCanvas()

  return (
    <>
      {popups.map(popup => {
        const posPx = popup.anchor ? toPx(popup.anchor) : toPx({ x: 50, y: 75 })
        return (
          <div
            key={popup.id}
            className="absolute z-30 pointer-events-none"
            style={{
              left: posPx.x,
              top: posPx.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <StepPopup text={popup.text} style={popup.style} visible={true} />
          </div>
        )
      })}
    </>
  )
}
