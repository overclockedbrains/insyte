import { nanoid } from 'nanoid'
import { safeParseScene } from '@insyte/scene-engine'
import type {
  Scene,
  Step,
  ExplanationSection,
  Popup,
  Challenge,
  Control,
  LayoutHint,
  SceneLayout,
  SceneType,
} from '@insyte/scene-engine'
import type {
  SceneSkeletonParsed,
  StepsParsed,
  PopupsParsed,
  MiscParsed,
} from './schemas'

// ─── Result type ──────────────────────────────────────────────────────────────

export interface AssemblyResult {
  ok: boolean
  scene?: Scene
  /** Human-readable errors from safeParseScene — only present when ok === false */
  errors?: string[]
}

// ─── Layout mapping helpers ───────────────────────────────────────────────────

/**
 * Derive the Scene page layout (left panel vs canvas) from the skeleton type.
 * Concept simulations get the explanation panel; DSA/LLD/HLD use full canvas.
 */
function derivePageLayout(skeletonType: SceneSkeletonParsed['type']): SceneLayout {
  if (skeletonType === 'concept') return 'text-left-canvas-right'
  return 'canvas-only'
}

/**
 * Map skeleton type ('dsa') to Scene type ('dsa-trace').
 * All other types pass through unchanged.
 */
function deriveSceneType(skeletonType: SceneSkeletonParsed['type']): SceneType {
  if (skeletonType === 'dsa') return 'dsa-trace'
  return skeletonType as SceneType
}

// ─── assembleScene ────────────────────────────────────────────────────────────

/**
 * Stage 5 — deterministic assembly. Zero AI calls.
 *
 * Merges all stage outputs into a complete Scene JSON object and runs
 * safeParseScene() for final schema + semantic validation.
 *
 * Phase 30 redesign: input types changed from ISCL-derived types to the new
 * Zod-schema-derived types (SceneSkeletonParsed, StepsParsed, etc.).
 * The deterministic assembly logic is unchanged.
 */
export function assembleScene(
  skeleton: SceneSkeletonParsed,
  stepsParsed: StepsParsed,
  popupsParsed: PopupsParsed | null,
  miscParsed: MiscParsed | null,
): AssemblyResult {
  // ── Visuals: merge skeleton declarations with initialStates from Stage 2 ──
  // skeleton.layout is a LayoutHint (e.g. 'linear-H', 'dagre-TB') applied to
  // all visuals as their layout algorithm. decl.hint is a descriptive AI hint
  // (e.g. "sorted integer array") — it is NOT a LayoutHint and must not be
  // used as one.
  const visuals = skeleton.visuals.map(decl => ({
    id: decl.id,
    type: decl.type,
    layoutHint: skeleton.layout as LayoutHint,
    ...(decl.slot && { slot: decl.slot }),
    initialState: (stepsParsed.initialStates[decl.id] as Record<string, unknown>) ?? null,
  }))

  // ── Steps: synthetic step 0 (init) + AI-generated steps ──────────────────
  const steps: Step[] = [
    { index: 0, actions: [] },
    ...stepsParsed.steps.map(s => ({
      index: s.index,
      actions: s.actions,
    })),
  ]

  // ── Explanation: one section per step, extracted from co-generated data ──
  const explanation: ExplanationSection[] = stepsParsed.steps.map(s => ({
    heading: s.explanation.heading,
    body: s.explanation.body,
    appearsAtStep: s.index,
  }))

  // ── Popups ───────────────────────────────────────────────────────────────
  const popups: Popup[] = popupsParsed
    ? popupsParsed.popups.map(p => ({
        id: nanoid(8),
        attachTo: p.attachTo,
        showAtStep: p.showAtStep,
        hideAtStep: p.hideAtStep,
        text: p.text,
        style: p.style as Popup['style'],
      }))
    : []

  // ── Challenges: map MCQ format to existing Scene Challenge shape ──────────
  const challenges: Challenge[] = miscParsed
    ? miscParsed.challenges.map((c, i) => ({
        id: nanoid(8),
        type: (c.type ?? (['predict', 'break-it', 'optimize'] as const)[i]) ?? 'predict',
        title: c.question,
        // Embed options + correct answer in description so the UI can display them
        description: c.options
          .map((opt, idx) => `${idx === c.answer ? '✓' : ' '} ${opt}`)
          .join('\n'),
      }))
    : []

  // ── Controls: new format ({id, label, action}) doesn't map to the existing
  //    Scene Control type ({id, type, label, config}). Skip for now —
  //    controls were rarely used and the new prompt doesn't generate them.
  const controls: Control[] = []

  // ── Build raw scene ───────────────────────────────────────────────────────
  const rawScene = {
    id: nanoid(),
    title: skeleton.title,
    type: deriveSceneType(skeleton.type),
    layout: derivePageLayout(skeleton.type),
    visuals,
    steps,
    controls,
    explanation,
    popups,
    ...(challenges.length > 0 && { challenges }),
  }

  // ── Final validation via scene schema ─────────────────────────────────────
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
