import { safeParseScene } from '@insyte/scene-engine'
import type { Scene, Visual, Step, Popup } from '@insyte/scene-engine'

// ─── Error types ──────────────────────────────────────────────────────────────

/** Thrown when a patch references a visual ID that does not exist in the scene */
export class MissingVisualError extends Error {
  constructor(public readonly missingId: string) {
    super(`Patch references unknown visual id "${missingId}"`)
    this.name = 'MissingVisualError'
  }
}

/** Thrown when an update-popup patch references a popup ID that does not exist */
export class MissingPopupError extends Error {
  constructor(public readonly missingId: string) {
    super(`Patch references unknown popup id "${missingId}"`)
    this.name = 'MissingPopupError'
  }
}

/** Thrown when the patched scene fails Zod validation */
export class PatchValidationError extends Error {
  constructor(
    message: string,
    public readonly zodErrors?: unknown,
  ) {
    super(message)
    this.name = 'PatchValidationError'
  }
}

// ─── Patch types ──────────────────────────────────────────────────────────────

export type ScenePatchType = 'add-steps' | 'update-popup' | 'add-visual' | 'update-visual'

export interface AddStepsPatch {
  type: 'add-steps'
  steps: Step[]
}

export interface UpdatePopupPatch {
  type: 'update-popup'
  id: string
  text: string
}

export interface AddVisualPatch {
  type: 'add-visual'
  visual: Visual
}

export interface UpdateVisualPatch {
  type: 'update-visual'
  id: string
  initialState: unknown
}

export type ScenePatch =
  | AddStepsPatch
  | UpdatePopupPatch
  | AddVisualPatch
  | UpdateVisualPatch

// ─── PlaybackIntent ───────────────────────────────────────────────────────────

export type PlaybackIntent =
  | { action: 'none' }
  | { action: 'pause' }
  | { action: 'rewind'; targetStep: number }

export interface ApplyDiffResult {
  scene: Scene
  intent: PlaybackIntent
}

// ─── applyDiff ────────────────────────────────────────────────────────────────

/**
 * Applies a ScenePatch to a Scene immutably.
 *
 * Returns a new Scene and a PlaybackIntent that callers must act on
 * to keep playback synchronized after the patch.
 *
 * Throws MissingVisualError, MissingPopupError, or PatchValidationError
 * on invalid patches — callers should display the error inline in the chat
 * rather than crashing the simulation.
 */
export function applyDiff(
  scene: Scene,
  patch: ScenePatch,
  currentStep = 0,
): ApplyDiffResult {
  let patched: Scene
  let intent: PlaybackIntent

  switch (patch.type) {
    case 'add-steps': {
      // Guard: every action in every new step must reference an existing visual
      const existingIds = new Set(scene.visuals.map((v) => v.id))
      for (const step of patch.steps) {
        for (const action of step.actions) {
          if (!existingIds.has(action.target)) {
            throw new MissingVisualError(action.target)
          }
        }
      }

      // Append steps and re-index to keep indices contiguous
      const existingSteps = scene.steps
      const offset = existingSteps.length
      const newSteps: Step[] = patch.steps.map((s, i) => ({
        ...s,
        index: offset + i,
      }))

      patched = { ...scene, steps: [...existingSteps, ...newSteps] }
      // Pause — don't auto-play new steps; let the user review them
      intent = { action: 'pause' }
      break
    }

    case 'update-popup': {
      const idx = scene.popups.findIndex((p) => p.id === patch.id)
      if (idx === -1) {
        throw new MissingPopupError(patch.id)
      }

      const updatedPopups: Popup[] = scene.popups.map((p) =>
        p.id === patch.id ? { ...p, text: patch.text } : p,
      )
      patched = { ...scene, popups: updatedPopups }
      intent = { action: 'none' }
      break
    }

    case 'add-visual': {
      const v = patch.visual
      if (!v.id || !v.type || v.initialState === undefined) {
        throw new PatchValidationError(
          'add-visual patch must include id, type, and initialState',
        )
      }

      patched = { ...scene, visuals: [...scene.visuals, v] }
      intent = { action: 'none' }
      break
    }

    case 'update-visual': {
      const idx = scene.visuals.findIndex((v) => v.id === patch.id)
      if (idx === -1) {
        throw new MissingVisualError(patch.id)
      }

      const updatedVisuals: Visual[] = scene.visuals.map((v) =>
        v.id === patch.id
          ? {
              ...v,
              initialState:
                typeof v.initialState === 'object' &&
                v.initialState !== null &&
                typeof patch.initialState === 'object' &&
                patch.initialState !== null
                  ? { ...(v.initialState as Record<string, unknown>), ...(patch.initialState as Record<string, unknown>) }
                  : patch.initialState,
            }
          : v,
      )

      patched = { ...scene, visuals: updatedVisuals }
      // Rewind to currentStep so the updated initialState re-renders immediately
      intent = { action: 'rewind', targetStep: currentStep }
      break
    }

    default: {
      // Exhaustiveness guard — TS will catch unhandled cases at compile time
      const _: never = patch
      throw new PatchValidationError(`Unknown patch type: ${(_ as ScenePatch).type}`)
    }
  }

  // Final Zod validation — reject any patch that produces an invalid scene
  const validation = safeParseScene(patched)
  if (!validation.success) {
    throw new PatchValidationError(
      'Patched scene failed schema validation',
      validation.error.errors,
    )
  }

  return { scene: validation.scene, intent }
}
