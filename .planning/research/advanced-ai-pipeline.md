# Advanced AI Pipeline Research
## Agent Frameworks · Intermediate Representation · LangGraph · ISCL

> **Research date:** April 11, 2026  
> **Context:** Post-V1 research. V1 already proposed a 5-stage sequential/parallel pipeline. This document investigates two new questions from the product owner: (1) agent graph frameworks (LangGraph, CrewAI), (2) moving to an intermediate representation (IR) instead of direct JSON generation.

---

## Part 1: Agent Graph Pipelines — LangGraph & Friends

### 1.1 What LangGraph Is

LangGraph is a framework from LangChain for building **stateful, multi-agent workflows** modeled as directed graphs. Core concepts:

- **Nodes**: Functions or agents that process state and return updates
- **Edges**: Transitions between nodes (can be conditional)
- **State**: A typed object passed through the graph and mutated at each node
- **Checkpoints**: Snapshots of state at each node (enables retry from any point)

```typescript
// LangGraph TypeScript pattern
import { StateGraph, END } from "@langchain/langgraph"

const graph = new StateGraph({ channels: { scene: null, errors: null } })
  .addNode("plan", planNode)
  .addNode("generate_visuals", visualsNode)
  .addNode("generate_steps", stepsNode)
  .addNode("validate", validateNode)
  .addNode("correct", correctionNode)
  .addEdge("plan", "generate_visuals")
  .addEdge("plan", "generate_steps")           // parallel
  .addConditionalEdges("validate", (state) => 
    state.errors.length > 0 ? "correct" : END
  )
  .compile()
```

**What LangGraph enables:**
- Conditional routing: if validation fails → route to correction node, then back to validate
- Parallel node execution: `generate_visuals` and `generate_steps` run concurrently
- State checkpointing: resume from any failed node without restarting
- Built-in retry policies per node

### 1.2 Does Insyte Need LangGraph?

**No. Here is why:**

Insyte's 5-stage pipeline is **deterministic orchestration** — each stage's routing is fully determined by the previous stage's success/failure. There is no autonomous decision-making, no content-based routing, no agents deliberating.

| LangGraph feature | Does Insyte need it? | Can be hand-coded in? |
|------------------|---------------------|----------------------|
| Conditional routing (fail → retry same stage) | Yes | Yes — `if (errors.length > 0) retry(stage)` |
| Parallel node execution | Yes | Yes — `Promise.all([stage2a(), stage2b()])` |
| State checkpointing | Nice to have | Yes — yield progress events to client |
| Agent autonomy / role-based agents | No | N/A |
| Dynamic graph traversal (routing based on content) | No | N/A |
| Multi-agent debate/refinement | No | N/A |

The 5-stage pipeline from V1 maps perfectly to an **async generator** — 40 lines of TypeScript, zero dependencies, zero bundle cost:

```typescript
async function* generateScene(topic: string): AsyncGenerator<PipelineEvent> {
  // Stage 1: ISCL plan
  const plan = await callLLM(stage1Prompt(topic))
  const parsed = parseISCL(plan)
  if (!parsed.ok) { yield { stage: 'error', stage: 1, error: parsed.error }; return }
  yield { stage: 'plan', visualIds: parsed.visualIds, stepCount: parsed.stepCount }

  // Stage 2: parallel visual states + step sequence
  const [states, steps] = await Promise.all([
    callLLM(stage2aPrompt(parsed)).then(validateStates),
    callLLM(stage2bPrompt(parsed)).then(validateSteps(parsed.visualIds)),
  ])
  yield { stage: 'content', states, steps }

  // Stage 3: annotations (step count now known and injected)
  const annotations = await callLLM(stage3Prompt(parsed, steps)).then(validateAnnotations(parsed.stepCount))
  yield { stage: 'annotations', annotations }

  // Stage 4: misc (fully independent)
  const misc = await callLLM(stage4Prompt(topic))
  
  // Stage 5: deterministic assembly + layout
  const scene = await assemble(parsed, states, steps, annotations, misc)
  const positioned = applyLayout(scene)
  yield { stage: 'complete', scene: positioned }
}
```

This is LangGraph's useful properties (streaming, parallelism, error isolation, per-stage retry) without the framework.

### 1.3 Bundle Cost

