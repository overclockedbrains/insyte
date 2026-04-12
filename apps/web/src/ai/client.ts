import { generateText } from 'ai'
import type { LanguageModel } from 'ai'

// ─── ModelConfig ──────────────────────────────────────────────────────────────

/**
 * Encapsulates everything callLLM needs to hit the AI model.
 * Constructed from request headers in the route handler and
 * threaded through the entire pipeline unchanged.
 */
export interface ModelConfig {
  model: LanguageModel
  /**
   * Provider-specific options forwarded to the Vercel AI SDK (e.g. Gemini
   * thinking budget). Keyed by the provider name as the AI SDK expects it.
   */
  providerOptions: Record<string, unknown>
}

// ─── callLLM ─────────────────────────────────────────────────────────────────

/**
 * Single LLM call — generates text from a prompt string.
 * Uses generateText (not streamText) because each pipeline stage is a complete
 * discrete call; we don't need token-by-token streaming within a stage.
 *
 * Throws on network/API errors — callers should wrap in retryStage().
 */
export async function callLLM(prompt: string, config: ModelConfig): Promise<string> {
  const result = await generateText({
    model: config.model,
    prompt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    providerOptions: config.providerOptions as any,
    maxOutputTokens: 8192,
    maxRetries: 0,
  })
  return result.text
}
