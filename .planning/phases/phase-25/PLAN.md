# Phase 25 — Multi-Stage AI Pipeline

**Goal:** Replace the current single-call 10–20KB JSON generation with a 5-stage pipeline driven by ISCL. Each stage is small, independently validable, and targets a specific piece of the scene. Visual IDs and step count flow from Stage 1 as hard constraints into downstream stages — the LLM reads them from its prompt context, never from its generation history. Each stage retries up to 2× before yielding a typed `ValidationError`. Stage 2a/2b support partial-success recovery. Expected failure rate: 5–10% (down from 50–60%).

**Source research:** `advanced-ai-pipeline.md` §2.7, `ai-pipeline.md` §6, `ARCHITECTURE_RECOMMENDATIONS.md` Phase D, `ARCHITECTURE_V3.md` Part 2 §2.5–2.6

**Estimated effort:** 10–12 days

**Prerequisite:** Phase 24 (ISCL parser must exist before Stage 1 can use it)

---

## Pipeline Architecture

```
User prompt (topic)
  │
  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Stage 1: ISCL Generation (~700 tokens output, ~1.5s)               │
│  AI generates Insyte Scene Language script                          │
│  → parseISCL() validates: visual IDs, step count, references        │
│  → ISCLParseResult: { visualIds, stepCount, visualDecls, steps }    │
│  → yield: { type: 'plan', title, visualCount, stepCount, layout }   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐  (parallel)
              │                         │
              ▼                         ▼
┌─────────────────────────┐   ┌──────────────────────────────────────┐
│ Stage 2a: Visual States │   │ Stage 2b: Step Params                │
│ (~400 tokens, ~2s)      │   │ (~900 tokens, ~3s)                   │
│ AI receives: visualIds  │   │ AI receives: visualIds (as enum)     │
│   as list + their types │   │   stepCount as hard constraint       │
│ AI generates: initial-  │   │ AI generates: params{} for each SET  │
│   State per visual      │   │   in each STEP                       │
│ (no positions)          │   │ → validates: all targets ∈ visualIds │
└────────────┬────────────┘   └───────────────┬──────────────────────┘
             │                                │
             └──────────────┬─────────────────┘
                            │ (partial-success recovery if one fails)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 3: Annotations (~600 tokens, ~2s)                             │
│ AI receives: visualIds, stepCount — INJECTED AS HARD CONSTRAINTS    │
│ AI generates: explanation[] + popups[]                              │
│ → all stepIndex values validated < stepCount                        │
│ → all attachTo IDs validated ∈ visualIds                            │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 4: Misc (~250 tokens, ~1s)                                    │
│ AI generates: challenges[] + controls[]                             │
│ Fully independent — no cross-references to validate                 │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 5: Deterministic Assembly (0 AI tokens, <100ms)               │
│ → Merge all stage outputs into Scene JSON                           │
│ → Run semanticValidate() — catch any remaining cross-ref errors     │
│ → Run computeLayout() — compute pixel positions                     │
│ → yield: { type: 'complete', scene }                                │
└─────────────────────────────────────────────────────────────────────┘

Wall-clock: ~8–10s total (vs 6–8s current with ~50% failure rate)
Streaming UX: skeleton at ~1.5s, content at ~5s, complete at ~8s
```

---

## What Actually Changes

### 1. `apps/web/src/ai/errors.ts` — New file (typed pipeline errors)

```typescript
/**
 * Thrown by per-stage validators when validation fails.
 * The `stage` field lets the streaming UX (Phase 26) display
 * a stage-specific error message rather than a generic failure.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly stage: number,
    public readonly retryable: boolean = true
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

---

### 2. Stage 1 Prompt — `apps/web/src/ai/prompts/stage1-iscl.md`

The Stage 1 prompt instructs the AI to produce valid ISCL. Key elements:

```markdown
You are generating an educational interactive simulation for the topic: {topic}

Output ISCL (Insyte Scene Language) — a structured text format. Follow the grammar EXACTLY.

## Grammar Reference
SCENE "<title>"
TYPE <concept | dsa-trace | lld | hld>
LAYOUT <text-left-canvas-right | canvas-only | code-left-canvas-right>

VISUAL <type> <id> [HINT <layoutHint>] [SLOT <slotPosition>]
  Types: array | hashmap | linked-list | tree | graph | stack | queue | dp-table | grid | recursion-tree | system-diagram | text-badge | counter
  Hints: dagre-TB | dagre-LR | tree-RT | linear-H | linear-V | grid-2d | hashmap-buckets
  Slots: top-left | top-center | top-right | bottom-left | bottom-right | overlay-top | center

