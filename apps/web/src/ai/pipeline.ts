import type { Scene, SceneType } from '@insyte/scene-engine'
import { streamText } from 'ai'
import { generateObject, generateJson } from './client'
import type { ModelConfig } from './client'
import type { ProviderOptions } from './types/provider-options'
import { resolveStageModel } from './model-routing'
import type { StageKey } from './model-routing'
import {
  SceneSkeletonSchema,
  buildStepsSchema,
  buildPopupsSchema,
  MiscSchema,
} from './schemas'
import type { SceneSkeletonParsed, StepsParsed, PopupsParsed, MiscParsed } from './schemas'
import {
  buildStage0Prompt,
  buildStage1Prompt,
  buildStage2Prompt,
  buildStage3Prompt,
  buildStage4Prompt,
  STAGE1_SYSTEM,
  STAGE2_SYSTEM,
  STAGE3_SYSTEM,
  STAGE4_SYSTEM,
} from './prompts/builders'
import { validateSteps, validatePopups } from './validators'
import { assembleScene } from './assembly'
import { aiLog } from '@/lib/ai-logger'

// ─── GenerationEvent ──────────────────────────────────────────────────────────

/**
 * Discriminated union of all events the pipeline emits over SSE.
 *
 * Canonical ordering contract (Phase 30):
 *   reasoning → plan → content → annotations → misc → complete
 *   (or: any stage → error on fatal failure)
 *
 * Stage 2 is the only fatal stage. Stage 3 and 4 failures are non-fatal —
 * the scene is still complete without popups or challenges.
 */
