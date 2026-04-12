import { z } from 'zod'
import type { ISCLParsed, Step } from '@insyte/scene-engine'

// ─── Schema ───────────────────────────────────────────────────────────────────

const ActionRawSchema = z.object({
  target: z.string(),
  params: z.record(z.unknown()),
})

const StepRawSchema = z.object({
  index: z.number().int().nonnegative(),
  actions: z.array(ActionRawSchema),
})

const StepsResponseSchema = z.object({
  steps: z.array(StepRawSchema),
})

// ─── Result type ──────────────────────────────────────────────────────────────

export interface ValidatedSteps {
  ok: boolean
  steps: Step[]
  error?: string
}

// ─── validateSteps ────────────────────────────────────────────────────────────

/**
 * Validates Stage 2b output.
 *
 * Checks:
 * 1. Top-level shape: { steps: Array<{ index, actions }> }
 * 2. Every action.target is in parsed.visualIds
 * 3. No step index >= parsed.stepCount
 *
 * Normalises:
 * - Prepends a synthetic step 0 (no actions) if the AI omitted it (spec says to omit it)
 * - Sorts steps by index
 *
 * This stage is fatal — no step data = no visualization.
 */
export function validateSteps(raw: unknown, parsed: ISCLParsed): ValidatedSteps {
  const result = StepsResponseSchema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      steps: [],
      error: `Stage 2b: invalid shape — ${result.error.message}`,
    }
  }

  const rawSteps = result.data.steps

  for (const step of rawSteps) {
    // Step index bounds
    if (step.index >= parsed.stepCount) {
      return {
        ok: false,
        steps: [],
        error: `Stage 2b: step index ${step.index} is out of range (stepCount=${parsed.stepCount})`,
      }
    }
    // Action target validation — the key invariant of the pipeline
    for (const action of step.actions) {
      if (!parsed.visualIds.has(action.target)) {
        return {
          ok: false,
          steps: [],
          error: `Stage 2b: step ${step.index} action targets unknown visual ID "${action.target}". Valid IDs: ${[...parsed.visualIds].join(', ')}`,
        }
      }
    }
  }

  // Normalise: always include step 0 with no actions (spec: AI omits it)
  const hasStep0 = rawSteps.some(s => s.index === 0)
  const allSteps: Step[] = hasStep0
    ? rawSteps.map(s => ({ index: s.index, actions: s.actions }))
    : [{ index: 0, actions: [] }, ...rawSteps.map(s => ({ index: s.index, actions: s.actions }))]

  allSteps.sort((a, b) => a.index - b.index)

  return { ok: true, steps: allSteps }
}
