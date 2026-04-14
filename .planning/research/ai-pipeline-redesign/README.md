# AI Pipeline Redesign Research

**Date:** April 14, 2026  
**Status:** Research finalized — ready for implementation planning  
**Trigger:** Persistent hallucinations, broken ISCL output, steps and explanations out of sync in the live pipeline

---

## Table of Contents

1. [The Original Problem](#1-the-original-problem)
2. [Why We Switched to ISCL (Phases 24–25)](#2-why-we-switched-to-iscl-phases-2425)
3. [Honest Assessment: Did ISCL Fix It?](#3-honest-assessment-did-iscl-fix-it)
4. [Current Pipeline — Anatomy of the Gaps](#4-current-pipeline--anatomy-of-the-gaps)
5. [What the Industry Has Already Solved](#5-what-the-industry-has-already-solved)
6. [Prior Art](#6-prior-art)
7. [The Final Pipeline Design](#7-the-final-pipeline-design)
8. [Decisions Log](#8-decisions-log)
9. [Migration Scope](#9-migration-scope)
10. [Deferred to Future Releases](#10-deferred-to-future-releases)

---

## 1. The Original Problem

Before Phases 24–25, the AI module asked a single LLM call to produce one monolithic Scene JSON — a deeply nested object of 10–20 KB. This caused:

- Rampant hallucinations (invented fields, wrong types, inconsistent references)
- Structural corruption mid-JSON on long outputs
- Near-impossible error recovery — one wrong token invalidates the whole blob
- Token limits hit on larger scenes

**Root cause correctly identified at the time:** asking one model to reason AND produce 10–20 KB of precise structured output simultaneously is too hard for any model.

---

## 2. Why We Switched to ISCL (Phases 24–25)

The switch decomposed the monolith into a 5-stage pipeline where Stage 1 generates ISCL — a compact, line-oriented DSL invented for insyte — and subsequent stages generate smaller JSON fragments anchored to that skeleton.

**What improved:** the decomposition itself. Smaller, focused calls with less output per stage genuinely reduced hallucination frequency.

**What didn't improve:** the underlying model of "generate then validate and retry" was kept. ISCL is still free-form text generation against a novel grammar the model has never seen.

---

## 3. Honest Assessment: Did ISCL Fix It?

**No — not fully. The decomposition helped. ISCL itself is neutral at best, a liability at worst.**

| Claim | Reality |
|---|---|
| ISCL is more compact than JSON | True — ~30–40% fewer tokens for the skeleton |
| ISCL reduces hallucinations | False — it shifts them. Model now hallucinates ISCL syntax instead of JSON syntax. Same problem, different surface. |
| ISCL is easier for the LLM | False — ISCL has zero training data. JSON has billions of examples. Models understand JSON structure far more deeply. |
| The preprocessing fixes it | No — `stripCodeFences` and `joinStepContinuations` are band-aids over the fundamental issue that the model doesn't know ISCL |

**The real win of Phases 24–25 was the pipeline decomposition, not ISCL. ISCL was an incidental choice that brought its own costs.**

---

## 4. Current Pipeline — Anatomy of the Gaps

### Current Stage Map

```
Stage 1  →  ISCL (free-form text, custom parser)
Stage 2a →  Initial states JSON       ┐ parallel, each sees only ISCL skeleton
Stage 2b →  Step params JSON          ┘
Stage 3  →  Annotations JSON          ← sees only: visual IDs + step count + topic
Stage 4  →  Misc/challenges JSON      ← fully independent
Stage 5  →  Deterministic assembly
```

### Gap 1: Grammar bug in Stage 1 prompt (active bug right now)

[apps/web/src/ai/prompts/stage1-iscl.md line 14](../../../apps/web/src/ai/prompts/stage1-iscl.md) says:

```
VISUAL <type> <id> [HINT ...] [SLOT ...]
```

Every real example and the quick reference shows `VISUAL <id> <type>` (id first, then type). The prompt teaches the model the **wrong token order**. The parser rejects the output. This causes unnecessary retries that are purely the prompt's fault.

### Gap 2: Stage 3 writes explanations for a visualization it has never seen

`buildStage3Prompt` injects into Stage 3:
- `visualIdList` — e.g. `"arr, ptr"`
- `stepCount` — e.g. `"4"`
- `topic` — e.g. `"Binary Search"`

**It does not inject what actually happens at each step.** Stage 3 writes explanations based on what it imagines the steps contain, while Stage 2b independently decides what the steps actually do. The two calls share only a step count integer. This is the direct, mechanical cause of "steps and explanations not in sync."

This failure mode is documented in the literature as **Visual-Logic Drift** (ManiBench, arxiv 2603.13251).

### Gap 3: "Think AND Format" simultaneously

Stage 1 forces the model to:
1. Reason about the concept (what to show, how many steps, what data evolves)
2. Enumerate 8–12 steps with exact data mutations
3. Simultaneously write valid ISCL syntax it barely knows

Research consistently shows this degrades reasoning quality 10–15% compared to letting the model reason freely first, then format. The model's attention is split between semantic content and syntactic correctness.

### Gap 4: ISCL — zero LLM training data, maximum hallucination surface

ISCL is an insyte-specific DSL that did not exist before this project. No LLM has ever seen it in training. Every call is zero-shot DSL generation from a grammar spec embedded in the prompt. By contrast:

- JSON: billions of training examples, models understand it deeply
- SQL: massive training data, reliable generation
- Python: near-perfect generation even for complex programs

When you force a model to generate a format it has never seen, you get "inspired guesses" rather than reliable output. The preprocessors and the "Known AI Hallucinations" table in the quick reference exist because the model keeps guessing wrong.

### Gap 5: Dumb retries — no error feedback

`retryStage` in `pipeline.ts` retries with the **exact same prompt**. The model has no information about why it failed. It will very likely make the same mistake again. Industry standard (Instructor, DSPy) is to inject the exact error message into the retry so the model can self-correct.

### Gap 6: Stages 2a and 2b are never cross-checked for consistency

Stage 2a sets initial state (e.g. `arr.items = [1,3,5,7,9]`). Stage 2b generates step actions. Neither sees the other. The initial state might contradict what Step 1 does. No validator catches semantic contradictions — only structural ones (wrong visual IDs, out-of-range indices).

### Gap 7: No shared reasoning context across stages

Each stage after Stage 1 receives only the parsed ISCL skeleton (visual IDs, step count, layout). None of them see:
- Why the model chose those specific visuals
- What the model decided about the concept's key teaching moments
- What data values were considered canonical for the algorithm

VideoDirectorGPT (2025) specifically identifies this as **content consistency failure** — downstream stages that cannot reference upstream decisions produce semantically incoherent output.

---

## 5. What the Industry Has Already Solved

### Constrained Decoding / Structured Outputs

Every major provider (OpenAI, Anthropic, Gemini) now offers native structured outputs that use constrained decoding — they modify the token probability distribution at generation time to make it **physically impossible** to produce output that violates the schema. This is not post-hoc validation; it's guaranteed-valid output at the token level.

Vercel AI SDK's `generateObject` exposes this. It is already in the insyte stack.

**This makes ISCL's entire reason for existing obsolete.** ISCL was a compact intermediate format to reduce what the model had to generate. `generateObject` with a Zod schema achieves the same goal with zero hallucination risk and zero custom parser.

### Error-Guided Retry (Instructor, 2025)

Instructor (python.useinstructor.com) demonstrated that injecting the exact validation error into the retry prompt cuts retry frequency by ~50% in production. The model is told exactly what it did wrong and corrects specifically that issue instead of regenerating blindly.

### Schema-Aligned Parsing — SAP (BAML / BoundaryML, 2025)

BAML's SAP algorithm handles the messy reality of LLM outputs: markdown embedded in JSON, chain-of-thought reasoning before the structured response, trailing commas, extra whitespace. The key insight: **the model produces better structured output when it is allowed to reason in text before emitting structure.** Forbidding preamble (as the current Stage 1 prompt does: "Output ONLY the ISCL script — no markdown, no preamble") actively hurts quality.

### Separate Reasoning from Formatting

Documented across multiple frameworks (DSPy, Chain-of-Thought research, Manimator):

1. **Reasoning pass** — no format constraints, model thinks freely in natural language
2. **Formatting pass** — model converts its own reasoning into the required structure

This two-step approach preserves full reasoning quality. The formatting step is trivially easy (the model is transcribing its own thoughts into JSON) so it succeeds on the first try almost always.

### Field Ordering Inside JSON Objects (OpenAI, ACL 2025)

LLMs generate **left-to-right, token by token.** The field that appears first in a JSON schema gets written first. This is a chain-of-thought enforcer built into the schema.

Putting a `reasoning` or `explanation` field **before** the `actions` field forces the model to write WHY first, which then drives WHAT. This improved accuracy by **8 percentage points** in controlled studies with no other changes.

> *"It is recommended to structure JSON objects so that the content corresponding to the reasoning process is generated before the content corresponding to the outcome of this reasoning process."*

### Few-Shot Prompting for Structured Output

Zero-shot generation of a custom schema relies entirely on the model inferring the expected pattern from the prompt alone. Few-shot prompting shifts the model's probability distribution toward the demonstrated pattern, producing more consistent structured outputs at scale. One canonical example per stage is sufficient — it shows FORMAT not content to copy.

Anti-copy guard: use a different topic for the example than the current topic, plus an explicit instruction: `"The example above shows FORMAT only. Do not copy values. Generate fresh content for: {topic}"`.

### Model Routing Per Stage

50–70% of pipeline stages do not require frontier model intelligence. RouteLLM (ICLR 2025) achieved 95% of GPT-4 performance using only 26% GPT-4 calls. The key principle: match model capability to task difficulty per stage, not per pipeline.

---

## 6. Prior Art

### Manimator (arxiv 2507.14306)

Closest analog to insyte. Turns research papers and concepts into Manim animations using LLMs.

**Their pipeline:**
1. LLM generates a structured pedagogical plan (topic, key concepts, visual elements, style) — plain text/markdown output, no code constraints
2. A code-specialized LLM converts the plan into executable Manim Python

**Key finding:** the pedagogical plan in Step 1 flows as full context into Step 2. Step 2 always knows what the animation is supposed to teach before writing code.

**What insyte does differently (and worse):** insyte's Stage 3 does not see Stage 2's output. The equivalent of Manimator's Step 2 not knowing what Step 1 planned.

### ManiBench (arxiv 2603.13251)

Benchmark specifically evaluating LLM performance generating Manim code. Formally defines the two failure modes insyte is experiencing:

- **Syntactic Hallucinations** — invalid syntax, wrong API calls, malformed structure. Equivalent to broken ISCL.
- **Visual-Logic Drift** — the visual output does not match the intended explanation/narration. Equivalent to steps and explanations not in sync.

ManiBench confirms Visual-Logic Drift is caused by multi-stage pipelines where downstream annotation stages do not see upstream visual decision stages.

### VideoDirectorGPT (arxiv 2309.15091)

Multi-scene video generation. Core finding: **content consistency requires passing the full plan forward**, not just a structural skeleton. Scenes generated without shared context diverge visually and semantically.

---

## 7. The Final Pipeline Design

### Core Principles

1. **Reason first, format second** — dedicated free-text reasoning pass before any schema-constrained call
2. **Full context chaining** — every stage sees all previous stages' complete output
3. **Constrained generation** — `generateObject` for all structured stages, zero custom parsing
4. **Co-generate explanation with actions** — explanation field comes BEFORE actions field per step (field ordering as chain-of-thought enforcer)
5. **Error-guided retry** — inject exact failure message into retry prompt
6. **Kill ISCL** — replaced entirely by `generateObject` + Zod schema
7. **Model routing** — right model per stage, not same model everywhere
8. **Few-shot per stage** — one canonical example per stage, different topic, with anti-copy guard

### Final Stage Map

```
Stage 0  FREE REASONING
         Model:  Gemini 2.5 Pro / o3 (best reasoning available)
         Input:  topic + mode hint
         Output: plain text stream — shown to user as "thinking..."
         Prompt: "Think step by step: What is this concept? What data structures
                  best represent it? What are the 3–4 key teaching moments?
                  What changes at each step? How many steps?"
         Why:    Separates reasoning from formatting entirely. Model thinks freely
                 with no schema pressure. Output becomes shared context for all
                 downstream stages. Streaming keeps user engaged during generation.

Stage 1  SCENE SKELETON
         Model:  Gemini Flash (cheap — just filling a small form)
         Input:  topic + Stage 0 reasoning + few-shot skeleton example
         Output: generateObject(SceneSkeletonSchema)
         Schema: { title, type, layout, visuals: [{ id, type, hint?, slot? }], stepCount }
         Why:    Guaranteed valid via constrained decoding. No parser. No ISCL.
                 Stage 0 reasoning means the model already knows what visuals
                 to pick — Stage 1 is just transcribing that decision into JSON.
         Emits:  'plan' event → client shows skeleton immediately

Stage 2  STEPS + EXPLANATIONS  (merges current 2a + 2b + part of 3)
         Model:  Gemini Pro / Claude Sonnet (needs logical + pedagogical coherence)
         Input:  topic + Stage 0 reasoning + Stage 1 skeleton + few-shot step example
         Output: generateObject(StepsSchema)
         Schema: {
           initialStates: Record<visualId, VisualState>,
           steps: [{
             index: number,
             explanation: {        ← FIRST (model thinks "what should this step teach?")
               heading: string,
               body: string
             },
             actions: [{           ← SECOND (driven by the explanation above)
               target: visualId,
               params: VisualParams
             }]
           }]
         }
         Why:    Explanation field BEFORE actions field — field ordering forces the model
                 to reason pedagogically before deciding the animation. This is the
                 "field ordering as chain-of-thought enforcer" pattern (8pp improvement
                 in research). Explanation and actions co-generated in same token stream
                 = drift is structurally impossible.
         Emits:  'content' event

Stage 3  POPUPS ONLY  (tiny focused call)
         Model:  Gemini Flash (small, independent task)
         Input:  topic + Stage 1 skeleton (visual IDs + step count)
         Output: generateObject(PopupsSchema)
         Schema: { popups: [{ attachTo, showAtStep, hideAtStep, text, style }] }
         Why:    Popups are callouts attached to specific visual IDs at specific step
                 ranges. They don't need to know step content — they reference step
                 indices which are already constrained by the schema. Tiny call,
                 nearly impossible to fail, non-fatal if it does.
         Emits:  'annotations' event

Stage 4  MISC
         Model:  Cheapest available (Haiku / Flash)
         Input:  topic only — fully independent
         Output: generateObject(MiscSchema)
         Schema: { challenges: [...], controls: [...] }
         Emits:  'misc' event

Stage 5  ASSEMBLY  (unchanged — deterministic, no LLM)
         Input:  all stage outputs
         Output: validated Scene object via Zod safeParseScene
         Emits:  'complete' event
```

### Error-Guided Retry

Replace the current `retryStage` helper:

```ts
// Current (dumb retry — same prompt every time)
retryStage(MAX_RETRIES, () => callLLM(samePrompt, config))

// New (error-guided retry — model knows exactly what to fix)
retryStage(MAX_RETRIES, (lastError?: string) =>
  generateObject(
    lastError
      ? `${basePrompt}\n\n---\nYour previous attempt was rejected with this error:\n"${lastError}"\nFix exactly that issue in your response.`
      : basePrompt,
    schema,
    config
  )
)
```

### Few-Shot Pattern Per Stage

```
[Stage prompt content]

EXAMPLE (do not copy — shows FORMAT only):
Topic: "Binary Search"
{
  ... canonical well-formed example output ...
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
```

### What Gets Deleted

| Current file/feature | Status |
|---|---|
| `iscl-preprocess.ts` + `.test.ts` | **Deleted** |
| `packages/scene-engine/src/iscl/parser.ts` | **Deleted** |
| `docs/guides/iscl-quick-reference.md` | **Archived** |
| `prompts/stage1-iscl.md` | **Replaced** |
| `prompts/stage2a-states.md` | **Deleted** — merged into Stage 2 |
| `prompts/stage2b-steps.md` | **Deleted** — merged into Stage 2 |
| ISCL grammar spec in prompt | **Gone** |
| "Known AI Hallucinations" table | **Gone** |
| `parseISCL()` call in pipeline | **Gone** |
| `ISCLParsed` type | **Gone** — replaced by `SceneSkeletonParsed` |
| `buildStage2aPrompt` / `buildStage2bPrompt` | **Replaced** by `buildStage2Prompt` |

### What Gets Added

| New item | Purpose |
|---|---|
| `prompts/stage0-reasoning.md` | Free reasoning pass — no schema, just think |
| `prompts/stage1-skeleton.md` | Skeleton with Stage 0 context + few-shot example |
| `prompts/stage2-steps.md` | Steps + explanations with Stage 0+1 context + few-shot |
| `prompts/stage3-popups.md` | Popups only — small focused call |
| `SceneSkeletonSchema` (Zod) | Replaces `ISCLParsed` as Stage 1 output type |
| `generateObject` wrapper in `client.ts` | Replaces `callLLM` + `JSON.parse` + Zod for stages 1–4 |

### What Stays Unchanged

- `assembly.ts` — deterministic, untouched
- `liveChat.ts` — separate system, untouched
- All validators — still used for semantic cross-checks after `generateObject`
- All of `packages/scene-engine` — types, Zod schema, rendering engine, all untouched
- All frontend components — zero changes

---

## 8. Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Keep Stage 0 and Stage 1 separate | ✅ Yes | Explicit Stage 0 text is streamable, injectable as context, debuggable. Thinking model internal reasoning is opaque and can't be used downstream. |
| Use thinking models for Stage 0 | ✅ Yes — as model choice | Use Gemini 2.5 Pro or o3 for Stage 0, not to collapse stages but to get best reasoning quality |
| Co-generate explanation + actions in Stage 2 | ✅ Yes | Structurally prevents drift. Backed by field-ordering research (8pp improvement). |
| Explanation field BEFORE actions field | ✅ Yes | LLM generates left-to-right. Explanation first = model reasons pedagogically before deciding animation. |
| Stage 3 = popups only | ✅ Yes | Explanations moved into Stage 2. Stage 3 becomes a tiny, focused, near-infallible call. |
| Few-shot examples per stage | ✅ Yes | With anti-copy guard: different topic example + explicit "FORMAT only" instruction |
| Model routing per stage | ✅ Yes | Smart model for reasoning (Stage 0, 2), cheap model for simple tasks (Stage 1, 3, 4) |
| streamObject / partial JSON streaming | 🔜 Next release | Incomplete JSON causes frontend problems. SSE stage-level streaming is sufficient for now. |
| Semantic caching | 🔜 Next release | Valid optimization but not blocking. Implement after pipeline is stable. |
| Self-critique / self-correction pass | ❌ Never | Research shows LLM self-correction without external feedback makes things WORSE. Error-guided retry (with actual error message) is the correct approach. |
| Fine-tuning | 📝 Future (Phase 30+) | Need ~500 validated scenes first. Not relevant now. |

---

## 9. Migration Scope

Entire change is inside `apps/web/src/ai/`. Nothing in the rendering engine, scene-engine types, frontend, or API surface changes.

**Files changed:**
- `pipeline.ts` — restructured for 5 new stages with full context chaining
- `prompts/builders.ts` — new builder functions for all stages
- `client.ts` — add `generateObject` wrapper alongside `callLLM`
- `validators/annotations.ts` — split: explanations now validated as part of Stage 2, popups as Stage 3

**Files deleted:**
- `iscl-preprocess.ts` + `iscl-preprocess.test.ts`
- `prompts/stage1-iscl.md`, `prompts/stage2a-states.md`, `prompts/stage2b-steps.md`

**Files added:**
- `prompts/stage0-reasoning.md`
- `prompts/stage1-skeleton.md`
- `prompts/stage2-steps.md`
- `prompts/stage3-popups.md`

**Key type change:** `ISCLParsed` → `SceneSkeletonParsed`. Find-and-replace across pipeline + validators. Not a logic change.

---

## 10. Deferred to Future Releases

| Item | Why deferred |
|---|---|
| `streamObject` / partial JSON progressive rendering | Incomplete JSON creates frontend complexity. Stage-level SSE streaming is good enough for launch. |
| Semantic caching (Stage 0 output for similar topics) | Valid 31% cost reduction opportunity. Needs vector store infra. Post-launch. |
| Fine-tuning on insyte-specific scenes | Needs ~500 validated training examples first. Phase 30+. |
| Prompt caching (Anthropic / Gemini native KV cache) | Easy win but not blocking. Add during performance pass. |
