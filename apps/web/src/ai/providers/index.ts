import type { LanguageModel } from 'ai'
import type { Provider } from '@/src/stores/slices/settings-slice'
import { getGeminiProvider } from './gemini'
import { getOpenAIProvider } from './openai'
import { getAnthropicProvider } from './anthropic'
import { getGroqProvider } from './groq'

export interface ProviderSettings {
  provider: Provider
  model: string
  apiKeys: Record<Provider, string | null>
}

/**
 * Returns the correct LanguageModel based on the settings state.
 * BYOK: uses the key stored in settings (keys never leave the client when used browser-direct).
 * Falls back to Gemini Flash server key when no BYOK key is configured.
 */
export function getAIProvider(settings: ProviderSettings): LanguageModel {
  const { provider, model, apiKeys } = settings
  const key = apiKeys[provider]

  if (key) {
    switch (provider) {
      case 'openai':
        return getOpenAIProvider(key, model)
      case 'anthropic':
        return getAnthropicProvider(key, model)
      case 'groq':
        return getGroqProvider(key, model)
      case 'gemini':
        return getGeminiProvider(key)
    }
  }

  // No BYOK key for the selected provider → fall back to Gemini Flash (server key)
  return getGeminiProvider()
}
