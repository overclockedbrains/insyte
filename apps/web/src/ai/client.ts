import { generateText, generateObject as aiGenerateObject } from 'ai'
import type { LanguageModel } from 'ai'
import { z } from 'zod'

// ─── ModelConfig ──────────────────────────────────────────────────────────────

/**
 * Encapsulates everything the AI pipeline needs to hit a model.
 * Constructed from request headers in the route handler and threaded
 * through the entire pipeline unchanged.
 *
 * Phase 30 additions:
 *   byokModel  — null = free tier (per-stage routing active);
 *                string = BYOK model ID (same model for all stages, no routing)
 *   createModel — factory that resolves a model ID to a LanguageModel instance.
 *                 Free tier: creates a Gemini model with the given ID.
 *                 BYOK / Ollama / Custom: ignores ID and always returns the user's model.
 *   temperature — optional override forwarded to the AI SDK call.
 */
export interface ModelConfig {
  model: LanguageModel
  /**
   * Provider-specific options forwarded to the Vercel AI SDK (e.g. Gemini
   * thinking budget). Keyed by the provider name as the AI SDK expects it.
   */
  providerOptions: Record<string, unknown>
  /**
   * null  = free tier — pipeline uses STAGE_MODELS per-stage routing.
   * string = BYOK active — pipeline uses this model for every stage (no routing).
   */
  byokModel: string | null
  /**
   * Resolves a model ID string to a LanguageModel instance.
   * Used by the pipeline to create per-stage models on the free tier.
   */
  createModel: (modelId: string) => LanguageModel
  /**
   * Active provider name — used by the pipeline to build provider-specific
   * options (e.g. thinking config for Stage 0).
   * Values: 'gemini' | 'anthropic' | 'openai' | 'groq' | 'ollama' | 'custom'
   */
  providerName: string
  /** Temperature passed to the AI call. */
  temperature?: number
}

// ─── callLLM ─────────────────────────────────────────────────────────────────

/**
 * Single LLM text call.
 * Used by Stage 0 (free reasoning) and liveChat.
 * Throws on network/API errors — callers should wrap in retryStage().
 */
export async function callLLM(prompt: string, config: ModelConfig): Promise<string> {
  const result = await generateText({
    model: config.model,
    prompt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    providerOptions: config.providerOptions as any,
    temperature: config.temperature,
    maxOutputTokens: 8192,
    maxRetries: 0,
  })
  return result.text
}

// ─── generateObject ───────────────────────────────────────────────────────────

/**
 * Structured output call using Vercel AI SDK's generateObject.
 * Uses constrained decoding — the response is guaranteed to match the Zod
 * schema at the token level, eliminating post-hoc JSON parsing failures.
 *
 * Accepts an optional system prompt (separate from the user turn) for stages
 * that need role/constraint priming before structured generation.
 *
 * Throws on network/API/validation errors — callers should wrap in retryStage().
 */
export async function generateObject<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  config: ModelConfig,
  system?: string,
): Promise<T> {
  const { object } = await aiGenerateObject({
    model: config.model,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: schema as any,
    prompt,
    ...(system ? { system } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    providerOptions: config.providerOptions as any,
    temperature: config.temperature ?? 0.1,
    maxRetries: 0,
  })
  return object as T
}
