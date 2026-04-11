import { createOpenAI } from '@ai-sdk/openai'
import { wrapLanguageModel } from 'ai'
import type { LanguageModel, LanguageModelMiddleware } from 'ai'

/**
 * Middleware for Ollama / custom OpenAI-compatible endpoints.
 *
 * Problem: the Vercel AI SDK's Output.object() sends
 *   responseFormat = { type:'json', schema: <JSONSchema7> }
 * The OpenAI adapter converts this to response_format: { type:'json_schema', ... },
 * but Ollama only supports response_format: { type:'json_object' }.
 *
 * Solution (two steps applied together):
 *   1. Move the JSON Schema into the system prompt so the model still knows
 *      exactly what structure to produce.
 *   2. Strip the schema from responseFormat → adapter sends json_object mode.
 *
 * Output.object() parses the JSON text from the stream and validates it
 * client-side, so the schema is enforced even without server-side structured
 * output support.
 */
const ollamaCompatMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',
  transformParams: async ({ params }) => {
    const { responseFormat } = params
    if (
      responseFormat?.type === 'json' &&
      'schema' in responseFormat &&
      responseFormat.schema != null
    ) {
      // Append schema to the system message so Ollama knows the exact shape.
      const schemaInstruction =
        '\n\n---\n\n' +
        'OUTPUT FORMAT: Return ONLY a raw JSON object — no markdown, no backticks, no explanation. ' +
        'The object MUST conform to this JSON Schema:\n' +
        JSON.stringify(responseFormat.schema)

      const updatedPrompt = params.prompt.map((msg) => {
        if (msg.role === 'system') {
          return { ...msg, content: msg.content + schemaInstruction }
        }
        return msg
      })

      return {
        ...params,
        prompt: updatedPrompt,
        responseFormat: { type: 'json' as const }, // no schema → json_object mode
      }
    }
    return params
  },
}

/**
 * Creates an OpenAI-compatible language model pointed at a custom base URL.
 * Used for both Ollama (local) and Custom Endpoint providers.
 *
 * - Uses .chat() to target /v1/chat/completions (not the newer /v1/responses).
 * - Wraps with ollamaCompatMiddleware to inject the schema into the system
 *   prompt and switch from json_schema to json_object response format.
 */
export function getOllamaProvider(
  baseURL: string,
  model: string,
  customFetch?: typeof fetch,
): LanguageModel {
  const client = createOpenAI({
    baseURL,
    apiKey: 'ollama',
    ...(customFetch && { fetch: customFetch }),
  })
  return wrapLanguageModel({
    model: client.chat(model),
    middleware: ollamaCompatMiddleware,
  })
}
