import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'
import { REGISTRY } from '../registry'

export function getAnthropicProvider(
  apiKey: string,
  model?: string,
  customFetch?: typeof fetch,
): LanguageModel {
  const anthropic = createAnthropic({
    apiKey,
    ...(customFetch && { fetch: customFetch }),
  })
  return anthropic(model ?? REGISTRY.anthropic.defaultModel)
}
