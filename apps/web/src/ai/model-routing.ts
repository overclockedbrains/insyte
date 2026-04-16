// ─── Stage-to-Model Routing (Phase 30 — Static) ──────────────────────────────
//
// Phase 30 stance: static routing only.
// BYOK provider-aware tier routing is deferred to Phase 31.
//
// Free tier: each stage uses a specific model optimised for that stage's task.
// BYOK active: every stage uses the user's selected model (no routing).

/**
 * Default model IDs per stage used when no BYOK key is active.
 *
 * Rationale:
 *   stage0 — Gemini 2.5 Pro: best reasoning quality for free-text planning
 *   stage1 — Gemini 2.0 Flash: cheap, fast transcription of stage0 decisions into JSON
 *   stage2 — Gemini 2.0 Pro: coherence for step + explanation co-generation (explanation-action alignment)
 *   stage3 — Gemini 2.0 Flash: cheap popup annotation
 *   stage4 — Gemini 2.0 Flash Lite: cheapest model for challenge generation (free-tier cost optimisation)
 */
export const STAGE_MODELS = {
  stage0: 'gemini-2.5-pro',
  stage1: 'gemini-2.5-flash',
  stage2: 'gemini-2.5-pro',
  stage3: 'gemini-2.5-flash',
  stage4: 'gemini-2.5-flash-lite',
} as const

export type StageKey = keyof typeof STAGE_MODELS

/**
 * Resolve the model ID for a pipeline stage.
 *
 * BYOK (byokModel != null): user's model for ALL stages — static, no routing.
 * Free tier (byokModel == null): stage-specific model from STAGE_MODELS.
 *
 * Phase 31 will add provider-aware tier selection for BYOK users so they
 * get the benefit of routing even with their own key.
 */
export function resolveStageModel(
  stage: StageKey,
  byokModel: string | null,
): string {
  if (byokModel) return byokModel
  return STAGE_MODELS[stage]
}
