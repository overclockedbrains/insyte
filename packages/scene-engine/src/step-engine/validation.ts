import type { Visual, Step } from '../types'

export interface StepValidationResult {
  ok: boolean
  errors: string[]
}

/**
 * Validate step sequence integrity at load time — before any rendering occurs.
 * Catches structural errors that would otherwise surface as silent runtime bugs.
 */
export function validateStepSequence(
  visuals: Visual[],
  steps: Step[]
): StepValidationResult {
  const errors: string[] = []
  const visualIds = new Set(visuals.map(v => v.id))

  // Indices must be 0, 1, 2, ... with no gaps or duplicates
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step) continue
    if (step.index !== i) {
      errors.push(
        `Step indices non-monotonic at position ${i}: expected ${i}, got ${step.index}`
      )
    }
  }

  // Every action target must reference a declared visual ID
  for (const step of steps) {
    for (const action of step.actions) {
      if (!visualIds.has(action.target)) {
        errors.push(
          `Step ${step.index}: action targets unknown visual "${action.target}" (declared: ${[...visualIds].join(', ')})`
        )
      }
    }
  }

  return { ok: errors.length === 0, errors }
}
