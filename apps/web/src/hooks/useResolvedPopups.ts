import { useMemo } from 'react'
import type { Scene } from '@insyte/scene-engine'
import type { ControlValue } from '@/src/engine/hooks/useControls'
import type { ResolvedPopup } from '@/src/components/renderers/types'

/**
 * Resolves the active popups for the current step and control state.
 *
 * Filters scene.popups by:
 *   - Step range (showAtStep / hideAtStep)
 *   - control-toggle showWhen (evaluated here, not in the renderer)
 *
 * Returns a ResolvedPopup[] that renderers consume directly — no raw Scene
 * access needed inside the renderer.
 */
export function useResolvedPopups(
  scene: Scene,
  step: number,
  controlValues: Record<string, ControlValue>,
): ResolvedPopup[] {
  return useMemo(() => {
    return scene.popups
      .filter(p => {
        if (step < p.showAtStep) return false
        if (p.hideAtStep !== undefined && step >= p.hideAtStep) return false
        if (!p.showWhen) return true
        if (p.showWhen.type !== 'control-toggle') return true
        const val = controlValues[p.showWhen.controlId]
        return p.showWhen.value !== undefined
          ? val === p.showWhen.value
          : Boolean(val)
      })
      .map(p => ({
        id: p.id,
        text: p.text,
        style: p.style,
        anchor: p.anchor,
      }))
  }, [scene, step, controlValues])
}
