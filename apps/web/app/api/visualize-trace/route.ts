import type { NextRequest } from 'next/server'
import { resolveModel } from '@/src/ai/providers'
import { extractByokHeaders } from '@/lib/headers'
import { jsonError } from '@/lib/responses'
import { streamTraceToScene } from '@/src/ai/traceToScene'
import { isValidLanguage, type TraceData } from '@/src/sandbox/types'

export const maxDuration = 180

function isTraceData(value: unknown): value is TraceData {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as TraceData).steps)
  )
}

export async function POST(req: NextRequest) {
  const { byokKey, byokProvider, byokModel } = extractByokHeaders(req)

  let trace: TraceData
  let originalCode: string
  let language: 'python' | 'javascript'
  let problemStatement: string

  try {
    const body = await req.json()
    trace = body?.trace
    originalCode = (body?.originalCode ?? '').trim()
    const rawLanguage = (body?.language ?? '').trim().toLowerCase()
    if (!isValidLanguage(rawLanguage)) {
      return new Response('language must be "python" or "javascript"', { status: 400 })
    }
    language = rawLanguage
    problemStatement = (body?.problemStatement ?? '').trim()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  if (!isTraceData(trace)) {
    return new Response('trace with steps[] is required', { status: 400 })
  }
  if (!originalCode) {
    return new Response('originalCode is required', { status: 400 })
  }

  try {
    const provider = byokProvider ?? 'gemini'
    const model = resolveModel(provider, byokModel, byokKey)
    const result = streamTraceToScene(
      trace,
      originalCode,
      language,
      problemStatement,
      { model, provider },
    )
    return result.toTextStreamResponse()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Trace visualization failed.'
    return jsonError(message, 500)
  }
}
