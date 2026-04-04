import { SceneSchema } from './schema'
import type { Scene } from './types'

export class SceneParseError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown,
  ) {
    super(message)
    this.name = 'SceneParseError'
  }
}

/**
 * Parses and validates raw unknown input as a Scene.
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
  return normalize(result.data)
}

/**
 * Normalizes a parsed scene to ensure consistent defaults
 * and sorted step indices.
 */
function normalize(scene: Scene): Scene {
  // Sort steps by index
  const steps = [...scene.steps].sort((a, b) => a.index - b.index)

  // Ensure step indices are sequential starting from 0
  const normalizedSteps = steps.map((step, i) => ({ ...step, index: i }))

  // Normalize code highlightByStep to match step count
  let code = scene.code
  if (code) {
    const highlights = [...code.highlightByStep]
    // Pad or trim to match step count
    while (highlights.length < normalizedSteps.length) {
      highlights.push(highlights[highlights.length - 1] ?? 0)
    }
    code = { ...code, highlightByStep: highlights.slice(0, normalizedSteps.length) }
  }

  return {
    ...scene,
    steps: normalizedSteps,
    code,
  }
}

/**
 * Safely tries to parse a Scene without throwing.
 * Returns null on failure.
 */
export function tryParseScene(raw: unknown): Scene | null {
  try {
    return parseScene(raw)
  } catch {
    return null
  }
}
