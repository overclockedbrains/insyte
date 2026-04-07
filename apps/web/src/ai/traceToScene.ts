import { streamObject } from 'ai'
import type { LanguageModel } from 'ai'
import { SceneSchema } from '@insyte/scene-engine'
import type { Scene } from '@insyte/scene-engine'
import { resolveModel } from './providers'
import { REGISTRY } from './registry'
import type { Provider } from './registry'
import { loadPromptMarkdown } from './prompts/loadPrompt'
import type { TraceData } from '@/src/sandbox/types'

const TRACE_TO_SCENE_SYSTEM_PROMPT = loadPromptMarkdown('trace-to-scene.md')

interface TraceToSceneOptions {
  model?: LanguageModel
  provider?: Provider
}

function buildTracePrompt(
  trace: TraceData,
  originalCode: string,
  language: string,
  problemStatement: string,
): string {
  return [
    `Language: ${language}`,
    `Problem Statement: ${problemStatement || 'N/A'}`,
    'Original Code:',
    originalCode,
    '',
    'Trace Data:',
    JSON.stringify(trace),
  ].join('\n')
}

export function streamTraceToScene(
  trace: TraceData,
  originalCode: string,
  language: string,
  problemStatement: string,
  options?: TraceToSceneOptions,
) {
  const provider = options?.provider ?? 'gemini'
  const model = options?.model ?? resolveModel(provider, null, null)

  return streamObject({
    model,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: SceneSchema as any,
    system: TRACE_TO_SCENE_SYSTEM_PROMPT,
    prompt: buildTracePrompt(trace, originalCode, language, problemStatement),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    providerOptions: REGISTRY[provider].providerOptions as any,
    maxOutputTokens: 32768,
    maxRetries: 0,
  })
}

export async function* traceToScene(
  trace: TraceData,
  originalCode: string,
  language: string,
  problemStatement: string,
  options?: TraceToSceneOptions,
): AsyncGenerator<Partial<Scene>> {
  const result = streamTraceToScene(
    trace,
    originalCode,
    language,
    problemStatement,
    options,
  )

  for await (const partial of result.partialObjectStream) {
    if (partial) {
      yield partial as Partial<Scene>
    }
  }
}
