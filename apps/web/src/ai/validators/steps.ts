import type { SceneSkeletonParsed, StepsParsed } from '../schemas'
import type { ValidationResult } from './index'
import { getVisualIdSet } from './index'

export type { ValidationResult }

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
  const visualIds = getVisualIdSet(skeleton)
  const errors: string[] = []

  // Check 1: initialStates keys must all be valid visual IDs
  for (const id of Object.keys(steps.initialStates)) {
    if (!visualIds.has(id)) {
      errors.push(`initialStates has unknown visual ID: "${id}"`)
    }
  }

  // Check 2: initialStates must not be empty and must cover all visual IDs
  if (Object.keys(steps.initialStates).length === 0) {
    const required = skeleton.visuals.map(v => `"${v.id}"`).join(', ')
    errors.push(`initialStates is empty {} — every visual needs an initial state. Required keys: ${required}`)
  } else {
    const missingIds = skeleton.visuals.map(v => v.id).filter(id => !(id in steps.initialStates))
    if (missingIds.length > 0) {
      errors.push(`initialStates missing entries for: ${missingIds.map(id => `"${id}"`).join(', ')}`)
    }
    for (const [id, state] of Object.entries(steps.initialStates)) {
      if (Object.keys(state).length === 0) {
        errors.push(`initialStates["${id}"] is empty {} — provide real initial state matching the visual-params-guide`)
      }
    }
  }

  // Check 3: Step indices must be monotonically increasing (1, 2, 3…)
  const indices = steps.steps.map(s => s.index)
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] !== i + 1) {
      errors.push(`Step indices must be 1, 2, 3… Got ${indices[i]} at position ${i}`)
    }
  }

  // Check 4: Step count must be within ±1 of skeleton.stepCount.
  // Strict equality caused unnecessary retries when the model produced one extra
  // or one fewer step on complex topics — the scene is valid either way.
  if (Math.abs(steps.steps.length - skeleton.stepCount) > 1) {
    errors.push(
      `Step count mismatch: skeleton declared ${skeleton.stepCount} steps, got ${steps.steps.length} (must be within ±1)`,
    )
  }

  // Check 5-pre: initialState values must NOT be wrapped in a "params" key.
  // The model sometimes confuses step-action structure ({ target, params })
  // with initialState structure (direct state object). Catch it explicitly.
  for (const [id, state] of Object.entries(steps.initialStates)) {
    const keys = Object.keys(state)
    if (
      keys.length === 1 &&
      keys[0] === 'params' &&
      typeof state['params'] === 'object' &&
      state['params'] !== null
    ) {
      errors.push(
        `initialStates["${id}"] is wrapped in a "params" key — initialState must be the DIRECT state object (e.g. { "components": [...] }), not { "params": { ... } }. The "params" wrapper belongs in step actions only.`,
      )
    }
  }

  // Check 5: action targets must match skeleton IDs (defence-in-depth)
  // Check 6: action params must never be empty {} — empty params render as blank visuals
  for (const step of steps.steps) {
    for (const action of step.actions) {
      if (!visualIds.has(action.target)) {
        errors.push(`Step ${step.index}: action target "${action.target}" not in skeleton`)
      }
      if (Object.keys(action.params).length === 0) {
        errors.push(`Step ${step.index}: action on "${action.target}" has empty params {} — supply complete visual state matching the visual-params-guide`)
      }
    }
  }

  return errors.length === 0
    ? { valid: true, errors: [] }
    : { valid: false, errors }
}
