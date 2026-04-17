# Phase 31 — BYOK Model Routing

> **Revision 1 — April 17, 2026**

**Goal:** Replace Phase 30's static BYOK behaviour (every stage gets the user's single selected model) with provider-aware tier routing — when a user brings their own API key for Gemini, OpenAI, Anthropic, or Groq, insyte routes each stage to the appropriate model tier within that provider's family. Ollama and Custom Endpoint are unrouted: they use the user's configured model for all stages (same as Phase 30, no change). The settings UI is simplified to match: routed providers no longer show a model selector.

**Prerequisite:** Phase 30 ✅ — pipeline stable, `providerName` on `ModelConfig` (BUG-10), `resolveStageModel` in `model-routing.ts`.

**Research:** `.planning/research/ai-pipeline-redesign/byok-model-routing.md`

**Estimated effort:** 2–3 days

---

## What Changes

| Area | Phase 30 (current) | Phase 31 (this phase) |
|---|---|---|
| BYOK model routing | Every stage uses user's selected model | Stage 0 → frontier · Stage 2 → mid · Stages 1/3/4 → cheap |
| Unrouted providers (Ollama, Custom) | User's configured model, all stages | No change |
| Settings UI — routed providers | Provider selector + model selector + key input | Provider selector + key input only (no model chips) |
| Settings UI — unrouted providers | Handled by Local & Custom section | No change |
| `resolveStageModel` signature | `(stage, byokModel)` | `(stage, providerName, fallbackModel)` |
| `createModel` factory in route.ts | `() => languageModel` (static) | `(id) => resolveModel(provider, id, byokKey)` (dynamic) |

---

## Stage Tier Map

```
Stage 0  FREE REASONING  → frontier   (best model — quality of reasoning defines everything downstream)
Stage 1  SCENE SKELETON  → cheap      (cheap transcription task — just format Stage 0's decisions into JSON)
Stage 2  STEPS + EXPLS   → mid        (needs coherence for explanation–action alignment)
Stage 3  POPUPS          → cheap      (tiny focused task — near infallible on cheap tier)
Stage 4  MISC / QUIZ     → cheap      (cheapest available — independent of visual state)
```

### `PROVIDER_TIER_MODELS`

| Provider | frontier (Stage 0) | mid (Stage 2) | cheap (Stages 1, 3, 4) |
|---|---|---|---|
| Gemini | `gemini-2.5-pro` | `gemini-2.5-flash` | `gemini-2.5-flash-lite` |
| Anthropic | `claude-opus-4-6` | `claude-sonnet-4-6` | `claude-haiku-4-5-20251001` |
| OpenAI | `o3` | `gpt-4.1` | `gpt-4o-mini` |
| Groq | `llama-3.3-70b-versatile` | `llama-3.3-70b-versatile` | `llama-3.1-8b-instant` |
| Ollama | user's model (all stages) | — | — |
| Custom | user's model (all stages) | — | — |