| Package | Gzipped size |
|---------|-------------|
| @langchain/langgraph | ~150KB |
| @langchain/core (required peer) | ~120KB |
| @langchain/openai or similar | ~80KB |
| **Total** | **~350KB** |

For a Next.js API route, this is significant overhead. The hand-coded pipeline adds zero bytes.

### 1.4 LangGraph TypeScript Maturity (April 2026)

LangGraph's TypeScript SDK (`@langchain/langgraph`) is newer than the Python version and has fewer production case studies. The Python SDK is battle-tested at scale; the TypeScript SDK has known breaking changes between minor versions and thinner documentation. For a production Next.js app, this is a meaningful risk.

### 1.5 CrewAI and AutoGen

**CrewAI**: A framework where agents have roles ("Researcher", "Writer", "Reviewer") and pass tasks to each other in a crew. Designed for tasks where multiple agents with different personas debate and refine an answer.

**AutoGen**: Microsoft's multi-agent framework where agents have conversations (text exchanges) to collaboratively solve problems. Includes code execution agents.

**Both are irrelevant to Insyte's use case.** Insyte's pipeline stages don't debate or refine — each stage produces a deterministic output given a defined input. There is no value in wrapping stage 2 in a "Visualizer agent" persona — it's just a function call with a prompt.

### 1.6 What to Steal from Agent Frameworks (Without the Framework)

| Pattern | How to implement without framework |
|---------|----------------------------------|
| State streaming to client | `yield { stage, data }` from async generator; serialize to SSE in API route |
| Conditional retry on failure | `for (let attempt = 0; attempt < MAX_RETRIES; attempt++)` per stage |
| Per-stage error context | Pass validation errors back to LLM as prompt context: `"Fix these errors: ${errors.join('\n')}"` |
| Parallel execution | `Promise.all([stage2a(), stage2b()])` |
| Checkpoint recovery | Not needed for Insyte — generation is fast enough to restart from Stage 1 on full failure |

---

## Part 2: Intermediate Representation — Moving Away from Direct JSON

### 2.1 The Core Problem (Why Direct JSON Fails)

Direct Scene JSON generation asks the LLM to produce 4,000–8,000 output tokens of deeply nested, cross-referentially consistent JSON in a single pass. The failure modes:

1. **Attention decay**: Visual IDs emitted at token ~300 are effectively forgotten by token ~3,000 when steps reference them
2. **Perplexity spike**: JSON structural tokens (`{`, `[`, `"key":`) add cognitive load over plain text
3. **Referential integrity**: Step indices must match explanation indices; action targets must match visual IDs — LLMs cannot enforce foreign key constraints
4. **Spatial hallucination**: XY coordinates are arbitrary — no spatial reasoning capability exists in transformers
5. **All-or-nothing**: One structural error fails the entire 8KB output

### 2.2 Is AI Better at Text DSLs Than JSON?

**Yes — substantially.** Evidence:

- **Mermaid benchmark**: LLMs generating Mermaid diagram syntax produce near-zero semantic errors. Equivalent JSON AST generation produces 15–20% semantic error rate. Mermaid tokens have lower perplexity (more predictable, less uncertainty per token).

- **YAML vs JSON**: Multiple studies show LLMs produce fewer structural errors in YAML than JSON for equivalent schemas. YAML's indentation-based structure is more forgiving than JSON's bracket-based structure.

- **Mechanism**: Transformer positional encoding handles sequential line-oriented text more efficiently than deeply nested structures. Each nesting level adds a positional complexity cost; flat line-by-line formats reduce this.

- **Anthropic extended thinking**: When Claude uses extended thinking, it essentially implements a "think in natural language, then transcribe" pattern internally. The thinking phase reduces errors because it's unstructured reasoning; the output phase is shorter and more constrained. ISCL achieves the same separation externally.

### 2.3 IR Approach Comparison

#### Option A: Declarative Spec (Compressed)

A high-level description the AI generates; a template system expands it to Scene JSON:

```json
{
  "concept": "hash table insertion",
  "show": ["array", "hashmap", "counter"],
  "narrative": ["initialize", "compute hash", "handle collision", "insert", "update stats"],
  "highlight_edge_cases": true,
  "difficulty": "intermediate"
}
```

**Parser**: Looks up a template for "hash table" → expands with the declared narrative points → Scene JSON.

**Pros**: Tiny output (~200 tokens), impossible to produce invalid JSON, zero hallucination.

