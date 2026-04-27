import { generateText } from 'ai'
import type { NextRequest } from 'next/server'
import { extractByokHeaders } from '@/lib/headers'
import { resolveModel } from '@/src/ai/providers'
import { REGISTRY, SERVER_PROVIDER } from '@/src/ai/registry'
import type { Provider } from '@/src/ai/registry'

// ─── GET /api/test-key ────────────────────────────────────────────────────────
//
// Fires a minimal LLM call to verify that the active key is valid.
// - BYOK active (x-api-key or x-base-url present): tests the user's key/endpoint.
// - Default tier (no headers): tests the server's built-in Gemini key.
//
// Response shape:
//   200  { ok: true,  provider, model, byok }
//   200  { ok: false, error, provider, model, byok }   — key invalid / unreachable

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const { byokKey, byokProvider, byokModel, byokBaseURL } = extractByokHeaders(req)

  const byok = !!(byokKey || byokBaseURL)

  // Derive the effective provider + model for the response payload
  const effectiveProvider: Provider = byok
    ? ((byokProvider && byokProvider in REGISTRY ? byokProvider : SERVER_PROVIDER) as Provider)
    : SERVER_PROVIDER

  const effectiveModel =
    byokModel ||
    REGISTRY[effectiveProvider]?.defaultModel ||
    REGISTRY[SERVER_PROVIDER].defaultModel

  let model
  try {
    model = resolveModel(
      byokProvider ?? SERVER_PROVIDER,
      byokModel,
      byokKey,
      undefined,
      byokBaseURL,
    )
  } catch (err) {
    return json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to initialise provider',
      provider: effectiveProvider,
      model: effectiveModel,
      byok,
    })
  }

  const prompt = 'Reply with the single word: ok'

  try {
    const result = await generateText({
      model,
      prompt,
      maxOutputTokens: 10,
      maxRetries: 0,
    })

    return json({
      ok: true,
      provider: effectiveProvider,
      model: effectiveModel,
      byok,
      probe: { prompt, response: result.text.trim() },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return json({
      ok: false,
      error: message,
      provider: effectiveProvider,
      model: effectiveModel,
      byok,
      probe: { prompt, response: null },
    })
  }
}

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
