# Phase 30 Plan — Audit Against Research

**Date:** April 14, 2026  
**Auditor:** Internal (Claude Code)  
**Documents compared:**  
- Research: `.planning/research/ai-pipeline-redesign/README.md`  
- Plan: `.planning/phases/phase-30/PLAN.md`

---

## Summary

15 discrepancies identified across: BYOK model routing, Stage 0 streaming, assembly.ts scope, schema field ordering guarantee, few-shot topic collision, parallel-stage event ordering, and `validators/states.ts` fate.

Severity legend: 🔴 Breaks the quality goal / implementation | 🟡 Design gap that needs a decision | 🟢 Minor — acceptable as-is

---

## Discrepancy 1 — BYOK Completely Disables Model Routing 🔴

**Research says:**  
> "Model routing per stage" is listed as a core principle (#7 of 8). Stages 0 and 2 get frontier/mid models; Stages 1, 3, 4 get cheap models.

**Plan says (Step 9, `model-routing.ts`):**
```typescript
if (modelConfig.modelOverride) return modelConfig.modelOverride
return STAGE_MODELS[stage]
```
If the user sets any BYOK key, `modelOverride` is set, and ALL stages use the same model. Routing is entirely gone.

**Why this is a problem:**  
BYOK is the primary path for power users (free tier limits are low). Disabling routing on the primary user path means most users get no benefit from model routing — the feature that the research identifies as delivering "95% quality at 26% frontier model calls."

**What the plan should say instead:**  
When BYOK is active, route within the user's chosen provider's model family. Needs research on provider-aware routing (separate research doc commissioned).

---

## Discrepancy 2 — Stage 0 Streaming to User Is Not Implemented 🔴

**Research says:**  
> "Output: plain text stream — shown to user as 'thinking...'"  
> "Streaming keeps user engaged during generation."  
> The Decisions Log specifically notes: "Explicit Stage 0 text is **streamable**, injectable as context, debuggable. Thinking model internal reasoning is opaque and can't be used downstream."

**Plan says:**  
> "Stage 0 does not emit a GenerationEvent — its output flows into Stage 1 and 2 as context"

The plan correctly notes Stage 0 doesn't emit a structural `GenerationEvent`, but it **never addresses how the Stage 0 text gets shown to the user**. The `callLLM` call returns a complete string — there's no streaming to the UI here.

**What needs to be added:**  
Either:
1. A new `{ type: 'reasoning', chunk: string }` GenerationEvent for streaming Stage 0 output token-by-token, OR
2. A simpler `{ type: 'reasoning', text: string }` event emitted once Stage 0 is complete, so the UI at least shows "Thinking..." with the full reasoning blob before Stage 1 starts

Option 2 is simpler and consistent with the "stage-level SSE is sufficient for now" principle (streaming partial JSON is deferred). The plan needs a `yield { type: 'reasoning', text: reasoning }` after `callLLM` returns, and the `GenerationEvent` union needs a new `reasoning` variant.

---

## Discrepancy 3 — `assembly.ts` "Untouched" Is False 🔴

**Research says:**  
> "What Stays Unchanged: `assembly.ts` — deterministic, untouched"

**Plan says:**  
> `assembleScene(skeleton, steps, popups, misc)` — new call signature in Step 3

The current `assembly.ts` (from Phase 25) calls `parseISCL()` and works with `ISCLParsed` types. After Phase 30, it must accept `SceneSkeletonParsed`, `StepsParsed`, `PopupsParsed`, `MiscParsed`. The function signature and input mapping both change.

The research's claim that assembly is "untouched" is technically true in the sense that the **deterministic logic** (how parsed inputs map to a Scene object) doesn't change. But the **input types** must change from ISCL-derived types to the new Zod-schema-derived types.

**What the plan should clarify:**  
Add a specific step: "Update `assembly.ts` function signature from ISCL types to new schema types. The assembly logic itself is unchanged — only the input types are updated to match `SceneSkeletonParsed`, `StepsParsed`, etc."

---

## Discrepancy 4 — Zod Schema Field Ordering Not Guaranteed 🟡

**Research says:**  
> "Putting a `reasoning` or `explanation` field BEFORE the `actions` field forces the model to write WHY first, which then drives WHAT. This improved accuracy by 8 percentage points."

**Plan says:**  
`StepsSchema` is defined with `explanation` before `actions` in the Zod object.

**The gap:**  
Zod does NOT guarantee property ordering in the JSON Schema it generates. When `generateObject` converts `StepsSchema` to a JSON Schema for the provider's API, the `explanation` and `actions` fields may appear in any order. JavaScript objects had unspecified property ordering until ES2015, and serializers vary.

**What needs to be verified/added:**  
1. Verify that Vercel AI SDK's `generateObject` + the Gemini/Anthropic/OpenAI providers preserve Zod property ordering in the generated JSON Schema
2. If not guaranteed, add an explicit prompt instruction in `stage2-steps.md`: "For each step, write the `explanation` object **before** the `actions` array. Always complete the explanation before listing any actions."
3. Consider adding a `z.describe()` annotation to each field in `StepsSchema` that reinforces the ordering intent

---

## Discrepancy 5 — `validators/states.ts` Deletion Loses Semantic Checks 🟡

**Research says:**  
> "All validators — still used for semantic cross-checks after `generateObject`"

**Plan says (Step 7):**  
> "**`validators/states.ts`** — Remove. Initial states are now validated as part of Stage 2 output via Zod schema (`StepsSchema.initialStates`). No separate validation pass needed."

**The gap:**  
`StepsSchema.initialStates` is `z.record(VisualParamsSchema)` — it validates that the value is a record of valid params, but it **cannot validate that all keys are valid visual IDs from Stage 1**. That cross-reference check (initialStates keys ⊆ skeleton visual IDs) is a semantic constraint that Zod schemas alone cannot express without custom `.refine()` logic.

**What the plan should say instead:**  
Keep the semantic cross-check from `validators/states.ts` but move it into the existing `validators/steps.ts` (since Steps now include initial states). Don't delete the check — delete the file and migrate the cross-reference validation into `validators/steps.ts`'s simplified semantic-check pass.

---

## Discrepancy 6 — Few-Shot Topics Collide Across Stages 🟡

**Research says:**  
> "Anti-copy guard: use a different topic for the example than the current topic"

**Plan says (Step 6, prompt files):**  
- `stage1-skeleton.md` example: Topic "Binary Search"  
- `stage2-steps.md` example: Topic "Binary Search"

Both Stage 1 and Stage 2 prompts use "Binary Search" as the few-shot example. If the user generates "Binary Search", both stages see the same topic in the example AND in the actual request. The anti-copy guard ("Do NOT copy any values from the example above") becomes especially important here but the collision weakens its effectiveness.

**What the plan should do:**  
Use different topics across stage examples. Suggested assignments:
- Stage 0: no few-shot (reasoning prompt needs no example)
- Stage 1: "Merge Sort" (skeleton example)
- Stage 2: "Hash Table" (steps + explanations example)
- Stage 3: "LRU Cache" (popups example)
- Stage 4: "Binary Tree BFS" (challenges example)

---

## Discrepancy 7 — Stage 0 Model Hardcoded as Gemini Only 🟡

**Research says:**  
> "Model: Gemini 2.5 Pro / o3 (best reasoning available)"

**Plan says (Step 3, pipeline.ts):**  
```typescript
callLLM(buildStage0Prompt(topic, mode), { ...modelConfig, model: 'gemini-2.5-pro' })
```

The Stage 0 model is hardcoded to Gemini regardless of the user's BYOK provider. If the user has an OpenAI key, Stage 0 would try to use Gemini 2.5 Pro with their OpenAI key — this will fail. If they have an Anthropic key, the same problem.

**What the plan should do:**  
Model routing for Stage 0 needs to be provider-aware. The `STAGE_MODELS` map should map each provider to its best available reasoning model:
```typescript
const STAGE0_BY_PROVIDER = {
  gemini: 'gemini-2.5-pro',
  openai: 'o3',
  anthropic: 'claude-opus-4-6',  // Claude 4's best reasoning model
  groq: 'llama-3.1-70b',         // best available on Groq
  ollama: undefined,              // use whatever local model is configured
}
```

---

## Discrepancy 8 — Parallel Stage 3+4 May Emit Events Out of Order 🟡

**Plan says (Step 3):**  
Stage 2, Stage 3, and Stage 4 run via `Promise.allSettled([...])` simultaneously. Popups (Stage 3) and misc (Stage 4) could complete before steps (Stage 2).

**The gap:**  
The current `generation-store.ts` (Phase 26 plan) expects events in a specific order: `plan` → `content` → `annotations` → `misc` → `complete`. If Stage 3 (popups → `annotations` event) arrives before Stage 2 (`content` event), the frontend state machine may break.

**What the plan should address:**  
Two options:
1. Run Stage 3 and 4 in parallel with each other but only after Stage 2 completes (sequential block then parallel)
2. Make the generation-store event handler order-agnostic (buffer events, apply in canonical order)

Option 1 is simpler: `const steps = await stageTwo(); const [popups, misc] = await Promise.allSettled([stageThree(), stageFour()])`. Stage 3 is cheap and fast enough that waiting for Stage 2 adds negligible total latency — Stage 2 is always the bottleneck.

---

## Discrepancy 9 — Stage 0 Adds Latency Before Stage 1 'plan' Event 🟡

**Research says:**  
> "Stage 1 Emits: 'plan' event → client shows skeleton immediately"

**Plan says:**  
Stage 0 (reasoning) runs sequentially before Stage 1. Stage 0 for a thinking model may take 5–15 seconds.

**The gap:**  
In the current pipeline (Phase 25), Stage 1 (ISCL) runs immediately. After Phase 30, Stage 0 runs first, meaning the user waits 5–15 seconds longer before seeing the first `plan` event. The "skeleton appears immediately" promise of Stage 1 is now 5–15 seconds later.

**This is a known and accepted tradeoff** — the research explicitly endorses this in the Decisions Log ("Use thinking models for Stage 0"). But the plan should explicitly document this latency addition and note that Stage 0 text streaming to the user (Discrepancy 2) is the UX mitigation.

---

## Discrepancy 10 — `retryStage` Timeout Not Specified 🟢

**Plan says:**  
```typescript
await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
```
Exponential backoff: 500ms, 1000ms.

**The gap:**  
No overall timeout on a stage. If Stage 0 (thinking model) takes 30s and Stage 2 takes 20s, and both retry twice, total time could exceed 3 minutes. Research doesn't address this but production pipelines need a timeout cap.

**Suggested addition:**  
Add `timeoutMs?: number` to `retryStage` and wrap each attempt in a `Promise.race([fn(), timeoutPromise])`. Default 60s per attempt for Stage 0, 30s for Stage 2, 15s for Stages 1/3/4.

---

## Discrepancy 11 — Stage 2 `initialStates` Schema Is Too Loose 🟢

**Plan's `StepsSchema`:**  
```typescript
initialStates: z.record(VisualParamsSchema)
```
`VisualParamsSchema = z.record(z.unknown())` — accepts any key-value pairs.

**What Stage 2a currently validates (from `validators/states.ts`):**  
Specific structural checks per visual type (array must have `items`, hashmap must have `buckets`, etc.).

**The gap:**  
After Phase 30, `generateObject` guarantees the shape is `Record<string, Record<string, unknown>>` but doesn't guarantee that an `array` visual's initial state has an `items` field. Type-specific semantic validation is lost.

**What the plan should say:**  
The simplified `validators/steps.ts` semantic pass should include per-visual-type structural checks on `initialStates` values. These are the type-specific checks from the current `validators/states.ts` that should be migrated, not deleted.

---

## Discrepancy 12 — `buildStage4Prompt` Missing From `builders.ts` Rewrite Table 🟢

**Plan (Step 5, builders.ts rewrite table):**  
Shows 5 new builders: `buildStage0Prompt`, `buildStage1Prompt`, `buildStage2Prompt`, `buildStage3Prompt`, `buildStage4Prompt`.

**Plan (Step 4, error-guided retry):**  
Shows `buildStage1Prompt` with `lastError` wiring, but the Stage 4 builder is listed without any `lastError` detail in the code examples.

**Minor gap:** The table is correct but Step 4's code examples only show Stage 1. The pattern is clear — all builders get `lastError?` — but for completeness the PLAN should note Stage 4 also gets `lastError`.

---

## Discrepancy 13 — `stage3-annotations.md` Rename Not Listed in Deletions 🟢

**Plan's deletion list:**  
Lists `stage1-iscl.md`, `stage2a-states.md`, `stage2b-steps.md` for deletion.

**Actual file that exists:**  
`apps/web/src/ai/prompts/stage3-annotations.md` (confirmed from file listing). This must also be deleted and replaced by `stage3-popups.md`.

The plan's "What Gets Deleted" table is missing this entry. It IS mentioned in the Files Changed Summary at the bottom, so the information is there — just not in the deletions section.

---

## Discrepancy 14 — `validateSteps` and `validateAnnotations` Imports Not Updated 🟢

**Plan says:**  
Validators are simplified but not explicitly renamed in the import chain.

**What needs to happen:**  
- `validators/annotations.ts` → `validators/popups.ts` (rename)
- All imports of `validateAnnotations` in `pipeline.ts` and `validators/index.ts` must update to `validatePopups`
- `validators/index.ts` re-exports need updating

This is obvious but worth noting in the plan to prevent a missed step during implementation.

---

## Discrepancy 15 — `GenerationEvent` Union Needs `reasoning` Variant 🟡

Tied to Discrepancy 2. If Stage 0 output is shown to the user, the `GenerationEvent` discriminated union (defined in Phase 25's `pipeline.ts`) needs a new variant:

```typescript
| { type: 'reasoning'; text: string }
```

The plan says "GenerationEvent type unchanged" — but adding Stage 0 streaming requires this new variant. The frontend `generation-store.ts` and the SSE route must both handle the new event type.

**This is a scope addition, not a bug** — but the plan incorrectly claims zero frontend changes. The generation-store must at minimum handle the new `reasoning` event (even if just to display a "Thinking..." message).

---

## Summary Table

| # | Issue | Severity | Section to Update in Plan |
|---|-------|----------|---------------------------|
| 1 | BYOK disables routing entirely | 🔴 | Step 9 (model-routing.ts) |
| 2 | Stage 0 streaming to UI not implemented | 🔴 | Step 3 (pipeline.ts) |
| 3 | `assembly.ts` signature must change | 🔴 | Step 3 or new step |
| 4 | Zod field ordering not guaranteed | 🟡 | Step 2 (StepsSchema) + Step 6 (stage2-steps.md) |
| 5 | `validators/states.ts` deletes semantic checks | 🟡 | Step 7 (validators) |
| 6 | Few-shot topics collide across stages | 🟡 | Step 6 (all prompt files) |
| 7 | Stage 0 model hardcoded Gemini-only | 🟡 | Step 9 (model-routing.ts) |
| 8 | Parallel Stage 3+4 event ordering | 🟡 | Step 3 (pipeline.ts) |
| 9 | Stage 0 adds latency before first 'plan' event | 🟡 | Document/acknowledge |
| 10 | No per-stage timeout | 🟢 | Step 4 (retryStage) |
| 11 | `initialStates` schema too loose | 🟢 | Step 2 (StepsSchema) + Step 7 |
| 12 | Stage 4 `lastError` not shown in examples | 🟢 | Step 4/5 |
| 13 | `stage3-annotations.md` missing from deletions section | 🟢 | "What Gets Deleted" |
| 14 | Validator import chain not updated | 🟢 | Step 7 |
| 15 | `GenerationEvent` needs `reasoning` variant | 🟡 | Step 3 + frontend scope note |
