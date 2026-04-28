'use client'

import { useLayoutEffect, useState } from 'react'
import { useCanvas } from '@/src/engine/CanvasContext'
import { StepPopup } from '@/src/engine/annotations/StepPopup'
import type { ResolvedPopup } from '../types'

interface PopupsLayerProps {
  popups: ResolvedPopup[]
}

/**
 * Measures each popup's canvas-group element against the canvas container and
 * returns pixel positions ready for absolute positioning.
 *
 * Priority: DOM-measured attachTo > explicit anchor % > fallback centre.
 */
function usePopupPositions(
  popups: ResolvedPopup[],
  toPx: (pos: { x: number; y: number }) => { x: number; y: number },
): Record<string, { x: number; y: number }> {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  useLayoutEffect(() => {
    const container = document.querySelector<HTMLElement>('[data-canvas-root]')
    const next: Record<string, { x: number; y: number }> = {}

    for (const popup of popups) {
      if (popup.attachTo) {
        const groupEl = document.getElementById(`sg-group-${popup.attachTo}`)
        if (groupEl && container) {
          const cr = container.getBoundingClientRect()
          const gr = groupEl.getBoundingClientRect()
          if (cr.width > 0 && cr.height > 0) {
            next[popup.id] = {
              x: gr.left + gr.width / 2 - cr.left,
              y: gr.bottom - cr.top + 8,
            }
            continue
          }
        }
      }
      // Fallback: explicit anchor % or centred default
      next[popup.id] = popup.anchor ? toPx(popup.anchor) : toPx({ x: 50, y: 75 })
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPositions(next)
  }, [popups, toPx])

  return positions
}

export function PopupsLayer({ popups }: PopupsLayerProps) {
  const { toPx } = useCanvas()
  const positions = usePopupPositions(popups, toPx)

  return (
    <>
      {popups.map(popup => {
        const posPx = positions[popup.id] ?? toPx({ x: 50, y: 75 })
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