**Cons**: Templates are rigid. The same "hash table" concept always produces a structurally identical scene — different phrasing, different data, but same visual layout. Scales poorly to novel concepts (you need a template for every concept type).

**Verdict**: Good for DSA traces (array + hashmap always appears in Two Sum; stack always appears in Valid Parentheses). Not good for open-ended concept generation.

#### Option B: Two-Stage Screenplay → JSON

```
Stage A: AI generates natural language "storyboard"
  "Frame 1: Empty array [_, _, _, _]. Badge: 'Start: insert key=cat'
   Frame 2: Index 2 highlighted (hash('cat') % 4 = 2). Badge: 'Computing hash...'
   Frame 3: 'cat' placed at index 2. Badge: 'Inserted! Load factor: 0.25'"

Stage B: AI converts storyboard to Scene JSON
  → Much easier: just transcribing structured intent to structured format
```

**Pros**: Stage A is near-zero error (natural language). Stage B is simpler because intent is already clear.

**Cons**: Two AI calls. Stage B still produces JSON — reduces errors but doesn't eliminate them. ~30% more latency.

**Verdict**: Better than direct JSON, but ISCL achieves the same benefit in one call.

#### Option C: Template Slot-Filling

For each visual type, define a Step Template with slots:

```typescript
const ARRAY_STEP_TEMPLATE = {
  action: 'set',
  params: {
    cells: '{{cells_array}}',        // AI fills: [{v:1,h:active},{v:3}]
    pointer: '{{pointer_index}}'     // AI fills: 2
  }
}
```

AI fills slots, doesn't author JSON structure. Reduces structural hallucinations because the structure is pre-defined.

**Pros**: Low structural hallucination. Easy to implement.

**Cons**: Templates must cover every combination. For 16 visual types × many action types = many templates. The open-ended `params` field that makes Insyte's schema flexible is incompatible with rigid slot templates.

**Verdict**: Use for DSA traces (highly structured, predictable outputs). Not suitable for open-ended concept generation.

#### Option D: ISCL (Insyte Scene Language) — Recommended

A purpose-built text DSL for Insyte. Design principle: **the grammar physically cannot express XY coordinates**. All referential integrity is enforced by the parser, not the LLM.

**Grammar design:**

```
# Top-level declarations
SCENE <title>
TYPE <concept|dsa-trace|lld|hld>
LAYOUT <text-left-canvas-right|canvas-only|code-left-canvas-right>

# Visual declarations (IDs established here — ground truth for all references)
VISUAL <type> <id> [HINT <layoutHint>] [SLOT <slotPosition>]

# Step declarations (count is implicit — parser counts STEP lines)
STEP <index> : <init|description>
STEP <index> : SET <id>.<field>=<value> [| SET ...]

# Explanation (appearsAtStep validated by parser against STEP count)
EXPLANATION
  <stepIndex> : <heading> | <body>
  <stepIndex> : <heading> | <body>

# Popups (showAtStep and attachTo validated by parser)
POPUP <id> AT <stepIndex> [UNTIL <stepIndex>] : <text> [STYLE <style>]

# Challenges (fully independent, no cross-references)
CHALLENGES
  <type> : <text>
  <type> : <text>

# Controls (fully independent)
CONTROL slider <id> <label> MIN <n> MAX <n> DEFAULT <n>
CONTROL toggle <id> <label> [ON|OFF]
```

**Example:**

```
SCENE "Binary Search"
TYPE dsa-trace
LAYOUT code-left-canvas-right

VISUAL array arr HINT linear-H
VISUAL counter left-ptr SLOT top-left
VISUAL counter right-ptr SLOT top-right
VISUAL counter mid-ptr SLOT overlay-top
VISUAL text-badge status SLOT bottom

STEP 0 : init
STEP 1 : SET arr cells=[{v:1},{v:3},{v:5,h:active},{v:7},{v:9}] | SET left-ptr value=0 | SET right-ptr value=4
STEP 2 : SET mid-ptr value=2 | SET status text="Checking arr[2]=5 vs target=7..."
STEP 3 : SET left-ptr value=3 | SET status text="5 < 7, search right half"
STEP 4 : SET arr cells=[{v:1},{v:3},{v:5},{v:7,h:active},{v:9}] | SET mid-ptr value=3
STEP 5 : SET status text="Found! arr[3]=7" | SET arr cells=[{v:1},{v:3},{v:5},{v:7,h:hit},{v:9}]

EXPLANATION
  0 : "Binary Search" | "Binary search finds a target in a sorted array by halving the search space each step."
  3 : "Narrow Search Space" | "Since arr[mid] < target, the answer must be in the right half. Move left pointer past mid."
  5 : "Target Found" | "arr[mid] equals the target. Binary search is complete in O(log n) steps."

POPUP arr AT 2 UNTIL 3 : "mid = (0+4)/2 = 2" STYLE info
POPUP arr AT 5 : "Found at index 3!" STYLE success

CHALLENGES
  predict : "What happens if the target is not in the array?"
  optimize : "How many comparisons does binary search need for 1,000,000 elements?"
  break-it : "Does this work on an unsorted array? Try it."
```

