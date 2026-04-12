import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { ISCLParsed, ExplanationSection, Popup } from '@insyte/scene-engine'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ExplanationRawSchema = z.object({
  appearsAtStep: z.number().int().nonnegative(),
  heading: z.string().min(1),
  body: z.string().min(1),
})

const PopupRawSchema = z.object({
  attachTo: z.string(),
  showAtStep: z.number().int().nonnegative(),
  hideAtStep: z.number().int().nonnegative().optional(),
  text: z.string().min(1),
  style: z.enum(['info', 'success', 'warning', 'insight']).default('info'),
})

const AnnotationsResponseSchema = z.object({
  explanation: z.array(ExplanationRawSchema),
  popups: z.array(PopupRawSchema),
})

// ─── Result type ──────────────────────────────────────────────────────────────

export interface ValidatedAnnotations {
  ok: boolean
  explanation: ExplanationSection[]
  popups: Popup[]
  error?: string
}

// ─── validateAnnotations ──────────────────────────────────────────────────────

/**
 * Validates Stage 3 output.
 *
 * Checks:
 * 1. Top-level shape: { explanation: [...], popups: [...] }
 * 2. explanation.appearsAtStep < stepCount
 * 3. popup.attachTo ∈ visualIds
 * 4. popup.showAtStep < stepCount
 * 5. popup.hideAtStep <= stepCount (if present)
 *
 * Non-fatal — on failure the pipeline continues with empty annotation arrays.
 * Generates stable nanoid IDs for Popup objects (Scene type requires id field).
 */
export function validateAnnotations(raw: unknown, parsed: ISCLParsed): ValidatedAnnotations {
  const result = AnnotationsResponseSchema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      explanation: [],
      popups: [],
      error: `Stage 3: invalid shape — ${result.error.message}`,
    }
  }

  const { explanation, popups } = result.data

  // Validate explanation step indices
  for (const entry of explanation) {
    if (entry.appearsAtStep >= parsed.stepCount) {
      return {
        ok: false,
        explanation: [],
        popups: [],
        error: `Stage 3: explanation appearsAtStep ${entry.appearsAtStep} >= stepCount ${parsed.stepCount}`,
      }
    }
  }

  // Validate popup references
  for (const popup of popups) {
    if (!parsed.visualIds.has(popup.attachTo)) {
      return {
        ok: false,
        explanation: [],
        popups: [],
        error: `Stage 3: popup attachTo "${popup.attachTo}" is not a declared visual ID. Valid: ${[...parsed.visualIds].join(', ')}`,
      }
    }
    if (popup.showAtStep >= parsed.stepCount) {
      return {
        ok: false,
        explanation: [],
        popups: [],
        error: `Stage 3: popup showAtStep ${popup.showAtStep} >= stepCount ${parsed.stepCount}`,
      }
    }
    if (popup.hideAtStep !== undefined && popup.hideAtStep > parsed.stepCount) {
      return {
        ok: false,
        explanation: [],
        popups: [],
        error: `Stage 3: popup hideAtStep ${popup.hideAtStep} > stepCount ${parsed.stepCount}`,
      }
    }
  }

  const explanationSections: ExplanationSection[] = explanation.map(e => ({
    appearsAtStep: e.appearsAtStep,
    heading: e.heading,
    body: e.body,
  }))

  const popupItems: Popup[] = popups.map(p => ({
    id: nanoid(8),
    attachTo: p.attachTo,
    showAtStep: p.showAtStep,
    hideAtStep: p.hideAtStep,
    text: p.text,
    style: p.style,
  }))

  return { ok: true, explanation: explanationSections, popups: popupItems }
}
