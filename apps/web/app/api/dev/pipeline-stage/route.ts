import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { getGeminiProvider } from '@/src/ai/providers/gemini'
import { generateObject, generateJson } from '@/src/ai/client'
import type { ModelConfig } from '@/src/ai/client'
import { STAGE_MODELS } from '@/src/ai/model-routing'
import { aiLog } from '@/lib/ai-logger'
import {
  SceneSkeletonSchema,
  buildStepsSchema,
  buildPopupsSchema,
  MiscSchema,
} from '@/src/ai/schemas'
import type {
  SceneSkeletonParsed,
  StepsParsed,
  PopupsParsed,
  MiscParsed,
} from '@/src/ai/schemas'
import {
  buildStage0Prompt,
  buildStage1Prompt,
  buildStage2Prompt,
  buildStage3Prompt,
  buildStage4Prompt,
  STAGE1_SYSTEM,
  STAGE2_SYSTEM,
  STAGE3_SYSTEM,
} from '@/src/ai/prompts/builders'
import { validateSteps } from '@/src/ai/validators'
import { assembleScene } from '@/src/ai/assembly'
import type { SceneType } from '@insyte/scene-engine'

// ─── POST /api/dev/pipeline-stage ────────────────────────────────────────────
// Dev-only route — runs a single AI pipeline stage in isolation.
// Returns 404 in production.

