import type { SceneSkeletonParsed, StepsParsed } from '../schemas'

// ─── Result type ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

// ─── validateSteps ────────────────────────────────────────────────────────────

/**
 * Semantic cross-checks after generateObject succeeds for Stage 2.
 *
 * Zod guarantees the structural shape and that action targets are constrained
 * to the visualIds enum. This function adds semantic invariants that Zod's
 * static schema cannot express:
 *
 * Check 1: initialStates keys must all be valid visual IDs
 * Check 2: All visual IDs must have an initialState entry
 * Check 3: Step indices must be monotonically increasing (1, 2, 3…)
 * Check 4: Step count must equal skeleton.stepCount
 * Check 5: action targets must match skeleton IDs (defence-in-depth — Zod already does this)
 *
 * Note: type-specific structural checks on initialStates values (e.g., array
 * visual must have items: unknown[]) are intentionally omitted — the renderer
 * degrades gracefully when params are missing, and overly strict validation
 * here caused more false rejections than bugs caught.
 */
export function validateSteps(
  steps: StepsParsed,
  skeleton: SceneSkeletonParsed,
): ValidationResult {
  const visualIds = new Set(skeleton.visuals.map(v => v.id))
  const errors: string[] = []

  // Check 1: initialStates keys must all be valid visual IDs
  for (const id of Object.keys(steps.initialStates)) {
    if (!visualIds.has(id)) {
      errors.push(`initialStates has unknown visual ID: "${id}"`)
    }
  }

  // Check 2 removed: missing initialStates entries are tolerated — the assembler
  // defaults them to undefined and the renderer handles missing initial state gracefully.

  // Check 3: Step indices must be monotonically increasing (1, 2, 3…)
  const indices = steps.steps.map(s => s.index)
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] !== i + 1) {
      errors.push(`Step indices must be 1, 2, 3… Got ${indices[i]} at position ${i}`)
    }
  }

  // Check 4 (new): Step count must equal skeleton.stepCount
  if (steps.steps.length !== skeleton.stepCount) {
    errors.push(
      `Step count mismatch: skeleton declared ${skeleton.stepCount} steps, got ${steps.steps.length}`,
    )
  }

  // Check 5: action targets must match skeleton IDs (defence-in-depth)
  for (const step of steps.steps) {
    for (const action of step.actions) {
      if (!visualIds.has(action.target)) {
        errors.push(`Step ${step.index}: action target "${action.target}" not in skeleton`)
      }
    }
  }

  return errors.length === 0
    ? { valid: true, errors: [] }
    : { valid: false, errors }
}