Groq has near-uniform routing: Stage 0 and Stage 2 both get the 70B model (Groq's value is throughput, not model differentiation), Stages 1/3/4 get 8B.

---

## Work Items

### ROUTING-01 — `src/ai/model-routing.ts`

Replace the Phase 30 static `resolveStageModel` with provider-aware tier routing.

```typescript
// apps/web/src/ai/model-routing.ts

// ─── Stage-to-Model Routing (Phase 31 — Provider-Aware Tier Routing) ──────────

/**
 * Default model IDs per stage — used when no BYOK key is active (free tier).
 * These are server-side Gemini models billed to insyte's key.
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
 *   mid      — coherent but cheaper       (Stage 2: explanation–action alignment)
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
 * Tier model map for every routed provider.
 * Providers absent from this map (ollama, custom) are unrouted —
 * resolveStageModel falls back to the user's configured model for all stages.
 *
 * Pricing context (April 2026, per 1M input tokens):
 *   Gemini:    2.5 Pro $1.25  / 2.5 Flash $0.30  / Flash-Lite $0.10
 *   Anthropic: Opus $5.00     / Sonnet $3.00      / Haiku $1.00
 *   OpenAI:    o3 ~$10.00     / gpt-4.1 ~$2.00    / gpt-4o-mini $0.15
 *   Groq:      latency-first, minor cost delta between models
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
    // Groq's value is throughput — differentiate heavy vs fast only.
    frontier: 'llama-3.3-70b-versatile',
    mid:      'llama-3.3-70b-versatile',
    cheap:    'llama-3.1-8b-instant',
  },
}

/**
 * Resolve the model ID for a pipeline stage.
 *
 *   fallbackModel === null  → free tier → STAGE_MODELS[stage]
 *   providerName in PROVIDER_TIER_MODELS → BYOK routed → tier model for this stage
 *   otherwise (ollama, custom) → BYOK unrouted → fallbackModel (user's configured model)
 */
export function resolveStageModel(
  stage: StageKey,
  providerName: string,
  fallbackModel: string | null,
): string {
  // Free tier (our server key — per-stage Gemini models)
  if (fallbackModel === null) return STAGE_MODELS[stage]

  // BYOK — routed provider: use the tier model for this stage
  const tierModels = PROVIDER_TIER_MODELS[providerName]
  if (tierModels) {
    return tierModels[STAGE_TIERS[stage]]
  }

  // BYOK — unrouted provider (ollama, custom): user's model for all stages
  return fallbackModel
}
```

**Call-site change summary:** `resolveStageModel(stage, byokModel)` → `resolveStageModel(stage, modelConfig.providerName, byokModel)`. Two call sites in `pipeline.ts` (see ROUTING-02).

---

### ROUTING-02 — `src/ai/pipeline.ts`

Update the two call sites that use `resolveStageModel` to pass `providerName`.

**`stageConfig` helper** (line ~113):
```typescript
// Before
const modelId = resolveStageModel(stage, byokModel)

// After
const modelId = resolveStageModel(stage, modelConfig.providerName, byokModel)
```

**Logging call** for stage0 (line ~130):
```typescript
// Before
const model0 = resolveStageModel('stage0', byokModel)

// After
const model0 = resolveStageModel('stage0', modelConfig.providerName, byokModel)
```

Same pattern applies to the logging calls for stages 1–4 (`model1` through `model4`).

No other changes to `pipeline.ts` — the `stageConfig` function already calls `modelConfig.createModel(modelId)`, which is where the per-stage `LanguageModel` instance is created. The routing logic is entirely inside `resolveStageModel` and `createModel`.

---

### ROUTING-03 — `app/api/generate/route.ts`

Update the `createModel` factory so routed BYOK providers get a per-stage `LanguageModel` instance (instead of always reusing the same one).

**Current** (static BYOK fallback, Phase 30):
```typescript
createModel: isFreeTier
  ? (id: string) => getGeminiProvider(undefined, id, longRunningFetch)
  : () => languageModel,   // BYOK: same model for every stage
```

**Phase 31** (dynamic per-stage for routed BYOK):
```typescript
// Routed BYOK: provider has a tier map — createModel receives the tier model ID
// and instantiates the right SDK model with the user's key.
const isRoutedBYOK = Boolean(byokKey) && !['ollama', 'custom'].includes(provider)

const modelConfig: ModelConfig = {
  // ...existing fields unchanged...
  createModel: isFreeTier
    ? (id: string) => getGeminiProvider(undefined, id, longRunningFetch)
    : isRoutedBYOK
      ? (id: string) => resolveModel(provider, id, byokKey, longRunningFetch)
      : () => languageModel,   // ollama / custom: single model, no routing
}
```

`resolveModel` is already imported in `route.ts` and already handles `(provider, model, apiKey, fetch)` → it dispatches to the right provider SDK. No new factories needed.

**Edge cases:**
- Ollama (`byokKey = null`, `byokBaseURL` set): `isRoutedBYOK = false` → `() => languageModel`. No change.
- Custom with key (`byokKey` set, `provider = 'custom'`): `'custom'` is excluded from routed set → `() => languageModel`. No change.
- Custom without key (`byokKey = null`, `byokBaseURL` set): `isRoutedBYOK = false` → `() => languageModel`. No change.
- Free tier: `isFreeTier = true` → Gemini factory. No change.

---

### UI-01 — `src/ai/registry.ts` + `app/settings/page.tsx`

**Step A — add `supportsRouting` to `ProviderConfig`** (`registry.ts`):

```typescript
export interface ProviderConfig {
  // ...existing fields...
  /**
   * When true, insyte applies provider-aware tier routing when the user's
   * BYOK key is active for this provider. The model selector is hidden in
   * Settings — routing picks the right model per stage automatically.
   * When false (Ollama, Custom), the user's configured model is used for all stages.
   */
  supportsRouting: boolean
}
```

Set `supportsRouting: true` for: `gemini`, `openai`, `anthropic`, `groq`.
Set `supportsRouting: false` for: `ollama`, `custom`.

**Step B — conditional model selector** (`app/settings/page.tsx`):

Read `provider` from `useSettings`. Replace the unconditional Model section:

```typescript
// Before (settings/page.tsx)
<SectionCard title="AI Provider" ...>
  <ProviderSelector />
  <div className="space-y-2 pt-1">
    <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
      Model
    </p>
    <ModelSelector />
  </div>
</SectionCard>

// After
const { provider } = useSettings()
const isRouted = REGISTRY[provider]?.supportsRouting ?? false

<SectionCard title="AI Provider" ...>
  <ProviderSelector />
  {isRouted ? (
    <RoutingInfoRow provider={provider} />   // new component — see below
  ) : (
    <div className="space-y-2 pt-1">
      <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
        Model
      </p>
      <ModelSelector />
    </div>
  )}
</SectionCard>
```

**`RoutingInfoRow`** — small inline component to replace the model selector for routed providers. Shows the tier split so the user understands what's happening. Design decisions (spacing, colours) to be resolved with `ui-ux-pro-max` during implementation. Semantics:

```
Auto-routing active
Frontier model for reasoning · Mid-tier for steps · Fast model for everything else
```

Keep it a single compact row — not a full section. The goal is "informed, not overwhelming". Use `Zap` or `Route` lucide icon. Reference DESIGN.md colours.

---

### UI-02 — `components/settings/ActiveProviderStatus.tsx`

For BYOK routed providers, replace the model name display with a routing indicator.

**Current** (`hasByok = true`):
```
Using your Anthropic key · claude-sonnet-4-6 · Unlimited requests
```

**Phase 31** (routed BYOK):
```
Using your Anthropic key · Smart routing · Unlimited requests
```

**Phase 31** (unrouted BYOK — ollama/custom — unchanged):
```
Using your Custom key · my-model · Unlimited requests
```

Implementation:
```typescript
const supportsRouting = REGISTRY[provider as Provider]?.supportsRouting ?? false

// In JSX — replace the model span for routed providers:
{hasByok ? (
  <p className="text-sm text-on-surface">
    Using your{' '}
    <span className="font-semibold text-secondary">{providerName}</span>{' '}
    key ·{' '}
    {supportsRouting ? (
      <span className="text-secondary text-xs">Smart routing</span>
    ) : (
      <span className="text-on-surface-variant text-xs font-mono truncate">{model}</span>
    )}{' '}
    · <span className="text-secondary">Unlimited requests</span>
  </p>
) : (
  // free tier — unchanged
)}
```

---

## Execution Order

1. **ROUTING-01** (`model-routing.ts`) — data change, no dependencies, do first
2. **ROUTING-02** (`pipeline.ts`) — updates call sites; unblocked after ROUTING-01
3. **ROUTING-03** (`route.ts`) — updates factory; unblocked after ROUTING-01
4. **UI-01** (`registry.ts` + `settings/page.tsx`) — add `supportsRouting` to registry first, then settings page
5. **UI-02** (`ActiveProviderStatus.tsx`) — reads `supportsRouting` from registry; unblocked after UI-01 registry step

ROUTING-01–03 and UI-01–02 are independent tracks; they can be implemented in any order after ROUTING-01.

---

## What Does NOT Change

- `src/ai/client.ts` (`ModelConfig` interface) — no new fields needed
- `src/stores/slices/settings-slice.ts` — `model` field kept; still used for Ollama/Custom model selection. For routed providers `model` holds the provider's `defaultModel` (set by `setProvider`) — it's still sent as `x-model` header but the backend routing ignores it.
- `src/engine/hooks/useStreamScene.ts` — no changes; `x-model` is still sent for routed providers (value = store's `model` = provider's default model) but backend routing ignores it. Not worth changing for no functional gain.
- `components/settings/LocalProviderSettings.tsx` — no changes; Ollama/Custom model selection lives here, untouched.
- `components/settings/ProviderSelector.tsx` — no changes; the provider grid is unchanged.
- `app/api/chat/route.ts` — no changes; live chat uses a single model call, not the pipeline.
- Free-tier routing (`STAGE_MODELS`) — not modified; server-side Gemini models stay as-is.

---

## Testing Checklist

- [ ] Gemini BYOK: Stage 0 uses `gemini-2.5-pro`, Stage 2 uses `gemini-2.5-flash`, Stages 1/3/4 use `gemini-2.5-flash-lite` (check `aiLog` output)
- [ ] Anthropic BYOK: Stage 0 = Opus, Stage 2 = Sonnet, Stages 1/3/4 = Haiku
- [ ] OpenAI BYOK: Stage 0 = `o3`, Stage 2 = `gpt-4.1`, Stages 1/3/4 = `gpt-4o-mini`
- [ ] Groq BYOK: Stage 0 and Stage 2 = `llama-3.3-70b-versatile`, Stages 1/3/4 = `llama-3.1-8b-instant`
- [ ] Ollama: all stages use the user's configured model (unrouted — no change)
- [ ] Custom endpoint: all stages use the user's configured model (unrouted — no change)
- [ ] Free tier: STAGE_MODELS still apply (no regression)
- [ ] Settings page: model selector hidden for routed providers, routing info row shown
- [ ] Settings page: model selector shown for Ollama and Custom (unchanged)
- [ ] `ActiveProviderStatus`: shows "Smart routing" for routed BYOK, model name for unrouted BYOK

---

## Files Modified

| File | Change |
|---|---|
| `src/ai/model-routing.ts` | Add `RoutingTier`, `STAGE_TIERS`, `PROVIDER_TIER_MODELS`; update `resolveStageModel` signature |
| `src/ai/pipeline.ts` | Update 6 `resolveStageModel` call sites (pass `providerName`) |
| `app/api/generate/route.ts` | Add `isRoutedBYOK`; dynamic `createModel` factory |
| `src/ai/registry.ts` | Add `supportsRouting: boolean` to `ProviderConfig`; set values for all 6 providers |
| `app/settings/page.tsx` | Conditional model selector; add `RoutingInfoRow` component |
| `components/settings/ActiveProviderStatus.tsx` | Show "Smart routing" for routed BYOK |
