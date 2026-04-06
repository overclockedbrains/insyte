import { streamText, Output } from 'ai'
import type { LanguageModel, FinishReason, LanguageModelUsage } from 'ai'
import { SceneSchema, safeParseScene } from '@insyte/scene-engine'
import type { Scene } from '@insyte/scene-engine'
import { SCENE_SYSTEM_PROMPT, buildSceneUserMessage } from './prompts/scene-generation'

// ─── Error types ──────────────────────────────────────────────────────────────

export class SceneGenerationError extends Error {
  constructor(
    message: string,
    public readonly zodErrors?: unknown,
  ) {
    super(message)
    this.name = 'SceneGenerationError'
  }
}

// ─── Return type ──────────────────────────────────────────────────────────────
// Explicit interface avoids TS4058 ("return type cannot be named") that occurs
// because the Output namespace and Output generic type share the same name in ai.

export interface SceneStreamResult {
  // Typed as unknown because callers pass this to safeParseScene() for validation.
  // The SDK infers a slightly different shape from Zod than our Scene type.
  readonly output: PromiseLike<unknown>
  readonly usage: PromiseLike<LanguageModelUsage>
  readonly finishReason: PromiseLike<FinishReason>
  toTextStreamResponse(init?: ResponseInit): Response
}

// ─── OnFinish event type ──────────────────────────────────────────────────────
// Matches the onFinish callback signature of streamText so route.ts can use it.

export interface SceneFinishEvent {
  object: unknown
  usage: LanguageModelUsage
  finishReason: FinishReason
}

// ─── generateScene ────────────────────────────────────────────────────────────

/**
 * Streams a Scene JSON from the AI model using streamText + Output.object().
 * Returns the StreamTextResult from Vercel AI SDK — callers can use:
 *   - result.toTextStreamResponse() for server-to-client streaming (used by useObject)
 *   - result.output for the final typed Scene
 *   - result.usage / result.finishReason for logging
 *
 * The optional onFinish callback replaces the fire-and-forget IIFE in route.ts,
 * providing a clean lifecycle hook for side effects (logging, DB saves).
 */
export function generateScene(topic: string, model: LanguageModel): SceneStreamResult {
  return streamText({
    model,
    output: Output.object({ schema: SceneSchema }),
    system: SCENE_SYSTEM_PROMPT,
    prompt: buildSceneUserMessage(topic),
    // By providing a fixed thinking budget (e.g., 2048 tokens), we allow Gemini
    // to reason about complex scenes without spending 20+ seconds in silence
    // (which causes retries) and without eating up the entire output token limit
    // (which causes clipped JSONs).
    providerOptions: {
      google: {
        thinkingConfig: { thinkingBudget: 2048 },
      },
    },
    maxOutputTokens: 32768,
    maxRetries: 0,
  })
}

/**
 * Validates the final streamed object.
 * Returns the Scene on success or throws SceneGenerationError on failure.
 */
export function validateGeneratedScene(raw: unknown): Scene {
  const result = safeParseScene(raw)
  if (result.success) return result.scene
  throw new SceneGenerationError(
    'Generated scene failed schema validation',
    result.error.errors,
  )
}
