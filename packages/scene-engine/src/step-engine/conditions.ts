import type { Condition } from '../types'

/**
 * Evaluate a showWhen condition at a given step index.
 * Returns true if the element should be visible at this step.
 *
 * Note on `control-toggle`: toggle state is driven by user interaction (PlaybackStore),
 * not by step index — so the step engine returns `true` as the structural default.
 * The renderer applies the actual toggle value as a final visibility filter.
 */
export function evaluateCondition(
  condition: Condition,
  stepIndex: number,
): boolean {
  switch (condition.type) {
    case 'step-range':
      return stepIndex >= condition.from && stepIndex <= condition.to

    case 'after-step':
      return stepIndex >= condition.after

    case 'before-step':
      return stepIndex < condition.before

    case 'control-toggle':
      return true

    case 'always':
    default:
      return true
  }
}
