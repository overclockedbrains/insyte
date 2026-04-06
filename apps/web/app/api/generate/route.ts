import type { NextRequest } from 'next/server'
// removed getGeminiProvider since we instantiate getServerModel natively inline here
import { generateScene } from '@/src/ai/generateScene'
import { checkAndIncrementRateLimit, saveScene } from '@/lib/supabase'
import { generateSlug } from '@/src/lib/slug'
import { safeParseScene } from '@insyte/scene-engine'
import { aiLog } from '@/lib/ai-logger'

// Allow streaming for up to 5 minutes
export const maxDuration = 300

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Agent, fetch as undiciFetch } from 'undici'

const longRunningAgent = new Agent({
  headersTimeout: 10 * 60 * 1000, // 10 minutes
  bodyTimeout: 10 * 60 * 1000, // 10 minutes
})

// Generate using Gemini Flash server key with custom timeout agent
function getServerModel() {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    fetch: (url, options) =>
      // Cast to un-confuse TS between undici's Response and global Response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undiciFetch(url as any, { ...options, dispatcher: longRunningAgent } as any) as unknown as Promise<Response>,
  })
  return google('gemini-2.5-flash')
}

// ─── POST /api/generate ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Block any attempt to pass API keys through this route
  if (req.headers.get('authorization') || req.headers.get('x-api-key')) {
    return new Response('Forbidden: API keys must not be sent to this route', {
      status: 403,
    })
  }

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

  // Rate limit check (15 requests / IP / hour via Supabase)
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

  const model = getServerModel()
  aiLog.server.request(topic, 'gemini-2.5-flash')

  try {
    const result = generateScene(topic, model)

    // Fire-and-forget: perform background logging once generation finishes.
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
