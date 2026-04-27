import type { CanvasVisual, Step } from '../types'

export interface StepValidationResult {
  ok: boolean
  errors: string[]
}

/**
 * Validate step sequence integrity at load time — before any rendering occurs.
 * Steps must be 1-based with sequential indices (1, 2, 3…).
 * Canvas update targets must reference declared canvas visual IDs.
 */
export function validateStepSequence(
  canvas: CanvasVisual[],
  steps: Step[],
): StepValidationResult {
  const errors: string[] = []
  const canvasIds = new Set(canvas.map(v => v.id))

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step) continue
    const expected = i + 1
    if (step.index !== expected) {
      errors.push(
        `Step indices non-monotonic at position ${i}: expected ${expected}, got ${step.index}`,
      )
    }
  }

  for (const step of steps) {
    if (!step.canvas) continue
    for (const id of Object.keys(step.canvas)) {
      if (!canvasIds.has(id)) {
        errors.push(
          `Step ${step.index}: canvas update targets unknown visual "${id}" (declared: ${[...canvasIds].join(', ')})`,
        )
      }
    }
  }

  return { ok: errors.length === 0, errors }
}
