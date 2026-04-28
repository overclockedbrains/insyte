import type { NextRequest } from 'next/server'
import { instrumentCode } from '@/src/ai/instrumentCode'
import { resolveModel } from '@/src/ai/providers'
import { extractByokHeaders } from '@/lib/headers'
import { jsonError } from '@/lib/responses'
import { enforceFreeTierRateLimit } from '@/lib/server-auth'
import { isValidLanguage } from '@/src/sandbox/types'

function detectLanguage(code: string): 'python' | 'javascript' {
  if (/\bdef\s+\w+\(|\bimport\s+\w+|:\s*$/.test(code)) {
    return 'python'
  }
  return 'javascript'
}

export async function POST(req: NextRequest) {
  const { byokKey, byokProvider, byokModel, byokBaseURL } = extractByokHeaders(req)

  let code: string
  let language: 'python' | 'javascript'
  let problemStatement: string

  try {
    const body = await req.json()
    code = (body?.code ?? '').trim()
    const rawLanguage = (body?.language ?? '').trim().toLowerCase()
    language = isValidLanguage(rawLanguage) ? rawLanguage : detectLanguage(code)
    problemStatement = (body?.problemStatement ?? '').trim()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  if (!code) {
    return new Response('code is required', { status: 400 })
  }

  try {
    const rateLimitResponse = await enforceFreeTierRateLimit(req, Boolean(byokKey || byokBaseURL))
    if (rateLimitResponse) return rateLimitResponse

    const provider = byokProvider ?? 'gemini'
    const model = resolveModel(provider, byokModel, byokKey, undefined, byokBaseURL)
    const instrumentedCode = await instrumentCode(code, language, problemStatement, {
      model,
      provider,
    })
    return Response.json({ instrumentedCode })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Instrumentation failed.'
    return jsonError(message, 500)
  }
}
