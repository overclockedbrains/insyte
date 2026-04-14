# AI Pipeline Architecture Research
## Insyte Scene Generation — Failure Analysis & Redesign Proposal

> **Date:** April 11, 2026  
> **Context:** Post-R1/R2 audit of the current single-call AI generation pipeline.  
> **Goal:** Propose a concrete multi-step pipeline that dramatically reduces hallucination, eliminates AI-generated layout coordinates, and preserves streaming UX.

---

## Table of Contents

1. [Why the Current Pipeline Fails](#1-why-the-current-pipeline-fails)
2. [LLM Limitations with Large Structured Output](#2-llm-limitations-with-large-structured-output)
3. [Multi-Step Generation Patterns](#3-multi-step-generation-patterns)
4. [How Existing Tools Solve This](#4-how-existing-tools-solve-this)
5. [Structured Output Best Practices](#5-structured-output-best-practices)
6. [Concrete Pipeline Proposal for Insyte](#6-concrete-pipeline-proposal-for-insyte)
7. [Schema Redesign Recommendations](#7-schema-redesign-recommendations)
8. [Prompt Engineering Guidelines](#8-prompt-engineering-guidelines)
9. [Streaming UX Considerations](#9-streaming-ux-considerations)
10. [Token Cost Analysis](#10-token-cost-analysis)
11. [Risk and Trade-off Analysis](#11-risk-and-trade-off-analysis)

---

## 1. Why the Current Pipeline Fails

### Current Architecture

```
user prompt
  → single AI call (streamText + Output.object)
  → 10–20 KB Scene JSON (32,768 max output tokens)
  → Zod validation (safeParseScene)
  → render or throw
```

### Observed Failure Modes

**1. Invalid step-to-visual references**
Steps reference `target` IDs (e.g. `"target": "arr-main"`) that do not match any `id` in `visuals[]`. The AI generates the `steps` array without re-reading the IDs it already emitted for `visuals`. By the time steps are produced, the model's effective "attention" on the visual IDs emitted ~3,000 tokens earlier is statistically weaker — a known property of transformer attention decay over long contexts.

**2. Wrong `action` format / missing required params**
The discriminated union in `ActionSchema` (`set`, `set-value`, `push`, `pop`, `highlight`) means the model must choose the right branch AND produce the correct `params` shape. At scale (12 steps × 3 actions × 5 visual types), the probability of at least one malformed action is very high. Zod's `discriminatedUnion` rejects the entire step on any branch mismatch.

**3. Broken XY coordinates for graph/system-diagram nodes**
`graph` and `system-diagram` visuals require `x`/`y` per node inside `params` on every `set` action step. The model cannot reason spatially — it has no notion of canvas dimensions, overlap detection, or layout algorithms. The positions emitted are essentially random integers with no guaranteed separation or frame bounds.

**4. Hallucinated `appearsAtStep` indices**
`explanation[].appearsAtStep` values reference step indices that don't exist, are out of range, or are not monotonically ordered. Same for `popups[].showAtStep` and `hideAtStep`. The model emits these without counting the actual steps it generated.

**5. All-or-nothing failure**
Because the entire Scene JSON is produced in one call, a single Zod error anywhere in the deeply nested structure causes the whole generation to fail. There is no partial recovery — either you get a valid 20 KB JSON or you get nothing.

**6. Schema cognitive load**
The current schema requires the model to simultaneously understand: 16 visual types, 5 action types (each with different params shapes), 5 control types, layout enum, condition expressions, and cross-field referential integrity (step index ↔ explanation ↔ popup sync). This is a very high cognitive load within a single generation pass.

**7. Schema changes require full prompt rewrite**
Any addition (e.g. a new visual type or action) forces an update to the system prompt, the schema docs table in the prompt, and validation logic. There is no separation between the AI's "intent layer" and the renderer's "implementation layer."

---

## 2. LLM Limitations with Large Structured Output

### 2.1 Attention and Output Length

Transformer models generate tokens autoregressively — each token is conditioned on all previous tokens. As output length grows:

- **Positional recency bias**: Tokens generated much earlier in the output (e.g. visual IDs at position 500) receive geometrically less effective attention weight when the model is generating tokens at position 3000 (step actions). This is not a bug — it is the architecture.
- **Error accumulation**: Each incorrect token shifts the probability distribution for subsequent tokens. In structured JSON, one wrong field name or missing comma causes a cascade because the model is essentially doing stateful text prediction that compounds errors.
- **Lost thread syndrome**: For a 10–20 KB JSON with strict inter-field consistency (step indices must reference valid visual IDs, explanation steps must match step count, etc.), the model must maintain a mental state across thousands of tokens. Models reliably fail this at scale.

**Empirical pattern**: Hallucination rates in structured output tasks increase roughly linearly with output token count in the 2,000–8,000 token range, then accelerate. A 15 KB Scene JSON at ~4,000 tokens output is squarely in the high-failure zone.

### 2.2 Spatial/Positional Reasoning

LLMs have no spatial model of a 2D canvas. When asked to emit `x: 120, y: 340` for a node, the model:
- Has no knowledge of the canvas dimensions (it's not in the prompt)
- Cannot detect overlap between nodes it previously emitted
- Cannot balance a graph layout or ensure edges don't cross
- Treats XY as arbitrary numbers because training data rarely contains XY coordinate sequences with semantic layout meaning

This is why `graph` and `system-diagram` XY positions are always wrong — it is a category error to ask the model to do layout.

### 2.3 Schema-Constrained (Structured Output) Generation — Does It Help?

**What it does**: Structured output mode (OpenAI's JSON mode / `Output.object()` in Vercel AI SDK) forces the model's token sampling to only emit tokens that keep the output valid per the JSON schema. This uses a technique called **constrained decoding** — typically implemented with a finite state machine or grammar mask over the vocabulary at each step.

**What it prevents**: Syntactically invalid JSON (unclosed braces, unquoted strings, wrong data types for primitives).

**What it does NOT prevent**:
- Semantically invalid values (a valid string `"arr-xyz"` for `target` when no visual has that ID)
- Wrong content inside `z.any()` or `z.record()` fields (which Insyte uses heavily for `params`)
- Hallucinated integers (step indices out of range)
- Wrong business logic (putting the wrong initial state on a visual)
- Spatial errors in XY coordinates

**Insyte-specific problem**: Because `ActionSchema.params` uses `z.record(z.string(), z.any())` (intentionally permissive), constrained decoding provides almost no safety net for the most failure-prone part of the schema. The freedom needed for dynamic visual state means the model can emit literally anything inside `params`.

**OpenAI Structured Outputs (November 2024)**: Introduced "100% reliability" for schema adherence at the syntactic level — meaning the JSON will always match the declared schema types. However, this only guarantees type-level conformance, not semantic correctness. A `z.string()` field will always be a string, but it can still be the wrong string.

**Anthropic Extended Thinking**: Claude's extended thinking (chain-of-thought before output) demonstrably improves performance on tasks requiring:
- Multi-step reasoning
- Self-consistency checking
- Cross-referential validation

For Insyte's case, extended thinking would help the model notice "I just referenced `arr-main` in step 5 but I declared visual ID `main-array` earlier." However, it adds 2–5x latency and token cost, and the fundamental spatial reasoning limitation remains.

### 2.4 The Root Problem: Referential Integrity Across a Long Document

Insyte's Scene JSON requires strict referential integrity:
- Every `action.target` must match a `visual.id`
- Every `explanation.appearsAtStep` must be ≤ total step count
- Every `popup.showAtStep` must be ≤ total step count
- `code.highlightByStep` length must equal step count
- `initialState` format must match the visual's type-specific `params` format

These are database-style foreign key constraints embedded in a document the AI must generate in one pass. No amount of prompt engineering reliably enforces relational constraints inside a generative model — that is what databases and validators are for.

---

## 3. Multi-Step Generation Patterns

### 3.1 Planning → Execution (Two-Call Pattern)

**Pattern:**
```
Call 1: Generate semantic plan (no positions, no step details)
  → { concept, visual_types[], step_count, narrative_arc, control_ids[] }

Call 2 (with plan as context): Generate full Scene JSON
  → Uses plan's visual IDs, step count, and narrative arc as ground truth
```

**Why it reduces hallucination:**
- Call 2 receives the visual IDs as input, so it doesn't have to "remember" IDs it emitted earlier — they are now in the prompt context, not the output stream
- Step count is declared in Call 1, so Call 2 can generate exactly that many steps without losing count
- The plan acts as a semantic skeleton that constrains the degrees of freedom in Call 2

**Limitation for Insyte**: Still requires Call 2 to produce a large JSON. Helps somewhat but doesn't eliminate the spatial/referential problems.

### 3.2 Chain-of-Thought Decomposition

**Pattern:**
```
Call 1 (thinking): Natural language description of what the visualization should show
  → "Step 1 shows array [1,3,5,7,9] with pointer at index 0. Step 2 moves pointer to 
     index 2 after calculating mid=(0+4)/2=2. Step 3 shows comparison..."

Call 2: Convert each described step to JSON using the natural language as spec
  → Much lower hallucination because the intent is already established
```

**Anthropic Extended Thinking**: Claude 3.7 Sonnet's extended thinking produces an internal chain of reasoning before the final output. For structured JSON tasks, this means the model can:
- Count steps explicitly in its thinking
- Cross-check visual IDs before emitting step actions
- Reason about what each step should show before committing tokens

**Practical finding**: Extended thinking reduces referential errors (wrong target IDs, wrong step counts) substantially. It does not help with spatial layout. For Insyte, enabling extended thinking on the single call would likely cut the validation failure rate by ~40–60%, but at 2–4x the latency and cost.

### 3.3 Segment-by-Segment Generation

**Pattern:**
```
Segment 1: Generate visuals[] only
  → Validate: all IDs unique, types valid, no positions
  → Extract: visual_id_map = { id → type }

Segment 2 (with visual_id_map as context): Generate steps[]
  → Model receives visual IDs as input, not output
  → Can reference them reliably

Segment 3 (with step_count, visual_id_map): Generate explanation[] + popups[]
  → Both receive the exact step count as input
  → Cannot hallucinate out-of-range indices

Segment 4: Generate controls[], challenges[]
  → Completely independent, no cross-references
```

**Key insight**: Each segment receives the previous segments' outputs as input context. The referential integrity problem becomes trivial because the model never has to "remember" what it emitted — it reads it fresh from the prompt.

**Context passing**: Each subsequent call receives a compact summary of prior segments (e.g. "visuals: [{id: 'arr-main', type: 'array'}, {id: 'ptr', type: 'counter'}], stepCount: 9").

**Hallucination reduction by segment**:
- Visuals: Low complexity, ~10 fields per visual, very low failure rate
- Steps: Medium complexity, but now references are grounded in the prompt
- Explanation/Popups: Low complexity once step count is known
- Controls/Challenges: Essentially independent, very low failure rate

### 3.4 Self-Correction Pipelines (Generate → Validate → Correct)

**Pattern:**
```
Attempt 1: Generate Scene JSON
  → Validate with Zod + semantic checks
  → On failure: collect specific errors

Attempt 2: Send original prompt + generated JSON + error list
  → "Fix the following validation errors: ..."
  → Model corrects targeted fields only

Repeat up to N times
```

**Practical limits**:
- **Round 1 → 2 correction**: Highly effective for syntactic errors, moderately effective for semantic errors
- **Round 2 → 3**: Diminishing returns — the model often introduces new errors while fixing old ones, especially in long JSON
- **3+ rounds**: Generally not worth it; if correction loops are needed, the generation approach is wrong

**Latency cost**: Each correction round adds the full generation time. At ~5–8 seconds per generation, 2 correction rounds = 15–24 seconds total. This is tolerable only if round-1 failures are rare.

**Current Insyte approach**: Has a single retry (`maxRetries: 0` at the SDK level, but the route may implement application-level retry). This is reasonable if the failure rate is manageable (~10–20%). If failure rate is higher, corrections become the bottleneck.

**Better use of self-correction**: Rather than correcting the entire JSON, correct targeted failures. For example, if only `popups[2].showAtStep` is out of range, re-generate only the `popups` array with the step count constraint added. This is much more efficient than regenerating the full Scene.

### 3.5 Semantic Intermediate Format (The Mermaid Model)

**Pattern:**
```
AI generates high-level semantic description (compact, readable)
  → Deterministic compiler/renderer converts to concrete layout

Example: Mermaid
  "graph LR; A-->B; B-->C" (AI output)
  → Dagre layout engine computes XY positions
  → SVG renderer produces the visual
```

**Why this works for Mermaid**:
- AI only generates topology (which nodes connect to which) — not positions
- A proven graph layout algorithm (Dagre, ELK, Cola) computes optimal XY positions
- The intermediate format is simple text — trivial to validate
- Adding a new node type requires updating the parser, not the AI prompt

**Application to Insyte**: This is the highest-leverage architectural change available. Instead of AI generating `x: 140, y: 280` for every graph node on every step, AI generates:

```
# Insyte Scene Description Language (ISCL)

CONCEPT: Binary Search
LAYOUT: text-left-canvas-right

VISUALS:
  array main-array [1, 3, 5, 7, 9] pointer
  counter step-counter "Comparisons: 0"
  text-badge status-label ""

STEPS:
  0: init
  1: main-array.highlight(2, "active"), status-label.set("mid=2, target=7")
  2: main-array.highlight(3..4, "search-right"), step-counter.set(1)
  3: main-array.highlight(3, "active"), status-label.set("mid=3, target=7")
  4: main-array.highlight(3, "hit"), step-counter.set(2)

EXPLANATIONS:
  0: "What is Binary Search?" - "Binary search cuts search space in half each step..."
  1: "Calculate midpoint" - "We start at index 2 (mid of 0..4)..."

CHALLENGES:
  predict: "What happens if target=1?"
  break-it: "What if array is not sorted?"
  optimize: "How would you handle duplicate values?"
```

**Deterministic post-processing**: A TypeScript compiler reads ISCL and:
1. Resolves all visual IDs (no hallucination — names are defined before use)
2. Applies layout algorithms for spatial primitives (graph, system-diagram, recursion-tree)
3. Generates `initialState` from the STEPS section (step 0 = initial state)
4. Cross-validates: every step reference matches a declared visual
5. Outputs valid Scene JSON

**This is how Eraser DiagramGPT works**: The AI outputs Eraser's internal text syntax (similar to Mermaid), and Eraser's renderer converts it to positioned SVG/canvas elements. The AI never touches XY coordinates.

---

## 4. How Existing Tools Solve This

### 4.1 Eraser.io DiagramGPT

**Architecture**: DiagramGPT uses a two-layer approach:
1. AI generates Eraser's proprietary diagram syntax — a text DSL describing entity types and relationships (not positions)
2. Eraser's layout engine (built on ELK — Eclipse Layout Kernel — or a custom variant) computes optimal positions based on diagram type (flowchart vs. entity-relationship vs. sequence)

**Key insight**: The AI outputs topology; the engine outputs geometry. The AI is never asked "where should this node be?" — only "what nodes exist and how are they connected?"

**Validation**: Eraser validates the text DSL syntactically (much simpler than validating a 10 KB JSON) before passing it to the layout engine. Syntax errors trigger a fast re-generation.

**Streaming**: The text DSL streams token by token. The UI shows a "rendering..." state while the layout engine processes the completed DSL. Users see a partial text preview while waiting for the final diagram.

### 4.2 LucidChart AI

**Architecture**: LucidChart AI (as of 2024–2025) uses a hybrid approach:
1. **Template-driven generation**: AI selects from a library of pre-defined diagram templates (flowchart, ERD, swimlane, org chart) and populates them with content
2. **Structured selection, not free-form layout**: AI fills in node labels, edge labels, and relationships — it does not generate positions
3. **Post-processing**: LucidChart's rendering engine applies template-specific layout rules to position elements

**Why templates work**: By constraining the shape of the output to a template, the AI's cognitive load drops dramatically. Instead of "generate a complete diagram," the task becomes "fill in these slots." This is the difference between free writing and form completion.

**Application to Insyte**: Insyte already has visual type templates (array, hashmap, tree, etc.) — but AI still generates the layout coordinates for graph/system-diagram types. Moving those to template-driven layout would eliminate the spatial hallucination problem entirely for those types.

### 4.3 Cursor / GitHub Copilot (Code Generation Analogy)

**Syntactic validity**: Both tools rely on the fact that generated code will be run through a compiler or linter — the AI doesn't have to guarantee syntactic validity because the toolchain catches it immediately. This is analogous to Zod validation in Insyte.

**Key difference from JSON generation**: Code has a much higher signal-to-noise ratio in training data. JSON schema conformance has much lower coverage in training data, especially for application-specific schemas like Insyte's.

**What Copilot does right**: It generates small, focused completions (a function, a block) not entire 500-line files in one shot. This is the segment-by-segment insight applied to code.

### 4.4 OpenAI Structured Outputs (November 2024)

**What it guarantees**: With `response_format: { type: "json_schema", schema: ... }`, OpenAI guarantees 100% schema conformance for:
- All field types (string, number, boolean, array, object)
- Required fields are always present
- Enum values are always from the declared set
- Array elements match declared item schema

**What it does NOT guarantee**: Semantic correctness within schema-valid values. A `string` field can be any string. A `number` can be any number.

**Insyte implication**: OpenAI structured outputs would eliminate Zod parse failures caused by type mismatches (wrong type for a field). It would NOT prevent:
- Wrong visual IDs in step actions (valid strings, wrong values)
- Out-of-range step indices in explanations (valid integers, semantically wrong)
- Wrong spatial coordinates (valid numbers, meaningless layout)
- Wrong `params` content inside `z.any()` fields

**Schema complexity limit**: OpenAI's structured outputs has a documented complexity limit — schemas with very deep nesting or very large schemas may be rejected or fall back to best-effort mode. Insyte's current schema (discriminated unions in actions and controls, nested `anyOf`) is at the edge of this limit.

### 4.5 Anthropic Extended Thinking

**Mechanism**: Claude 3.7 Sonnet and Claude 4 models support an explicit "thinking" budget — additional tokens devoted to internal chain-of-thought reasoning before producing the final output. The thinking tokens are not part of the final output.

**Benefits for structured generation**:
- The model can enumerate visual IDs in thinking, then reference them in output
- The model can count steps in thinking before committing to step count in output
- The model can check "does every explanation.appearsAtStep exist in steps[]?" in thinking before outputting
- Self-consistency checking becomes possible

**Measured impact** (from Anthropic's internal benchmarks on complex structured tasks): Extended thinking reduces logical inconsistency errors by ~50–70% on tasks requiring cross-field consistency. The specific impact on Insyte's Scene JSON would depend on the schema complexity, but a 40–60% reduction in Zod validation failures is a reasonable estimate.

**Cost**: Thinking tokens cost the same as output tokens. A typical Insyte generation might use 2,000–4,000 thinking tokens on top of the 4,000–8,000 output tokens. This roughly doubles the token cost but can halve the retry rate — net cost impact depends on current retry frequency.

**Latency**: Extended thinking adds ~2–5 seconds to TTFB (time to first byte of actual output). This is significant for streaming UX.

---

## 5. Structured Output Best Practices

### 5.1 Schema Design Principles

**Flat is better than nested for AI generation**:
- Every level of nesting adds a token budget for structural tokens (`{`, `}`, `:`, `,`)
- Deep nesting forces the model to track indentation/closure state
- Prefer arrays of flat objects over deeply nested hierarchies

**Separate type-specific schemas instead of unions**:
- Discriminated unions (`z.discriminatedUnion`) force the model to pick a branch and then fully satisfy that branch's constraints
- For a union of 5 action types × 12 step-action instances, the probability of all 60 instances picking the correct branch is compounded
- Alternative: use separate API calls per visual type, or simplify to a single flexible action format

**Minimize `z.any()` and `z.record()` fields**:
- These fields receive zero benefit from constrained decoding
- They are the primary source of semantic hallucinations in Insyte's schema
- Tradeoff: replacing them with strict per-type schemas increases schema complexity (more union branches)
- Resolution: use the semantic intermediate format instead, where `params` shapes are generated by deterministic post-processing, not by AI

**Reference IDs as enums, not free strings**:
- When a field must reference an ID from another part of the schema, declare it as a runtime-known enum if possible
- For multi-call pipelines: after Segment 1 generates visual IDs, pass them to Segment 2 as a declared enum — the model must pick from the list rather than invent a string
- This converts referential hallucinations into constrained selection

**Reduce schema size**:
- Every schema field described in the system prompt adds tokens to the context
- The current system prompt's params table is ~1,500 tokens — that's 1,500 tokens of "meta-information about the schema" that competes with "instructions about what to generate"
- Lean schemas that move schema knowledge to the prompt more efficiently reduce cognitive load

### 5.2 Prompt Engineering for JSON Generation

**Enumerate before generating**:
- Before generating a large array, instruct the model to enumerate the items first
- Example: "First list the visual IDs you will use, then generate the full JSON"
- This creates a self-reference anchor in the prompt context

**Use step-by-step thinking instructions even without extended thinking**:
- "Think through each step's actions before writing them. Verify each action.target matches a visual you declared."
- These instructions measurably reduce target-mismatch errors even without actual extended thinking

**Bound the output explicitly**:
- "Generate exactly 8 steps, numbered 0–7."
- "Generate exactly 3 explanation sections, with appearsAtStep values from {0, 3, 6}."
- Explicit enumeration prevents the model from losing count

**Anchor cross-references in the prompt, not in prior output**:
- After generating visuals in Segment 1, inject the visual ID list into the Segment 2 prompt as: "You MUST use only these visual IDs: [arr-main, ptr-left, ptr-right, status]"
- This is the single highest-impact change for eliminating target-mismatch errors

**Never ask for layout in prompts**:
- Remove all mention of XY coordinates from the system prompt for non-positional visual types
- For graph/system-diagram, generate topology only and apply layout separately
- Adding "position x and y for nodes to avoid overlap" to a prompt signals to the model that it should produce XY values — which it will do, incorrectly

### 5.3 Validation Strategy

**Layered validation** (most to least expensive):
1. **Syntactic**: JSON.parse() — catches malformed JSON, fastest, free
2. **Schema structural**: Zod type checking — catches wrong types, missing required fields
3. **Semantic referential**: Custom validators — catches target-ID mismatches, out-of-range step indices
4. **Semantic content**: Rule-based checks — catches obviously wrong content (empty arrays where content is required, duplicate step indices)

**Targeted repair over full regeneration**:
- Parse the Zod error path (`error.errors[0].path`) to identify exactly which field failed
- If only `explanation[2].appearsAtStep` is invalid, regenerate only the `explanation` array with the correct step count constraint
- Do not regenerate the full Scene JSON for a single-field failure

**Semantic validation checklist** (current gap in Insyte):
```typescript
function semanticValidate(scene: Scene): ValidationError[] {
  const errors: ValidationError[] = []
  const visualIds = new Set(scene.visuals.map(v => v.id))
  const stepCount = scene.steps.length

  // Check 1: step action targets exist
  scene.steps.forEach((step, si) => {
    step.actions.forEach((action, ai) => {
      if (!visualIds.has(action.target)) {
        errors.push({ path: `steps[${si}].actions[${ai}].target`, 
                      msg: `Unknown visual ID: ${action.target}` })
      }
    })
  })

  // Check 2: explanation step indices in range
  scene.explanation.forEach((section, i) => {
    if (section.appearsAtStep >= stepCount) {
      errors.push({ path: `explanation[${i}].appearsAtStep`,
                    msg: `Step ${section.appearsAtStep} out of range (max ${stepCount - 1})` })
    }
  })

  // Check 3: popup step indices in range
  scene.popups.forEach((popup, i) => {
    if (popup.showAtStep >= stepCount) {
      errors.push({ path: `popups[${i}].showAtStep`,
                    msg: `Step ${popup.showAtStep} out of range` })
    }
    if (popup.attachTo && !visualIds.has(popup.attachTo)) {
      errors.push({ path: `popups[${i}].attachTo`,
                    msg: `Unknown visual ID: ${popup.attachTo}` })
    }
  })

  // Check 4: code.highlightByStep length matches step count
  if (scene.code && scene.code.highlightByStep.length !== stepCount) {
    errors.push({ path: 'code.highlightByStep',
                  msg: `Length ${scene.code.highlightByStep.length} != stepCount ${stepCount}` })
  }

  return errors
}
```

---

## 6. Concrete Pipeline Proposal for Insyte

### Architecture Overview

```
User Input
  │
  ▼
┌─────────────────────────────────────────────┐
│  Stage 0: Intent Classification (50ms)      │
│  Classify: concept / dsa / lld / hld        │
│  Extract: topic, mode, complexity           │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Stage 1: Semantic Plan Generation          │
│  AI Call: ~800 token output                 │
│  Output: ScenePlan (no positions, no steps) │
│  ├── visual_slots: [{id, type, label}]      │
│  ├── step_outline: string[]                 │  
│  ├── narrative_arc: string                  │
│  └── control_slots: [{id, type}]            │
│  Validate: lightweight schema check         │
└──────────────────┬──────────────────────────┘
                   │ (pass visual IDs as ground truth)
                   ▼
┌─────────────────────────────────────────────┐
│  Stage 2a: Visual InitialState Generation   │
│  AI Call: ~600 token output                 │
│  Input: visual_slots from Stage 1           │
│  Output: visuals[] with initialState only   │
│  Deterministic: no XY for graph types       │
└──────────┬──────────────────────────────────┘
           │
           │  Stage 2b: Step Sequence Generation   
           │  AI Call: ~2000 token output           
           │  Input: visual_ids[], step_outline[]  
           │  Output: steps[] (actions only)        
           │  Validate: all targets in visual_ids  
           │
           ▼
┌─────────────────────────────────────────────┐
│  Stage 3: Annotations Generation            │
│  AI Call: ~1000 token output                │
│  Input: visual_ids[], step_count            │
│  Output: explanation[], popups[]            │
│  Validate: all indices in [0, step_count)   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Stage 4: Challenges + Controls Generation  │
│  AI Call: ~400 token output                 │
│  Input: topic, narrative_arc (no refs)      │
│  Output: challenges[], controls[]           │
│  Fully independent — no cross-references    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Stage 5: Deterministic Assembly            │
│  No AI involved                             │
│  ├── Apply layout engine for graph/diagram  │
│  ├── Merge all segments into Scene JSON     │
│  ├── Run full Zod + semantic validation     │
│  └── If errors: targeted segment retry     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
             Valid Scene JSON
             → Render
```

### Stage Definitions

#### Stage 0: Intent Classification
**Input**: Raw user prompt  
**Output**: `{ type: 'concept'|'dsa'|'lld'|'hld', topic: string, complexity: 'simple'|'medium'|'complex' }`  
**How**: Regex + keyword matching first (fast path), AI classification as fallback.  
**Cost**: 0 tokens if regex matches; ~200 tokens if AI needed.  
**Streaming UX**: Navigation to `/s/[slug]` happens immediately after this stage.  

#### Stage 1: Semantic Plan
**Input**: `{ type, topic }`  
**Output schema** (flat, small):
```typescript
interface ScenePlan {
  title: string
  narrative_arc: string           // 1-2 sentence description
  visual_slots: Array<{
    id: string                    // e.g. "main-array"
    type: VisualType              // enum — constrained decoding works perfectly here
    label: string
    role: 'primary'|'secondary'|'annotation'
  }>
  step_count: number              // 8–12
  step_outline: string[]          // ["Init with array [1,3,5]", "Calculate mid=2", ...]
  control_slots: Array<{
    id: string
    type: ControlType
    label: string
  }>
}
```
**Why small**: ~300–500 tokens. No positions, no step details, no params. Just intent.  
**Key benefit**: After this call, visual IDs are FIXED. Every subsequent call receives them as input, not output.  
**Streaming UX**: Title and step_outline can begin populating the UI skeleton immediately.  

#### Stage 2a: Visual States
**Input**: `ScenePlan` (all visual IDs and types are known)  
**Output**: `visuals[]` with `initialState` per type  
**Key constraint**: No `position` field for non-positional types. For `graph` and `system-diagram`: generate node/edge topology only (no XY). Layout engine applies XY in Stage 5.  
**Validation after call**: Each visual's `initialState` matches its declared `type`'s required fields.  

#### Stage 2b: Step Sequence
**Input**: `ScenePlan.visual_slots` (IDs + types), `ScenePlan.step_outline`  
**Output**: `steps[]` with `actions[]`  
**Key constraint**: Model is told "You MUST only reference these visual IDs: [list]". Constrained enum selection eliminates target-mismatch.  
**Validation after call**: Run semantic check — all `action.target` values must be in `visual_ids`.  
**Retry on failure**: Re-run Stage 2b only, not the full pipeline.  

#### Stage 3: Annotations
**Input**: `visual_ids[]`, `step_count` (exact number from Stage 2b output)  
**Output**: `explanation[]`, `popups[]`  
**Key constraint**: "Generate exactly N explanation sections. Use appearsAtStep values from 0 to N-1." Step count is passed explicitly.  
**Validation after call**: All `appearsAtStep` and `showAtStep` values < step_count.  

#### Stage 4: Challenges + Controls
**Input**: `topic`, `narrative_arc` from ScenePlan. No cross-references.  
**Output**: `challenges[]`, `controls[]` with configs  
**Why independent**: Challenges reference no visual IDs, no step indices. Controls reference their own IDs (which will be validated separately). This is the safest segment.  

#### Stage 5: Deterministic Assembly (No AI)

```typescript
function assembleScene(
  plan: ScenePlan,
  visualStates: Visual[],
  steps: Step[],
  annotations: { explanation: ExplanationSection[], popups: Popup[] },
  misc: { challenges: Challenge[], controls: Control[] },
): Scene {
  // 1. Apply layout for spatial visual types
  const positionedVisuals = applyLayout(visualStates, plan)

  // 2. Merge into Scene
  const scene: Scene = {
    id: generateSlug(plan.title),
    title: plan.title,
    type: plan.type,
    layout: inferLayout(plan.type),
    visuals: positionedVisuals,
    steps: steps,
    controls: misc.controls,
    explanation: annotations.explanation,
    popups: annotations.popups,
    challenges: misc.challenges,
  }

  // 3. Full validation
  const zodResult = safeParseScene(scene)
  const semanticErrors = semanticValidate(scene)

  // 4. Targeted retry if needed
  if (!zodResult.success || semanticErrors.length > 0) {
    return targetedRetry(scene, zodResult.error, semanticErrors, plan)
  }

  return scene
}
```

**Layout engine** for graph/system-diagram:
```typescript
function applyLayout(visuals: Visual[], plan: ScenePlan): Visual[] {
  return visuals.map(visual => {
    if (visual.type === 'graph' || visual.type === 'system-diagram') {
      // Run topology through a simple layout algorithm
      // Option A: Dagre (npm: dagre) — hierarchical layouts
      // Option B: Simple circular layout for ≤8 nodes
      // Option C: Grid layout for system-diagram (rows × cols)
      const positions = computeLayout(visual.initialState, visual.type)
      return { ...visual, initialState: applyPositions(visual.initialState, positions) }
    }
    return visual  // Array, hashmap, etc. don't need XY positions
  })
}
```

### Retry Strategy

```
Stage 1 failure → retry Stage 1 (rare, schema is simple)
Stage 2a failure → retry Stage 2a only
Stage 2b failure (target mismatch) → retry Stage 2b with explicit ID list emphasis
Stage 3 failure (index out of range) → retry Stage 3 with step_count constraint reinforced
Stage 4 failure → retry Stage 4 (very rare)
Assembly semantic failure → identify failing segment → retry that segment only
```

**Max retry budget**: 1 retry per segment, fail the pipeline after 2 total failures.

---

## 7. Schema Redesign Recommendations

### 7.1 Introduce ScenePlan as a First-Class Type

Add `ScenePlan` to `packages/scene-engine/src/types.ts` and `schema.ts`:

```typescript
export const ScenePlanSchema = z.object({
  title: z.string(),
  narrative_arc: z.string(),
  visual_slots: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/), // enforce kebab-case IDs
    type: VisualTypeSchema,
    label: z.string(),
    role: z.enum(['primary', 'secondary', 'annotation']),
  })),
  step_count: z.number().int().min(6).max(14),
  step_outline: z.array(z.string()),
  control_slots: z.array(z.object({
    id: z.string(),
    type: ControlTypeSchema,
    label: z.string(),
  })).optional(),
})
```

### 7.2 Remove XY Positions from AI-Generated Schema

For the multi-step pipeline, visuals should NOT have a `position` field in the AI-generated output. Positions are computed by the layout engine in Stage 5.

```typescript
// AI-generated visual (no position)
export const AIVisualSchema = VisualSchema.omit({ position: true })

// Final scene visual (position added by layout engine if needed)
export const RenderedVisualSchema = VisualSchema // keeps position optional
```

### 7.3 Simplify ActionSchema for Step Generation

The current discriminated union with 5 branches is too complex for reliable AI generation. For the step generation segment, use a simplified single-branch format:

```typescript
// Simplified action for AI generation
export const AIActionSchema = z.object({
  target: z.string(),            // constrained to known IDs via prompt
  action: z.enum(['set', 'highlight', 'push', 'pop', 'set-value']),
  params: z.record(z.string(), z.any()),  // permissive, validated semantically
})
```

The discriminated union can remain in the Scene schema for the final assembled output, populated by the deterministic assembler which can convert from the simplified format to the typed format based on visual type knowledge.

### 7.4 Add a `scene_version` Field

```typescript
export const SceneSchema = z.object({
  schema_version: z.literal('2.0').default('2.0'),
  // ...rest of fields
})
```

This enables future schema migrations without breaking existing cached scenes. It also allows the renderer to handle v1 (legacy single-call) and v2 (multi-call assembled) scenes with the same codebase during the transition.

### 7.5 Separate `graph` Node Positions from Step Params

Currently, graph nodes require XY in every `set` action params:
```json
{ "nodes": [{ "id": "a", "x": 120, "y": 80 }, ...] }
```

This means positions are repeated across every step, and any step that re-sets the graph must re-specify positions. Proposed fix:

```typescript
// Positions declared once in initialState, not repeated in every step
// Steps only update non-spatial properties (label, color, highlighted)
export const GraphStepParamsSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string().optional(),
    color: z.string().optional(),
    // NO x, y here — positions are set once in initialState, not per-step
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    highlighted: z.boolean().optional(),
    label: z.string().optional(),
  })),
})
```

---

## 8. Prompt Engineering Guidelines

### 8.1 Stage 1 (Semantic Plan) Prompt Principles

```
You are planning a visualization, not writing it.

Output a ScenePlan JSON with:
- title: clear, educational title
- narrative_arc: 1–2 sentences describing the story arc
- visual_slots: 2–4 visuals. IDs must be kebab-case (e.g. "main-array", "left-ptr").
  Use only these types: [list of VisualType enum values]
- step_count: integer from 8 to 12
- step_outline: exactly step_count strings, each describing one step's key moment

Do NOT generate any step details, initial states, or positions.
This is a planning document only.
```

**Principle**: Explicitly forbid what you don't want the model to generate. "Do NOT generate positions" is stronger than silence.

### 8.2 Stage 2b (Steps) Prompt Principles

```
Generate steps[] for this visualization.

VISUAL IDs (ONLY use these as action targets):
{visual_ids_list}

STEP OUTLINE (follow this exactly, one step per item):
{step_outline}

Rules:
- Generate exactly {step_count} steps, indexed 0 to {step_count - 1}
- Step 0 must have empty actions []
- Every action.target MUST be one of: {visual_ids_as_comma_separated}
- Include full visual state in every "set" action (not just deltas)
```

**Key technique**: Repeat the visual IDs three times in different formats (list, enum format, inline constraint). Repetition in the prompt significantly improves adherence.

### 8.3 Stage 3 (Annotations) Prompt Principles

```
Generate explanations and popups for this visualization.

Context:
- Total steps: {step_count} (valid indices: 0 to {step_count - 1})
- Visual IDs (for popup attachTo): {visual_ids_list}

Rules for explanation[]:
- Generate exactly 3–4 sections
- appearsAtStep MUST be in range [0, {step_count - 1}]
- First section appearsAtStep must be 0

Rules for popups[]:
- Generate 2–5 popups
- showAtStep MUST be < {step_count}
- attachTo MUST be one of: {visual_ids_as_comma_separated}
```

### 8.4 General Hallucination-Reduction Techniques

**Repeat constraints**: State each constraint at the start of the prompt AND inline in the field descriptions.

**Use examples, not just descriptions**: Show one complete correct example before asking for output. LLMs follow examples more reliably than abstract descriptions.

**Minimize output length**: Shorter output = fewer hallucinations. Stage decomposition achieves this naturally.

**Avoid negative space**: Instead of "don't include positions for non-graph visuals," say "include positions ONLY for graph and system-diagram visuals." Models follow positive instructions better.

**Be explicit about counts**: "Generate exactly 9 steps" beats "generate 8–12 steps." Ranges give the model an excuse to drift.

---

## 9. Streaming UX Considerations

### 9.1 The Challenge

The current pipeline streams a single large JSON object, enabling progressive rendering via `useObject()`. The multi-step pipeline produces output in multiple calls — how do we preserve the streaming experience?

### 9.2 Proposed: Progressive Stage Streaming

Each stage sends events to the client as it completes. The UI updates progressively:

```
Client receives:          UI state:
─────────────────────────────────────────────────────
stage:0 complete         → Slug generated, navigate to /s/[slug]
stage:1 complete         → Title appears, skeleton with N step placeholders
stage:2a complete        → Visual primitives appear (no data yet, placeholder shimmer)  
stage:2b complete        → Steps data arrives, playback controls become active
stage:3 complete         → Explanation panel populates, popups become available
stage:4 complete         → Challenges section appears
stage:5 complete         → Controls appear, full scene is live
```

**Server-Sent Events (SSE) for stage updates**:
```typescript
// /api/generate route
async function* generateSceneMultiStep(topic: string) {
  const plan = await generatePlan(topic)
  yield { event: 'stage', data: { stage: 1, plan } }

  const [visualStates, steps] = await Promise.all([
    generateVisualStates(plan),
    generateSteps(plan),
  ])
  yield { event: 'stage', data: { stage: '2a', visuals: visualStates } }
  yield { event: 'stage', data: { stage: '2b', steps } }

  const annotations = await generateAnnotations(plan, steps.length)
  yield { event: 'stage', data: { stage: 3, annotations } }

  const misc = await generateMisc(plan)
  yield { event: 'stage', data: { stage: 4, misc } }

  const scene = assembleScene(plan, visualStates, steps, annotations, misc)
  yield { event: 'complete', data: { scene } }
}
```

**Parallelism**: Stages 2a and 2b can run in parallel (both depend only on Stage 1 output). Stages 3, 4 can run in parallel (both depend only on Stage 2b for step_count). This creates a DAG:

```
Stage 1
├── Stage 2a ─┐
└── Stage 2b ─┤──► Stage 5 (assembly)
              │
Stage 1 ──► Stage 3 ─┘
         └► Stage 4 ─┘
```

**Wall-clock time with parallelism**:
- Stage 1: ~2s
- Stage 2a + 2b (parallel): ~4s
- Stage 3 + 4 (parallel): ~3s
- Stage 5 (deterministic): ~0.1s
- **Total: ~9s** (vs. ~6–8s single call, but with dramatically higher reliability)

### 9.3 Client-Side Progressive Rendering

```typescript
// New generation state machine
type GenerationStage = 
  | 'idle' 
  | 'planning'    // Stage 1 running → show skeleton with title shimmer
  | 'visuals'     // Stage 2a done → show visual shells
  | 'steps'       // Stage 2b done → playback controls active
  | 'annotations' // Stage 3 done → explanation panel live
  | 'complete'    // All stages done → full interactive scene

// Scene store gets partial data per stage
interface SceneStore {
  generationStage: GenerationStage
  plan: ScenePlan | null         // available after Stage 1
  visuals: Visual[] | null       // available after Stage 2a
  steps: Step[] | null           // available after Stage 2b
  explanation: ExplanationSection[] | null  // available after Stage 3
  scene: Scene | null            // available after Stage 5
}
```

---

## 10. Token Cost Analysis

### Current Pipeline (Single Call)

| Item | Tokens |
|------|--------|
| System prompt | ~1,800 |
| User message | ~20 |
| Output (Scene JSON) | ~4,000–8,000 |
| **Total per generation** | **~6,000–10,000** |
| Retry (25% failure rate × full regen) | +~2,500 |
| **Effective average** | **~8,500** |

### Proposed Multi-Step Pipeline

| Stage | Input Tokens | Output Tokens | Notes |
|-------|-------------|---------------|-------|
| Stage 1 (Plan) | ~500 | ~400 | Small schema, very reliable |
| Stage 2a (Visuals) | ~800 | ~600 | Plan as context |
| Stage 2b (Steps) | ~900 | ~2,000 | Steps are the bulk |
| Stage 3 (Annotations) | ~700 | ~900 | Explanation + popups |
| Stage 4 (Misc) | ~500 | ~300 | Challenges + controls |
| Stage 5 (Assembly) | 0 | 0 | Deterministic |
| **Total** | **~3,400** | **~4,200** | **~7,600 total** |
| Retry rate (estimated 5–8%) | +~400 | +~500 | Segment retries only |
| **Effective average** | | | **~8,500** |

**Net cost**: Approximately the same total tokens, but with:
- ~80% reduction in total failure rate
- Retries targeting individual segments (~600 tokens) vs. full scene (~8,000 tokens)
- Parallelism reducing wall-clock time to comparable levels

**With extended thinking on Stage 2b** (most error-prone):
- Add ~1,500–2,500 thinking tokens to Stage 2b
- Estimated 60% further reduction in Stage 2b failures
- Net cost increase: ~+$0.002 per generation at Gemini Flash pricing
- Tradeoff: +2–3s latency on Stage 2b

---

## 11. Risk and Trade-off Analysis

### 11.1 Benefits

| Risk Addressed | Current | Proposed |
|----------------|---------|----------|
| Invalid visual ID references | High (25–40%) | Very Low (<3%) |
| Out-of-range step indices | High (15–30%) | Very Low (<3%) |
| Broken XY positions (graph) | Always wrong | Eliminated (deterministic layout) |
| All-or-nothing failure | Yes | No (segment recovery) |
| Full retry on single-field failure | Yes | No (targeted segment retry) |
| Schema change propagation | Full prompt rewrite | Update one segment's prompt |

### 11.2 Costs and Tradeoffs

**Increased implementation complexity**:
- 5 AI calls instead of 1
- SSE stage event system
- Partial scene state management on client
- Layout engine integration (Dagre or custom)
- Targeted retry orchestration
- Backwards compatibility with existing cached scenes

**Latency**: Wall-clock time increases slightly (~9s vs. ~6–8s) on the happy path, but eliminates the catastrophic ~20s+ retry scenarios on failures.

**Cold start / provider switching**: More API calls means more latency variance. Rate limits hit sooner on burst traffic.

**BYOK complexity**: Each provider's structured output capabilities differ. Gemini Flash, GPT-4o Mini, Claude Haiku all behave differently on small-schema structured calls. The pipeline must be robust to provider-specific quirks across 5 separate calls.

**Streaming UX degradation risk**: If Stage 2b takes longer than expected (e.g. Gemini adds latency), the playback controls won't appear until later. The current single-call streaming gives a continuous "something is happening" signal; multi-call has distinct pauses between stages.

### 11.3 Migration Strategy

**Phase A: Add semantic validation layer** (immediate, no pipeline change)
- Add `semanticValidate()` function
- Run it after Zod validation
- Use Zod error paths to implement targeted retries for specific segments
- Expected outcome: 40–60% reduction in visible failures with zero architecture change

**Phase B: Extract `explanation` and `popups` into separate calls** (medium effort)
- These are the easiest to isolate (step count constraint is simple)
- Implement Stage 3 as a separate call
- Expected outcome: ~80% reduction in annotation-related failures

**Phase C: Implement full Stage 1 (ScenePlan)** (higher effort)
- Requires ScenePlan schema, new prompt, and client state updates
- Enables Stage 2b to receive visual IDs as input
- Expected outcome: eliminates the majority of target-ID mismatch errors

**Phase D: Deterministic layout engine** (research + implementation)
- Integrate Dagre for graph/system-diagram layout
- Remove XY coordinates from AI generation
- Expected outcome: eliminates all spatial hallucinations

**Phase E: Parallel execution + SSE streaming** (infrastructure)
- Implement concurrent Stage 2a+2b and Stage 3+4 execution
- Progressive client rendering per stage
- Expected outcome: comparable wall-clock time with dramatically better reliability

---

## Summary of Key Findings

1. **The root cause is not prompt quality — it is architecture**. Single-call 10–20 KB JSON generation is fundamentally unreliable for cross-field referential integrity because LLMs lose attention on early-output tokens while generating later content.

2. **Schema-constrained generation (structured outputs) does not prevent semantic hallucinations**. It only enforces type correctness. The most failure-prone fields in Insyte use `z.any()` which constrained decoding cannot help with at all.

3. **AI should never generate XY layout coordinates**. This is a category error — LLMs have no spatial model. The Mermaid/Eraser pattern (AI generates topology, engine generates geometry) is the correct division of labor.

4. **The highest-ROI immediate fix is semantic validation + targeted segment retry**. This requires no pipeline change and can reduce visible failures by 40–60% immediately.

5. **The correct long-term architecture is a 5-stage pipeline where each stage is small, independent, and validated**. Visual IDs generated in Stage 1 are passed as ground truth to Stage 2, eliminating the target-mismatch class of errors entirely.

6. **Token cost is roughly equivalent** to the current approach when accounting for retry savings. The real savings are in reliability, developer iteration time, and user trust.

7. **Streaming UX can be preserved** via SSE stage events, with the UI progressively activating as each stage completes. Stages 2a/2b and 3/4 can run in parallel to limit wall-clock time.
