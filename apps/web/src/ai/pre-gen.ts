import { generateObject as aiGenerateObject } from 'ai'
import { getGeminiProvider } from './providers/gemini'
import { PreGenSchema } from './schemas'
import type { PreGenResult } from './schemas'

// ─── Pre-gen ──────────────────────────────────────────────────────────────────

// Cheapest model — pre-gen is a lightweight classification call, not a heavy pipeline stage.
const PRE_GEN_MODEL = 'gemini-2.5-flash-lite'

const PRE_GEN_SYSTEM =
  'You are a CS education assistant. Given a topic, do two things:\n' +
  '1. Classify the simulation mode: concept (explaining a CS concept), ' +
  'dsa-trace (algorithm/data structure trace), ' +
  'lld (low-level design — implement a specific component), ' +
  'or hld (high-level system design).\n' +
  '2. Generate up to 3 short, specific clarifying questions that would meaningfully ' +
  'improve the simulation. Tailor questions to the mode — DSA questions differ from HLD questions.\n' +
  'Return only what the schema requires.'

/**
 * Derives the best simulation mode for a topic and generates up to 3 scoped
 * clarifying questions in a single lightweight AI call.
 *
 * Uses the cheapest Gemini model (Flash Lite) — target latency under 3s.
 * On failure, callers should fall back to { mode: 'concept', questions: [] }.
 */
export async function generatePreGen(topic: string): Promise<PreGenResult> {
  const model = getGeminiProvider(undefined, PRE_GEN_MODEL)
  const { object } = await aiGenerateObject({
    model,
    schema: PreGenSchema,
    system: PRE_GEN_SYSTEM,
    prompt: `Topic: ${topic}`,
    maxRetries: 1,
  })
  return object
}

export type { PreGenResult }
