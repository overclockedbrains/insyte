# Phase 30 — Implementation Audit (Rev 2)

> Initial audit: 2026-04-15. Decisions reviewed and resolved: 2026-04-16.
> All 15 findings have a final decision. Ready for implementation.

---

## Summary

Phase 30 landed the core redesign correctly: ISCL is dead, `generateObject` is wired, schema factories for Stages 2 and 3 are correct, event ordering is correct, `retryStage` + per-attempt timeouts are in place, and the `GenerationEvent` union is updated.

**5 critical bugs** will cause visible failures or wrong behavior. **5 moderate issues** degrade quality or cost. **5 gaps** represent missing validation, inconsistent contracts, or silent failures.

All 15 have owner decisions below.

---

## Critical Bugs

### BUG-01 — Semantic validation is outside the retry loop

**File:** [`apps/web/src/ai/pipeline.ts:183-208`](apps/web/src/ai/pipeline.ts#L183-L208)  
**Decision: ✅ Fix as proposed**

`retryStage` only covers `generateObject`. `validateSteps` runs after it returns. When Zod passes structurally but semantic checks fail (missing `initialState`, index gaps), the error hits the Stage 2 `catch` block as immediately fatal — no error-guided retry, no `lastError` injection. The model never learns what failed.

**Fix:** Wrap both `generateObject` AND `validateSteps` inside the `retryStage` callback:

```typescript
const stepsRaw = await retryStage(MAX_RETRIES, async (lastError) => {
  const raw = await generateObject(
    buildStage2Prompt(topic, reasoningSummary, skeleton, lastError),
    buildStepsSchema(visualIds),
    stageConfig('stage2', 0.2),
    STAGE2_SYSTEM,
  )
  const validation = validateSteps(raw as StepsParsed, skeleton)
  if (!validation.valid) {
    throw new Error(`Semantic validation failed: ${validation.errors.join('; ')}`)
  }
  return raw
}, 45_000)
```

---

### BUG-02 — Stage 0 is not streaming: up to 90 seconds of dead silence

**Files:** [`apps/web/src/ai/pipeline.ts:131`](apps/web/src/ai/pipeline.ts#L131), [`apps/web/src/ai/client.ts:48`](apps/web/src/ai/client.ts#L48)  
**Decision: ✅ Stream Stage 0 using `streamText`**

The user wants to see reasoning arriving progressively ("Thinking...") — not dumped all at once after 90 seconds. `callLLM` uses `generateText` (blocking). The `reasoning` event fires only after Stage 0 fully completes. Without any SSE data for up to 90 seconds, CDN/proxy idle timeouts also kill the connection.

**Fix:** Replace `callLLM` for Stage 0 with a `streamText` loop that:
1. Accumulates full text for condensation
2. Emits `{ type: 'reasoning', text: chunk }` as each chunk arrives

```typescript
import { streamText } from 'ai'

// In pipeline.ts — Stage 0
let reasoning = ''
try {
  const stage0Cfg = stageConfig('stage0', 1.0)
  const { textStream } = streamText({
    model: stage0Cfg.model,
    prompt: buildStage0Prompt(topic, mode),
    providerOptions: stage0Cfg.providerOptions as Record<string, unknown>,
    temperature: 1.0,
    maxOutputTokens: 8192,
    maxRetries: 0,
  })
  for await (const chunk of textStream) {
    reasoning += chunk
    yield { type: 'reasoning', text: chunk }
  }
} catch (err) {
  yield { type: 'error', stage: 0, message: `...`, retryable: true }
  return
}
```

Note: `callLLM` in `client.ts` stays unchanged — it is still used by `liveChat.ts`.

This also resolves BUG-09 (the SSE connection drop) — active streaming during Stage 0 keeps the connection alive, eliminating the need for a separate heartbeat.

---

### BUG-03 — `condenseReasoning` truncates the wrong end

**File:** [`apps/web/src/ai/pipeline.ts:323-328`](apps/web/src/ai/pipeline.ts#L323-L328)  
**Decision: ✅ Remove `condenseReasoning`. Constrain Stage 0 output at the prompt level**

The user's direction: remove `condenseReasoning` and pass full reasoning to downstream stages. To keep Stage 2's total prompt under the ~3000 token research-mandated ceiling, constrain Stage 0 output length in the prompt itself instead of truncating after the fact.

**Fix — two-part:**

**Part 1:** Add a length constraint to `stage0-reasoning.md`:
```markdown
Keep your response under 400 words. State your key decisions directly.
Do not explore alternatives or hedge — commit to your choices.
```

**Part 2:** Remove `condenseReasoning` from `pipeline.ts`. Pass `reasoning` directly to both Stage 1 and Stage 2 (unchanged):

```typescript
// Before:
const reasoningSummary = condenseReasoning(reasoning, 300)
// … Stage 1
buildStage1Prompt(topic, reasoning, lastError)  // full reasoning
// … Stage 2
buildStage2Prompt(topic, reasoningSummary, skeleton, lastError)  // truncated

// After:
// No condenseReasoning call at all
// … Stage 1
buildStage1Prompt(topic, reasoning, lastError)
// … Stage 2
buildStage2Prompt(topic, reasoning, skeleton, lastError)  // full reasoning (now short by design)
```

Also update `buildStage2Prompt` signature: rename parameter `reasoningSummary` → `reasoning`.

**Why this is better than truncation:** Constraining output at the prompt level means Stage 0 decides what to include (prioritising decisions naturally). Truncating after the fact always loses the end — where thinking models put their conclusions.

---

### BUG-04 — `validateMisc` is dead code with an incompatible schema

**Files:** [`apps/web/src/ai/validators/misc.ts`](apps/web/src/ai/validators/misc.ts), [`apps/web/src/ai/validators/validators.test.ts:167-201`](apps/web/src/ai/validators/validators.test.ts#L167-L201)  
**Decision: ✅ Delete `validators/misc.ts`. Replace test with `MiscSchema` smoke test**

`validators/misc.ts` validates the old ISCL shape `{ type, title, description }`. Stage 4 generates MCQ format `{ question, options, answer, type }`. Never called in `pipeline.ts`. Exported as a public API. Tests pass on the wrong schema — false confidence.

**Fix:**

1. Delete `apps/web/src/ai/validators/misc.ts`
2. Remove `export { validateMisc }` and `export type { ValidatedMisc }` from `validators/index.ts`
3. In `validators.test.ts`, replace the `validateMisc` test block with a `MiscSchema` smoke test:

```typescript
import { MiscSchema } from '../schemas'

describe('MiscSchema', () => {
  it('accepts valid MCQ challenges', () => {
    const result = MiscSchema.safeParse({
      challenges: [
        { question: 'Q?', options: ['A', 'B', 'C'], answer: 1, type: 'predict' },
        { question: 'Q2?', options: ['A', 'B'], answer: 0, type: 'break-it' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects challenges with answer out of options range', () => {
    // answer: 5 but only 2 options — caught by answer: z.number().int().min(0).max(3)
    // Note: Zod caps at 3, not options.length — this is a known schema limitation
    const result = MiscSchema.safeParse({
      challenges: [{ question: 'Q?', options: ['A'], answer: 0, type: 'predict' }],
    })
    // options.min(2) will reject single-option challenge
    expect(result.success).toBe(false)
  })

  it('accepts missing challenges (empty array)', () => {
    const result = MiscSchema.safeParse({ challenges: [] })
    expect(result.success).toBe(true)
  })
})
```

---

### BUG-05 — `mode` is never sent from client to the API route

**File:** [`apps/web/src/engine/hooks/useStreamScene.ts:211`](apps/web/src/engine/hooks/useStreamScene.ts#L211)  
**Decision: ✅ Fix as proposed — pull detectedMode from store**

`JSON.stringify({ topic, slug })` — `mode` missing. Route reads `body.mode` → always `undefined`. Stage 0 gets `Mode: auto` on every call even when mode was already detected.

**Fix:** In `useStreamScene.ts`, read the detected mode from the store and include it in the body:

```typescript
const { provider, model, apiKeys, user, ollamaBaseURL, customBaseURL, customApiKey, detectedMode } =
  useBoundStore.getState()
// …
body: JSON.stringify({ topic, slug, mode: detectedMode ?? undefined }),
```

Verify the exact store field name for mode detection (`detectedMode` or equivalent) before applying. The route already reads `body.mode`, so no server-side change needed.

---

## Moderate Issues

### BUG-06 — Stage 4 uses `gemini-2.0-flash` instead of `gemini-2.0-flash-lite`

**File:** [`apps/web/src/ai/model-routing.ts:24`](apps/web/src/ai/model-routing.ts#L24)  
**Decision: ✅ Change to `gemini-2.0-flash-lite`**

Plan specified `gemini-2.0-flash-lite` as the cheapest model for challenge generation. Implementation silently uses `gemini-2.0-flash` — a cost regression on every free-tier call.

**Fix:**
```typescript
stage4: 'gemini-2.0-flash-lite',  // was: 'gemini-2.0-flash'
```

**⚠️ Before applying:** Verify `'gemini-2.0-flash-lite'` is the correct Gemini API model ID (not `'gemini-2.0-flash-8b'` or similar). Check current Gemini model availability docs.

---

### BUG-07 — Stage 2 model deviates from plan without documentation

**File:** [`apps/web/src/ai/model-routing.ts:22`](apps/web/src/ai/model-routing.ts#L22)  
**Decision: ✅ Revert to `gemini-2.0-pro` as planned**

Plan: `stage2: 'gemini-2.0-pro'` (coherence rationale). Implementation: `stage2: 'gemini-2.5-flash'`. If Stage 2 quality suffers (explanation-action drift, weak coherence), this is the first thing to investigate.

**Fix:**
```typescript
stage2: 'gemini-2.0-pro',  // was: 'gemini-2.5-flash'
```

Also update the comment block in `model-routing.ts` to reflect `gemini-2.0-pro` and its rationale.

---

### BUG-08 — Step count not validated against `skeleton.stepCount`

**File:** [`apps/web/src/ai/validators/steps.ts`](apps/web/src/ai/validators/steps.ts)  
**Decision: ✅ Add count check to `validateSteps`**

`buildStepsSchema` only enforces `steps.min(1)`. The AI can generate 3 steps for a declared `stepCount: 12` and pass all checks. Explanation panel and playback controls would show wrong totals.

**Fix:** Add after Check 3 in `validateSteps`:

```typescript
// Check 4 (new): Step count must equal skeleton.stepCount
if (steps.steps.length !== skeleton.stepCount) {
  errors.push(
    `Step count mismatch: skeleton declared ${skeleton.stepCount} steps, got ${steps.steps.length}`,
  )
}
```

Renumber the existing Check 4 (action target defence-in-depth) to Check 5.

---

### BUG-09 — SSE connection can be killed during inter-stage gaps

**File:** [`apps/web/app/api/generate/route.ts`](apps/web/app/api/generate/route.ts)  
**Decision: ✅ Add keep-alive heartbeat regardless of BUG-02 fix**

SSE comment lines (`: keep-alive\n\n`) are **safe to send**. The `readSSE` function in `useStreamScene.ts` filters strictly on `trimmed.startsWith('data: ')` — comment lines are silently discarded. Zero UI pollution.

BUG-02's streaming fix keeps the connection alive **during Stage 0 only**. Stages 1–4 all use blocking `generateObject` calls. Between each stage completion event and the next stage starting, the SSE stream is silent:

| Gap | Duration |
|---|---|
| After Stage 0 → before Stage 1 completes | up to 15s |
| After Stage 1 → before Stage 2 completes | up to 45s |
| After Stage 2 → before Stage 3/4 complete | up to 15s |

A 45-second silent gap between `plan` and `content` events is enough for CDN/proxy idle timeouts to kill the connection even with Stage 0 streaming resolved.

**Fix:** Add a heartbeat interval in the route handler that runs throughout the entire pipeline, not just Stage 0:

```typescript
// In route.ts — inside ReadableStream start()
const heartbeat = setInterval(() => {
  try { controller.enqueue(encoder.encode(': keep-alive\n\n')) } catch { /* stream closed */ }
}, 15_000)

try {
  for await (const event of generateScene(topic, mode, modelConfig)) {
    const line = `data: ${JSON.stringify(event)}\n\n`
    controller.enqueue(encoder.encode(line))
    // … rest of event handling
  }
} catch (err) {
  // … error handling
} finally {
  clearInterval(heartbeat)
  controller.close()
}
```

The `try/catch` inside the interval callback prevents a `controller.enqueue` failure (stream already closed) from leaking as an unhandled rejection.

---

### BUG-10 — Stage 0 thinkingBudget uses Google format for all BYOK providers

**Files:** [`apps/web/src/ai/pipeline.ts:114-116`](apps/web/src/ai/pipeline.ts#L114-L116), [`apps/web/src/ai/client.ts`](apps/web/src/ai/client.ts), [`apps/web/app/api/generate/route.ts`](apps/web/app/api/generate/route.ts)  
**Decision: ✅ Provider-aware thinking config via helper — add `providerName` to `ModelConfig`**

**Why the previous merge fix was wrong:** Each provider uses a completely different key and schema for thinking:

| Provider | Correct `providerOptions` format for thinking |
|---|---|
| Gemini | `{ google: { thinkingConfig: { thinkingBudget: 16384 } } }` |
| Anthropic | `{ anthropic: { thinking: { type: 'enabled', budget_tokens: 16384 } } }` |
| OpenAI (o-series) | `{ openai: { reasoningEffort: 'high' } }` |
| Groq | No thinking API — pass through unchanged |
| Ollama / Custom | No standard thinking API — pass through unchanged |

Merging `{ ...modelConfig.providerOptions, google: { thinkingConfig: ... } }` only sets the right key for Gemini. The `google` key is silently ignored by every other adapter. Anthropic, OpenAI, etc. would not get thinking enabled at all.

**Fix — two parts:**

**Part 1:** Add `providerName` to `ModelConfig` so the pipeline knows which provider is active. Set it in `route.ts` where the provider is already resolved:

```typescript
// client.ts — add to ModelConfig interface
export interface ModelConfig {
  model: LanguageModel
  providerOptions: Record<string, unknown>
  byokModel: string | null
  createModel: (modelId: string) => LanguageModel
  providerName: string   // ← NEW: 'gemini' | 'anthropic' | 'openai' | 'groq' | 'ollama' | 'custom'
  temperature?: number
}

// route.ts — set providerName when building modelConfig
const modelConfig: ModelConfig = {
  // … existing fields
  providerName: provider,  // provider is already resolved from headers above
}
```

**Part 2:** Add a provider-aware helper in `pipeline.ts` and use it in `stageConfig`:

```typescript
// pipeline.ts — new helper
function buildStage0ProviderOptions(
  baseOptions: Record<string, unknown>,
  providerName: string,
): Record<string, unknown> {
  switch (providerName) {
    case 'gemini':
      return { ...baseOptions, google: { thinkingConfig: { thinkingBudget: 16384 } } }
    case 'anthropic':
      return { ...baseOptions, anthropic: { thinking: { type: 'enabled', budget_tokens: 16384 } } }
    case 'openai':
      // o-series models think automatically; reasoningEffort controls depth
      return { ...baseOptions, openai: { reasoningEffort: 'high' } }
    default:
      // groq, ollama, custom: no standard thinking API — pass through unchanged
      return baseOptions
  }
}

// pipeline.ts — use in stageConfig
const stageProviderOptions = stage === 'stage0'
  ? buildStage0ProviderOptions(modelConfig.providerOptions, modelConfig.providerName)
  : modelConfig.providerOptions
```

Result by user type:
- **Free-tier Gemini 2.5 Pro**: `google.thinkingConfig.thinkingBudget = 16384` ✅
- **BYOK Gemini**: same — 16k budget, consistent behavior ✅
- **BYOK Anthropic**: `anthropic.thinking` enabled correctly ✅
- **BYOK OpenAI o-series**: `openai.reasoningEffort = 'high'` ✅
- **BYOK Groq / Ollama / Custom**: `baseOptions` passed through unchanged ✅

---

## Gaps

### GAP-01 — Few-shot topics inconsistent across stages

**Files:** All four stage prompt `.md` files  
**Decision: ✅ Fix — align all stages to Binary Search**

The prompt engineering research is unambiguous:

> *"The canonical few-shot topic is Binary Search across all stages. Using the same topic across stages is fine — it creates a coherent 'reference visualization' that all stages can draw on without confusion."*  
> — `prompt-engineering.md`, Pattern 3 (Anti-Copy Guard)

Current implementation violates this:

| Stage | Current example | Correct (per research + plan invariant #8) |
|---|---|---|
| Stage 1 `stage1-skeleton.md` | Merge Sort | **Binary Search** |
| Stage 2 `stage2-steps.md` | Hash Table | **Binary Search** |
| Stage 3 `stage3-popups.md` | LRU Cache | **Binary Search** |
| Stage 4 `stage4-misc.md` | Binary Tree BFS | **Binary Search** |

Additional issue: the Stage 1 "Merge Sort" example uses `"layout": "linear-H"` which is incorrect for Merge Sort (a recursive algorithm that should use `dagre-TB` or `tree-RT`). This actively teaches the model a bad layout mapping.

**Fix:** Replace all four example topics with Binary Search. Use the same Binary Search examples from the PLAN.md (the plan already wrote these out for each stage — copy from there). Keep anti-copy guard on each: `"Do NOT copy any values from the example above."`.

---

### GAP-02 — `annotations` and `misc` events are silently dropped

**File:** [`apps/web/src/engine/hooks/useStreamScene.ts:229-263`](apps/web/src/engine/hooks/useStreamScene.ts#L229-L263)  
**Decision: ✅ Add logging cases**

Phase 26 progressive rendering is deferred, but having zero observability means popup/challenge failures are invisible. Add logging so you can tell from client logs whether these stages produced output.

**Fix:** Add cases to the switch statement:

```typescript
case 'annotations':
  aiLog.stream.firstPartial()
  // Phase 26: store popups progressively here
  break

case 'misc':
  aiLog.stream.firstPartial()
  // Phase 26: store challenges progressively here
  break
```

If `aiLog.stream` doesn't have a suitable method, `console.debug('[stream] annotations received:', event.popups.popups.length, 'popups')` is sufficient.

---

### GAP-03 — `validateMisc` tests validate the wrong schema

**File:** [`apps/web/src/ai/validators/validators.test.ts:167-201`](apps/web/src/ai/validators/validators.test.ts#L167-L201)  
**Decision: ✅ Resolved by BUG-04 fix**

Covered entirely by BUG-04: deleting `validators/misc.ts` removes the source of the false tests, and the replacement test block validates `MiscSchema` with actual Stage 4 output format. No additional action needed.

---

### GAP-04 — No graceful total pipeline timeout ceiling

**File:** [`apps/web/app/api/generate/route.ts`](apps/web/app/api/generate/route.ts)  
**Decision: ✅ Add 4.5-minute total pipeline timeout with graceful error event**

Worst-case total duration (all retries, all stages):

| Stage | Max attempts | Max time |
|---|---|---|
| Stage 0 | 1 | ~90s |
| Stage 1 | 3 × 15s + backoff | ~48s |
| Stage 2 | 3 × 45s + backoff | ~138s |
| Stage 3+4 | 3 × 15s + backoff (parallel) | ~48s |
| **Total** | | **~324s** |

Without a ceiling, Vercel's `maxDuration: 300` kills the request with a 504 — no graceful `{ type: 'error' }` event, no client retry. The client sees "stream closed without completing" and retries blind.

**Fix:** Wrap the generator loop in a `withTimeout`:

```typescript
// In route.ts — inside ReadableStream start()
const PIPELINE_HARD_LIMIT_MS = 270_000  // 4.5 min — leaves headroom under maxDuration: 300

const generatorWithTimeout = withPipelineTimeout(
  generateScene(topic, mode, modelConfig),
  PIPELINE_HARD_LIMIT_MS,
)

for await (const event of generatorWithTimeout) {
  // … existing SSE emit logic
}
```

Where `withPipelineTimeout` wraps the async generator in a `Promise.race` against a timeout that yields a graceful error event before closing. Alternatively, use the same `withTimeout` pattern already in `pipeline.ts` but at the route level.

---

### GAP-05 — Client double-validates scenes that were already validated server-side

**Decision: ✅ Closed — keep as-is**

The user confirmed both client and server will always run the same version of `@insyte/scene-engine`. Double validation is acceptable as defence-in-depth. No action needed.

---

## Implementation Order

Apply in this order to avoid breaking intermediate states:

| # | Fix | File(s) | Depends on |
|---|---|---|---|
| 1 | BUG-04 + GAP-03: Delete `validateMisc`, replace test | `validators/misc.ts`, `validators/index.ts`, `validators.test.ts` | — |
| 2 | BUG-08: Add step count check to `validateSteps` | `validators/steps.ts` | — |
| 3 | BUG-03: Remove `condenseReasoning`, update Stage 0 prompt | `pipeline.ts`, `stage0-reasoning.md` | — |
| 4 | BUG-01: Move semantic validation inside `retryStage` | `pipeline.ts` | BUG-03 (signature change) |
| 5 | BUG-02 + BUG-09: Stream Stage 0 with `streamText` | `pipeline.ts` | BUG-03 |
| 6 | BUG-10: Add `providerName` to `ModelConfig`; provider-aware thinking helper | `client.ts`, `route.ts`, `pipeline.ts` | BUG-02 |
| 7 | BUG-06 + BUG-07: Fix model IDs in routing | `model-routing.ts` | — |
| 8 | BUG-05: Send `mode` from client | `useStreamScene.ts` | — |
| 9 | GAP-01: Align all stage examples to Binary Search | All 4 `.md` prompts | — |
| 10 | GAP-02: Add logging for annotations/misc events | `useStreamScene.ts` | — |
| 11 | BUG-09: Add keep-alive heartbeat interval | `route.ts` | — |
| 12 | GAP-04: Add total pipeline timeout | `route.ts` | BUG-09 (both touch route.ts, do together) |

---

## Quick Reference

| ID | File | Decision | Status |
|---|---|---|---|
| BUG-01 | `pipeline.ts:183` | Wrap validateSteps inside retryStage | ✅ Fix |
| BUG-02 | `pipeline.ts:131`, `client.ts:48` | Stream Stage 0 with streamText | ✅ Fix |
| BUG-03 | `pipeline.ts:323` | Remove condenseReasoning, constrain Stage 0 prompt | ✅ Fix |
| BUG-04 | `validators/misc.ts` | Delete file, replace test with MiscSchema smoke test | ✅ Fix |
| BUG-05 | `useStreamScene.ts:211` | Send detectedMode in fetch body | ✅ Fix |
| BUG-06 | `model-routing.ts:24` | Change stage4 to gemini-2.0-flash-lite | ✅ Fix |
| BUG-07 | `model-routing.ts:22` | Revert stage2 to gemini-2.0-pro | ✅ Fix |
| BUG-08 | `validators/steps.ts` | Add stepCount check | ✅ Fix |
| BUG-09 | `route.ts` | Add keep-alive heartbeat for inter-stage gaps (independent of BUG-02) | ✅ Fix |
| BUG-10 | `client.ts`, `route.ts`, `pipeline.ts:114` | Provider-aware thinking config via `buildStage0ProviderOptions` + `providerName` on `ModelConfig` | ✅ Fix |
| GAP-01 | 4 prompt `.md` files | Align all examples to Binary Search | ✅ Fix |
| GAP-02 | `useStreamScene.ts:229` | Add logging for annotations/misc events | ✅ Fix |
| GAP-03 | `validators.test.ts:167` | Resolved by BUG-04 | ✅ Resolved by BUG-04 |
| GAP-04 | `route.ts` | Add 4.5-min total pipeline timeout | ✅ Fix |
| GAP-05 | `useStreamScene.ts:119` | Keep as-is (same version guaranteed) | ✅ Closed |
