import { parseISCL } from '@insyte/scene-engine'
import type { Scene, SceneLayout, SceneType, Step, ExplanationSection, Popup, Challenge, Control } from '@insyte/scene-engine'
import { callLLM } from './client'
import type { ModelConfig } from './client'
import {
  buildStage1Prompt,
  buildStage2aPrompt,
  buildStage2bPrompt,
  buildStage3Prompt,
  buildStage4Prompt,
} from './prompts/builders'
import { validateStates, validateSteps, validateAnnotations, validateMisc } from './validators'
import { assembleScene } from './assembly'
import { stripCodeFences, joinStepContinuations } from './iscl-preprocess'

// ─── GenerationEvent ──────────────────────────────────────────────────────────

/**
 * Discriminated union of all events the pipeline can emit.
 * The client (useStreamScene) consumes these over SSE.
 *
 * Ordering contract:
 *   plan → content → annotations → misc → complete
 *   (or: plan → error on fatal failure)
 */
export type GenerationEvent =
  | {
      type: 'plan'
      title: string
      visualCount: number
      stepCount: number
      layout: SceneLayout
    }
  | {
      type: 'content'
      states: Record<string, unknown>
      steps: Step[]
    }
  | {
      type: 'annotations'
      explanation: ExplanationSection[]
      popups: Popup[]
    }
  | {
      type: 'misc'
      challenges: Challenge[]
      controls: Control[]
    }
  | {
      type: 'complete'
      scene: Scene
    }
  | {
      type: 'error'
      stage: number
      message: string
      retryable: boolean
    }

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Per-stage retry budget.
 * Override with PIPELINE_MAX_RETRIES=0 to disable all server-side retries
 * (useful in development to fail fast rather than burning tokens on every typo).
 */
const MAX_RETRIES = Math.max(
  0,
  parseInt(process.env.PIPELINE_MAX_RETRIES ?? '2', 10) || 2,
)

// ─── generateScene ────────────────────────────────────────────────────────────

/**
 * Async generator orchestrating all 5 pipeline stages.
 *
 * Stage execution order:
 *   1  ISCL generation      — fatal on all retries failing
 *   2a Visual initial states — non-fatal (falls back to empty)    ┐ parallel
 *   2b Step params           — fatal if all retries fail          ┘
 *   3  Annotations           — non-fatal (falls back to empty arrays)
 *   4  Misc (challenges)     — non-fatal (falls back to empty arrays)
 *   5  Deterministic assembly — fatal if safeParseScene fails
 *
 * @param topic   User-supplied topic string
 * @param mode    Optional SceneType hint — if omitted the AI picks the type
 * @param config  Model + providerOptions bundle built by the route handler
 */
