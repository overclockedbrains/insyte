# Phase 30 — AI Pipeline Redesign: Kill ISCL, Stage 0 Reasoning, Co-generated Steps + Explanations

> **Revision 3 — April 14, 2026**  
> Incorporates findings from 4 research documents: `byok-model-routing.md`, `prompt-engineering.md`, `ai-module-package.md`, `plan-audit.md`. 14 of 15 audit discrepancies resolved. BYOK model routing (discrepancy #1) deferred to Phase 31.

**Goal:** Fix the root causes of insyte's generation quality problems — persistent ISCL hallucinations, visual-logic drift (steps and explanations out of sync), and blind retries — by replacing ISCL with native constrained decoding, introducing a free-text reasoning pass (Stage 0) that flows as shared context into all downstream stages, and co-generating explanation + actions per step so drift is structurally impossible.

**Source research:** `.planning/research/ai-pipeline-redesign/README.md` + `sources-and-quotes.md`  
**Additional research:** `byok-model-routing.md` · `prompt-engineering.md` · `ai-module-package.md` · `plan-audit.md`

**Estimated effort:** 8–10 days

**Prerequisite:** Phase 25 (5-stage pipeline and SSE infrastructure in place — this phase restructures it)

**Scope:** Entire change is inside `apps/web/src/ai/`. Nothing in `packages/scene-engine`, the rendering engine, or layout engine changes. The `GenerationEvent` discriminated union gains one new variant (`reasoning`) — a minor frontend addition to show "Thinking..." during Stage 0.

---

## Why This Phase Exists

Phase 25 correctly decomposed the monolithic generation into stages. What it didn't fix:

| Problem | Root cause | This phase fixes it by |
|---|---|---|
| Broken ISCL output | Model has zero ISCL training data — every call is zero-shot DSL generation | Killing ISCL entirely; using `generateObject` + Zod for guaranteed-valid output |
| Steps and explanations out of sync | Stage 3 writes explanations for a visualization it has never seen | Co-generating explanation + actions in Stage 2; `explanation` field before `actions` forces pedagogical reasoning first |
| Blind retries | `retryStage` sends the same prompt every time | Injecting the exact validator error message into each retry prompt |
| Reasoning quality degraded | Stage 1 forces simultaneous reasoning + ISCL syntax generation | Stage 0 (free reasoning, no format pressure) + Stage 1 (transcribe decisions into JSON) |

---

## New Stage Map

```
Stage 0  FREE REASONING
         Model:  Gemini 2.5 Pro (default) — or user's BYOK model for all stages (static, no routing)
         Input:  topic + mode hint  [single user turn — no system prompt]
         Output: plain text stream → yield { type: 'reasoning', text } to UI ("Thinking...")
         Prompt: PTCF framework, numbered planning questions, visual primitive enum
         Rules:  NO few-shot, NO "think step by step", temperature 1.0 + high thinkingBudget
         Why:    Thinking models reason from first principles. Few-shot pushes into pattern-
                 matching mode, short-circuiting the reasoning you're paying for. Separating
                 reasoning from formatting preserves full reasoning quality.
         Emits:  { type: 'reasoning', text: string }

Stage 1  SCENE SKELETON
         Model:  Gemini Flash (default) — or user's BYOK model
         Input:  topic + Stage 0 reasoning + few-shot skeleton example
         Output: generateObject(SceneSkeletonSchema)  [guaranteed valid, no parser]
         Schema: { title, type, layout, visuals: [{ id, type, hint?, slot? }], stepCount }
         Prompt: Brief system prompt; Stage 0 context as labeled block at top; schema first,
                 then Binary Search example, then anti-copy guard, then topic
         Rules:  ID naming constraints HERE (lowercase-hyphen only). Temperature 0.1.
         Emits:  { type: 'plan', skeleton }

Stage 2  STEPS + EXPLANATIONS  (replaces Stage 2a + Stage 2b + Stage 3's explanation role)
         Model:  Gemini 2.0 Pro (default) — or user's BYOK model
         Input:  topic + Stage 0 reasoning (condensed ≤300 tokens) + Stage 1 skeleton + few-shot
         Output: generateObject(buildStepsSchema(visualIds))   [dynamic schema factory]
         Schema: {
           initialStates: Record<visualId, VisualState>,
           steps: [{
             index: number,
             explanation: {  ← FIRST (explanation drives animation)
               heading: string,
               body: string
             },
             actions: [{     ← SECOND (driven by explanation above)
               target: z.enum([...visualIds]),   ← constrained decoding: invalid IDs impossible
               params: VisualParams
             }]
           }]
         }
         Prompt: Pedagogical system prompt; visual IDs enum as bullet list at TOP of user turn;
                 Stage 1 skeleton block; condensed Stage 0 block; explicit CoT instruction
                 ("write EXPLANATION FIRST, then ACTIONS"); Binary Search example; topic LAST.
                 Total prompt ≤ 3000 tokens. XML-style section delimiters throughout.
         Rules:  Both schema ordering AND explicit instruction (neither alone is sufficient).
                 Temperature 0.2. Stage 0 context MUST be condensed before injection.
         Emits:  { type: 'content', steps }

[Stage 2 must complete before Stage 3 starts — Stage 3 references visual IDs, Stage 2 confirms them]

Stage 3  POPUPS ONLY  (tiny, focused — no longer writes explanations)
         Model:  Gemini Flash (default) — or user's BYOK model
         Input:  topic + Stage 1 skeleton (visual IDs + step count only) — NOT Stage 2 output
         Output: generateObject(buildPopupsSchema(visualIds))  [dynamic schema factory]
         Schema: { popups: [{ attachTo: z.enum([...visualIds]), showAtStep, hideAtStep, text, style }] }
         Prompt: Visual IDs bullet list at top; tiny example; anti-copy guard; topic.
                 No Stage 2 context — popups reference step indices (schema-constrained) and
                 visual IDs (schema-constrained). Stage 2 content adds context rot with no benefit.
         Rules:  Temperature 0.3–0.5 (most creative text in popups). Keep short.
         Emits:  { type: 'annotations', popups }

Stage 4  MISC  [parallel with Stage 3]
         Model:  Gemini Flash-Lite (default) — or user's BYOK model
         Input:  topic only — fully independent
         Output: generateObject(MiscSchema)
         Schema: { challenges: [...], controls: [...] }
         Prompt: No system prompt; challenge type progression example; temperature 0.5 challenges.
         Emits:  { type: 'misc', misc }

Stage 5  ASSEMBLY  (unchanged — deterministic, no LLM)
         Input:  skeleton + steps + popups + misc (all new typed inputs — not ISCL types)
         Output: validated Scene object via Zod safeParseScene
         Emits:  { type: 'complete', scene }
```

**Execution order:** Stage 0 → Stage 1 → Stage 2 → [Stage 3 ∥ Stage 4] → Stage 5  
Stage 3 and 4 run in parallel with each other AFTER Stage 2, not simultaneously with Stage 2. This ensures events arrive in the correct canonical order (`reasoning` → `plan` → `content` → `annotations` → `misc` → `complete`) and prevents the generation-store state machine from receiving out-of-order events.

---

## Model Routing

**Phase 30 stance: static routing only. BYOK routing deferred to Phase 31.**

When the user has no BYOK key (free tier, default Gemini), the pipeline uses fixed stage-specific models. When the user has BYOK active, every stage uses their selected model — no routing.

### `apps/web/src/ai/model-routing.ts`

```typescript
// apps/web/src/ai/model-routing.ts

/**
 * Default stage models (used when no BYOK key is active).
 * BYOK routing — smarter per-provider tier selection — is planned for Phase 31.
 */
export const STAGE_MODELS = {
  stage0: 'gemini-2.5-pro',       // free reasoning — best quality
  stage1: 'gemini-2.0-flash',     // skeleton transcription — cheap
  stage2: 'gemini-2.0-pro',       // steps + explanations — needs coherence
  stage3: 'gemini-2.0-flash',     // popups — cheap
  stage4: 'gemini-2.0-flash-lite',// misc/challenges — cheapest
} as const

/**
 * Resolve model for a stage.
 * BYOK: use the user's selected model for all stages (static, no routing).
 * Default: use STAGE_MODELS per-stage mapping.
 */
export function resolveStageModel(
  stage: keyof typeof STAGE_MODELS,
  byokModel: string | null,
): string {
  if (byokModel) return byokModel   // BYOK: same model for all stages
  return STAGE_MODELS[stage]
}
```

---

## AI Module Package Structure

**Decision: Do NOT extract to `packages/ai/` now.**

Blockers found by auditing the actual codebase:
1. `loadPrompt.ts` uses `readFileSync` with `process.cwd()` — breaks in external packages under Webpack (project is locked to `--webpack` in both dev and build scripts)
2. `liveChat.ts` and `traceToScene.ts` import app-internal types via `@/` alias — the module is not package-ready without fixing those first
3. Turborepo's own docs: extract only when there are multiple consumers — there is one consumer

**What to do instead (Hybrid approach):**

**Step A** (do in this phase): Fix the two `@/` alias imports that cross the boundary:
- `apps/web/src/ai/liveChat.ts` — fix `@/src/stores/slices/chat-slice` import
- `apps/web/src/ai/traceToScene.ts` — fix `@/src/sandbox/types` import

**Step B** (do in this phase): Add `apps/web/src/ai/index.ts` as a public barrel — all external consumers import from this, not from individual files.

**Step C** (optional): Add ESLint `import/no-restricted-paths` rule to enforce that only `src/ai/index.ts` can be imported from outside `src/ai/`.

**After Phase 30:** The pipeline redesign eliminates `readFileSync` (markdown prompts become TS template literals, ISCL parser deleted). At that point, the only hard blocker to extraction is gone. If a second consumer appears, extraction is straightforward.

---

## Plan Audit Resolutions

All 15 discrepancies from `plan-audit.md` resolved:

| # | Discrepancy | Resolution |
|---|---|---|
| 1 | BYOK kills routing | **Deferred to Phase 31.** Phase 30: BYOK is static — user's selected model for all stages. |
| 2 | Stage 0 streaming not in plan | Add `yield { type: 'reasoning', text }` event; new `reasoning` variant in GenerationEvent |
| 3 | `assembly.ts` "untouched" is false | New Step 8 explicitly covers updating assembly.ts input types |
| 4 | Zod field ordering not guaranteed | Both schema ordering AND explicit prompt instruction (both required per research) |
| 5 | `validators/states.ts` delete loses semantic checks | Migrate checks to `validators/steps.ts` — do not delete the checks, only delete the file |
| 6 | Few-shot topics collide across stages | Research confirms: same Binary Search topic across all stages is correct; anti-copy guard is sufficient |
| 7 | Stage 0 model hardcoded Gemini | resolveStageModel(stage0, provider, ...) uses frontier tier from provider's tier map |
| 8 | Stage 3+4 parallel with Stage 2 breaks event order | Stage 2 completes first; Stage 3 and 4 run in parallel after Stage 2 |
| 9 | Stage 0 adds latency | Acknowledged; Stage 0 streaming (`reasoning` event) is the UX mitigation |
| 10 | No per-stage timeout | Added to `retryStage` — see Step 4 |
| 11 | `initialStates` schema too loose | Per-visual-type structural checks migrated from states.ts to steps.ts |
| 12 | Stage 4 lastError not in examples | Covered explicitly in Step 5 |
| 13 | `stage3-annotations.md` missing from deletions | Added to "What Gets Deleted" table |
| 14 | Validator import chain not updated | Added as explicit sub-step in Step 7 |
| 15 | GenerationEvent needs `reasoning` variant | Added in Step 12 (GenerationEvent update) |

---

## Implementation Steps

### Step 1 — Add `generateObject` wrapper to `client.ts`

Add alongside `callLLM`. Uses Vercel AI SDK's native structured output (constrained decoding — guaranteed-valid output at the token level, not post-hoc validation).

```typescript
// apps/web/src/ai/client.ts — new export

import { generateObject as aiGenerateObject } from 'ai'
import type { ZodSchema } from 'zod'

export async function generateObject<T>(
  prompt: string,
  schema: ZodSchema<T>,
  config: ModelConfig,
): Promise<T> {
  const model = getModel(config)
  const { object } = await aiGenerateObject({
    model,
    schema,
    prompt,
    temperature: config.temperature ?? 0.1,
  })
  return object
}
```

`callLLM` stays unchanged — used by Stage 0 (free text) and `liveChat.ts`.

---

### Step 2 — Define Zod schemas in `apps/web/src/ai/schemas.ts`

Note: Stage 2 and Stage 3 schemas are **factories** (not static schemas) because `target` and `attachTo` must be `z.enum([...visualIds])` where `visualIds` comes from Stage 1 output. A static schema cannot enumerate IDs that aren't known at compile time.

```typescript
// apps/web/src/ai/schemas.ts

import { z } from 'zod'

// ─── Stage 1: Scene Skeleton ──────────────────────────────────────────────────

export const SceneSkeletonSchema = z.object({
  title: z.string(),
  type: z.enum(['concept', 'dsa', 'lld', 'hld']),
  layout: z.enum([
    'dagre-TB', 'dagre-LR', 'dagre-BT',
    'tree-RT', 'linear-H', 'linear-V',
    'grid-2d', 'hashmap-buckets', 'radial',
  ]),
  visuals: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'ID must be lowercase-hyphen (e.g. arr, left-ptr)'),
    type: z.enum([
      'array', 'hashmap', 'linked-list', 'tree', 'graph',
      'stack', 'queue', 'dp-table', 'recursion-tree',
      'system-diagram', 'text-badge', 'counter',
    ]),
    hint: z.string().optional(),
    slot: z.enum([
      'top-left', 'top-center', 'top-right',
      'center-left', 'center', 'center-right',
      'bottom-left', 'bottom-center', 'bottom-right',
      'full', 'overlay',
    ]).optional(),
  })),
  stepCount: z.number().int().min(3).max(20),
})

export type SceneSkeletonParsed = z.infer<typeof SceneSkeletonSchema>

// ─── Stage 2: Steps + Explanations (dynamic schema factory) ──────────────────

const VisualParamsSchema = z.record(z.unknown())

/**
 * buildStepsSchema creates the Stage 2 schema with visual IDs constrained
 * to the exact set from Stage 1. This makes it physically impossible for
 * generateObject to produce an action.target that isn't a valid visual ID.
 */
export function buildStepsSchema(visualIds: string[]) {
  const visualIdEnum = z.enum(visualIds as [string, ...string[]])
  return z.object({
    initialStates: z.record(visualIdEnum, VisualParamsSchema),
    steps: z.array(z.object({
      index: z.number().int().min(1),
      explanation: z.object({  // FIRST — LLM must write this before actions
        heading: z.string().min(3).max(80),
        body: z.string().min(10).max(400),
      }),
      actions: z.array(z.object({
        target: visualIdEnum,  // constrained decoding: invalid IDs impossible
        params: VisualParamsSchema,
      })),
    })).min(1),
  })
}

export type StepsParsed = {
  initialStates: Record<string, Record<string, unknown>>,
  steps: Array<{
    index: number,
    explanation: { heading: string; body: string },
    actions: Array<{ target: string; params: Record<string, unknown> }>,
  }>
}

// ─── Stage 3: Popups (dynamic schema factory) ─────────────────────────────────

/**
 * buildPopupsSchema constrains attachTo to valid visual IDs from Stage 1.
 */
export function buildPopupsSchema(visualIds: string[]) {
  return z.object({
    popups: z.array(z.object({
      attachTo: z.enum(visualIds as [string, ...string[]]),
      showAtStep: z.number().int().min(1),
      hideAtStep: z.number().int().min(1),
      text: z.string().min(5).max(200),
      style: z.enum(['info', 'warning', 'success', 'highlight']).optional(),
    })).max(6),
  })
}

export type PopupsParsed = z.infer<ReturnType<typeof buildPopupsSchema>>

// ─── Stage 4: Misc ───────────────────────────────────────────────────────────

export const MiscSchema = z.object({
  challenges: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()).min(2).max(4),
    answer: z.number().int().min(0).max(3),
    type: z.enum(['predict', 'break-it', 'optimize']).optional(),
  })).max(3),
  controls: z.array(z.object({
    id: z.string(),
    label: z.string(),
    action: z.string(),
  })).optional(),
})

export type MiscParsed = z.infer<typeof MiscSchema>
```

**Why dynamic schema factories for Stages 2 and 3:** The `z.enum([...visualIds])` constraint on `target` and `attachTo` is the strongest anti-hallucination layer. It makes it physically impossible for `generateObject` to produce an invalid cross-reference. This can only be enforced if the enum values are known at call time — which means the schema must be built after Stage 1 completes.

---

### Step 3 — Rewrite `pipeline.ts`

```typescript
// apps/web/src/ai/pipeline.ts (restructured)

export async function* generateScene(
  topic: string,
  mode: SceneMode,
  modelConfig: ModelConfig,
): AsyncGenerator<GenerationEvent> {

  // BYOK: use user's selected model for all stages (static — routing deferred to Phase 31)
  // Default: use per-stage models from STAGE_MODELS
  const byokModel = modelConfig.byokModel ?? null

  // Helper: build a config for a specific stage
  const stageConfig = (stage: StageKey, temperature: number): ModelConfig => ({
    ...modelConfig,
    model: resolveStageModel(stage, byokModel),
    temperature,
  })

  // ── Stage 0: Free Reasoning ────────────────────────────────────────────────
  // Single user turn, no system prompt, no few-shot. Frontier model.
  // Temperature 1.0, high thinkingBudget. See prompt-engineering.md for rationale.
  const reasoning = await withTimeout(
    callLLM(buildStage0Prompt(topic, mode), stageConfig('stage0', 1.0)),
    60_000,  // 60s timeout for thinking model
  )
  yield { type: 'reasoning', text: reasoning }

  // Condense Stage 0 output to ≤300 tokens before injecting into Stage 2.
  // Full raw Stage 0 in the middle of Stage 2's prompt triggers "lost-in-the-middle"
  // context rot. Condensed summary goes near top of Stage 2 user turn.
  const reasoningSummary = condenseReasoning(reasoning, 300)

  // ── Stage 1: Scene Skeleton ────────────────────────────────────────────────
  const skeleton = await retryStage(2, (lastError) =>
    generateObject(
      buildStage1Prompt(topic, reasoning, lastError),
      SceneSkeletonSchema,
      stageConfig('stage1', 0.1),
    ),
    15_000,  // 15s timeout per attempt
  )
  yield { type: 'plan', skeleton }

  const visualIds = skeleton.visuals.map(v => v.id)

  // ── Stage 2: Steps + Explanations ─────────────────────────────────────────
  // Must complete before Stage 3 — Stage 3 references visual IDs that Stage 2 confirms.
  // Schema is a factory call so target/attachTo enums are constrained to actual IDs.
  const steps = await retryStage(2, (lastError) =>
    generateObject(
      buildStage2Prompt(topic, reasoningSummary, skeleton, lastError),
      buildStepsSchema(visualIds),
      stageConfig('stage2', 0.2),
    ),
    30_000,  // 30s timeout per attempt — this is the heaviest stage
  )
  yield { type: 'content', steps }

  // ── Stage 3 + Stage 4 in parallel ─────────────────────────────────────────
  // Stage 3 runs AFTER Stage 2 (not simultaneously) to preserve event ordering.
  // Stage 3 and 4 run in parallel with each other — both are independent.
  const [popupsResult, miscResult] = await Promise.allSettled([

    retryStage(2, (lastError) =>
      generateObject(
        buildStage3Prompt(topic, skeleton, lastError),
        buildPopupsSchema(visualIds),
        stageConfig('stage3', 0.4),
      ),
      15_000,
    ),

    retryStage(2, (lastError) =>
      generateObject(
        buildStage4Prompt(topic, lastError),
        MiscSchema,
        stageConfig('stage4', 0.5),
      ),
      15_000,
    ),
  ])

  const popups = popupsResult.status === 'fulfilled' ? popupsResult.value : null
  const misc   = miscResult.status   === 'fulfilled' ? miscResult.value   : null

  if (popups) yield { type: 'annotations', popups }
  if (misc)   yield { type: 'misc',        misc   }

  // ── Stage 5: Assembly (deterministic, no LLM) ─────────────────────────────
  const scene = assembleScene(skeleton, steps, popups, misc)
  const parsed = safeParseScene(scene)
  if (!parsed.success) {
    yield { type: 'error', stage: 5, message: parsed.error.message }
    return
  }
  yield { type: 'complete', scene: parsed.data }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Condense Stage 0 reasoning to approximately maxTokens tokens.
 * Extracts key decisions (visual choices, step count, teaching moments)
 * and discards exploratory tangents.
 * Simple implementation: take first N characters as proxy for token count.
 */
function condenseReasoning(text: string, maxTokens: number): string {
  const charLimit = maxTokens * 4  // rough chars-per-token estimate
  if (text.length <= charLimit) return text
  return text.slice(0, charLimit) + '\n[condensed]'
}

/**
 * Wrap a promise with a timeout. Throws if the promise doesn't resolve
 * within timeoutMs milliseconds.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Stage timed out after ${timeoutMs}ms`)), timeoutMs)
  )
  return Promise.race([promise, timeout])
}
```

**Stage 2 is load-bearing.** If it fails after retries (or times out), the scene cannot be completed — abort by letting the error propagate up to the route handler which emits `{ type: 'error', stage: 2, message }`. All other stages (3, 4) are non-fatal — the scene renders without popups or challenges.

---

### Step 4 — Error-guided `retryStage` with timeout

```typescript
// apps/web/src/ai/pipeline.ts

