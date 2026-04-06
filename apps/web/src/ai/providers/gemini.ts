import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'
import { REGISTRY } from '../registry'

export function getGeminiProvider(
  apiKey?: string,
  model?: string,
  customFetch?: typeof fetch,
): LanguageModel {
  const google = createGoogleGenerativeAI({
    apiKey: apiKey ?? process.env.GEMINI_API_KEY,
    ...(customFetch && { fetch: customFetch }),
  })
  return google(model ?? REGISTRY.gemini.defaultModel)
}
