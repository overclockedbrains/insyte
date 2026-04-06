import type { NextRequest } from 'next/server'
import { resolveModel } from '@/src/ai/providers'
import type { Provider } from '@/src/ai/registry'
import { streamChatResponse } from '@/src/ai/liveChat'
import type { SceneContext } from '@/src/ai/prompts/live-chat'
import type { ChatMessage } from '@/src/stores/slices/chat-slice'

// Allow streaming responses for up to 60 seconds
export const maxDuration = 60

// ─── POST /api/chat ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // BYOK headers — present when the user has configured their own API key.
  // Keys are never logged and never stored server-side.
  const byokKey = req.headers.get('x-api-key')
  const byokProvider = req.headers.get('x-provider') as Provider | null
  const byokModel = req.headers.get('x-model')

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

  const model = resolveModel(byokProvider ?? 'gemini', byokModel, byokKey)

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