async function retryStage<T>(
  maxRetries: number,
  fn: (lastError?: string) => Promise<T>,
  timeoutPerAttemptMs: number,
): Promise<T> {
  let lastError: string | undefined = undefined
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(lastError), timeoutPerAttemptMs)
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt === maxRetries) throw err
      // Exponential backoff: 500ms, 1000ms
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
  }
  throw new Error('retryStage: unreachable')
}
```

Each prompt builder receives `lastError` and appends the error guidance when present. The model is told exactly what to fix — not asked to "try again":

```typescript
function appendErrorGuidance(base: string, lastError?: string): string {
  if (!lastError) return base
  return `${base}

---
Your previous attempt was rejected with this validation error:
"${lastError}"
Fix exactly that issue. Do not change anything else.`
}
```

---

### Step 5 — Rewrite `prompts/builders.ts`

Five new builder functions, replacing all old builders:

```typescript
// apps/web/src/ai/prompts/builders.ts

export function buildStage0Prompt(topic: string, mode: SceneMode): string {
  return loadPrompt('stage0-reasoning.md', { topic, mode })
  // No lastError — Stage 0 failures abort immediately (no schema to validate against)
}

export function buildStage1Prompt(topic: string, reasoning: string, lastError?: string): string {
  const base = loadPrompt('stage1-skeleton.md', { topic, reasoning })
  return appendErrorGuidance(base, lastError)
}

