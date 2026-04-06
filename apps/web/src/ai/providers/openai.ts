import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { REGISTRY } from '../registry'

export function getOpenAIProvider(
  apiKey: string,
  model?: string,
  customFetch?: typeof fetch,
): LanguageModel {
  const openai = createOpenAI({
    apiKey,
    ...(customFetch && { fetch: customFetch }),
  })
  return openai(model ?? REGISTRY.openai.defaultModel)
}
