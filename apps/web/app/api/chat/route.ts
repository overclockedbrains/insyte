import type { NextRequest } from 'next/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGroq } from '@ai-sdk/groq'
import { streamChatResponse } from '@/src/ai/liveChat'
import type { SceneContext } from '@/src/ai/prompts/live-chat'
import type { ChatMessage } from '@/src/stores/slices/chat-slice'

// Allow streaming responses for up to 60 seconds
export const maxDuration = 60

// ─── Helper: resolve the model from the request ───────────────────────────────

function getModel(req: NextRequest) {
  // BYOK path: client passes provider and key via headers
  // NOTE: this is the only route where keys may be passed from the client.
  // Keys are never logged and never stored server-side.
  const byokKey = req.headers.get('x-api-key')
  const byokProvider = req.headers.get('x-provider') ?? 'gemini'
  const byokModel = req.headers.get('x-model')

  if (byokKey) {
    switch (byokProvider) {
      case 'openai': {
        const openai = createOpenAI({ apiKey: byokKey })
        return openai(byokModel ?? 'gpt-4o')
      }
      case 'anthropic': {
        const anthropic = createAnthropic({ apiKey: byokKey })
        return anthropic(byokModel ?? 'claude-3-5-haiku-20241022')
      }
      case 'groq': {
        const groq = createGroq({ apiKey: byokKey })
        return groq(byokModel ?? 'llama-3.1-70b-versatile')
      }
      case 'gemini':
      default: {
        const google = createGoogleGenerativeAI({ apiKey: byokKey })
        return google(byokModel ?? 'gemini-2.5-flash')
      }
    }
  }

  // Default: server Gemini Flash key
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  })
  return google('gemini-2.5-flash')
}

// ─── POST /api/chat ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Parse body
  let message: string
  let sceneContext: SceneContext
  let history: ChatMessage[]

  try {
    const body = await req.json()
    message = (body?.message ?? '').trim()
    sceneContext = body?.sceneContext
    history = body?.history ?? []
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  if (!message) {
    return new Response('message is required', { status: 400 })
  }

  if (message.length > 1000) {
    return new Response('message is too long (max 1000 chars)', { status: 400 })
  }

  if (!sceneContext?.title || !sceneContext?.type) {
    return new Response('sceneContext with title and type is required', { status: 400 })
  }

  const model = getModel(req)

  try {
    const result = streamChatResponse(message, sceneContext, history, model)
    return result.toTextStreamResponse()
  } catch (err) {
    console.error('[/api/chat] error:', err)
    return new Response(
      JSON.stringify({ error: 'Chat failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
