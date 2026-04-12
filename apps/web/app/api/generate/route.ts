import type { NextRequest } from 'next/server'
import { Agent, fetch as undiciFetch } from 'undici'
import { resolveModel } from '@/src/ai/providers'
import { REGISTRY } from '@/src/ai/registry'
import type { Provider } from '@/src/ai/registry'
import { generateScene } from '@/src/ai/pipeline'
import type { ModelConfig } from '@/src/ai/client'
import type { SceneType } from '@insyte/scene-engine'
import {
  checkAndIncrementRateLimit,
  saveScene,
  getCachedSlugForQuery,
  saveQueryHash,
  recordUserGeneration,
} from '@/lib/supabase'
import { generateSlug } from '@/src/lib/slug'
import { aiLog } from '@/lib/ai-logger'

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
  // BYOK headers — present when the user has configured their own API key.
  const byokKey = req.headers.get('x-api-key')
  const byokProvider = req.headers.get('x-provider') as Provider | null
  const byokModel = req.headers.get('x-model')
  // Custom base URL — present for Ollama and Custom Endpoint providers.
  const byokBaseURL = req.headers.get('x-base-url')
  // Auth header — present when user is signed in (userId for history tracking)
  const userId = req.headers.get('x-user-id')

  // Parse body
  let topic: string
  let slug: string | undefined
  let mode: SceneType | undefined
  try {
    const body = await req.json()
    topic = body?.topic?.trim() ?? ''
    slug = body?.slug?.trim() || undefined
    mode = body?.mode ?? undefined
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
  if (!byokKey && !byokBaseURL) {
    const existingSlug = await getCachedSlugForQuery(topic)
    if (existingSlug) {
      return Response.json(
        { cached: true, slug: existingSlug },
        { status: 200, headers: { 'X-Cache': 'HIT' } },
      )
    }
  }

  // Rate limit only applies to the free tier (our server key).
  if (!byokKey && !byokBaseURL) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const allowed = await checkAndIncrementRateLimit(ip)
    aiLog.server.rateLimit(ip, allowed)
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  const provider = (byokProvider ?? 'gemini') as Provider
  const languageModel = resolveModel(provider, byokModel, byokKey, longRunningFetch, byokBaseURL)
  const modelConfig: ModelConfig = {
    model: languageModel,
    providerOptions: REGISTRY[provider]?.providerOptions ?? {},
  }

  aiLog.server.request(topic, byokModel ?? REGISTRY[provider]?.defaultModel ?? 'unknown')

  // ── SSE stream from async generator ──────────────────────────────────────
  const encoder = new TextEncoder()
  const saveSlug = slug ?? generateSlug(topic)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generateScene(topic, mode, modelConfig)) {
          const line = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(line))

          // Background persistence: save the scene to Supabase on 'complete'
          if (event.type === 'complete') {
            aiLog.server.complete({ inputTokens: 0, outputTokens: 0 }, 'stop')
            void (async () => {
              try {
                await saveScene(saveSlug, event.scene)
                saveQueryHash(topic, saveSlug)
                if (userId) {
                  recordUserGeneration(userId, topic, saveSlug)
                }
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
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
        aiLog.server.error('pipeline', err)
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