export type GenerationEvent =
  | {
      type: 'reasoning'
      text: string
    }
  | {
      type: 'plan'
      skeleton: SceneSkeletonParsed
    }
  | {
      type: 'content'
      steps: StepsParsed
    }
  | {
      type: 'annotations'
      popups: PopupsParsed
    }
  | {
      type: 'misc'
      misc: MiscParsed
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
 * Per-stage retry budgets (excluding Stage 0).
 * Override with PIPELINE_MAX_RETRIES=0 to disable retries in development.
 */
const _pipelineRetries = parseInt(process.env.PIPELINE_MAX_RETRIES ?? '', 10)
const MAX_RETRIES = Math.max(0, isNaN(_pipelineRetries) ? 2 : _pipelineRetries)

// ─── generateScene ────────────────────────────────────────────────────────────

/**
 * Async generator orchestrating the 6-stage AI pipeline.
 *
 * Stage execution order:
 *   0  Free reasoning       — fatal abort on failure (no schema, no retry)
 *   1  Scene skeleton        — fatal on all retries failing
 *   2  Steps + explanations  — fatal on all retries failing
 *   3  Popups               ┐ parallel after Stage 2; non-fatal
 *   4  Misc (challenges)    ┘ parallel after Stage 2; non-fatal
 *   5  Deterministic assembly — fatal if safeParseScene fails
 *
 * Model routing:
 *   BYOK (modelConfig.byokModel != null): every stage uses user's model (static).
 *   Free tier (byokModel == null): per-stage models from STAGE_MODELS.
 */
export async function* generateScene(
  topic: string,
  mode: SceneType | undefined,
  modelConfig: ModelConfig,
): AsyncGenerator<GenerationEvent> {

  const byokModel = modelConfig.byokModel
  const pipelineStart = Date.now()

  /**
   * Build a per-stage ModelConfig:
   * - Resolves the correct model for this stage (per-stage or BYOK passthrough)
   * - Sets the stage-specific temperature
   * - Adjusts providerOptions for Stage 0 (higher thinking budget)
   */
  const stageConfig = (stage: StageKey, temperature: number): ModelConfig => {
    const modelId = resolveStageModel(stage, modelConfig.providerName, byokModel)
    const stageProviderOptions = stage === 'stage0'
      ? buildStage0ProviderOptions(modelConfig.providerOptions, modelConfig.providerName)
      : modelConfig.providerOptions
    return {
      ...modelConfig,
      model: modelConfig.createModel(modelId),
      temperature,
      providerOptions: stageProviderOptions,
    }
  }

  // ── Stage 0: Free Reasoning ──────────────────────────────────────────────
  // No system prompt, no few-shot, temperature 1.0, high thinkingBudget.
  // Thinking models reason from first principles; examples push them into
  // pattern-matching mode, short-circuiting the reasoning we're paying for.
  const model0 = resolveStageModel('stage0', modelConfig.providerName, byokModel)
  aiLog.server.stageStart(0, model0, 1.0)
  const t0 = Date.now()
  let reasoning = ''
  try {
    const stage0Cfg = stageConfig('stage0', 1.0)
    const { textStream } = streamText({
      model: stage0Cfg.model,
      prompt: buildStage0Prompt(topic, mode),
      providerOptions: stage0Cfg.providerOptions,
      temperature: 1.0,
      maxOutputTokens: 8192,
      maxRetries: 0,
    })
    for await (const chunk of textStream) {
      reasoning += chunk
      yield { type: 'reasoning', text: chunk }
    }
    aiLog.server.stageDone(0, Date.now() - t0)
  } catch (err) {
    aiLog.server.stageFail(0, err)
    yield {
      type: 'error',
      stage: 0,
      message: `Stage 0 (reasoning) failed: ${err instanceof Error ? err.message : String(err)}`,
      retryable: true,
    }
    return
  }

  // ── Stage 1: Scene Skeleton ──────────────────────────────────────────────
  const model1 = resolveStageModel('stage1', modelConfig.providerName, byokModel)
  aiLog.server.stageStart(1, model1, 0.1)
  const t1 = Date.now()
  let skeleton: SceneSkeletonParsed
  try {
    skeleton = await retryStage(MAX_RETRIES, (lastError) =>
      generateObject(
        buildStage1Prompt(topic, reasoning, lastError),
        SceneSkeletonSchema,
        stageConfig('stage1', 0.1),
        STAGE1_SYSTEM,
      ),
      15_000,
      1,
    )
    aiLog.server.stageDone(1, Date.now() - t1)
  } catch (err) {
    aiLog.server.stageFail(1, err)
    yield {
      type: 'error',
      stage: 1,
      message: `Stage 1 (skeleton) failed after ${MAX_RETRIES} retries: ${err instanceof Error ? err.message : String(err)}`,
      retryable: true,
    }
    return
  }

  yield { type: 'plan', skeleton }

  const visualIds = skeleton.visuals.map(v => v.id)

  // ── Stage 2: Steps + Explanations ───────────────────────────────────────
  // Must complete before Stage 3 — Stage 3 references visual IDs that Stage 2
  // confirms. Dynamic schema factory constrains target enum to actual visual IDs.
  const model2 = resolveStageModel('stage2', modelConfig.providerName, byokModel)
  aiLog.server.stageStart(2, model2, 0.2)
  const t2 = Date.now()
  let stepsParsed: StepsParsed
  try {
    const stepsRaw = await retryStage(MAX_RETRIES, async (lastError) => {
      const raw = await generateJson(
        buildStage2Prompt(topic, reasoning, skeleton, lastError),
        buildStepsSchema(visualIds),
        stageConfig('stage2', 0.2),
        STAGE2_SYSTEM,
      )
      const validation = validateSteps(raw as StepsParsed, skeleton)
      if (!validation.valid) {
        throw new Error(`Semantic validation failed: ${validation.errors.join('; ')}`)
      }
      return raw
    }, 60_000, 2)  // 60s — heaviest stage (co-generates both steps and explanations)

    stepsParsed = stepsRaw as StepsParsed
    aiLog.server.stageDone(2, Date.now() - t2)
  } catch (err) {
    aiLog.server.stageFail(2, err)
    yield {
      type: 'error',
      stage: 2,
      message: `Stage 2 (steps) failed after ${MAX_RETRIES} retries: ${err instanceof Error ? err.message : String(err)}`,
      retryable: true,
    }
    return
  }

  yield { type: 'content', steps: stepsParsed }

  // ── Stage 3 + Stage 4 in parallel ───────────────────────────────────────
  // Both run AFTER Stage 2 (not simultaneously) to preserve event ordering.
  // Stage 3 uses STAGE3_SYSTEM; Stage 4 has no system prompt.
  const model3 = resolveStageModel('stage3', modelConfig.providerName, byokModel)
  const model4 = resolveStageModel('stage4', modelConfig.providerName, byokModel)
  aiLog.server.stageStart(3, model3, 0.4)
  aiLog.server.stageStart(4, model4, 0.5)
  const t34 = Date.now()

  const [popupsResult, miscResult] = await Promise.allSettled([

    retryStage(MAX_RETRIES, (lastError) =>
      generateObject(
        buildStage3Prompt(topic, skeleton, stepsParsed, lastError),
        buildPopupsSchema(visualIds),
        stageConfig('stage3', 0.4),
        STAGE3_SYSTEM,
      ),
      15_000,
      3,
    ).then(raw => {
      aiLog.server.stageDone(3, Date.now() - t34)
      // Semantic validation (non-fatal — invalid popups are simply dropped)
      const validation = validatePopups(raw as PopupsParsed, skeleton)
      if (!validation.valid) {
        // Warn only — stage still succeeded, popups are returned as-is
        aiLog.server.error('stage-3-validation', validation.errors.join('; '))
      }
      return raw as PopupsParsed
    }),

    retryStage(MAX_RETRIES, (lastError) =>
      generateObject(
        buildStage4Prompt(topic, skeleton, stepsParsed, lastError),
        MiscSchema,
        stageConfig('stage4', 0.5),
        STAGE4_SYSTEM,
      ),
      15_000,
      4,
    ).then(raw => {
      aiLog.server.stageDone(4, Date.now() - t34)
      return raw
    }),

  ])

  const popups = popupsResult.status === 'fulfilled' ? popupsResult.value : null
  const misc   = miscResult.status   === 'fulfilled' ? miscResult.value   : null

  if (popupsResult.status === 'rejected') {
    aiLog.server.stageFail(3, (popupsResult as PromiseRejectedResult).reason)
  }
  if (miscResult.status === 'rejected') {
    aiLog.server.stageFail(4, (miscResult as PromiseRejectedResult).reason)
  }

  if (popups) yield { type: 'annotations', popups }
  if (misc)   yield { type: 'misc',        misc   }

  // ── Stage 5: Deterministic Assembly ─────────────────────────────────────
  aiLog.server.stageStart(5, 'deterministic', 0)
  const t5 = Date.now()
  const assembled = assembleScene(skeleton, stepsParsed, popups, misc)

  if (!assembled.ok) {
    aiLog.server.stageFail(5, assembled.errors!.join('; '))
    yield {
      type: 'error',
      stage: 5,
      message: `Stage 5 (assembly) failed: ${assembled.errors!.join('; ')}`,
      retryable: false,
    }
    return
  }

  aiLog.server.stageDone(5, Date.now() - t5)
  aiLog.server.pipelineDone(Date.now() - pipelineStart)

  yield { type: 'complete', scene: assembled.scene! }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds provider-specific thinking config for Stage 0.
 * Each provider uses a different key/schema for extended thinking.
 */
function buildStage0ProviderOptions(
  baseOptions: ProviderOptions,
  providerName: string,
): ProviderOptions {
  switch (providerName) {
    case 'gemini':
      return { ...baseOptions, google: { thinkingConfig: { thinkingBudget: 16384 } } }
    case 'anthropic':
      return { ...baseOptions, anthropic: { thinking: { type: 'enabled', budget_tokens: 16384 } } }
    case 'openai':
      return { ...baseOptions, openai: { reasoningEffort: 'high' } }
    default:
      return baseOptions
  }
}

/**
 * Retry wrapper with per-attempt timeout, retry logging, and error-guided prompts.
 *
 * The function fn receives lastError on retries so prompt builders can inject
 * the exact validation failure — the model is told what to fix, not just
 * asked to "try again".
 *
 * Uses exponential backoff: 500ms, 1000ms (then throws).
 */
async function retryStage<T>(
  maxRetries: number,
  fn: (lastError?: string) => Promise<T>,
  timeoutPerAttemptMs: number,
  stageNum: number,
): Promise<T> {
  let lastError: string | undefined = undefined
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(lastError), timeoutPerAttemptMs)
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt === maxRetries) throw err
      aiLog.server.stageRetry(stageNum, attempt + 1, lastError)
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
  }
  throw new Error('retryStage: unreachable')
}

/**
 * Wrap a promise with a timeout.
 * Throws if the promise doesn't resolve within timeoutMs milliseconds.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Stage timed out after ${timeoutMs}ms`)), timeoutMs),
  )
  return Promise.race([promise, timeout])
}
