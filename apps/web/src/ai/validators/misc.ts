import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { Challenge, Control } from '@insyte/scene-engine'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ChallengeRawSchema = z.object({
  type: z.enum(['predict', 'break-it', 'optimize', 'scenario']),
  title: z.string().min(1),
  description: z.string().min(1),
})

const ControlRawSchema = z.object({
  type: z.enum(['slider', 'toggle', 'button']),
  id: z.string().min(1),
  label: z.string().min(1),
  config: z.record(z.unknown()).default({}),
})

const MiscResponseSchema = z.object({
  challenges: z.array(ChallengeRawSchema).default([]),
  controls: z.array(ControlRawSchema).default([]),
})

// ─── Result type ──────────────────────────────────────────────────────────────

export interface ValidatedMisc {
  ok: boolean
  challenges: Challenge[]
  controls: Control[]
  error?: string
}

// ─── validateMisc ─────────────────────────────────────────────────────────────

/**
 * Validates Stage 4 output.
 *
 * Non-fatal — on failure the pipeline continues with empty arrays.
 * Generates stable nanoid IDs for Challenge objects (Scene type requires id field).
 *
 * Maps ISCLControl.controlType → Control.type (Scene schema uses "type" not "controlType").
 */
export function validateMisc(raw: unknown): ValidatedMisc {
  const result = MiscResponseSchema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      challenges: [],
      controls: [],
      error: `Stage 4: invalid shape — ${result.error.message}`,
    }
  }

  const challenges: Challenge[] = result.data.challenges.map(c => ({
    id: nanoid(8),
    type: c.type,
    title: c.title,
    description: c.description,
  }))

  const controls: Control[] = result.data.controls.map(c => ({
    id: c.id,
    type: c.type,
    label: c.label,
    config: c.config,
  }))

  return { ok: true, challenges, controls }
}
