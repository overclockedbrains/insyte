import { nanoid } from 'nanoid'
import { safeParseScene } from '@insyte/scene-engine'
import type {
  ISCLParsed,
  Scene,
  Step,
  ExplanationSection,
  Popup,
  Challenge,
  Control,
} from '@insyte/scene-engine'

// ─── Result type ──────────────────────────────────────────────────────────────

export interface AssemblyResult {
  ok: boolean
  scene?: Scene
  /** Human-readable errors from safeParseScene — only present when ok === false */
  errors?: string[]
}

// ─── assembleScene ────────────────────────────────────────────────────────────

/**
 * Stage 5 — deterministic assembly. Zero AI calls.
 *
 * Merges all stage outputs into a complete Scene JSON object and runs
 * safeParseScene() for final schema + semantic validation. Any remaining
 * cross-reference errors surface here as typed errors rather than runtime
 * failures in the renderer.
 *
 * This is a pure function — same inputs always produce the same output.
 */
export function assembleScene(
  parsed: ISCLParsed,
  states: Record<string, unknown>,
  steps: Step[],
  explanation: ExplanationSection[],
  popups: Popup[],
  challenges: Challenge[],
  controls: Control[],
): AssemblyResult {
  // Build visuals from ISCL declarations, merging in initialState from Stage 2a.
  // When states[id] is missing (Stage 2a failed / degraded), fall back to null
  // so the schema validation catches it rather than a runtime crash.
  const visuals = parsed.visualDecls.map(decl => ({
    id: decl.id,
    type: decl.type,
    ...(decl.layoutHint && { layoutHint: decl.layoutHint }),
    ...(decl.slot && { slot: decl.slot }),
    initialState: states[decl.id] ?? null,
  }))

  const rawScene = {
    id: nanoid(),
    title: parsed.title,
    type: parsed.type,
    layout: parsed.layout,
    visuals,
    steps,
    controls,
    explanation,
    popups,
    ...(challenges.length > 0 && { challenges }),
  }

  // Run full schema + semantic validation — catches any remaining issues.
  const parseResult = safeParseScene(rawScene)

  if (!parseResult.success) {
    const msgs = parseResult.error.errors.map(
      (e: { path: (string | number)[]; message: string }) =>
        `${e.path.join('.')}: ${e.message}`,
    )
    return { ok: false, errors: msgs }
  }

  return { ok: true, scene: parseResult.scene }
}
