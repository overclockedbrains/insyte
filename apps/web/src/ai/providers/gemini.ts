import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'

export function getGeminiProvider(apiKey?: string): LanguageModel {
  const google = createGoogleGenerativeAI({
    apiKey: apiKey ?? process.env.GEMINI_API_KEY,
  })
  return google('gemini-2.5-flash')
}
