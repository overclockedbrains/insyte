import { nanoid } from 'nanoid'
import { safeParseScene } from '@insyte/scene-engine'
import type {
  Scene,
  Popup,
  Challenge,
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
  errors?: string[]
}

// ─── Layout derivation ────────────────────────────────────────────────────────

function derivePageLayout(type: SceneType): SceneLayout {
  if (type === 'dsa-trace') return 'code-left-canvas-right' // fixed: was canvas-only
  if (type === 'concept')   return 'text-left-canvas-right'
  return 'canvas-only' // lld, hld
}

// ─── assembleScene ────────────────────────────────────────────────────────────

/**
 * Stage 5 — deterministic assembly. Zero AI calls.
 *
 * Merges all stage outputs into a complete Scene v2 JSON and runs
 * safeParseScene() for final schema validation.
 */
export function assembleScene(
  skeleton: SceneSkeletonParsed,
  stepsParsed: StepsParsed,
  popupsParsed: PopupsParsed | null,
  miscParsed: MiscParsed | null,
): AssemblyResult {
  // ── Canvas: merge skeleton declarations with initialStates from Stage 2 ─────
  const canvas = skeleton.canvas.map(decl => ({
    id:           decl.id,
    ...(decl.label   !== undefined && { label:   decl.label }),
    type:         decl.type,
    ...(decl.variant !== undefined && { variant: decl.variant }),
    layoutHint:   decl.layoutHint,
    initialState: (stepsParsed.initialStates[decl.id] as Record<string, unknown>) ?? {},
  }))

  // ── activeText: declared in Stage 1, initialValue from Stage 2 ──────────────
  const activeText = skeleton.activeText
    ? { initialValue: stepsParsed.initialActiveText || 'Ready' }
    : undefined

  // ── HUD: declared in Stage 1 (id + label), initialValue from Stage 2 ────────
  const hud = skeleton.hud && skeleton.hud.length > 0
    ? skeleton.hud.map(item => ({
        id:           item.id,
        label:        item.label,
        initialValue: stepsParsed.initialHud?.[item.id] ?? 0,
      }))
    : undefined

  // ── Steps: embed explanation inside each step (no separate root array) ───────
  const steps = stepsParsed.steps.map(s => ({
    index:       s.index,
    explanation: s.explanation,
    ...(s.activeText !== undefined && { activeText: s.activeText }),
    ...(s.hud        !== undefined && { hud:        s.hud }),
    ...(s.canvas     !== undefined && { canvas:     s.canvas }),
  }))

  // ── Popups ──────────────────────────────────────────────────────────────────
  const popups: Popup[] = popupsParsed
    ? popupsParsed.popups.map(p => ({
        id:          nanoid(8),
        attachTo:    p.attachTo,
        showAtStep:  p.showAtStep,
        hideAtStep:  p.hideAtStep,
        text:        p.text,
        style:       p.style as Popup['style'],
      }))
    : []

  // ── Challenges ──────────────────────────────────────────────────────────────
  const challenges: Challenge[] | undefined = miscParsed?.challenges.map(c => ({
    id:          nanoid(8),
    type:        c.type as Challenge['type'],
    title:       c.title,
    description: c.description,
  }))

  // ── Build raw scene ─────────────────────────────────────────────────────────
  const rawScene = {
    id:       nanoid(),
    title:    skeleton.title,
    type:     skeleton.type,
    layout:   derivePageLayout(skeleton.type),
    ...(skeleton.description && { description: skeleton.description }),
    ...(skeleton.category    && { category:    skeleton.category }),
    canvas,
    ...(activeText           && { activeText }),
    ...(hud                  && { hud }),
    controls: [],
    steps,
    popups,
    ...(challenges?.length   && { challenges }),
    ...(miscParsed?.complexity && { complexity: miscParsed.complexity }),
  }

  // ── Final validation ────────────────────────────────────────────────────────
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
