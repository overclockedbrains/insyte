import type { NextRequest } from 'next/server'
import { resolveModel } from '@/src/ai/providers'
import { extractByokHeaders } from '@/lib/headers'
import { jsonError } from '@/lib/responses'
import { streamChatResponse } from '@/src/ai/liveChat'
import type { SceneContext } from '@/src/ai/prompts/live-chat'
import type { ChatMessage } from '@/src/stores/slices/chat-slice'

// Allow streaming responses for up to 60 seconds
export const maxDuration = 60

// ─── POST /api/chat ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { byokKey, byokProvider, byokModel } = extractByokHeaders(req)

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
    return jsonError('Chat failed. Please try again.', 500)
  }
}