export function buildStage2Prompt(
  topic: string,
  reasoningSummary: string,
  skeleton: SceneSkeletonParsed,
  lastError?: string,
): string {
  const visualIdsList = skeleton.visuals.map(v => `- ${v.id} (${v.type})`).join('\n')
  const skeletonJson = JSON.stringify(skeleton, null, 2)
  const base = loadPrompt('stage2-steps.md', {
    topic,
    reasoningSummary,
    visualIdsList,
    skeletonJson,
    stepCount: String(skeleton.stepCount),
  })
  return appendErrorGuidance(base, lastError)
}

export function buildStage3Prompt(
  topic: string,
  skeleton: SceneSkeletonParsed,
  lastError?: string,
): string {
  const visualIdsList = skeleton.visuals.map(v => `- ${v.id}`).join('\n')
  const base = loadPrompt('stage3-popups.md', {
    topic,
    visualIdsList,
    stepCount: String(skeleton.stepCount),
  })
  return appendErrorGuidance(base, lastError)
}

export function buildStage4Prompt(topic: string, lastError?: string): string {
  const base = loadPrompt('stage4-misc.md', { topic })
  return appendErrorGuidance(base, lastError)
}
```

---

### Step 6 — Write prompt files

#### `stage0-reasoning.md` — Free reasoning, thinking model

```markdown
You are an expert computer science educator and visual explainer.
Your goal is to deeply plan an interactive, step-by-step visualization of a CS concept.