export async function* generateScene(
  topic: string,
  mode: SceneType | undefined,
  config: ModelConfig,
): AsyncGenerator<GenerationEvent> {

  // ─── Stage 1: ISCL Generation ──────────────────────────────────────────────
  const stage1Prompt = buildStage1Prompt(topic, mode)
  const isclResult = await retryStage(MAX_RETRIES, async () => {
    const raw = await callLLM(stage1Prompt, config)
    // Strip any markdown code fences the model may add despite instructions,
    // then re-join SET lines that the model split across multiple lines.
    const cleaned = joinStepContinuations(stripCodeFences(raw))
    const parsed = parseISCL(cleaned)
    return parsed.ok
      ? { ok: true as const, value: parsed.parsed! }
      : { ok: false as const, error: parsed.error!.message }
  })

  if (!isclResult.ok) {
    yield {
      type: 'error',
      stage: 1,
      message: `Stage 1 (ISCL) failed after ${MAX_RETRIES} attempts: ${isclResult.error}`,
      retryable: true,
    }
    return
  }

  const iscl = isclResult.value

  // Yield 'plan' immediately — client can show title + placeholder skeleton
  yield {
    type: 'plan',
    title: iscl.title,
    visualCount: iscl.visualDecls.length,
    stepCount: iscl.stepCount,
    layout: iscl.layout,
  }

  // ─── Stages 2a + 2b: Parallel ──────────────────────────────────────────────
  const [statesResult, stepsResult] = await Promise.all([
    retryStage(MAX_RETRIES, async () => {
      const raw = await callLLM(buildStage2aPrompt(iscl, topic), config)
      const parsed = parseJSON(raw)
      if (!parsed.ok) return { ok: false as const, error: parsed.error }
      const validated = validateStates(parsed.data, iscl)
      return validated.ok
        ? { ok: true as const, value: validated.states }
        : { ok: false as const, error: validated.error! }
    }),
    retryStage(MAX_RETRIES, async () => {
      const raw = await callLLM(buildStage2bPrompt(iscl), config)
      const parsed = parseJSON(raw)
      if (!parsed.ok) return { ok: false as const, error: parsed.error }
      const validated = validateSteps(parsed.data, iscl)
      return validated.ok
        ? { ok: true as const, value: validated.steps }
        : { ok: false as const, error: validated.error! }
    }),
  ])

  // Stage 2b failure is fatal — no step data means no visualization
  if (!stepsResult.ok) {
    yield {
      type: 'error',
      stage: 2,
      message: `Stage 2b (steps) failed after ${MAX_RETRIES} attempts: ${stepsResult.error}`,
      retryable: true,
    }
    return
  }

  // Stage 2a failure is non-fatal — fall back to empty states (schema defaults)
  const states = statesResult.ok ? statesResult.value : {}
  if (!statesResult.ok) {
    console.warn('[pipeline] Stage 2a (initial states) failed — using empty states:', statesResult.error)
  }

  yield {
    type: 'content',
    states,
    steps: stepsResult.value,
  }

  // ─── Stage 3: Annotations ──────────────────────────────────────────────────
  const annotationsResult = await retryStage(MAX_RETRIES, async () => {
    const raw = await callLLM(buildStage3Prompt(iscl, topic), config)
    const parsed = parseJSON(raw)
    if (!parsed.ok) return { ok: false as const, error: parsed.error }
    const validated = validateAnnotations(parsed.data, iscl)
    return validated.ok
      ? { ok: true as const, value: { explanation: validated.explanation, popups: validated.popups } }
      : { ok: false as const, error: validated.error! }
  })

  const explanation: ExplanationSection[] = annotationsResult.ok ? annotationsResult.value.explanation : []
  const popups: Popup[] = annotationsResult.ok ? annotationsResult.value.popups : []
  if (!annotationsResult.ok) {
    console.warn('[pipeline] Stage 3 (annotations) failed — proceeding without annotations:', annotationsResult.error)
  }

  yield {
    type: 'annotations',
    explanation,
    popups,
  }

  // ─── Stage 4: Misc ─────────────────────────────────────────────────────────
  const miscResult = await retryStage(1, async () => {
    const raw = await callLLM(buildStage4Prompt(topic), config)
    const parsed = parseJSON(raw)
    if (!parsed.ok) return { ok: false as const, error: parsed.error }
    const validated = validateMisc(parsed.data)
    return validated.ok
      ? { ok: true as const, value: { challenges: validated.challenges, controls: validated.controls } }
      : { ok: false as const, error: validated.error! }
  })

  const challenges: Challenge[] = miscResult.ok ? miscResult.value.challenges : []
  const controls: Control[] = miscResult.ok ? miscResult.value.controls : []
  if (!miscResult.ok) {
    console.warn('[pipeline] Stage 4 (misc) failed — proceeding without challenges/controls:', miscResult.error)
  }

  yield { type: 'misc', challenges, controls }

  // ─── Stage 5: Deterministic Assembly ───────────────────────────────────────
  const assembled = assembleScene(
    iscl,
    states,
    stepsResult.value,
    explanation,
    popups,
    challenges,
    controls,
  )

  if (!assembled.ok) {
    yield {
      type: 'error',
      stage: 5,
      message: `Stage 5 (assembly) failed: ${assembled.errors!.join('; ')}`,
      retryable: false,
    }
    return
  }

  yield { type: 'complete', scene: assembled.scene! }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retry wrapper for a single stage function.
 *
 * fn must return { ok: true; value: T } | { ok: false; error: string }.
 * If fn throws, the exception is caught and treated as a retryable failure.
 * Retries up to maxRetries times, returning the last result on all failures.
 */
async function retryStage<T>(
  maxRetries: number,
  fn: () => Promise<{ ok: true; value: T } | { ok: false; error: string }>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  let last: { ok: true; value: T } | { ok: false; error: string } = {
    ok: false,
    error: 'No attempts made',
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      last = await fn()
      if (last.ok) return last
    } catch (err) {
      last = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  return last
}

/**
 * Parse JSON from an LLM response, stripping markdown code fences if present.
 * Returns { ok: true, data } | { ok: false, error }.
 */
function parseJSON(raw: string): { ok: true; data: unknown } | { ok: false; error: string } {
  const cleaned = stripCodeFences(raw)
  try {
    return { ok: true, data: JSON.parse(cleaned) }
  } catch {
    return { ok: false, error: `JSON.parse failed on: ${cleaned.slice(0, 120)}...` }
  }
}

// stripCodeFences and joinStepContinuations are imported from ./iscl-preprocess