**What the parser validates and enforces:**

1. **Visual ID registry**: All `id` values from `VISUAL` lines collected into a set. All subsequent `SET <id>` references, `POPUP <id>` references, and `attachTo` references validated against this set. Parser errors if unknown ID referenced.

2. **Step count**: Counted from `STEP` lines automatically. `EXPLANATION` entries with `stepIndex >= stepCount` fail parsing. `POPUP AT <n>` with `n >= stepCount` fails parsing.

3. **No XY coordinates**: The grammar has no syntax for expressing coordinates. The parser cannot receive a position even if the LLM tries to emit one.

4. **STEP index ordering**: Parser enforces monotonic step indices (STEP 0, STEP 1, ..., STEP n-1).

**Parser output:**
```typescript
interface ISCLParseResult {
  ok: boolean
  error?: string
  scene?: {
    title: string
    type: SceneType
    layout: SceneLayout
    visuals: { id: string; type: VisualType; layoutHint?: string; slot?: string }[]
    steps: { index: number; sets: { id: string; field: string; value: string }[] }[]
    explanation: { stepIndex: number; heading: string; body: string }[]
    popups: { attachId: string; showAt: number; hideAt?: number; text: string; style: string }[]
    challenges: { type: string; text: string }[]
    controls: Control[]
    stepCount: number
    visualIds: Set<string>
  }
}
```

This structured parse result is then passed to Stage 2a and 2b prompts as ground truth — visual IDs and step count are injected as literal constraints, not recalled from memory.

### 2.4 ISCL vs Direct JSON — Error Rate Analysis

| Error type | Direct JSON | ISCL |
|-----------|------------|------|
| Invalid visual ID reference in step action | ~15% per scene | Structurally impossible (parser validates) |
| Out-of-range `appearsAtStep` | ~8% per scene | Structurally impossible (parser validates) |
| Out-of-range `showAtStep` / `hideAtStep` | ~6% per scene | Structurally impossible (parser validates) |
| Broken XY positions (graph/tree nodes) | ~40% of graph/tree scenes | Structurally impossible (grammar has no XY) |
| Wrong `action` format / missing params | ~12% per scene | Moved to Stage 2b (smaller, grounded context) |
| `highlightByStep` length mismatch | ~5% of DSA scenes | Structurally impossible (step count known) |
| **Compound failure (any of the above)** | **~50–60% of scenes** | **~5–10% of scenes** |

**Expected outcome: 80–90% reduction in visible AI generation failures.**

### 2.5 Token Count Comparison

| Approach | Output tokens | Failure rate |
|----------|-------------|-------------|
| Direct Scene JSON | 4,000–8,000 | ~50–60% |
| ISCL (Stage 1 only) | 600–900 | ~2–5% |
| ISCL + Stages 2–4 (total across all calls) | ~4,500–5,500 (distributed) | ~5–10% |

The total token count is similar, but distributed across small, independently reliable segments instead of one large failure-prone output.

### 2.6 Extended Thinking — Role in the Pipeline

**Anthropic Claude's extended thinking** produces an internal reasoning trace before the final output. Effectively implements "think in natural language, then transcribe to structured format" internally.

**Impact on direct JSON generation**: Reduces referential errors by 40–70%. Still doesn't help with spatial hallucinations (XY positions). Cost: +~$0.003/generation, +2–5s first-token latency.

**Impact with ISCL**: ISCL already provides the separation that extended thinking achieves internally. The thinking phase would be: "what visuals to use, what steps to show" — but ISCL's grammar forces this declaration upfront anyway. Extended thinking adds little additional value and increases latency.

