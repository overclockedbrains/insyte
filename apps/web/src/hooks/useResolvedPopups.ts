import { useMemo } from 'react'
import type { Scene } from '@insyte/scene-engine'
import type { ResolvedPopup } from '@/src/components/renderers/types'

/**
 * Resolves the active popups for the current step.
 * Filtering is step-range based (showAtStep / hideAtStep).
 * attachTo is carried through so the renderer can derive a DOM anchor.
 */
export function useResolvedPopups(scene: Scene, step: number): ResolvedPopup[] {
  return useMemo(() => {
    return scene.popups
      .filter(p => step >= p.showAtStep && step < p.hideAtStep)
      .map(p => ({
        id: p.id,
        text: p.text,
        style: p.style,
        attachTo: p.attachTo,
      }))
  }, [scene, step])
}
