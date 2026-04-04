'use client'

import { useMemo } from 'react'
import { usePlayerStore } from '@/src/stores/player-store'
import type { Popup, Condition } from '@insyte/scene-engine'
import type { ControlValue } from './useControls'

// ─── Condition evaluation ─────────────────────────────────────────────────────

function evaluateCondition(
  condition: Condition,
  controlValues: Record<string, ControlValue>,
): boolean {
  const val = controlValues[condition.control]
  // Loose equality to handle string/number coercion from config defaults
  // eslint-disable-next-line eqeqeq
  return val == condition.equals
}

// ─── useAnnotations ───────────────────────────────────────────────────────────
//
// Returns the list of Popup[] that are visible at the given currentStep,
// optionally filtered by control state (evaluates showWhen conditions).

export function useAnnotations(
  controlValues: Record<string, ControlValue> = {},
): Popup[] {
  const popups = usePlayerStore((s) => s.activeScene?.popups ?? [])
  const currentStep = usePlayerStore((s) => s.currentStep)

  return useMemo(() => {
    return popups.filter((popup) => {
      // Step range check
      if (popup.showAtStep > currentStep) return false
      if (popup.hideAtStep !== undefined && popup.hideAtStep <= currentStep) return false

      // showWhen condition check
      if (popup.showWhen) {
        return evaluateCondition(popup.showWhen, controlValues)
      }

      return true
    })
  }, [popups, currentStep, controlValues])
}