export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_DEV_TOOLS) {
    return NextResponse.json({}, { status: 404 })
  }

  let body: {
    stage: number
    topic: string
    mode?: SceneType
    inputs?: Record<string, unknown>
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { stage, topic, mode, inputs = {} } = body

  if (!topic) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured on server' }, { status: 500 })
  }

  const makeConfig = (modelId: string): ModelConfig => ({
    model: getGeminiProvider(geminiKey, modelId),
    providerOptions: {},
    byokModel: null,
    createModel: (id: string) => getGeminiProvider(geminiKey, id),
    providerName: 'gemini',
  })

  // ── Stage 0: streaming SSE (reasoning text) ──────────────────────────────

  if (stage === 0) {
    const model = getGeminiProvider(geminiKey, STAGE_MODELS.stage0)
    const prompt = buildStage0Prompt(topic, mode)
    aiLog.server.stageStart(0, STAGE_MODELS.stage0, 1.0)
    aiLog.server.stagePrompt(0, prompt)
    const t0 = Date.now()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = streamText({ model, prompt, maxRetries: 0 })
          let fullText = ''
          for await (const chunk of result.textStream) {
            fullText += chunk
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`),
            )
          }
          aiLog.server.stageDone(0, Date.now() - t0)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', text: fullText })}\n\n`),
          )
        } catch (err) {
          aiLog.server.stageFail(0, err)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`),
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // ── Stages 1–5: JSON responses ────────────────────────────────────────────

  /**
  * Per-stage retry budgets (excluding Stage 0).
  * Override with PIPELINE_MAX_RETRIES=0 to disable retries in development.
  */
  const _pipelineRetries = parseInt(process.env.PIPELINE_MAX_RETRIES ?? '', 10)
  const MAX_RETRIES = Math.max(0, isNaN(_pipelineRetries) ? 2 : _pipelineRetries)

  /**
   * Retry wrapper — mirrors the main pipeline's retryStage().
   * Injects the last validation error into the prompt builder so the model
   * knows exactly what to fix on the next attempt.
   */
  async function retryStage<T>(
    stageNum: number,
    fn: (lastError?: string) => Promise<T>,
    maxRetries = 1,
  ): Promise<T> {
    let lastError: string | undefined
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(lastError)
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        if (attempt === maxRetries) throw err
        aiLog.server.stageRetry(stageNum, attempt + 1, lastError)
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
      }
    }
    throw new Error('retryStage: unreachable')
  }

  try {
    switch (stage) {
      case 1: {
        const reasoning = (inputs.reasoning as string) ?? ''
        aiLog.server.stageStart(1, STAGE_MODELS.stage1, 0.1)
        const t1 = Date.now()
        const result = await retryStage(1, (lastError) => {
          const prompt = buildStage1Prompt(topic, reasoning, lastError)
          aiLog.server.stagePrompt(1, prompt, STAGE1_SYSTEM)
          return generateObject(prompt, SceneSkeletonSchema, makeConfig(STAGE_MODELS.stage1), STAGE1_SYSTEM)
        }, MAX_RETRIES)
        aiLog.server.stageDone(1, Date.now() - t1)
        return NextResponse.json({ ok: true, data: result })
      }

      case 2: {
        const reasoning = (inputs.reasoning as string) ?? ''
        const skeleton = inputs.skeleton as SceneSkeletonParsed
        if (!skeleton?.visuals) {
          return NextResponse.json(
            { ok: false, error: 'Stage 2 requires skeleton from Stage 1' },
            { status: 400 },
          )
        }
        const visualIds = skeleton.visuals.map((v) => v.id) as [string, ...string[]]
        aiLog.server.stageStart(2, STAGE_MODELS.stage2, 0.2)
        const t2 = Date.now()
        const result = await retryStage(2, async (lastError) => {
          const prompt = buildStage2Prompt(topic, reasoning, skeleton, lastError)
          aiLog.server.stagePrompt(2, prompt, STAGE2_SYSTEM)
          const raw = await generateJson(prompt, buildStepsSchema(visualIds), makeConfig(STAGE_MODELS.stage2), STAGE2_SYSTEM)
          const validation = validateSteps(raw as StepsParsed, skeleton)
          if (!validation.valid) {
            throw new Error(`Semantic validation failed: ${validation.errors.join('; ')}`)
          }
          return raw
        }, MAX_RETRIES)
        aiLog.server.stageDone(2, Date.now() - t2)
        return NextResponse.json({ ok: true, data: result })
      }

      case 3: {
        const skeleton = inputs.skeleton as SceneSkeletonParsed
        if (!skeleton?.visuals) {
          return NextResponse.json(
            { ok: false, error: 'Stage 3 requires skeleton from Stage 1' },
            { status: 400 },
          )
        }
        const visualIds = skeleton.visuals.map((v) => v.id) as [string, ...string[]]
        aiLog.server.stageStart(3, STAGE_MODELS.stage3, 0.4)
        const t3 = Date.now()
        const steps3 = (inputs.steps as StepsParsed) ?? null
        const result = await retryStage(3, (lastError) => {
          const prompt = buildStage3Prompt(topic, skeleton, steps3, lastError)
          aiLog.server.stagePrompt(3, prompt, STAGE3_SYSTEM)
          return generateObject(prompt, buildPopupsSchema(visualIds), makeConfig(STAGE_MODELS.stage3), STAGE3_SYSTEM)
        }, MAX_RETRIES)
        aiLog.server.stageDone(3, Date.now() - t3)
        return NextResponse.json({ ok: true, data: result })
      }

      case 4: {
        aiLog.server.stageStart(4, STAGE_MODELS.stage4, 0.5)
        const t4 = Date.now()
        const skeleton4 = (inputs.skeleton as SceneSkeletonParsed) ?? null
        const steps4 = (inputs.steps as StepsParsed) ?? null
        const result = await retryStage(4, (lastError) => {
          const prompt = buildStage4Prompt(topic, skeleton4 ?? { visuals: [], stepCount: 0, title: topic, type: 'dsa', layout: 'linear-H' }, steps4, lastError)
          aiLog.server.stagePrompt(4, prompt)
          return generateObject(prompt, MiscSchema, makeConfig(STAGE_MODELS.stage4))
        }, MAX_RETRIES)
        aiLog.server.stageDone(4, Date.now() - t4)
        return NextResponse.json({ ok: true, data: result })
      }

      case 5: {
        const skeleton = inputs.skeleton as SceneSkeletonParsed
        const steps = inputs.steps as StepsParsed
        const popups = (inputs.popups as PopupsParsed) ?? null
        const misc = (inputs.misc as MiscParsed) ?? null
        if (!skeleton || !steps) {
          return NextResponse.json(
            { ok: false, error: 'Stage 5 requires skeleton (Stage 1) and steps (Stage 2)' },
            { status: 400 },
          )
        }
        aiLog.server.stageStart(5, 'deterministic', 0)
        const t5 = Date.now()
        const result = assembleScene(skeleton, steps, popups, misc)
        aiLog.server.stageDone(5, Date.now() - t5)
        return NextResponse.json({ ok: true, data: result })
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown stage: ${stage}` }, { status: 400 })
    }
  } catch (err) {
    // Extract structured detail from Vercel AI SDK errors (AI_NoObjectGeneratedError etc.)
    const message = err instanceof Error ? err.message : String(err)
    const cause = err instanceof Error && (err as NodeJS.ErrnoException & { cause?: unknown }).cause
    const rawText = err instanceof Error && (err as { text?: string }).text

    aiLog.server.stageFail(stage, err)
    if (cause) console.error(`[pipeline-stage]   cause:`, cause)
    if (rawText) console.error(`[pipeline-stage]   raw model output:`, rawText)

    return NextResponse.json(
      {
        ok: false,
        error: message,
        ...(cause ? { cause: String(cause) } : {}),
        ...(rawText ? { rawText } : {}),
      },
      { status: 500 },
    )
  }
}
