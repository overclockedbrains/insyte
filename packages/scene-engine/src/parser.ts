import { SceneSchema } from './schema'
import type { Scene, VisualState } from './types'
import { ZodError } from 'zod'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class SceneParseError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown,
  ) {
    super(message)
    this.name = 'SceneParseError'
  }
}

// ─── normalizeScene ───────────────────────────────────────────────────────────

/**
 * Fills in defaults and ensures arrays are never undefined.
 * Sorts steps by index and reassigns sequential 1-based indices.
 * Normalizes code.highlightByStep to steps.length + 1 (step 0 + all steps).
 */
export function normalizeScene(raw: Scene): Scene {
  const steps = [...raw.steps]
    .sort((a, b) => a.index - b.index)
    .map((step, i) => ({ ...step, index: i + 1 }))

  let code = raw.code
  if (code) {
    const needed = steps.length + 1 // step 0 (initial state) + n animation steps
    const highlights = [...code.highlightByStep]
    while (highlights.length < needed) {
      highlights.push(highlights[highlights.length - 1] ?? 0)
    }
    code = { ...code, highlightByStep: highlights.slice(0, needed) }
  }

  return {
    ...raw,
    canvas: raw.canvas ?? [],
    steps,
    controls: raw.controls ?? [],
    popups: raw.popups ?? [],
    challenges: raw.challenges ?? [],
    code,
  }
}

// ─── computeVisualStateAtStep ─────────────────────────────────────────────────

/**
 * Returns the full state of a canvas visual at a given step index.
 * stepIndex=0 → initialState. stepIndex=N → applies all canvas updates up to step N.
 *
 * Each step.canvas[id] is a FULL STATE SNAPSHOT, so the last snapshot wins.
 */
export function computeVisualStateAtStep(
  scene: Scene,
  visualId: string,
  stepIndex: number,
): VisualState {
  const visual = scene.canvas.find(v => v.id === visualId)
  if (!visual) return {}

  let state: VisualState = { ...(visual.initialState as Record<string, unknown>) }

  for (const step of scene.steps) {
    if (step.index > stepIndex) break
    const update = step.canvas?.[visualId]
    if (update) {
      state = { ...(update as Record<string, unknown>) }
    }
  }

  return state
}

// ─── Public parse API ─────────────────────────────────────────────────────────

/**
 * Validates and normalizes raw unknown input as a Scene.
 * Throws SceneParseError if validation fails.
 */
export function parseScene(raw: unknown): Scene {
  const result = SceneSchema.safeParse(raw)
  if (!result.success) {
    throw new SceneParseError(
      `Invalid Scene JSON: ${result.error.issues.length} validation error(s)`,
      result.error.issues,
    )
  }
  return normalizeScene(result.data as Scene)
}

/**
 * Safely validates and normalizes raw input without throwing.
 * Returns { success: true, scene } or { success: false, error }.
 */
export function safeParseScene(
  raw: unknown,
): { success: true; scene: Scene } | { success: false; error: ZodError } {
  const result = SceneSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error }
  }
  return { success: true, scene: normalizeScene(result.data as Scene) }
}

/**
 * @deprecated Prefer safeParseScene for consistent behaviour.
 */
export function tryParseScene(raw: unknown): Scene | null {
  try {
    return parseScene(raw)
  } catch {
    return null
  }
}
