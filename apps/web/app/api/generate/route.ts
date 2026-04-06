import type { NextRequest } from 'next/server'
import { Agent, fetch as undiciFetch } from 'undici'
import { generateScene } from '@/src/ai/generateScene'
import { resolveModel } from '@/src/ai/providers'
import type { Provider } from '@/src/ai/registry'
import { checkAndIncrementRateLimit, saveScene } from '@/lib/supabase'
import { generateSlug } from '@/src/lib/slug'
import { safeParseScene } from '@insyte/scene-engine'
import { aiLog } from '@/lib/ai-logger'

// Allow streaming for up to 5 minutes
export const maxDuration = 300

// Custom HTTP agent with extended timeouts for long-running AI generation.
// Used by all providers in this route — generation can take several minutes.
const longRunningAgent = new Agent({
  headersTimeout: 10 * 60 * 1000, // 10 minutes
  bodyTimeout: 10 * 60 * 1000,    // 10 minutes
})

// Cast undici's fetch to the global fetch type expected by AI SDKs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const longRunningFetch = (url: any, options?: any) =>
  undiciFetch(url, { ...options, dispatcher: longRunningAgent }) as unknown as Promise<Response>

// ─── POST /api/generate ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // BYOK headers — present when the user has configured their own API key.
  // Keys are never logged and never stored server-side.
  const byokKey = req.headers.get('x-api-key')
  const byokProvider = req.headers.get('x-provider') as Provider | null
  const byokModel = req.headers.get('x-model')

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

  // Rate limit only applies to the free tier (our server key).
  // BYOK users consume their own quota — no limit imposed.
  if (!byokKey) {
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
  const model = resolveModel(provider, byokModel, byokKey, longRunningFetch)
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
          aiLog.server.cache('saved', saveSlug)
        } else {
          aiLog.server.cache('skipped', 'scene failed schema validation')
        }
      } catch (err) {
        aiLog.server.error('stream-complete', err)
        aiLog.server.cache('failed', err instanceof Error ? err.message : err)
      }
    })()

    // toTextStreamResponse() is the format expected by experimental_useObject on the client.
    // Do NOT change this to toDataStreamResponse() — that is for useChat, a different protocol.
    return result.toTextStreamResponse()
  } catch (err) {
    aiLog.server.error('generation', err)
    return new Response(
      JSON.stringify({ error: 'AI generation failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
