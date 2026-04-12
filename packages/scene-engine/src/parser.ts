import { SceneSchema } from './schema'
import type { Scene, Visual, VisualState } from './types'
import { ZodError } from 'zod'

// ─── Migration helpers ────────────────────────────────────────────────────────

/**
 * Silently drops the legacy `position` field from a visual if present.
 * Also drops `x`/`y` from node arrays inside initialState (graph, tree,
 * recursion-tree, system-diagram use "nodes" or "components").
 * Runs before schema validation so old JSONs parse cleanly during the transition.
 */
function stripLegacyPositions(raw: Record<string, unknown>): Record<string, unknown> {
  const visuals = raw['visuals']
  if (!Array.isArray(visuals)) return raw
  return {
    ...raw,
    visuals: visuals.map((v: unknown) => {
      if (!v || typeof v !== 'object') return v
      const visual = v as Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { position, ...rest } = visual

      // Strip x/y from node/component arrays inside initialState
      const initialState = rest['initialState']
      if (initialState && typeof initialState === 'object') {
        const state = initialState as Record<string, unknown>
        const stripped: Record<string, unknown> = { ...state }
        for (const key of ['nodes', 'components']) {
          if (Array.isArray(state[key])) {
            stripped[key] = (state[key] as Array<Record<string, unknown>>).map(
              ({ x: _x, y: _y, ...node }) => node,
            )
          }
        }
        return { ...rest, initialState: stripped }
      }
      return rest
    }),
  }
}

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
 * Also sorts steps by index and reassigns sequential indices starting from 0.
 */
export function normalizeScene(raw: Scene): Scene {
  // Sort steps by index and re-number sequentially from 0
  const steps = [...raw.steps]
    .sort((a, b) => a.index - b.index)
    .map((step, i) => ({ ...step, index: i }))

  // Normalize code.highlightByStep to match step count
  let code = raw.code
  if (code) {
    const highlights = [...code.highlightByStep]
    // Pad (repeat last value) or trim to match step count
    while (highlights.length < steps.length) {
      highlights.push(highlights[highlights.length - 1] ?? 0)
    }
    code = { ...code, highlightByStep: highlights.slice(0, steps.length) }
  }

  return {
    ...raw,
    visuals: raw.visuals ?? [],
    steps,
    controls: raw.controls ?? [],
    explanation: raw.explanation ?? [],
    popups: raw.popups ?? [],
    challenges: raw.challenges ?? [],
    code,
  }
}

// ─── computeVisualStateAtStep ─────────────────────────────────────────────────

/**
 * Applies all actions targeting a specific visual from step 0 up to (and
 * including) stepIndex, starting from the visual's initialState.
 *
 * This is a pure function with no side effects — safe to call repeatedly.
 *
 * New universal format: each action.params is the complete visual state at
 * that step — a shallow merge of params onto the running state is sufficient.
 *
 * Legacy format (action.action present) is also handled for backwards
 * compatibility with any scenes not yet migrated to Phase 19 format.
 */
export function computeVisualStateAtStep(
  scene: Scene,
  visualId: string,
  stepIndex: number,
): VisualState {
  const visual = scene.visuals.find((v: Visual) => v.id === visualId)
  if (!visual) return {}

  // Start from the visual's initial state (spread to avoid mutation)
  let state: VisualState =
    visual.initialState !== null && typeof visual.initialState === 'object'
      ? { ...(visual.initialState as Record<string, unknown>) }
      : {}

  // Apply each action in order up to stepIndex
  const stepsUpTo = scene.steps.filter((s) => s.index <= stepIndex)
  for (const step of stepsUpTo) {
    for (const action of step.actions) {
      if (action.target !== visualId) continue
      // Universal format: shallow-merge params directly
      state = { ...state, ...action.params }
    }
  }

  return state
}

// ─── Public parse API ─────────────────────────────────────────────────────────

/**
 * Validates and normalizes raw unknown input as a Scene.
 * Applies legacy migration shims (strips position/x/y) before validation.
 * Throws SceneParseError if validation fails.
 */
export function parseScene(raw: unknown): Scene {
  // Apply migration shims to strip legacy position/xy fields before validation
  const migrated =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? stripLegacyPositions(raw as Record<string, unknown>)
      : raw
  const result = SceneSchema.safeParse(migrated)
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
 * Applies legacy migration shims (strips position/x/y) before validation.
 * Returns { success: true, scene } or { success: false, error }.
 */
export function safeParseScene(
  raw: unknown,
): { success: true; scene: Scene } | { success: false; error: ZodError } {
  // Apply migration shims to strip legacy position/xy fields before validation
  const migrated =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? stripLegacyPositions(raw as Record<string, unknown>)
      : raw
  const result = SceneSchema.safeParse(migrated)
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
