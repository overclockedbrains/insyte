import { streamText, Output } from 'ai'
import type { LanguageModel, FinishReason, LanguageModelUsage } from 'ai'
import { SceneSchema, safeParseScene } from '@insyte/scene-engine'
import type { Scene } from '@insyte/scene-engine'
import { SCENE_SYSTEM_PROMPT, buildSceneUserMessage } from './prompts/scene-generation'
import { REGISTRY } from './registry'
import type { Provider } from './registry'

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
 * provider — used to look up per-provider options from the registry
 * (e.g. Gemini's thinking budget). Defaults to 'gemini' when omitted.
 */
export function generateScene(
  topic: string,
  model: LanguageModel,
  provider: Provider = 'gemini',
): SceneStreamResult {
  return streamText({
    model,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output: Output.object({ schema: SceneSchema as any }),
    system: SCENE_SYSTEM_PROMPT,
    prompt: buildSceneUserMessage(topic),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    providerOptions: REGISTRY[provider].providerOptions as any,
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
