import type { CanvasVisual, Step } from '../types'

/**
 * Return all canvas visuals active at a given step.
 * New schema: all canvas visuals are always visible (showWhen removed).
 */
export function computeTopologyAtStep(
  canvas: CanvasVisual[],
  _steps: Step[],
  _stepIndex: number,
): CanvasVisual[] {
  return canvas
}

/**
 * Hash topology at a given step for layout memoization.
 * Same hash → same computed positions → layout cache hit.
 */
export function hashTopologyAtStep(
  canvas: CanvasVisual[],
  steps: Step[],
  stepIndex: number,
): string {
  const active = computeTopologyAtStep(canvas, steps, stepIndex)
  return active
    .map(v => `${v.id}:${v.type}:${v.layoutHint}`)
    .join('|')
}
