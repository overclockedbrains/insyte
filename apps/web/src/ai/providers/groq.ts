import { createGroq } from '@ai-sdk/groq'
import type { LanguageModel } from 'ai'
import { REGISTRY } from '../registry'

export function getGroqProvider(
  apiKey: string,
  model?: string,
  customFetch?: typeof fetch,
): LanguageModel {
  const groq = createGroq({
    apiKey,
    ...(customFetch && { fetch: customFetch }),
  })
  return groq(model ?? REGISTRY.groq.defaultModel)
}
