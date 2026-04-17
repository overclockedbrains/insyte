// ─── Stage-to-Model Routing (Phase 31 — Provider-Aware Tier Routing) ────────────
//
// Free tier: each stage uses a specific Gemini model optimised for that task.
// BYOK — routed provider (Gemini, OpenAI, Anthropic, Groq): per-stage tier routing.
// BYOK — unrouted provider (Ollama, Custom): user's configured model for all stages.

/**
 * Default model IDs per stage — used when no BYOK key is active (free tier).
 * These are server-side Gemini models billed to insyte's key.
 *
 * Rationale:
 *   stage0 — Gemini 2.5 Pro:       best reasoning quality for free-text planning
 *   stage1 — Gemini 2.5 Flash:     cheap, fast transcription of stage0 decisions into JSON
 *   stage2 — Gemini 2.5 Pro:       coherence for step + explanation co-generation
 *   stage3 — Gemini 2.5 Flash:     cheap popup annotation
 *   stage4 — Gemini 2.5 Flash Lite: cheapest model for challenge generation
 */
export const STAGE_MODELS = {
  stage0: 'gemini-2.5-pro',
  stage1: 'gemini-2.5-flash',
  stage2: 'gemini-2.5-pro',
  stage3: 'gemini-2.5-flash',
  stage4: 'gemini-2.5-flash-lite',
} as const

export type StageKey = keyof typeof STAGE_MODELS

export type RoutingTier = 'frontier' | 'mid' | 'cheap'

/**
 * Which tier each pipeline stage uses.
 *
 *   frontier — strongest reasoning model  (Stage 0: free planning pass)
 *   mid      — coherent but cost-aware    (Stage 2: explanation–action alignment)
 *   cheap    — fastest, cheapest          (Stages 1, 3, 4: transcription, popups, quiz)
 */
export const STAGE_TIERS: Record<StageKey, RoutingTier> = {
  stage0: 'frontier',
  stage1: 'cheap',
  stage2: 'mid',
  stage3: 'cheap',
  stage4: 'cheap',
}

/**
 * Provider-aware tier model map for all routed providers.
 *
 * Providers absent from this map (ollama, custom) are unrouted —
 * resolveStageModel falls back to the user's configured model for all stages.
 *
 * Pricing context (April 2026, per 1M input tokens):
 *   Gemini:    2.5 Pro $1.25  / 2.5 Flash $0.30  / Flash-Lite $0.10
 *   Anthropic: Opus $5.00     / Sonnet $3.00      / Haiku $1.00
 *   OpenAI:    o3 ~$10.00     / gpt-4.1 ~$2.00    / gpt-4o-mini $0.15
 *   Groq:      latency-first; minor cost delta — differentiate heavy vs fast only
 */
export const PROVIDER_TIER_MODELS: Partial<Record<string, Record<RoutingTier, string>>> = {
  gemini: {
    frontier: 'gemini-2.5-pro',
    mid:      'gemini-2.5-flash',
    cheap:    'gemini-2.5-flash-lite',
  },
  anthropic: {
    frontier: 'claude-opus-4-6',
    mid:      'claude-sonnet-4-6',
    cheap:    'claude-haiku-4-5-20251001',
  },
  openai: {
    frontier: 'o3',
    mid:      'gpt-4.1',
    cheap:    'gpt-4o-mini',
  },
  groq: {
    // Groq's value is throughput — differentiate Stage 0 (heavy) vs 1/3/4 (fast) only.
    // Stage 2 also gets the large model for explanation coherence.
    frontier: 'llama-3.3-70b-versatile',
    mid:      'llama-3.3-70b-versatile',
    cheap:    'llama-3.1-8b-instant',
  },
}

/**
 * Resolve the model ID for a pipeline stage.
 *
 *   fallbackModel === null            → free tier → STAGE_MODELS[stage]
 *   providerName in PROVIDER_TIER_MODELS → routed BYOK → tier model for this stage
 *   otherwise (ollama, custom)         → unrouted BYOK → fallbackModel (user's model, all stages)
 */
export function resolveStageModel(
  stage: StageKey,
  providerName: string,
  fallbackModel: string | null,
): string {
  // Free tier — our server key, per-stage Gemini models
  if (fallbackModel === null) return STAGE_MODELS[stage]

  // BYOK — routed provider: use the tier model for this stage
  const tierModels = PROVIDER_TIER_MODELS[providerName]
  if (tierModels) {
    return tierModels[STAGE_TIERS[stage]]
  }

  // BYOK — unrouted provider (ollama, custom): user's model for all stages
  return fallbackModel
}
