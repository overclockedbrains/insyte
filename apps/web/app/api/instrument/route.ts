import type { NextRequest } from 'next/server'
import { instrumentCode } from '@/src/ai/instrumentCode'
import { resolveModel } from '@/src/ai/providers'
import type { Provider } from '@/src/ai/registry'

function detectLanguage(code: string): 'python' | 'javascript' {
  if (/\bdef\s+\w+\(|\bimport\s+\w+|:\s*$/.test(code)) {
    return 'python'
  }
  return 'javascript'
}

export async function POST(req: NextRequest) {
  const byokKey = req.headers.get('x-api-key')
  const byokProvider = req.headers.get('x-provider') as Provider | null
  const byokModel = req.headers.get('x-model')

  let code: string
  let language: 'python' | 'javascript'
  let problemStatement: string

  try {
    const body = await req.json()
    code = (body?.code ?? '').trim()
    const rawLanguage = (body?.language ?? '').trim().toLowerCase()
    language =
      rawLanguage === 'python' || rawLanguage === 'javascript'
        ? rawLanguage
        : detectLanguage(code)
    problemStatement = (body?.problemStatement ?? '').trim()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  if (!code) {
    return new Response('code is required', { status: 400 })
  }

  try {
    const provider = byokProvider ?? 'gemini'
    const model = resolveModel(provider, byokModel, byokKey)
    const instrumentedCode = await instrumentCode(code, language, problemStatement, {
      model,
      provider,
    })
    return Response.json({ instrumentedCode })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Instrumentation failed.'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

