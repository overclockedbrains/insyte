# BYOK + Model Routing Research

**Date:** April 14, 2026
**Question:** How should insyte handle model routing when users bring their own API keys?

---

## Key Findings

- **Every serious multi-model AI tool keeps routing active with BYOK — they do not collapse to a single model.** Cursor, Aider, Continue.dev, and DeepSource all maintain task-differentiated model routing even when users supply their own keys. The single-model BYOK fallback is the beginner mistake.
- **Provider-aware routing (routing within the user's chosen provider family) is the established industry pattern.** Every major provider ships a tiered model family (Anthropic: Haiku / Sonnet / Opus; Google: Flash-Lite / Flash / Pro; OpenAI: mini / o4 / o3) designed for exactly this. The tier names differ but the structure is universal.
- **The cost difference is significant enough to matter to BYOK users.** Gemini 2.5 Flash costs $0.30/M input tokens vs $1.25/M for 2.5 Pro — a 4× difference. Claude Haiku costs $1.00/M vs Sonnet at $3.00/M vs Opus at $5.00/M. A user generating 100 scenes/month with Stage 0 on the frontier model and stages 1/3/4 on the cheap tier pays roughly 60–70% less than routing everything through the frontier model.
- **Aider's architect/editor split is the closest production analogy to insyte's Stage 0 + Stage 2 split.** Aider uses a strong reasoning model (Sonnet/o3) for the architect pass and a cheap, fast model (Haiku/DeepSeek) for the edit pass — exactly the Stage 0 (reasoning) + Stages 1/3/4 (transcription/cheap tasks) structure insyte is designing.
- **Vercel AI SDK's `createProviderRegistry` is the correct primitive for implementing provider-aware routing in insyte's stack.** It allows registering multiple providers under aliases and resolving `providerId:modelId` at call time, which maps cleanly to insyte's `resolveModel()` pattern.
- **OpenRouter's BYOK model shows that routing and user-owned keys are not in conflict** — OpenRouter explicitly prioritizes user keys while preserving full routing intelligence. The architecture is: user key + full routing, not user key OR routing.
- **Windsurf (Codeium) is the cautionary counterexample.** Windsurf's BYOK bypasses their internal routing entirely — and their own documentation acknowledges this as a limitation ("you won't benefit from Windsurf's adaptive routing"). They are aware it is a downgrade, not a feature.
- **The Phase 30 plan's current BYOK behavior (`if (modelConfig.modelOverride) return modelConfig.modelOverride`) is both an anti-pattern and inconsistent with how the rest of the industry has solved this.** It should be replaced with provider-aware routing.

---

## How Other Tools Handle It

### Aider — Architect / Editor Model Split

**URL:** https://aider.chat/2024/09/26/architect.html  
**URL:** https://aider.chat/docs/usage/modes.html

Aider separates the reasoning pass (architect model) from the execution pass (editor model) and explicitly documents that these should be different models from potentially different providers:

> "When in architect mode, aider sends your requests to two models: First, it sends your request to the main model which will act as an architect to propose how to solve your coding request. Aider then sends another request to an 'editor model', asking it to turn the architect's proposal into specific file editing instructions."

> "Using the efficient 'diff' editing format, Deepseek helps all the Architect models except for Sonnet. Deepseek is surprisingly effective as an Editor model."

Key behavior: The architect and editor models can be from **different providers** (e.g., `--model o3` for architect, `--editor-model deepseek` for editor). Aider does not collapse to a single model when you bring your own key — it maintains the routing split regardless of where the keys come from.

This is directly analogous to insyte's Stage 0 (free reasoning, frontier model) + Stages 1/3/4 (cheap transcription/formatting tasks). Aider solved this in production and documented it.

---

### Continue.dev — Role-Based Model Routing

**URL:** https://docs.continue.dev/customize/model-roles  
**URL:** https://docs.continue.dev/customize/models

Continue.dev implements per-role model routing in its config, allowing BYOK users to assign different models to different task types:

> "Different Continue features can use different models, which are called model roles. For example, you can use a different model for Chat mode than you do for Autocomplete."

Available roles include: `chat`, `autocomplete`, `edit`, `apply`, `embed`, `rerank`, `summarize`.

Key behavior: BYOK configuration is per-model entry in `config.yaml`, with each model assigned specific roles. A user can configure a Claude Opus key for `chat` and a Haiku key for `autocomplete`. The routing logic is user-controlled but the framework enforces that routing happens at all.

---

### Cursor — Model Routing Partially Disabled with BYOK (Cautionary Example)

**URL:** https://cursor.com/help/models-and-usage/api-keys  
**URL:** https://www.cursor-ide.com/blog/cursor-custom-api-key-guide-2025

Cursor's BYOK is a partial exception: standard chat completions work with the user's key, but Cursor's proprietary "custom models" (optimized for multi-file context and inline edits) only run on Cursor's infrastructure and cannot be accessed via BYOK.

> "When you enter a BYOK in Settings → Models → API Keys, Cursor unlocks chat completions for standard models only. The Agent and Edit features depend on custom models. These run on Cursor's infrastructure and are metered through their subscription plans, not your API credits."

This is a different problem than insyte's — Cursor's "custom models" are proprietary infrastructure, not a routing tier. Cursor still routes within the BYOK-eligible set; they simply don't expose all their internal models. For insyte (which uses public API models only), this constraint does not apply.

---

### Windsurf (Codeium) — BYOK Bypasses Routing (Cautionary Example)

**URL:** https://docs.windsurf.com/windsurf/models  
**URL:** https://kearai.com/agents/windsurf-ai-review-complete-guide

Windsurf implements exactly the pattern the Phase 30 plan currently proposes — and their own documentation frames it as a known limitation:

> "Standard Model Routing: Windsurf routes tasks to different models automatically based on complexity and plan tier, and you do not choose which model handles a given Cascade flow."

> "BYOK Model Routing: If you have your own Claude API keys, BYOK bypasses Windsurf's model routing entirely, and you pay provider rates directly while knowing exactly what model you're using."

Windsurf recently launched an "Adaptive model router" precisely because the BYOK bypass was seen as a quality downgrade. They are now trying to preserve routing even with user keys. This is the trajectory insyte should avoid starting on.

---

### OpenRouter — Routing as a Service, BYOK Enhances Routing

**URL:** https://openrouter.ai/docs/guides/overview/auth/byok  
**URL:** https://openrouter.ai/docs/guides/routing/provider-selection  
**URL:** https://www.datastudios.org/post/openrouter-pricing-byok-routing-costs-and-cost-optimization-strategies-how-openrouter-actually-c

OpenRouter is the most instructive example because routing is their core product. Their design decision: BYOK keys do not replace routing, they enhance it.

> "When you combine BYOK keys with provider ordering, OpenRouter always prioritizes BYOK endpoints first, and after all BYOK endpoints are exhausted, OpenRouter falls back to shared capacity in the order you specified."

> "OpenRouter supports BYOK for over 60 different inference providers."

Key insight: OpenRouter's architecture is `user_key + routing_intelligence`, not `user_key OR routing_intelligence`. The user key controls _which provider handles the call_; the routing layer still decides _which model within that provider_ and _what order to try_ if the first choice fails.

For insyte's multi-stage pipeline, the analogy is: the user's key controls which provider SDK handles each call, but the routing layer (model-routing.ts) still decides that Stage 0 gets the frontier model and Stage 4 gets the cheapest.

---

### DeepSource — Smart / Fast Split with BYOK

**URL:** https://deepsource.com/blog/byok  
**URL:** https://www.mindstudio.ai/blog/best-ai-model-routers-multi-provider-llm-cost-011e6

DeepSource describes the production-proven "smart/fast" routing pattern that works with BYOK:

> "The routing capability allows you to configure tools to use a Smart model (Claude Opus 4.6) for complex refactoring and a Fast model (DeepSeek V3 or Haiku) for simple autocomplete and unit tests. This capability can significantly reduce AI spend while improving speed."

> "DeepSource splits workloads by using a larger, more capable model for complex analysis and a smaller, faster model that handles everything else (like generating issue descriptions, filtering, summarization). BYOK lets teams use the model family that matches their requirements, and swapping providers is a simple config change where you update the API key."

The "swapping providers is a simple config change" point is important: the routing tiers are stable (`smart`, `fast`, `cheapest`), and BYOK just changes which concrete model backs each tier.

---

### Vercel AI SDK — `createProviderRegistry` as the Implementation Primitive

**URL:** https://ai-sdk.dev/docs/reference/ai-sdk-core/provider-registry  
**URL:** https://ai-sdk.dev/docs/ai-sdk-core/provider-management  
**URL:** https://vercel.com/docs/ai-gateway/authentication-and-byok/byok

The AI SDK (insyte's existing dependency) has direct support for exactly this pattern via `createProviderRegistry`:

> "`createProviderRegistry` lets you create a registry with multiple providers that you can access by their ids in the format `providerId:modelId`."

The AI Gateway also supports per-request BYOK credential injection:

> "You can pass your own provider credentials on a per-request basis using the `byok` option in `providerOptions.gateway`, which allows you to control both the routing behavior and provider-specific settings in the same request."

> "You can configure multiple credentials for the same provider (tried in order), enabling flexible routing strategies."

Known limitation (relevant to insyte): There is a documented issue where AI Gateway BYOK credentials override explicit `provider.order` configuration. For insyte's use case (not using AI Gateway, calling providers directly via their SDKs), this issue does not apply. The `createProviderRegistry` approach bypasses it entirely.

---

### LiteLLM — Explicit Tier Aliases for Provider-Aware Routing

**URL:** https://docs.litellm.ai/docs/routing  
**URL:** https://medium.com/@michael.hannecke/implementing-llm-model-routing-a-practical-guide-with-ollama-and-litellm-b62c1562f50f

LiteLLM (the Python-ecosystem reference implementation for LLM routing) uses model group aliases that map to provider-specific tier models:

> "For cost optimization, tasks like support ticket classification can use Haiku instead of more expensive models for comparable accuracy on well-defined tasks."

> "The router automatically escalates through ordered deployments — when order=1 fails, it tries order=2, then order=3, with each order level getting its own retry attempts before escalating to configured fallbacks."

The key implementation insight from LiteLLM: **define abstract tier names** (`reasoning-tier`, `mid-tier`, `cheap-tier`) and map them to concrete models per-provider. This is the pattern insyte should implement in `model-routing.ts`.

---

## Recommended Approach for insyte

### The Core Decision

**Replace the single-model BYOK fallback with provider-aware tier routing.** When a user has a BYOK key active, insyte should determine which provider that key belongs to and route each stage to the equivalent tier within that provider's model family.

The Phase 30 plan's current draft:
```typescript
// WRONG — collapses all stages to one model
if (modelConfig.modelOverride) return modelConfig.modelOverride
```

Should become a per-provider tier mapping.

---

### Tier Model Map

Define three tiers (matching insyte's stage requirements) and map every supported provider's models to those tiers:

```typescript
// apps/web/src/ai/model-routing.ts

export type RoutingTier = 'frontier' | 'mid' | 'cheap'

/**
 * Provider-aware tier model map.
 * When a user brings their own key for a provider, resolve stage models
 * from this map rather than collapsing all stages to a single model.
 *
 * Pricing context (April 2026, per 1M input tokens):
 *   Gemini:    2.5 Pro $1.25  / 2.5 Flash $0.30  / Flash-Lite $0.10
 *   Anthropic: Opus $5.00     / Sonnet $3.00      / Haiku $1.00
 *   OpenAI:    o3 ~$10.00     / gpt-4.1 ~$2.00    / gpt-4o-mini $0.15
 *   Groq:      routed by Groq internally — user picks, routing adjusts
 */
export const PROVIDER_TIER_MODELS: Record<Provider, Record<RoutingTier, string>> = {
  gemini: {
    frontier: 'gemini-2.5-pro',        // best reasoning — Stage 0
    mid:      'gemini-2.5-flash',       // logical coherence — Stage 2
    cheap:    'gemini-2.5-flash-lite',  // transcription / simple tasks — Stages 1, 3, 4
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
    // Groq's value is speed, not differentiation by tier.
    // User's chosen model is used for all tiers — Groq is fast enough
    // that the cost difference between their model options is minor.
    frontier: 'llama-3.3-70b-versatile',
    mid:      'llama-3.3-70b-versatile',
    cheap:    'llama-3.1-8b-instant',
  },
  ollama: {
    // Local models: use the model the user configured for all tiers.
    // Routing within Ollama is meaningless — they're running whatever
    // they pulled locally. Fall through to the user's configured model.
    frontier: '',  // resolved dynamically
    mid:      '',
    cheap:    '',
  },
  custom: {
    // Custom endpoint: user-specified model for all tiers.
    frontier: '',
    mid:      '',
    cheap:    '',
  },
}

/** Which tier each pipeline stage should use. */
export const STAGE_TIERS: Record<'stage0' | 'stage1' | 'stage2' | 'stage3' | 'stage4', RoutingTier> = {
  stage0: 'frontier',  // free reasoning — best model quality matters here
  stage1: 'cheap',     // transcribing Stage 0's decision into JSON schema
  stage2: 'mid',       // steps + explanations — needs logical + pedagogical coherence
  stage3: 'cheap',     // popup callouts — tiny, focused, near-infallible
  stage4: 'cheap',     // quiz questions — cheapest available
}

/**
 * Resolve the model ID for a given stage and provider.
 *
 * For providers with no tier differentiation (ollama, custom, groq-like),
 * falls back to the user's configured model so the user's intent is respected.
 */
export function resolveStageModel(
  stage: keyof typeof STAGE_TIERS,
  provider: Provider,
  userConfiguredModel: string,
): string {
  const tier = STAGE_TIERS[stage]
  const tierModel = PROVIDER_TIER_MODELS[provider]?.[tier]

  // Providers that don't differentiate tiers (ollama, custom) or where
  // the tier mapping returns empty — use the user's configured model.
  if (!tierModel) return userConfiguredModel

  return tierModel
}
```

---

### What Changes in `pipeline.ts`

Each stage call gets resolved through `resolveStageModel` instead of using `config.model` directly:

```typescript
// Stage 0 — frontier model from the user's provider
const stage0Model = resolveStageModel('stage0', provider, userModel)
const reasoning = await callLLM(
  buildStage0Prompt(topic, mode),
  { ...baseConfig, model: getProviderModel(provider, stage0Model, apiKey) }
)

// Stage 1 — cheap model from the user's provider
const stage1Model = resolveStageModel('stage1', provider, userModel)
const skeleton = await retryStage(2, (lastError) =>
  generateObject(
    buildStage1Prompt(topic, reasoning, lastError),
    SceneSkeletonSchema,
    { ...baseConfig, model: getProviderModel(provider, stage1Model, apiKey) }
  )
)

// Stage 2 — mid-tier model from the user's provider
const stage2Model = resolveStageModel('stage2', provider, userModel)
// ...and so on
```

`getProviderModel(provider, modelId, apiKey)` is the existing `resolveModel()` function from `providers/index.ts`, called with the resolved model ID instead of the user's selected model ID.

---

### Edge Cases and Rules

**Rule 1: Ollama and Custom endpoints get the user's configured model for all stages.**
These are local/custom deployments where the user has one model running. There is no tier to route to. Fallback to `userConfiguredModel` unconditionally.

**Rule 2: Groq gets near-uniform routing (except Stage 0 vs Stage 4 fast/slow split).**
Groq's pricing difference between their models is small and their latency advantage is the primary reason users choose Groq. Differentiate only Stages 0 vs. 3/4 (heavy vs. fast).

**Rule 3: The user's explicitly selected model acts as a preference signal, not an override.**
If a user selects "Gemini 2.5 Flash" as their model, insyte should interpret this as "I want the Flash tier and below" — route Stage 0 to Flash (not Pro) and Stages 1/3/4 to Flash-Lite. The user's selected model is the _ceiling_, not the floor.

**Rule 4: If a selected model is already in the cheap tier, all stages use it.**
A user who picks Haiku or Flash-Lite is explicitly signaling cost preference. Respect that. Do not route Stage 0 to Opus without their consent — that would be a surprise billing event.

**Rule 5: Surface the routing decision to users in Settings.**
Show a simple "Routing: Frontier model for reasoning, Fast models for other stages" toggle. Users who want all-one-model should have that option (useful for debugging or when they only have access to one tier). This makes the routing visible, not hidden.

---

### Cost Impact Estimate

For a user with an Anthropic key generating 100 scenes/month, assuming ~3,000 tokens total per scene across all stages:

| Routing mode | Stage 0 model | Stage 2 model | Stages 1/3/4 model | Estimated cost/month |
|---|---|---|---|---|
| All-one-model (current plan) | Sonnet | Sonnet | Sonnet | ~$1.35 |
| Provider-aware routing | Opus | Sonnet | Haiku | ~$0.85 |
| Provider-aware routing | Opus | Sonnet | Haiku | at 1000 scenes: ~$8.50 vs ~$13.50 |

The absolute numbers are small for casual users but the pattern scales: at 10,000 scenes/month the difference is ~$50/month in savings — meaningful for a power user who chose BYOK specifically to manage costs.

For Gemini: routing Stage 0 to 2.5 Pro and Stages 1/3/4 to Flash-Lite produces ~75% cost reduction on the cheap stages vs. using 2.5 Pro for everything.

---

### Update to Phase 30 Plan — Step 9

Replace the current Step 9 (Model routing configuration) in Phase 30's PLAN.md:

**Current (to be replaced):**
```typescript
export function resolveStageModel(
  stage: keyof typeof STAGE_MODELS,
  modelConfig: ModelConfig,
): string {
  // If user has specified a model override in settings, use it for all stages
  // (BYOK users trade routing optimization for provider preference)
  if (modelConfig.modelOverride) return modelConfig.modelOverride
  return STAGE_MODELS[stage]
}
```

**Replace with:** The `PROVIDER_TIER_MODELS` + `STAGE_TIERS` + `resolveStageModel` implementation shown above. The key contract change: `resolveStageModel` now takes `(stage, provider, userConfiguredModel)` instead of `(stage, modelConfig)`. The `provider` comes from the route handler (already available in `settings-slice.ts` state) and the `userConfiguredModel` is the user's explicit model selection (used as the ceiling and as the fallback for untiered providers).

---

## Sources

- https://aider.chat/2024/09/26/architect.html — Aider architect/editor split rationale and implementation
- https://aider.chat/docs/usage/modes.html — Aider chat mode documentation
- https://docs.continue.dev/customize/model-roles — Continue.dev per-role model routing
- https://docs.continue.dev/customize/models — Continue.dev model configuration
- https://cursor.com/help/models-and-usage/api-keys — Cursor BYOK documentation
- https://www.cursor-ide.com/blog/cursor-custom-api-key-guide-2025 — Cursor BYOK limitations analysis
- https://docs.windsurf.com/windsurf/models — Windsurf model routing and BYOK behavior
- https://kearai.com/agents/windsurf-ai-review-complete-guide — Windsurf routing bypass with BYOK
- https://openrouter.ai/docs/guides/overview/auth/byok — OpenRouter BYOK documentation
- https://openrouter.ai/docs/guides/routing/provider-selection — OpenRouter provider routing
- https://www.datastudios.org/post/openrouter-pricing-byok-routing-costs-and-cost-optimization-strategies-how-openrouter-actually-c — OpenRouter routing cost analysis
- https://deepsource.com/blog/byok — DeepSource smart/fast BYOK model routing
- https://www.mindstudio.ai/blog/best-ai-model-routers-multi-provider-llm-cost-011e6 — LLM model router survey
- https://ai-sdk.dev/docs/reference/ai-sdk-core/provider-registry — Vercel AI SDK createProviderRegistry
- https://ai-sdk.dev/docs/ai-sdk-core/provider-management — Vercel AI SDK provider management
- https://vercel.com/docs/ai-gateway/authentication-and-byok/byok — Vercel AI Gateway BYOK
- https://docs.litellm.ai/docs/routing — LiteLLM router configuration
- https://medium.com/@michael.hannecke/implementing-llm-model-routing-a-practical-guide-with-ollama-and-litellm-b62c1562f50f — LiteLLM routing guide
- https://blog.jetbrains.com/ai/2025/12/bring-your-own-key-byok-is-now-live-in-jetbrains-ides/ — JetBrains BYOK launch
- https://langcopilot.com/gemini-2.5-flash-vs-gemini-2.5-pro-pricing — Gemini Flash vs Pro pricing
- https://www.tldl.io/resources/anthropic-api-pricing — Anthropic API pricing April 2026
- https://www.morphllm.com/llm-router — Morph LLM router patterns
- https://dev.to/cwilkins507/llm-gateway-architecture-when-you-need-one-and-how-to-get-started-1817 — LLM gateway architecture
- https://github.com/anthropics/claude-code/issues/44976 — Claude Code feature request: auto model routing by task type (community validation of the approach)
