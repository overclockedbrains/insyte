'use client'

import { useState, useCallback } from 'react'
import { usePlayerStore } from '@/src/stores/player-store'
import type { Control } from '@insyte/scene-engine'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ControlValue = string | number | boolean

// ─── useControlValues ─────────────────────────────────────────────────────────
//
// Manages live control values in local component state.
// Initialized from each control's config.defaultValue.
// Returns getControlValue / setControlValue accessors.

export function useControlValues(controls: Control[]) {
  const [values, setValues] = useState<Record<string, ControlValue>>(() => {
    const initial: Record<string, ControlValue> = {}
    for (const control of controls) {
      const defaultVal = control.config['defaultValue']
      if (defaultVal !== undefined) {
        initial[control.id] = defaultVal as ControlValue
      }
    }
    return initial
  })

  const getControlValue = useCallback(
    (id: string): ControlValue | undefined => values[id],
    [values],
  )

  const setControlValue = useCallback(
    (id: string, val: ControlValue) => {
      setValues((prev) => ({ ...prev, [id]: val }))
    },
    [],
  )

  return { values, getControlValue, setControlValue }
}

// ─── useSceneControls ─────────────────────────────────────────────────────────
// Convenience hook that reads controls from the active scene.

export function useSceneControls() {
  const controls = usePlayerStore((s) => s.activeScene?.controls ?? [])
  return useControlValues(controls)
}
