import type { NextRequest } from 'next/server'
import { resolveModel } from '@/src/ai/providers'
import type { Provider } from '@/src/ai/registry'
import { streamTraceToScene } from '@/src/ai/traceToScene'
import type { TraceData } from '@/src/sandbox/types'

export const maxDuration = 180

function isLanguage(value: string): value is 'python' | 'javascript' {
  return value === 'python' || value === 'javascript'
}

function isTraceData(value: unknown): value is TraceData {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as TraceData).steps)
  )
}

export async function POST(req: NextRequest) {
  const byokKey = req.headers.get('x-api-key')
  const byokProvider = req.headers.get('x-provider') as Provider | null
  const byokModel = req.headers.get('x-model')

  let trace: TraceData
  let originalCode: string
  let language: 'python' | 'javascript'
  let problemStatement: string

  try {
    const body = await req.json()
    trace = body?.trace
    originalCode = (body?.originalCode ?? '').trim()
    const rawLanguage = (body?.language ?? '').trim().toLowerCase()
    language = isLanguage(rawLanguage) ? rawLanguage : 'python'
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
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