Think through the following planning questions. Write your analysis freely — no format constraints.

1. What is this concept precisely? Define it.
2. What data structures or system components visually represent it?
   Allowed visual types: array · hashmap · linked-list · tree · graph · stack · queue · dp-table · recursion-tree · system-diagram · text-badge · counter
3. What are the 3–4 key "aha" teaching moments a learner MUST experience?
4. What data values change at each step? Describe the concrete mutations.
5. How many steps total? (Target 6–12. Fewer for simple concepts, more for complex algorithms.)
6. Which specific visual primitives best represent this? Why?

Topic: {topic}
Mode: {mode}
```

Rules for this prompt:
- No system prompt. Single user turn. This is the complete call.
- No "think step by step" instruction — the model is already doing it.
- No few-shot example — examples push thinking models into pattern-matching mode.
- The visual type enum appears here so Stage 0 reasoning is constrained to valid primitives.

---

#### `stage1-skeleton.md` — Skeleton with Stage 0 context

System prompt (separate system message):
```
You are building the skeleton for an interactive CS visualization.
Output only what the schema requires — no extra fields, no explanations.
```

User turn:
```markdown
<planning-context>
{reasoning}
</planning-context>

Based on your planning above, produce the scene skeleton JSON. Follow these rules:

1. Visual IDs must be lowercase with hyphens only (arr, left-ptr, call-stack). No camelCase, no underscores, no numbers as first character.
2. Choose layout that best fits the visual structure (dagre-TB for graphs, linear-H for arrays, etc.)
3. stepCount must match the number of teaching moments in your planning (typically 6–12)