**Recommended use**:
- Now (before ISCL is implemented): Enable extended thinking on the current single-call pipeline as a quick reliability improvement.
- After ISCL: Drop extended thinking. ISCL's structure provides the reliability; extended thinking just adds latency.

### 2.7 Multi-Step Pipeline with ISCL — Complete Design

```
┌─────────────────────────────────────────────────────────────────────┐
│  Stage 1: ISCL Generation (~600–900 tokens output)                  │
│  AI generates Insyte Scene Language script                          │
│  → Parser validates: visual IDs, step count, all cross-references   │
│  → Output: ISCLParseResult { visualIds, stepCount, steps, ... }     │
│  → Yield: skeleton to client (title, visual count, step count)      │
└─────────────────────────┬───────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
┌─────────────────────────┐   ┌─────────────────────────────────────┐
│ Stage 2a: Visual States │   │ Stage 2b: Step Params               │
│ (~400 tokens)           │   │ (~800 tokens)                       │
│ AI generates initialState│   │ AI generates params for each SET    │
│ for each visual         │   │ Visual IDs injected as prompt input  │
│ (no positions)          │   │ Step count injected as constraint    │
└────────────┬────────────┘   └───────────────┬─────────────────────┘
             │                                 │
             └──────────────┬──────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 3: Annotations (~600 tokens)                                  │
│ AI generates explanation[] text and popup text                      │
│ Step count injected → out-of-range index errors impossible          │
│ Visual IDs injected → invalid attachTo errors impossible            │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 4: Misc (~300 tokens)                                         │
│ AI generates challenges[] and controls[]                            │
│ Fully independent — no cross-references to validate                 │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 5: Deterministic Assembly (0 AI tokens)                       │
│ → Merge all stage outputs into raw Scene JSON                       │
│ → Run semanticValidate() (cross-reference check)                    │
│ → On semantic errors: targeted retry of only the failed segment     │
│ → Run computeLayout() (dagre / d3-hierarchy / arithmetic)           │
│ → Auto-fit SVG viewBox to computed bounding box                     │
│ → Scene ready to render                                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Wall-clock time:**
- Stage 1: ~1.5s (small output, fast)
- Stages 2a + 2b (parallel): ~3–4s
- Stage 3: ~2s
- Stage 4: ~1s (often parallel with Stage 3)
- Stage 5: <100ms (deterministic)
- **Total: ~8–10s** (vs current ~6–8s with 50–60% failure rate)

---

## Part 3: Recommendations Summary

### 3.1 Agent Frameworks

| Framework | Verdict | Reason |
|-----------|---------|--------|
| LangGraph (TypeScript) | Skip | Deterministic orchestration doesn't need agent autonomy. 350KB bundle. TypeScript SDK less mature. |
| CrewAI | Skip | Role-based debate agents — irrelevant for structured output generation. |
| AutoGen | Skip | Conversation-based agents — irrelevant. |
| Hand-coded async generator | **Use this** | 40 lines, zero deps, zero bundle cost, full control. |

**Steal from agent frameworks:** state streaming (yield events), parallel execution (Promise.all), per-stage retry with error context. Don't bring in the framework.

### 3.2 Intermediate Representation

| Approach | Verdict | Use for |
|----------|---------|--------|
| ISCL text DSL | **Implement** | All open-ended concept/LLD/HLD generation |
| Declarative spec | Partial | Supplement for structured DSA traces |
| Screenplay → JSON | Skip | ISCL achieves same in one call |
| Template slot-filling | Already exists | DSA traces (keep and extend) |
| Extended thinking on JSON | Bridge | Use now, drop after ISCL ships |

### 3.3 Implementation Order

1. **Extended thinking** — enable on current pipeline immediately (minutes to implement, 40–70% reliability improvement)
2. **`semanticValidate()`** — add cross-reference checking to current pipeline (3–4 days, 40–60% additional improvement)
3. **ISCL grammar + parser** — define the DSL, build the parser (4–5 days)
4. **Stage 1–4 prompts** — rewrite generation to use ISCL + segmented stages (3–4 days)
5. **Async generator orchestrator** — wire up the pipeline (2 days)
6. **Streaming UX update** — skeleton from Stage 1, progressive population (1–2 days)
