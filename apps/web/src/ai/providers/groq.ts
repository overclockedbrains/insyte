import { createGroq } from '@ai-sdk/groq'
import type { LanguageModel } from 'ai'

/** BYOK only — no server fallback for Groq. */
export function getGroqProvider(
  apiKey: string,
  model = 'llama-3.1-70b-versatile',
): LanguageModel {
  const groq = createGroq({ apiKey })
  return groq(model)
}
