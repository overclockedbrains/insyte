import { z } from 'zod'
import type { ISCLParsed } from '@insyte/scene-engine'

// ─── Schema ───────────────────────────────────────────────────────────────────

const StatesResponseSchema = z.object({
  initialStates: z.record(z.unknown()),
})

// ─── Result type ──────────────────────────────────────────────────────────────

export interface ValidatedStates {
  ok: boolean
  states: Record<string, unknown>
  error?: string
}

// ─── validateStates ───────────────────────────────────────────────────────────

/**
 * Validates Stage 2a output.
 *
 * Checks:
 * 1. Top-level shape: { initialStates: Record<string, unknown> }
 * 2. Every declared visual ID has a corresponding initialState entry
 *
 * Returns a degraded result on failure — the pipeline falls back to empty
 * initial states rather than aborting generation.
 */
export function validateStates(raw: unknown, parsed: ISCLParsed): ValidatedStates {
  const result = StatesResponseSchema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      states: {},
      error: `Stage 2a: invalid shape — ${result.error.message}`,
    }
  }

  const { initialStates } = result.data

  for (const decl of parsed.visualDecls) {
    if (!(decl.id in initialStates)) {
      return {
        ok: false,
        states: {},
        error: `Stage 2a: missing initialState for visual "${decl.id}". Received keys: ${Object.keys(initialStates).join(', ')}`,
      }
    }
  }

  return { ok: true, states: initialStates }
}