EXAMPLE — shows FORMAT only, do not copy:
Topic: "Binary Search"
{
  "title": "Binary Search",
  "type": "dsa",
  "layout": "linear-H",
  "visuals": [
    { "id": "arr", "type": "array", "hint": "sorted integer array" },
    { "id": "ptr", "type": "counter", "hint": "current mid index" }
  ],
  "stepCount": 8
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
```

---

#### `stage2-steps.md` — Steps + explanations

System prompt (separate system message):
```
You are an expert CS educator and interactive simulation author.
Your job: write step-by-step animations that teach a concept through visual change,
with explanations that justify every visual action.
```

User turn (ordered by attention priority: critical constraints first, topic last):
```markdown
<visual-ids>
Use ONLY these exact strings as action targets and initialStates keys:
{visualIdsList}
</visual-ids>

<skeleton>
{skeletonJson}
</skeleton>

<planning-context>
{reasoningSummary}
</planning-context>

<instructions>
For each step, write the EXPLANATION FIRST — what should this step teach?
Then decide the ACTIONS — what should change on screen to show that teaching moment?
The explanation drives the animation. Not the other way around.

Rules:
1. initialStates must define starting values for every visual ID listed above
2. Steps must be numbered 1 through {stepCount} with no gaps
3. Every action target must be one of the visual IDs listed above — no others
4. Explanations: heading 5–80 chars, body 20–300 chars, plain prose (no bullet points)
5. Actions: target must exactly match a visual ID; params must be valid for that visual type
</instructions>

EXAMPLE — shows FORMAT only, do not copy:
Topic: "Binary Search"
{
  "initialStates": {
    "arr": { "items": [1, 3, 5, 7, 9, 11, 13], "highlighted": [] },
    "ptr": { "value": 0 }
  },
  "steps": [
    {
      "index": 1,
      "explanation": {
        "heading": "Start at the middle",
        "body": "Binary search begins by checking the middle element. If it matches the target, we found it in O(1). Otherwise, we eliminate half the array."
      },
      "actions": [
        { "target": "arr", "params": { "highlighted": [3] } },
        { "target": "ptr", "params": { "value": 3 } }
      ]
    }
  ]
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
```

**Context rot mitigation:** Visual IDs at top (highest attention), topic at bottom (also high attention), reasoning context in the middle. Total prompt kept under 3000 tokens. Stage 0 reasoning is pre-condensed to ≤300 tokens before injection.

---

#### `stage3-popups.md` — Popups only

```markdown
<visual-ids>
Attach popups ONLY to these visual IDs:
{visualIdsList}
</visual-ids>

Add 2–5 popup callouts for the visualization. Each popup appears for a range of steps.
Step range: 1 to {stepCount}.

Rules:
1. attachTo must be one of the visual IDs listed above
2. showAtStep must be ≤ hideAtStep
3. text: say WHY (insight or warning), not WHAT (the animation already shows what)
4. style: info (fact/context) · warning (common mistake) · success (key takeaway) · highlight (pivot moment)

EXAMPLE — shows FORMAT only, do not copy:
Topic: "Binary Search"
{
  "popups": [
    {
      "attachTo": "arr",
      "showAtStep": 2,
      "hideAtStep": 4,
      "text": "Each comparison eliminates half the remaining elements — that's O(log n)",
      "style": "info"
    }
  ]
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
```

---

#### `stage4-misc.md` — Challenges + controls

```markdown
Generate 3 challenges for a learner who just watched this visualization.

Challenge types — include all three types in this order:
1. predict: "What happens when…" — tests prediction before running
2. break-it: "What input would cause…" — tests edge case understanding
3. optimize: "How would you improve…" — tests deeper understanding

Rules:
1. 2–4 answer options per challenge; exactly one correct (0-indexed answer field)
2. No spoilers — don't reference the visualization's specific values
3. Increasing difficulty: predict → break-it → optimize

EXAMPLE — shows FORMAT only, do not copy:
Topic: "Binary Search"
{
  "challenges": [
    {
      "question": "If the target is larger than every element, how many comparisons does binary search make on a 16-element array?",
      "options": ["1", "4", "8", "16"],
      "answer": 1,
      "type": "predict"
    },
    {
      "question": "What input causes binary search to perform the maximum number of comparisons?",
      "options": ["An empty array", "A sorted array with the target at index 0", "A sorted array where the target is not present", "A reversed array"],
      "answer": 2,
      "type": "break-it"
    },
    {
      "question": "Binary search requires a sorted array. What technique allows you to binary search an almost-sorted array?",
      "options": ["Re-sort before each search", "Use a skip list instead", "Extend the search window by ±k positions", "Fall back to linear search"],
      "answer": 2,
      "type": "optimize"
    }
  ]
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
```

---

### Step 7 — Update validators (migrate, not delete)

**`validators/states.ts` — Do not delete. Migrate.**

The structural checks for `initialStates` values must move to `validators/steps.ts`. The Zod schema validates shape (`Record<visualId, Record<string, unknown>>`), but cannot validate type-specific structural requirements (e.g., an `array` visual's initial state must have an `items: unknown[]` field).

```typescript
// validators/steps.ts — semantic cross-checks after generateObject succeeds

export function validateSteps(
  steps: StepsParsed,
  skeleton: SceneSkeletonParsed,
): ValidationResult {
  const visualIds = new Set(skeleton.visuals.map(v => v.id))
  const errors: string[] = []

  // Check 1: initialStates keys must all be valid visual IDs
  for (const id of Object.keys(steps.initialStates)) {
    if (!visualIds.has(id)) {
      errors.push(`initialStates has unknown visual ID: "${id}"`)
    }
  }

  // Check 2: All visual IDs must have an initialState entry
  for (const id of visualIds) {
    if (!(id in steps.initialStates)) {
      errors.push(`initialStates missing entry for visual ID: "${id}"`)
    }
  }

  // Check 3: Step indices must be monotonically increasing (1, 2, 3…)
  const indices = steps.steps.map(s => s.index)
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] !== i + 1) {
      errors.push(`Step indices must be 1, 2, 3… Got ${indices[i]} at position ${i}`)
    }
  }

  // Check 4: action targets must match skeleton IDs
  // (This is also enforced by Zod enum but double-checked semantically)
  for (const step of steps.steps) {
    for (const action of step.actions) {
      if (!visualIds.has(action.target)) {
        errors.push(`Step ${step.index}: action target "${action.target}" not in skeleton`)
      }
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors }
}
```

**`validators/annotations.ts` → `validators/popups.ts`** (rename file):

```typescript
// validators/popups.ts — replaces validators/annotations.ts

export function validatePopups(
  popups: PopupsParsed,
  skeleton: SceneSkeletonParsed,
): ValidationResult {
  const visualIds = new Set(skeleton.visuals.map(v => v.id))
  const stepCount = skeleton.stepCount
  const errors: string[] = []

  for (const popup of popups.popups) {
    if (!visualIds.has(popup.attachTo)) {
      errors.push(`Popup attachTo "${popup.attachTo}" not in skeleton`)
    }
    if (popup.showAtStep > popup.hideAtStep) {
      errors.push(`Popup showAtStep (${popup.showAtStep}) > hideAtStep (${popup.hideAtStep})`)
    }
    if (popup.hideAtStep > stepCount) {
      errors.push(`Popup hideAtStep (${popup.hideAtStep}) > scene stepCount (${stepCount})`)
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors }
}
```

**`validators/index.ts`** — Update re-exports:
```typescript
export { validateSteps } from './steps'
export { validatePopups } from './popups'  // was: validateAnnotations from './annotations'
export { validateMisc } from './misc'
// Remove: validateStates (merged into validateSteps)
// Remove: validateAnnotations (renamed validatePopups)
```

---

### Step 8 — Update `assembly.ts` input types

The research says "assembly.ts — unchanged" but that refers to the deterministic logic, not the input types. The input types must update because `assembleScene` was built to consume ISCL-derived types.

```typescript
// apps/web/src/ai/assembly.ts

// Before: assembleScene(isclParsed: ISCLParsed): Scene
// After:  assembleScene(skeleton, steps, popups, misc): Scene

export function assembleScene(
  skeleton: SceneSkeletonParsed,
  steps: StepsParsed,
  popups: PopupsParsed | null,
  misc: MiscParsed | null,
): Scene {
  // Assembly logic is unchanged — only the input types change.
  // Map SceneSkeletonParsed → Scene.visuals
  // Map StepsParsed → Scene.steps + Scene.initialStates
  // Map PopupsParsed → Scene.popups (if present)
  // Map MiscParsed → Scene.challenges + Scene.controls (if present)
}
```

This is a type-level change + mapping update, not a logic change. The deterministic assembly logic (how inputs map to a Scene object) is unchanged.

---

### Step 9 — Fix AI module `@/` alias imports (Hybrid package step)

Two files in `apps/web/src/ai/` import app-internal types via the `@/` alias. Fix these before adding the barrel, so the barrier between the AI module and the rest of the app is clean:

- `apps/web/src/ai/liveChat.ts` — fix `@/src/stores/slices/chat-slice` import to use a relative path or a proper shared type
- `apps/web/src/ai/traceToScene.ts` — fix `@/src/sandbox/types` import similarly

Then add `apps/web/src/ai/index.ts` as the public barrel:

```typescript
// apps/web/src/ai/index.ts

export { generateScene } from './pipeline'
export { liveChat } from './liveChat'
export { traceToScene } from './traceToScene'
export type { GenerationEvent } from './pipeline'
// Internal implementation details (builders, validators, schemas) are not re-exported.
```

All consumers outside `src/ai/` must import from this barrel, not from individual files.

---

### Step 10 — Update `GenerationEvent` union

The `GenerationEvent` discriminated union (defined in `pipeline.ts` or a types file) gains one new variant:

```typescript
// Before (Phase 25):
export type GenerationEvent =
  | { type: 'plan';       skeleton: SceneSkeletonParsed }
  | { type: 'content';    steps: StepsParsed }
  | { type: 'annotations'; popups: PopupsParsed }
  | { type: 'misc';       misc: MiscParsed }
  | { type: 'complete';   scene: Scene }
  | { type: 'error';      stage: number; message: string }

// After (Phase 30):
export type GenerationEvent =
  | { type: 'reasoning';  text: string }           // ← NEW: Stage 0 text for "Thinking..."
  | { type: 'plan';       skeleton: SceneSkeletonParsed }
  | { type: 'content';    steps: StepsParsed }
  | { type: 'annotations'; popups: PopupsParsed }
  | { type: 'misc';       misc: MiscParsed }
  | { type: 'complete';   scene: Scene }
  | { type: 'error';      stage: number; message: string }
```

**Frontend impact:** `generation-store.ts` must handle the new `reasoning` event — at minimum, store the reasoning text and show it as a "Thinking..." block. This is the minimal frontend change required; detailed UX is out of scope for this phase.

---

### Step 11 — Delete ISCL artifacts

Delete after the pipeline is working end-to-end:

| File | Action |
|---|---|
| `apps/web/src/ai/iscl-preprocess.ts` | Delete |
| `apps/web/src/ai/iscl-preprocess.test.ts` | Delete |
| `apps/web/src/ai/prompts/stage1-iscl.md` | Delete |
| `apps/web/src/ai/prompts/stage2a-states.md` | Delete |
| `apps/web/src/ai/prompts/stage2b-steps.md` | Delete |
| `apps/web/src/ai/prompts/stage3-annotations.md` | Delete (replaced by `stage3-popups.md`) |
| `packages/scene-engine/src/iscl/parser.ts` | Delete (if not already removed) |
| `apps/web/src/ai/validators/states.ts` | Delete (logic migrated to steps.ts) |
| `apps/web/src/ai/validators/annotations.ts` | Delete (replaced by popups.ts) |

**Find-and-replace:** `ISCLParsed` → `SceneSkeletonParsed` across all TypeScript files. Run `grep -r "ISCLParsed" apps/web/src/` to find all occurrences before deleting.

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `apps/web/src/ai/client.ts` | Edit | Add `generateObject<T>` wrapper |
| `apps/web/src/ai/pipeline.ts` | Rewrite | New 6-stage structure, error-guided retry, model routing, timeouts, sequential Stage 2 then parallel Stage 3+4 |
| `apps/web/src/ai/schemas.ts` | New | Zod schemas + dynamic schema factories for Stages 1–4 |
| `apps/web/src/ai/model-routing.ts` | New | `STAGE_MODELS` + `resolveStageModel(stage, byokModel)` — static routing; BYOK uses user's model for all stages |
| `apps/web/src/ai/prompts/builders.ts` | Rewrite | 5 new builder functions with `lastError?` param |
| `apps/web/src/ai/assembly.ts` | Edit | Update input types from ISCL types to new schema types |
| `apps/web/src/ai/validators/steps.ts` | Expand | Migrate semantic checks from states.ts + add step index check |
| `apps/web/src/ai/validators/popups.ts` | New | Renamed from annotations.ts; removes explanation validation |
| `apps/web/src/ai/validators/index.ts` | Edit | Update re-exports |
| `apps/web/src/ai/index.ts` | New | Public barrel for the module |
| `apps/web/src/ai/liveChat.ts` | Edit | Fix `@/` alias import |
| `apps/web/src/ai/traceToScene.ts` | Edit | Fix `@/` alias import |
| `apps/web/src/ai/prompts/stage0-reasoning.md` | New | Free reasoning prompt |
| `apps/web/src/ai/prompts/stage1-skeleton.md` | New | Skeleton with Stage 0 context |
| `apps/web/src/ai/prompts/stage2-steps.md` | New | Steps + explanations |
| `apps/web/src/ai/prompts/stage3-popups.md` | New | Popups only |
| `apps/web/src/ai/prompts/stage4-misc.md` | New | Challenges + controls |
| `apps/web/src/ai/iscl-preprocess.ts` | Delete | ISCL eliminated |
| `apps/web/src/ai/iscl-preprocess.test.ts` | Delete | Tests for deleted file |
| `apps/web/src/ai/prompts/stage1-iscl.md` | Delete | Replaced |
| `apps/web/src/ai/prompts/stage2a-states.md` | Delete | Merged into stage2-steps.md |
| `apps/web/src/ai/prompts/stage2b-steps.md` | Delete | Merged into stage2-steps.md |
| `apps/web/src/ai/prompts/stage3-annotations.md` | Delete | Replaced by stage3-popups.md |
| `apps/web/src/ai/validators/states.ts` | Delete | Logic migrated to steps.ts |
| `apps/web/src/ai/validators/annotations.ts` | Delete | Replaced by popups.ts |
| `generation-store.ts` (frontend) | Edit | Handle new `reasoning` GenerationEvent (minimal: store text, show "Thinking...") |

---

## Key Invariants

1. **Stage 2 is load-bearing.** If it fails after retries, abort. All other stages are non-fatal.
2. **Event order must be canonical:** `reasoning` → `plan` → `content` → `annotations` → `misc` → `complete`. Stage 2 must complete before Stage 3 emits `annotations`.
3. **User's selected model is the ceiling for routing.** Never escalate to a more expensive model than the user selected. Never surprise-bill.
4. **Stage 0 gets NO system prompt, NO few-shot, NO "think step by step".** Thinking models degrade when given examples.
5. **Stage 2 explanation field MUST precede actions field in the Zod schema.** Verify that `generateObject` preserves Zod object property order in the JSON Schema it sends to the provider. If not guaranteed, add explicit prompt instruction (already in stage2-steps.md) as a redundant safeguard.
6. **Dynamic schema factories for Stages 2 and 3.** Never use a static Zod schema with `z.string()` for `target` or `attachTo` — the enum constraint is the primary anti-hallucination layer.
7. **Stage 2 prompt total ≤ 3000 tokens.** Condense Stage 0 output before injection. Lost-in-the-middle causes 30%+ accuracy drop on long prompts.
8. **Few-shot topic is Binary Search across all stages.** Same topic is correct — it creates a coherent reference visualization. Anti-copy guard is sufficient protection.
9. **`ISCLParsed` must not exist in the codebase after this phase.** grep for it in the verification checklist.

---

## Verification Checklist

- [ ] Generate "Binary Search" — no ISCL parse errors in logs; `reasoning` event shows planning text
- [ ] Generate "Hash Table" — explanation in each step matches the animation shown (no drift)
- [ ] Generate "Event Loop" — retry with a forced error injects the error message into the next attempt (check request logs)
- [ ] Generate "LRU Cache" — Stage 0 "Thinking..." visible in the UI before skeleton appears
- [ ] Generate with Anthropic BYOK — all stages use the user's selected Anthropic model (no routing, static)
- [ ] Stage 2 failure (mock it) — pipeline emits `{ type: 'error', stage: 2 }` and stops cleanly
- [ ] Stage 3 failure (mock it) — pipeline continues, scene is complete without popups
- [ ] Events arrive in canonical order: `reasoning` before `plan`, `plan` before `content`, `content` before `annotations`
- [ ] `grep -r "ISCLParsed" apps/` returns zero results
- [ ] `grep -r "parseISCL" apps/` returns zero results
- [ ] `grep -r "iscl-preprocess" apps/` returns zero results
- [ ] `grep -r "@/src" apps/web/src/ai/` returns zero results (no more cross-boundary imports)
- [ ] TypeScript compiles with zero errors across workspace (`pnpm typecheck`)
- [ ] `action.target` fields in generated scenes are always valid visual IDs (run 10 generations, check)

---

## Deferred (not in this phase)

| Item | Why deferred |
|---|---|
| BYOK model routing (provider-aware tier routing) | Active decision — deferred to Phase 31 for focused planning. Research in `byok-model-routing.md`. |
| `streamObject` / partial JSON progressive rendering | O(n²) reparsing makes naive streaming unusable above 5KB. Requires proper incremental parser. Post-launch. |
| Stage 0 token-level streaming to UI | Current plan emits `{ type: 'reasoning', text }` once Stage 0 completes. True token-level streaming requires a streaming variant in the SSE route. Deferred — stage-level streaming is sufficient for launch. |
| Semantic caching for Stage 0 (similar topics → same reasoning) | 31% cost reduction opportunity. Needs vector store infra. Phase 31+. |
| Settings UI for routing visibility | "Frontier model for reasoning, Fast models for other stages" toggle. Architecture supports it now; UI in a later polish phase. |
| Fine-tuning on insyte-specific scenes | Needs ~500 validated training examples. Phase 35+. |
| Phase 26 (Progressive Streaming UX) | Was blocked on pipeline quality. This phase fixes quality; Phase 26 resumes after. |
| `packages/ai/` extraction | Blocked by `readFileSync` in loadPrompt.ts. After Phase 30 converts prompts to TS template literals, the blocker is gone. Extract if a second consumer appears. |
