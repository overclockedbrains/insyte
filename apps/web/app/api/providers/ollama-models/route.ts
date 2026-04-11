import { NextResponse } from 'next/server'

/**
 * GET /api/providers/ollama-models?baseURL=http://localhost:11434
 *
 * Server-side proxy for Ollama's model list endpoint.
 * Avoids CORS issues when the browser calls localhost:11434 directly.
 * Returns { models: Array<{ id: string; label: string }> }.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  // Accept either the full v1 base URL or the base host
  const rawBase = searchParams.get('baseURL') ?? 'http://localhost:11434'
  // Strip trailing /v1 suffix so we can call /api/tags on the root
  const base = rawBase.replace(/\/v1\/?$/, '')

  try {
    const res = await fetch(`${base}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return NextResponse.json({ models: [] })

    const data = (await res.json()) as { models?: { name: string }[] }
    const models = (data.models ?? []).map((m) => ({
      id: m.name,
      label: m.name,
    }))
    return NextResponse.json({ models })
  } catch {
    return NextResponse.json({ models: [], error: 'unreachable' })
  }
}