STEP 0 : init
STEP <n> : SET <id> <field>=<value> [| SET <id> <field>=<value> ...]

EXPLANATION
  <n> : "<heading>" | "<body>"

POPUP <id> AT <n> [UNTIL <n>] : "<text>" [STYLE info|success|warning|insight]

CHALLENGES
  <predict|break-it|optimize|scenario> : "<text>"

CONTROL slider <id> "<label>" MIN <n> MAX <n> DEFAULT <n>
CONTROL toggle <id> "<label>" [on|off]

## Rules
1. Visual IDs declared in VISUAL lines are the ONLY valid targets in SET, POPUP, and EXPLANATION
2. STEP 0 must always be "init" — no SET lines on step 0
3. Steps must be numbered 0, 1, 2, 3, ... with no gaps
4. Explanation and POPUP step indices must be < total number of STEPs
5. NEVER include x, y, or any coordinates — layout is computed automatically
6. Use 8–12 steps for a well-paced visualization

## Topic: {topic}
## Detected mode: {mode} ({modeRationale})
```

---

### 3. Stage 2a Prompt — `apps/web/src/ai/prompts/stage2a-states.md`

```markdown
You are filling in the initial visual states for a simulation.

The simulation has these visuals (declared in order):
{visualDecls}
Format: [{ id: "{id}", type: "{type}" }, ...]

For each visual, generate its initialState — the state before any steps run (step 0).
Positions are computed automatically — NEVER include x, y coordinates.

Return JSON:
{
  "initialStates": {
    "{visualId}": { ...initial state object for this visual type... },
    ...
  }
}

## Visual type state formats:
- array: { "cells": [{ "v": <value>, "h": "default" }, ...] }
- stack: { "items": [{ "value": <value>, "h": "default" }] }
- queue: { "items": [{ "value": <value>, "h": "default" }] }
- counter: { "value": 0, "label": "<label>" }
- text-badge: { "text": "" }
- hashmap: { "entries": [] }
- linked-list: { "nodes": [{ "id": "n0", "value": <v> }] }
- tree: { "root": { "id": "n0", "value": <v>, "left": null, "right": null } }
- graph: { "nodes": [{ "id": "n0", "label": "<label>" }], "edges": [] }
- system-diagram: { "components": [{ "id": "c0", "label": "<label>" }], "connections": [] }
- dp-table: { "rows": [[{ "v": null }]] }

Topic: {topic}
```

---

### 4. Stage 2b Prompt — `apps/web/src/ai/prompts/stage2b-steps.md`

```markdown
You are filling in the step params for a simulation.

The simulation ISCL script declared these steps:
{stepSummary}

Valid visual IDs (you MUST use ONLY these IDs in your output):
{visualIdList}

Step count: {stepCount} (valid step indices: 0 to {maxStepIndex})

For each STEP after STEP 0, convert the SET instructions into typed params JSON.
Return JSON:
{
  "steps": [
    {
      "index": 1,
      "actions": [
        { "target": "{visualId}", "params": { ...complete state for this visual... } }
      ]
    },
    ...
  ]
}

IMPORTANT:
- Every action.target MUST be one of: [{visualIdList}]
- params must contain the COMPLETE visual state at that step (full snapshot, not a delta)
- Step 0 has no actions — omit it from the output

Topic: {topic}
ISCL Steps:
{isclSteps}
```

The key insight: `visualIdList` is injected into the prompt as a literal list. The model **selects** from this list rather than **inventing** strings. This converts referential hallucinations into constrained selection.

---

### 5. Stage 3 Prompt — `apps/web/src/ai/prompts/stage3-annotations.md`

```markdown
You are writing educational annotations for a simulation.

Valid visual IDs: [{visualIdList}]
Total step count: {stepCount}
Valid step indices: 0 to {maxStepIndex}

Generate:
1. explanation[] — step-synced learning text (3–5 entries)
2. popups[] — contextual tooltips attached to specific visuals at specific steps (2–4 entries)

Return JSON:
{
  "explanation": [
    {
      "appearsAtStep": <number between 0 and {maxStepIndex}>,
      "heading": "<short heading>",
      "body": "<markdown body text>"
    }
  ],
  "popups": [
    {
      "attachTo": "<one of: {visualIdList}>",
      "showAtStep": <number between 0 and {maxStepIndex}>,
      "hideAtStep": <number between 0 and {stepCount}>,
      "text": "<popup text>",
      "style": "info | success | warning | insight"
    }
  ]
}

RULES:
- Every explanation.appearsAtStep must be < {stepCount}
- Every popup.showAtStep must be < {stepCount}
- Every popup.attachTo must be one of: [{visualIdList}]
- Do NOT invent new visual IDs

