import type { NextRequest } from 'next/server'
import { Agent, fetch as undiciFetch } from 'undici'
import { generateScene } from '@/src/ai/generateScene'
import { resolveModel } from '@/src/ai/providers'
import type { Provider } from '@/src/ai/registry'
import {
  checkAndIncrementRateLimit,
  saveScene,
  getCachedSlugForQuery,
  saveQueryHash,
  recordUserGeneration,
} from '@/lib/supabase'
import { generateSlug } from '@/src/lib/slug'
import { safeParseScene } from '@insyte/scene-engine'
import { aiLog } from '@/lib/ai-logger'

// Allow streaming for up to 5 minutes
export const maxDuration = 300

// Custom HTTP agent with extended timeouts for long-running AI generation.
const longRunningAgent = new Agent({
  headersTimeout: 10 * 60 * 1000, // 10 minutes
  bodyTimeout: 10 * 60 * 1000,    // 10 minutes
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
  try {
    const body = await req.json()
    topic = body?.topic?.trim() ?? ''
    slug = body?.slug?.trim() || undefined
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
      // Return a redirect response — client should load from /s/[existingSlug]
      return Response.json(
        { cached: true, slug: existingSlug },
        { status: 200, headers: { 'X-Cache': 'HIT' } },
      )
    }
  }

  // Rate limit only applies to the free tier (our server key).
  // BYOK and local/custom endpoint users consume their own quota — no limit imposed.
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

  const provider = byokProvider ?? 'gemini'
  const model = resolveModel(provider, byokModel, byokKey, longRunningFetch, byokBaseURL)
  const modelId = byokModel ?? (byokKey ? provider : 'gemini-2.5-flash')
  aiLog.server.request(topic, modelId)

  try {
    const result = generateScene(topic, model, provider)

    // Fire-and-forget: background logging + scene persistence once generation finishes.
    void (async () => {
      try {
        const usage = await result.usage
        const finishReason = await result.finishReason

        aiLog.server.complete(
          {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            reasoningTokens: (usage as { outputTokenDetails?: { reasoningTokens?: number } }).outputTokenDetails?.reasoningTokens,
            textTokens: (usage as { outputTokenDetails?: { textTokens?: number } }).outputTokenDetails?.textTokens,
          },
          finishReason,
        )

        const obj = await result.output
        const parsed = safeParseScene(obj)
        if (parsed.success) {
          const saveSlug = slug ?? generateSlug(topic)
          await saveScene(saveSlug, parsed.scene)
          // Save query → slug mapping for deduplication
          saveQueryHash(topic, saveSlug)
          // Record in user history if signed in
          if (userId) {
            recordUserGeneration(userId, topic, saveSlug)
          }
          aiLog.server.cache('saved', saveSlug)
        } else {
          aiLog.server.cache('skipped', 'scene failed schema validation')
        }
      } catch (err) {
        aiLog.server.error('stream-complete', err)
        aiLog.server.cache('failed', err instanceof Error ? err.message : err)
      }
    })()

    return result.toTextStreamResponse()
  } catch (err) {
    aiLog.server.error('generation', err)
    return new Response(
      JSON.stringify({ error: 'Generation failed', retryable: true }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
