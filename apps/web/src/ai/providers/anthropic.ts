import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

/** BYOK only — no server fallback for Anthropic. */
export function getAnthropicProvider(
  apiKey: string,
  model = 'claude-3-5-haiku-20241022',
): LanguageModel {
  const anthropic = createAnthropic({ apiKey })
  return anthropic(model)
}
