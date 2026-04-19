import type { SceneSkeletonParsed, PopupsParsed } from '../schemas'
import type { ValidationResult } from './index'
import { getVisualIdSet } from './index'

export type { ValidationResult }

// ─── validatePopups ───────────────────────────────────────────────────────────

/**
 * Semantic cross-checks for Stage 3 popup output.
 *
 * Zod's buildPopupsSchema constrains attachTo to valid visual IDs at the
 * token level. This adds semantic temporal checks:
 *
 * Check 1: popup.attachTo must be in skeleton visual IDs (defence-in-depth)
 * Check 2: showAtStep must be <= hideAtStep
 * Check 3: hideAtStep must not exceed the scene's stepCount
 *
 * Non-fatal — on failure the pipeline continues without popups.
 */
export function validatePopups(
  popups: PopupsParsed,
  skeleton: SceneSkeletonParsed,
): ValidationResult {
  const visualIds = getVisualIdSet(skeleton)
  const stepCount = skeleton.stepCount
  const errors: string[] = []

  for (const popup of popups.popups) {
    if (!visualIds.has(popup.attachTo)) {
      errors.push(`Popup attachTo "${popup.attachTo}" not in skeleton`)
    }
    if (popup.showAtStep > popup.hideAtStep) {
      errors.push(`Popup showAtStep (${popup.showAtStep}) > hideAtStep (${popup.hideAtStep})`)
    }
    if (popup.hideAtStep > stepCount) {
      errors.push(`Popup hideAtStep (${popup.hideAtStep}) > scene stepCount (${stepCount})`)
    }
  }

  return errors.length === 0
    ? { valid: true, errors: [] }
    : { valid: false, errors }
}