Topic: {topic}
```

---

### 6. Stage 4 Prompt — `apps/web/src/ai/prompts/stage4-misc.md`

```markdown
You are generating challenges and optional controls for a simulation about: {topic}

Generate:
1. challenges[] — 3 educational challenges
2. controls[] — 0–2 interactive controls (optional)

Return JSON:
{
  "challenges": [
    { "type": "predict", "text": "..." },
    { "type": "break-it", "text": "..." },
    { "type": "optimize", "text": "..." }
  ],
  "controls": []
}

Challenge types: predict, break-it, optimize, scenario
Controls: slider (for n/k parameters), toggle (show/hide, enable/disable)
```

This stage is fully independent — no cross-references to validate.

---

### 7. `apps/web/src/ai/validators/` — New directory (per-stage validators)

```typescript
// validators/states.ts
export function validateStates(
  raw: unknown,
  parsed: ISCLParsed
): { ok: boolean; states: Record<string, unknown>; error?: string } {
  // Zod schema: { initialStates: Record<string, unknown> }
  const result = z.object({ initialStates: z.record(z.unknown()) }).safeParse(raw)
  if (!result.success) return { ok: false, states: {}, error: result.error.message }

  // Validate all declared visual IDs have an initial state
  for (const decl of parsed.visualDecls) {
    if (!result.data.initialStates[decl.id]) {
      return { ok: false, states: {}, error: `Missing initial state for visual: ${decl.id}` }
    }
  }

  return { ok: true, states: result.data.initialStates }
}

// validators/steps.ts
export function validateSteps(
  raw: unknown,
  parsed: ISCLParsed
): { ok: boolean; steps: Step[]; error?: string } {
  // Validate all action targets are in visualIds
  // ... zod + semantic checks
}

// validators/annotations.ts
export function validateAnnotations(
  raw: unknown,
  parsed: ISCLParsed
): { ok: boolean; explanation: ExplanationSection[]; popups: Popup[]; error?: string } {
  // Validate step indices < stepCount, attachTo ∈ visualIds
  // ... zod + semantic checks
}
```

---

### 8. `apps/web/src/ai/assembly.ts` — New file (Stage 5 deterministic assembly)

```typescript
import { semanticValidate } from '@insyte/scene-engine'
import { computeLayout } from '../engine/layout'

export function assembleScene(
  parsed: ISCLParsed,
  states: Record<string, unknown>,
  steps: Step[],
  explanation: ExplanationSection[],
  popups: Popup[],
  challenges: Challenge[],
  controls: Control[]
): { ok: boolean; scene?: Scene; errors?: SemanticError[] } {
  // Build raw Scene JSON from all stage outputs
  const scene: Scene = {
    title: parsed.title,
    type: parsed.type,
    layout: parsed.layout,
    visuals: parsed.visualDecls.map(decl => ({
      id: decl.id,
      type: decl.type,
      layoutHint: decl.layoutHint,
      slot: decl.slot,
      initialState: states[decl.id],
    })),
    steps,
    explanation,
    popups,
    challenges,
    controls,
  }

  // Run semantic validation (catch any remaining cross-reference issues)
  const semanticErrors = semanticValidate(scene)
  if (semanticErrors.length > 0) {
    return { ok: false, errors: semanticErrors }
  }

  // Positions are computed by the layout engine at render time (not stored in scene)
  // Scene is returned without positions — the renderer calls computeLayout()
  return { ok: true, scene }
}
```

---

### 9. `apps/web/src/ai/pipeline.ts` — New file (async generator orchestrator)

```typescript
import { parseISCL } from '@insyte/scene-engine'
import { ValidationError } from './errors'
import { callLLM } from './client'
import { validateStates, validateSteps, validateAnnotations } from './validators'
import { assembleScene } from './assembly'
import { buildStage1Prompt, buildStage2aPrompt, buildStage2bPrompt, buildStage3Prompt, buildStage4Prompt } from './prompts'

export type GenerationEvent =
  | { type: 'plan';        title: string; visualCount: number; stepCount: number; layout: SceneLayout }
  | { type: 'content';     states: Record<string, unknown>; steps: Step[] }
  | { type: 'annotations'; explanation: ExplanationSection[]; popups: Popup[] }
  | { type: 'misc';        challenges: Challenge[]; controls: Control[] }
  | { type: 'complete';    scene: Scene }
  | { type: 'error';       stage: number; message: string; retryable: boolean }

const MAX_RETRIES = 2

