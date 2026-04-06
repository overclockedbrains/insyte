import { streamText } from 'ai'
import type { LanguageModel } from 'ai'
import type { Scene } from '@insyte/scene-engine'
import {
  CHAT_SYSTEM_PROMPT,
  buildChatContextBlock,
  type SceneContext,
} from './prompts/live-chat'
import type { ChatMessage } from '@/src/stores/slices/chat-slice'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatRequestBody {
  message: string
  sceneContext: SceneContext
  history: ChatMessage[]
}

/**
 * Explicit return type to avoid TS4058 "cannot be named" error from
 * the internal Output type in the Vercel AI SDK.
 */
export interface ChatStreamResult {
  toTextStreamResponse(init?: ResponseInit): Response
}

// ─── buildSceneContext ────────────────────────────────────────────────────────

/**
 * Extracts a minimal SceneContext from the active Scene and current step.
 * Only the fields the AI actually needs — no full JSON (too many tokens).
 */
export function buildSceneContext(scene: Scene, currentStep: number): SceneContext {
  // Find the explanation text for the current step (last section whose appearsAtStep <= currentStep)
  const currentExplanation = [...scene.explanation]
    .filter((s) => s.appearsAtStep <= currentStep)
    .pop()?.body

  return {
    title: scene.title,
    type: scene.type,
    currentStep,
    currentExplanation,
    visualSummary: scene.visuals.map((v) => ({
      id: v.id,
      type: v.type,
      label: v.label,
    })),
  }
}

// ─── streamChatResponse ───────────────────────────────────────────────────────

/**
 * Streams an AI chat response given the user message, scene context, and history.
 *
 * Returns the Vercel AI SDK StreamTextResult — callers can:
 *   - toTextStreamResponse() for server-to-client streaming
 *   - await textStream for accumulating text
 */
export function streamChatResponse(
  message: string,
  sceneContext: SceneContext,
  history: ChatMessage[],
  model: LanguageModel,
): ChatStreamResult {
  const contextBlock = buildChatContextBlock(sceneContext)

  // Build messages array: context block is prepended to the first user message
  // to ground the AI without blowing up the system prompt on every turn.
  const userContent = `${contextBlock}\n\n${message}`

  // Rebuild history as Vercel AI SDK message format, inserting context block
  // only for the first user turn (most recent history pairs)
  const priorMessages = history.slice(0, -1) // exclude the message we're about to send
  const aiMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    // Historical turns from the current session (no context block on prior turns)
    ...priorMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    // Current user turn with context block
    { role: 'user' as const, content: userContent },
  ]

  return streamText({
    model,
    system: CHAT_SYSTEM_PROMPT,
    messages: aiMessages,
    maxOutputTokens: 1024,
    maxRetries: 0,
  })
}
