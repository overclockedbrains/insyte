import type { Visual, Step } from '../types'

/**
 * Replay all step actions from 0 to stepIndex (inclusive).
 * Returns a map of visualId → complete visual state at this step.
 *
 * Full-state contract: each Action carries the COMPLETE visual state for that step,
 * not a delta. Applying the same action twice yields the same result (idempotent).
 * This enables perfect random-access to any step without replaying history.
 */
export function applyStepActionsUpTo(
  visuals: Visual[],
  steps: Step[],
  stepIndex: number
): Map<string, Record<string, unknown>> {
  const stateMap = new Map<string, Record<string, unknown>>()

  // Initialize with each visual's initialState
  for (const visual of visuals) {
    stateMap.set(visual.id, { ...(visual.initialState as Record<string, unknown>) })
  }

  // Replay all actions from step 0 through stepIndex
  const limit = Math.min(stepIndex, steps.length - 1)
  for (let i = 0; i <= limit; i++) {
    const step = steps[i]
    if (!step) continue
    for (const action of step.actions) {
      // Full state snapshot — replace entire state for this visual
      stateMap.set(action.target, { ...action.params })
    }
  }

  return stateMap
}

/**
 * Convenience wrapper: get the state for a single visual at a specific step.
 */
export function getVisualStateAtStep(
  visual: Visual,
  steps: Step[],
  stepIndex: number
): Record<string, unknown> {
  const stateMap = applyStepActionsUpTo([visual], steps, stepIndex)
  return stateMap.get(visual.id) ?? (visual.initialState as Record<string, unknown>)
}
