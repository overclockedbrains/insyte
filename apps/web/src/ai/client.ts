import { generateText, generateObject as aiGenerateObject } from 'ai'
import type { LanguageModel } from 'ai'
import { z } from 'zod'
import type { ProviderOptions } from './types/provider-options'

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
  providerOptions: ProviderOptions
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
    providerOptions: config.providerOptions,
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
    schema: schema as z.ZodType<T>,
    prompt,
    ...(system ? { system } : {}),
    providerOptions: config.providerOptions,
    temperature: config.temperature ?? 0.1,
    maxRetries: 0,
  })
  return object as T
}

// ─── generateJson ─────────────────────────────────────────────────────────────

/**
 * Free-text generation + post-hoc Zod validation.
 *
 * Use instead of generateObject when the schema is too deeply nested for
 * Gemini's constrained decoding (response_schema) to handle reliably.
 * The model generates freely; we parse and validate the JSON afterwards.
 * On a Zod mismatch the error propagates to retryStage, which injects it
 * into the next prompt — same retry loop as generateObject.
 */
export async function generateJson<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  config: ModelConfig,
  system?: string,
): Promise<T> {
  const fullSystem = [
    system,
    'Return ONLY valid JSON — no markdown fences, no preamble, no trailing text.',
  ].filter(Boolean).join('\n\n')

  const { text } = await generateText({
    model: config.model,
    prompt,
    system: fullSystem,
    providerOptions: config.providerOptions,
    temperature: config.temperature ?? 0.2,
    maxOutputTokens: 16384,
    maxRetries: 0,
  })

  // Strip markdown code fence the model may add despite instructions
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

  // Model may output chain-of-thought preamble before the JSON object (e.g. stage-2
  // asks it to list teaching moments first). Extract the outermost JSON object.
  const jsonMatch = stripped.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new SyntaxError('No JSON object found in model response')
  return schema.parse(JSON.parse(jsonMatch[0])) as T
}