export async function* generateScene(
  topic: string,
  mode: SceneType,
  modelConfig: ModelConfig
): AsyncGenerator<GenerationEvent> {

  // ─── Stage 1: ISCL Generation ───────────────────────────────────────────────
  let isclResult = null
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const rawISCL = await callLLM(buildStage1Prompt(topic, mode), modelConfig)
    const parsed = parseISCL(rawISCL)

    if (parsed.ok) {
      isclResult = parsed.parsed!
      break
    }

    if (attempt === MAX_RETRIES - 1) {
      yield { type: 'error', stage: 1, message: `ISCL parse failed: ${parsed.error!.message}`, retryable: true }
      return
    }
  }

  // Yield skeleton immediately — client can show title + placeholder nodes
  yield {
    type: 'plan',
    title: isclResult!.title,
    visualCount: isclResult!.visualDecls.length,
    stepCount: isclResult!.stepCount,
    layout: isclResult!.layout,
  }

  // ─── Stages 2a + 2b: Parallel with partial-success recovery ─────────────────
  const [statesResult, stepsResult] = await Promise.all([
    retryStage(
      2,
      () => callLLM(buildStage2aPrompt(isclResult!), modelConfig).then(r => validateStates(JSON.parse(r), isclResult!))
    ),
    retryStage(
      2,
      () => callLLM(buildStage2bPrompt(isclResult!), modelConfig).then(r => validateSteps(JSON.parse(r), isclResult!))
    ),
  ])

  // Partial-success recovery: if Stage 2a fails, use visual.initialState fallbacks.
  // If Stage 2b fails, no steps → fatal for the visualization.
  if (!stepsResult.ok) {
    yield { type: 'error', stage: 2, message: `Step params failed after ${MAX_RETRIES} attempts: ${stepsResult.error}`, retryable: true }
    return
  }
  if (!statesResult.ok) {
    // Degrade gracefully: fall back to empty initial states (visual.initialState from schema)
    // rather than aborting the whole generation. Users see valid steps without initial state polish.
    console.warn('[pipeline] Stage 2a failed — falling back to schema initialState defaults')
  }

  yield {
    type: 'content',
    states: statesResult.ok ? statesResult.states : {},
    steps: stepsResult.steps,
  }

  // ─── Stage 3: Annotations ────────────────────────────────────────────────────
  const annotationsResult = await retryStage(
    2,
    () => callLLM(buildStage3Prompt(isclResult!), modelConfig).then(r => validateAnnotations(JSON.parse(r), isclResult!))
  )

  if (!annotationsResult.ok) {
    // Annotations are non-fatal — yield empty and continue to assembly
    console.warn('[pipeline] Stage 3 failed — proceeding without annotations')
  }

  yield {
    type: 'annotations',
    explanation: annotationsResult.ok ? annotationsResult.explanation : [],
    popups: annotationsResult.ok ? annotationsResult.popups : [],
  }

  // ─── Stage 4: Misc ───────────────────────────────────────────────────────────
  const miscRaw = await callLLM(buildStage4Prompt(topic), modelConfig)
  const misc = parseMisc(miscRaw)

  // ─── Stage 5: Deterministic Assembly ─────────────────────────────────────────
  const assembled = assembleScene(
    isclResult!,
    statesResult.ok ? statesResult.states : {},
    stepsResult.steps,
    annotationsResult.ok ? annotationsResult.explanation : [],
    annotationsResult.ok ? annotationsResult.popups : [],
    misc.challenges,
    misc.controls
  )

  if (!assembled.ok) {
    yield { type: 'error', stage: 5, message: `Assembly failed: ${assembled.errors!.map(e => e.message).join('; ')}`, retryable: false }
    return
  }

  yield { type: 'complete', scene: assembled.scene! }
}

/**
 * Per-stage retry wrapper. Calls fn up to maxRetries times, returning the
 * first successful result. On all failures, returns the last failure result.
 *
 * fn must return a result with an `ok: boolean` field.
 */
async function retryStage<T extends { ok: boolean }>(
  maxRetries: number,
  fn: () => Promise<T>
): Promise<T> {
  let last!: T
  for (let i = 0; i < maxRetries; i++) {
    last = await fn()
    if (last.ok) return last
  }
  return last
}
```

---

### 10. `apps/web/src/app/api/generate/route.ts` — Edit

Replace the current `streamObject` approach with the async generator pipeline:

```typescript
import { generateScene } from '../../../ai/pipeline'

