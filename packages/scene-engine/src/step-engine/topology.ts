import type { Visual, Step } from '../types'
import { evaluateCondition } from './conditions'

/**
 * Compute which visuals are active (exist on canvas) at a given step.
 * Handles showWhen conditions for static visibility toggling.
 * Future: dynamic add-node / remove-node actions (e.g. recursion tree expansion).
 */
export function computeTopologyAtStep(
  visuals: Visual[],
  steps: Step[],
  stepIndex: number
): Visual[] {
  return visuals.filter(visual => {
    if (!visual.showWhen) return true
    return evaluateCondition(visual.showWhen, steps, stepIndex)
  })
}

/**
 * Hash topology at a given step for layout memoization.
 * Same hash → same computed positions → layout cache hit.
 * Only hashes structural identity (IDs, types, hints) — NOT visual state (colors, highlights).
 */
export function hashTopologyAtStep(
  visuals: Visual[],
  steps: Step[],
  stepIndex: number
): string {
  const active = computeTopologyAtStep(visuals, steps, stepIndex)
  return active
    .map(v => `${v.id}:${v.type}:${v.layoutHint ?? ''}:${v.slot ?? ''}`)
    .join('|')
}
