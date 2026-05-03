import { type NextRequest } from 'next/server'
import { generatePreGen } from '@/src/ai'

// ─── POST /api/pre-gen ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let topic: string
  try {
    const body = await req.json()
    topic = body?.topic?.trim() ?? ''
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  if (!topic) {
    return new Response('topic is required', { status: 400 })
  }

  try {
    const result = await generatePreGen(topic)
    return Response.json(result)
  } catch {
    // Fail gracefully — the pre-gen screen still works without AI-derived questions
    return Response.json({ mode: 'concept', questions: [] })
  }
}
