// ─── resolveModel ─────────────────────────────────────────────────────────────
//
// Server-side helper used by both /api/chat and /api/generate.
// Instantiates the correct provider SDK based on the request parameters and
// returns a LanguageModel ready for streamText / generateText.
//
// customFetch — optional: pass the undici long-timeout agent for /api/generate.

import type { LanguageModel } from 'ai'
import { REGISTRY, SERVER_PROVIDER } from '../registry'
import type { Provider } from '../registry'
import { getGeminiProvider } from './gemini'
import { getOpenAIProvider } from './openai'
import { getAnthropicProvider } from './anthropic'
import { getGroqProvider } from './groq'

export function resolveModel(
  provider: string,
  model: string | null | undefined,
  apiKey: string | null | undefined,
  customFetch?: typeof fetch,
): LanguageModel {
  const resolvedProvider = (
    provider in REGISTRY ? provider : SERVER_PROVIDER
  ) as Provider

  const resolvedModel = model || REGISTRY[resolvedProvider].defaultModel

  // BYOK path: use the supplied key with the requested provider
  if (apiKey) {
    switch (resolvedProvider) {
      case 'openai':
        return getOpenAIProvider(apiKey, resolvedModel, customFetch)
      case 'anthropic':
        return getAnthropicProvider(apiKey, resolvedModel, customFetch)
      case 'groq':
        return getGroqProvider(apiKey, resolvedModel, customFetch)
      case 'gemini':
      default:
        return getGeminiProvider(apiKey, resolvedModel, customFetch)
    }
  }

  // Core path: server Gemini key, ignores requested provider
  return getGeminiProvider(undefined, REGISTRY[SERVER_PROVIDER].defaultModel, customFetch)
}
