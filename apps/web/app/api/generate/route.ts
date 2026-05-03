import type { NextRequest } from 'next/server'
import { Agent, fetch as undiciFetch } from 'undici'
import { resolveModel } from '@/src/ai/providers'
import { getGeminiProvider } from '@/src/ai/providers/gemini'
import { REGISTRY } from '@/src/ai/registry'
import type { Provider } from '@/src/ai/registry'
import { generateScene } from '@/src/ai'
import type { GenerationConfig } from '@/src/ai'
import type { ModelConfig } from '@/src/ai'
import type { SceneType } from '@insyte/scene-engine'
import {
  saveScene,
  getCachedSlugForQuery,
  saveQueryHash,
  recordUserGeneration,
  incrementHitCount,
} from '@/lib/supabase'
import { generateSlug } from '@/src/lib/slug'
import { aiLog } from '@/lib/ai-logger'
import { extractByokHeaders } from '@/lib/headers'
import { enforceFreeTierRateLimit, getAuthenticatedUserId, getRequestIp } from '@/lib/server-auth'

// Allow streaming for up to 5 minutes
export const maxDuration = 300

// Custom HTTP agent with extended timeouts for long-running AI generation.
const longRunningAgent = new Agent({
  headersTimeout: 10 * 60 * 1000,
  bodyTimeout: 10 * 60 * 1000,
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const longRunningFetch = (url: any, options?: any) =>
  undiciFetch(url, { ...options, dispatcher: longRunningAgent }) as unknown as Promise<Response>

// ─── POST /api/generate ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { byokKey, byokProvider, byokModel, byokBaseURL } = extractByokHeaders(req)

  // Parse body
  let topic: string
  let slug: string | undefined
  let mode: SceneType | undefined
  let genConfig: GenerationConfig | undefined
  try {
    const body = await req.json()
    topic = body?.topic?.trim() ?? ''
    slug = body?.slug?.trim() || undefined
    mode = body?.mode ?? undefined
    const depth = body?.depth
    const familiarity = body?.familiarity
    const answers = Array.isArray(body?.answers) ? body.answers.slice(0, 3) : []
    if (depth || familiarity || answers.length) {
      genConfig = {
        depth: depth ?? 'standard',
        familiarity: familiarity ?? 'basics',
        answers,
      }
    }
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  if (!topic) {
    return new Response('topic is required', { status: 400 })
  }

  if (topic.length > 500) {
    return new Response('topic is too long (max 500 chars)', { status: 400 })
  }

  // ── Query deduplication: skip AI if this exact query was generated before ──
  // Only for free-tier (our server key) — BYOK / local-model users want fresh generation.
  const isByok = Boolean(byokKey || byokBaseURL)
  const ip = getRequestIp(req)
  const rateLimitResponse = await enforceFreeTierRateLimit(req, isByok)
  aiLog.server.rateLimit(ip, rateLimitResponse == null)
  if (rateLimitResponse) return rateLimitResponse

  const provider = (byokProvider ?? 'gemini') as Provider
  const languageModel = resolveModel(provider, byokModel, byokKey, longRunningFetch, byokBaseURL)

  // Free tier: no user API key and no custom base URL → per-stage Gemini routing applies.
  // Routed BYOK (Gemini/OpenAI/Anthropic/Groq): provider-aware tier routing per stage.
  // Unrouted BYOK (Ollama/Custom): user's configured model for all stages (no routing).
  const isFreeTier = !isByok
  const isRoutedBYOK = Boolean(byokKey) && !['ollama', 'custom'].includes(provider)

  const modelConfig: ModelConfig = {
    model: languageModel,
    providerOptions: REGISTRY[provider]?.providerOptions ?? {},
    // null = free tier (per-stage routing active via STAGE_MODELS)
    // string = BYOK active (non-null signals BYOK; value used only for unrouted providers)
    byokModel: isFreeTier ? null : (byokModel ?? REGISTRY[provider]?.defaultModel ?? null),
    // Factory for per-stage model resolution:
    //   free tier       → Gemini model with the stage model ID from STAGE_MODELS
    //   routed BYOK     → provider-specific model with the tier model ID for this stage
    //   unrouted BYOK   → ignores model ID, always returns the user's configured model
    createModel: isFreeTier
      ? (id: string) => getGeminiProvider(undefined, id, longRunningFetch)
      : isRoutedBYOK
        ? (id: string) => resolveModel(provider, id, byokKey, longRunningFetch)
        : () => languageModel,
    providerName: provider,
  }

  aiLog.server.request(
    topic,
    provider,
    byokModel ?? (isFreeTier ? 'stage-routed' : REGISTRY[provider]?.defaultModel ?? 'unknown'),
    isFreeTier ? 'free' : 'byok',
    mode,
  )

  // ── SSE stream from async generator ──────────────────────────────────────
  const encoder = new TextEncoder()
  const saveSlug = slug ?? generateSlug(topic)
  const authenticatedUserId = await getAuthenticatedUserId(req)

  // 4.5 min — leaves headroom under maxDuration: 300 for graceful shutdown
  const PIPELINE_HARD_LIMIT_MS = 270_000

  const stream = new ReadableStream({
    async start(controller) {
      if (isFreeTier) {
        const existingSlug = await getCachedSlugForQuery(topic)
        if (existingSlug) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'cached', slug: existingSlug })}\n\n`),
          )
          controller.close()
          return
        }
      }

      // Keep-alive: SSE comment lines every 15 s prevent CDN/proxy idle timeouts
      // during the silent gaps between stages (up to 45 s for Stage 2).
      // readSSE in useStreamScene filters on "data: " prefix — comments are silently discarded.
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': keep-alive\n\n')) } catch { /* stream closed */ }
      }, 15_000)

      // Hard timeout: yield a graceful error event before Vercel's maxDuration kills the request
      let pipelineTimedOut = false
      const timeoutId = setTimeout(() => {
        pipelineTimedOut = true
        const timeoutEvent = {
          type: 'error',
          stage: 0,
          message: 'Pipeline timed out after 4.5 minutes — please try again',
          retryable: true,
          errorCode: 'unknown',
        }
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(timeoutEvent)}\n\n`)) } catch { /* stream closed */ }
      }, PIPELINE_HARD_LIMIT_MS)

      try {
        for await (const event of generateScene(topic, mode, modelConfig, genConfig)) {
          if (pipelineTimedOut) break

          const line = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(line))

          // Background persistence: save the scene to Supabase on 'complete'
          if (event.type === 'complete') {
            void (async () => {
              try {
                await saveScene(saveSlug, event.scene)
                await saveQueryHash(topic, saveSlug)
                if (authenticatedUserId) {
                  await recordUserGeneration(authenticatedUserId, topic, saveSlug)
                }
                await incrementHitCount(saveSlug)
                aiLog.server.cache('saved', saveSlug)
              } catch (err) {
                aiLog.server.cache('failed', err instanceof Error ? err.message : err)
              }
            })()
          }

          if (event.type === 'error') {
            aiLog.server.error(`stage-${event.stage}`, event.message)
          }
        }
      } catch (err) {
        // Unexpected error outside the generator — emit an error event
        const errorEvent = {
          type: 'error',
          stage: 0,
          message: err instanceof Error ? err.message : 'Unexpected pipeline error',
          retryable: true,
          errorCode: 'unknown',
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
        aiLog.server.error('pipeline', err)
      } finally {
        clearInterval(heartbeat)
        clearTimeout(timeoutId)
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
