import { SceneSchema } from './schema'
import type { Scene, Visual, VisualState } from './types'
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
 * The merge strategy is a shallow-key deep-object merge:
 * - Scalar values in params overwrite the matching key in state.
 * - Array values in params replace (not concat) the matching key in state.
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
      // Merge action params into the running state
      state = applyAction(state, action.action, action.params)
    }
  }

  return state
}

/**
 * Applies a single named action to state. Unknown action names perform a
 * shallow-merge of params, acting as a generic "set" operation.
 */
function applyAction(
  state: VisualState,
  actionName: string,
  params: Record<string, unknown>,
): VisualState {
  switch (actionName) {
    case 'set':
      // Shallow-merge all params into state
      return { ...state, ...params }

    case 'set-value':
      // Set a single 'value' key
      return { ...state, value: params['value'] }

    case 'push': {
      // Append to an array field (default: 'items')
      const field = (params['field'] as string | undefined) ?? 'items'
      const current = Array.isArray(state[field]) ? (state[field] as unknown[]) : []
      return { ...state, [field]: [...current, params['item']] }
    }

    case 'pop': {
      const field = (params['field'] as string | undefined) ?? 'items'
      const current = Array.isArray(state[field]) ? (state[field] as unknown[]) : []
      return { ...state, [field]: current.slice(0, -1) }
    }

    case 'highlight':
      // Set highlight on a specific index in an array field
      return applyHighlight(state, params)

    default:
      // Generic shallow-merge for any unrecognised action
      return { ...state, ...params }
  }
}

function applyHighlight(
  state: VisualState,
  params: Record<string, unknown>,
): VisualState {
  const field = (params['field'] as string | undefined) ?? 'cells'
  const index = params['index'] as number | undefined
  const value = params['value'] as string | undefined

  if (index === undefined || !Array.isArray(state[field])) {
    return { ...state, ...params }
  }

  const arr = state[field] as Array<Record<string, unknown>>
  const updated = arr.map((item, i) =>
    i === index ? { ...item, highlight: value ?? 'active' } : item,
  )
  return { ...state, [field]: updated }
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
 * Returns the scene unchanged or null — does not normalize.
 * @deprecated Prefer safeParseScene for consistent behaviour.
 */
export function tryParseScene(raw: unknown): Scene | null {
  try {
    return parseScene(raw)
  } catch {
    return null
  }
}
