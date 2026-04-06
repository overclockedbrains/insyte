import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

/** BYOK only — no server fallback for OpenAI. */
export function getOpenAIProvider(apiKey: string, model = 'gpt-4o-mini'): LanguageModel {
  const openai = createOpenAI({ apiKey })
  return openai(model)
}
