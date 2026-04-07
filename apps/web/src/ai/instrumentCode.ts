import { generateText } from 'ai'
import type { LanguageModel } from 'ai'
import { resolveModel } from './providers'
import { REGISTRY } from './registry'
import type { Provider } from './registry'
import { loadPromptMarkdown } from './prompts/loadPrompt'

const CODE_INSTRUMENTATION_SYSTEM_PROMPT = loadPromptMarkdown('code-instrumentation.md')

interface InstrumentCodeOptions {
  model?: LanguageModel
  provider?: Provider
}

function stripCodeFences(value: string): string {
  const trimmed = value.trim()
  const fenced = trimmed.match(/^```(?:\w+)?\s*([\s\S]*?)\s*```$/)
  return fenced ? (fenced[1] ?? '').trim() : trimmed
}

export async function instrumentCode(
  code: string,
  language: 'python' | 'javascript',
  problemStatement: string,
  options?: InstrumentCodeOptions,
): Promise<string> {
  const provider = options?.provider ?? 'gemini'
  const model = options?.model ?? resolveModel(provider, null, null)

  const result = await generateText({
    model,
    system: CODE_INSTRUMENTATION_SYSTEM_PROMPT,
    prompt: [
      `Language: ${language}`,
      `Problem Statement:\n${problemStatement || 'N/A'}`,
      'Original Code:',
      code,
      '',
      'Return instrumented code only.',
    ].join('\n'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    providerOptions: REGISTRY[provider].providerOptions as any,
    maxOutputTokens: 8192,
    maxRetries: 0,
  })

  const instrumented = stripCodeFences(result.text)
  if (!instrumented) {
    throw new Error('AI returned empty instrumented code.')
  }
  return instrumented
}