export async function POST(req: Request) {
  const { topic, mode } = await req.json()
  const modelConfig = resolveModelConfig(req.headers)

  // Return a ReadableStream of SSE events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      for await (const event of generateScene(topic, mode, modelConfig)) {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      }
      
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

---

### 11. Prompt builders — `apps/web/src/ai/prompts/builders.ts` — New file

```typescript
import stage1Template from './stage1-iscl.md'
import stage2aTemplate from './stage2a-states.md'
import stage2bTemplate from './stage2b-steps.md'
import stage3Template from './stage3-annotations.md'
import stage4Template from './stage4-misc.md'

export function buildStage1Prompt(topic: string, mode: SceneType): string {
  return stage1Template.replace('{topic}', topic).replace('{mode}', mode)
}

export function buildStage2aPrompt(parsed: ISCLParsed): string {
  const visualDecls = JSON.stringify(parsed.visualDecls.map(d => ({ id: d.id, type: d.type })))
  return stage2aTemplate.replace('{visualDecls}', visualDecls)
}

export function buildStage2bPrompt(parsed: ISCLParsed): string {
  const visualIdList = [...parsed.visualIds].join(', ')
  const isclSteps = parsed.steps.filter(s => !s.isInit)
    .map(s => `STEP ${s.index}: ${s.sets.map(set => `SET ${set.visualId} ${set.field}=${set.rawValue}`).join(' | ')}`)
    .join('\n')

  return stage2bTemplate
    .replace('{visualIdList}', visualIdList)
    .replace('{stepCount}', String(parsed.stepCount))
    .replace('{maxStepIndex}', String(parsed.stepCount - 1))
    .replace('{isclSteps}', isclSteps)
}

export function buildStage3Prompt(parsed: ISCLParsed): string {
  return stage3Template
    .replace('{visualIdList}', [...parsed.visualIds].join(', '))
    .replace(/{stepCount}/g, String(parsed.stepCount))
    .replace('{maxStepIndex}', String(parsed.stepCount - 1))
}

export function buildStage4Prompt(topic: string): string {
  return stage4Template.replace('{topic}', topic)
}
```

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `apps/web/src/ai/errors.ts` | New | `ValidationError` class with `stage` field |
| `apps/web/src/ai/prompts/stage1-iscl.md` | New | Stage 1 ISCL generation prompt |
| `apps/web/src/ai/prompts/stage2a-states.md` | New | Stage 2a visual states prompt |
| `apps/web/src/ai/prompts/stage2b-steps.md` | New | Stage 2b step params prompt (visual IDs as constraint) |
| `apps/web/src/ai/prompts/stage3-annotations.md` | New | Stage 3 annotations prompt (step count as constraint) |
| `apps/web/src/ai/prompts/stage4-misc.md` | New | Stage 4 misc/challenges prompt |
| `apps/web/src/ai/prompts/builders.ts` | New | Prompt template builders with variable injection |
| `apps/web/src/ai/validators/states.ts` | New | Stage 2a output validator |
| `apps/web/src/ai/validators/steps.ts` | New | Stage 2b output validator |
| `apps/web/src/ai/validators/annotations.ts` | New | Stage 3 output validator |
| `apps/web/src/ai/assembly.ts` | New | Stage 5 deterministic assembly |
| `apps/web/src/ai/pipeline.ts` | New | Async generator orchestrator with `retryStage` |
| `apps/web/src/app/api/generate/route.ts` | Rewrite | SSE stream from async generator |
| `apps/web/src/ai/generateScene.ts` | Delete | Replaced by pipeline.ts |
| `apps/web/src/ai/prompts/scene-generation.md` | Delete | Replaced by 5 stage prompts |

---

## Token Cost Analysis

| Stage | Input tokens | Output tokens | Parallel |
|-------|-------------|---------------|---------|
| 1: ISCL | ~800 | ~750 | No |
| 2a: States | ~500 | ~400 | Yes (with 2b) |
| 2b: Steps | ~700 | ~900 | Yes (with 2a) |
| 3: Annotations | ~600 | ~600 | No |
| 4: Misc | ~300 | ~250 | No |
| **Total** | **~2,900** | **~2,900** | **~8–10s** |

Current single call: ~1,200 input + ~5,000 output = worse reliability at similar cost.

## Retry and Recovery Strategy

| Stage | Max retries | Failure behavior |
|-------|------------|-----------------|
| 1 (ISCL) | 2 | Fatal — yield `error` event and return |
| 2a (States) | 2 | Degraded — fall back to `visual.initialState` defaults; continue |
| 2b (Steps) | 2 | Fatal — no steps = no visualization; yield `error` event |
| 3 (Annotations) | 2 | Non-fatal — yield empty explanation/popups; continue to assembly |
| 4 (Misc) | 1 | Non-fatal — parse best-effort; continue |
| 5 (Assembly) | 0 | Fatal if semantic errors remain; non-retryable |
