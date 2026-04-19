# AI Pipeline Audit — 2026-04-19

## Executive Summary

The 6-stage pipeline has solid architectural bones: stage separation, error-guided retries, semantic validation, graceful degradation, and context-rot mitigation are all genuinely well-done. The main quality problem is **not the architecture** — it's **prompt-level gaps** that cause the model to produce technically-valid but educationally-weak output.

The pipeline can produce something (good), but the output often feels generic because:
1. Stage 3 (popups) has no idea what each step actually animates
2. Stage 4 (challenges) has no idea what the visualization shows
3. Stage 2 has structural prompt ordering issues that bury critical constraints
4. Stage 0 is throttled by a 400-word cap that conflicts with its 16384-token thinking budget

---

## What's Working Well (Keep These)

### Architecture
- **6-stage pipeline with clear responsibilities** — each stage has a single job
- **Stage 0 "free reasoning" before JSON generation** — planning before execution is the right pattern
- **Error-guided retries** — injecting the exact validation error back into the prompt is textbook prompt recovery
- **Dynamic schema constraint** — constraining `target` enum to Stage 1's actual visual IDs (anti-hallucination)
- **Semantic validation layer** — `validateSteps` catches cross-field invariants Zod can't express
- **Promise.allSettled for stages 3+4** — graceful degradation, scene still valid without popups/challenges
- **Context-rot mitigation** — Stage 3 intentionally omits Stage 2's full output (correct)
- **Full-state snapshots** — renderer needs complete state per action, this is enforced correctly
- **Temperature tuning per stage** — 0.1 for skeleton, 0.2 for steps, 0.5 for challenges is appropriate

### Prompts
- **XML tag sectioning in Stage 2** — `<visual-ids>`, `<visual-params-guide>`, `<skeleton>`, `<planning-context>`, `<instructions>` is clean and model-readable
- **"EXAMPLE — shows FORMAT only, do not copy"** warning — important guard against template copying
- **Validation checklist in Stage 2** — explicit list of rejection criteria is effective
- **Visual params guide** — per-type param shapes with notes is genuinely useful
- **Explanation-before-actions instruction** — "write the EXPLANATION FIRST — what should this step teach? Then decide the ACTIONS" enforces pedagogical thinking order

---

## Problems & Fixes (Prioritized)

---

### CRITICAL — Stage 3 Has No Step Context

**Problem:** Stage 3 generates popups with `showAtStep`/`hideAtStep` targeting specific step ranges, but it receives ZERO information about what those steps animate. It knows:
- Topic name
- Visual IDs (bare, no type or purpose)
- Total step count (just a number)

Result: popup text is generic topic knowledge disconnected from the actual animation. "Each comparison eliminates half the remaining elements — that's O(log n)" might show at step 2-4, but step 2-4 might be about pointer initialization, not comparisons.

**Fix:** Inject step explanation headings from Stage 2 into Stage 3's prompt:
```
<step-summaries>
Step 1: Initialize the sorted array
Step 2: Set left and right pointers
Step 3: Calculate the midpoint
...
</step-summaries>
```
This is ~80 chars × stepCount = 480-960 chars of context — negligible cost, massive quality improvement. Popups can then say "This is the moment where binary search does X" with X grounded in what actually happens at that step.

**Implementation:** `buildStage3Prompt` receives `stepsParsed: StepsParsed | undefined` and injects headings. In `pipeline.ts`, Stage 3 starts after Stage 2 completes, so `stepsParsed` is available.

---

### CRITICAL — Stage 4 Has No Visualization Context

**Problem:** Stage 4 challenges are meant to test understanding of the visualization the user just watched. But Stage 4 only receives the topic name. Result:
- "predict" challenges may ask about things already shown in the animation (redundant)
- "optimize" challenges may ask about tangential improvements unrelated to what was animated
- Questions feel like generic topic quizzes, not visualization-specific assessments

**Fix:** Inject step headings + visual IDs from Stage 1/2 into Stage 4:
```
<what-was-visualized>
Visuals: arr (array), left-ptr (counter), right-ptr (counter)
Steps shown:
1. Initialize the sorted array
2. Set left and right pointers
...
</what-was-visualized>
```
Now "predict" can ask "what happens at step 5?" and "break-it" can reference the actual data shown.

---

### HIGH — Stage 2 Prompt Section Ordering

**Problem:** Context Engineering research (Shi et al. 2023, Anthropic prompting guide) consistently shows that:
1. Critical constraints placed BEFORE examples outperform those placed after
2. LLMs suffer from "lost in the middle" — content in the middle of long prompts gets less attention

Current Stage 2 order:
1. `<visual-ids>` ✓
2. `<visual-params-guide>` ✓
3. `<skeleton>` ✓
4. `<planning-context>` (400-word reasoning block — MIDDLE POSITION = lost)
5. `<instructions>` 
6. Validation checklist ← should be BEFORE the example
7. Example JSON
8. Topic ← good (recency = last)

**Fix:** Reorder to:
1. `<visual-ids>`
2. `<visual-params-guide>`
3. `<skeleton>`
4. `<instructions>` + validation checklist (move UP — before planning context and example)
5. `<planning-context>` (context, not rules — can be middle)
6. Example JSON
7. Topic (last = recency bias — model generates starting here)

The validation checklist especially should be immediately before the example JSON so the model sees "don't do this" right before seeing the format template.

---

### HIGH — Stage 0 Word Cap Conflicts With Thinking Budget

**Problem:** Stage 0 uses `thinkingBudget: 16384` (paid extended thinking) and `maxOutputTokens: 8192` but the prompt says "Keep your response under 400 words." This is contradictory:
- 400 words ≈ 550 tokens of visible output
- The model uses 16384 tokens of internal thinking
- Then outputs ≤400 words of the result

The thinking budget is wasted if the output is aggressively compressed. The 400-word cap also means Stage 0 reasoning passed to Stages 1/2 is too sparse to be useful for complex topics.

**Fix:** Increase to 800 words for complex topics. Remove the hard cap and replace with "Be concise — aim for 400-600 words. Do not pad. Every sentence should drive a specific decision."

Also: "Do not explore alternatives or hedge — commit to your choices" is good, but should add "If you see multiple valid approaches, pick the one best suited to {mode} mode and state why."

---

### HIGH — Error Message Formatting in Retries

**Current:**
```
Your previous attempt was rejected with this validation error:
"initialStates missing entries for: "arr"; Step 3: action on "mid-ptr" has empty params {}"
Fix exactly that issue. Do not change anything else.
```

**Problems:**
1. Multiple errors are concatenated with `;` — hard to parse
2. "Fix exactly that issue" (singular) when there are multiple issues
3. "Do not change anything else" — too rigid, may prevent the model from fixing cascading issues

**Fix:**
```
Your previous attempt was rejected. Fix ALL of these issues:

1. initialStates is missing an entry for "arr" — add "arr": { <valid initial state> }
2. Step 3: action on "mid-ptr" has empty params {} — supply the complete params matching the visual-params-guide

Do not change anything that was already correct.
```

Implementation: format errors as numbered list in `appendErrorGuidance()`.

---

### HIGH — Step Count Validation Too Strict

**Problem:** `validateSteps` requires `steps.steps.length === skeleton.stepCount` exactly. This causes unnecessary retries when:
- The model generates 7 steps instead of 8 (close but not exact)
- One step gets dropped in a complex topic

**Fix:** Allow ±1 tolerance:
```typescript
// Check 4: Step count must be within ±1 of skeleton.stepCount
const diff = Math.abs(steps.steps.length - skeleton.stepCount)
if (diff > 1) {
  errors.push(`Step count mismatch: skeleton declared ${skeleton.stepCount} steps, got ${steps.steps.length}`)
}
```
If the model gives 7 instead of 8, the scene works fine. Strict enforcement causes retry cost with no quality benefit.

---

### MEDIUM — Stage 4 Needs a System Prompt

**Current:** No system prompt for Stage 4. The justification is "fully self-contained task."

**Problem:** Challenge quality/tone varies widely without role priming. The model doesn't know it's writing for an educational context.

**Fix:** Add a system prompt:
```
You are an expert CS educator writing assessment questions for learners who just watched an interactive visualization. Write questions that test understanding, not memorization. Prefer questions about WHY, not WHAT.
```

---

### MEDIUM — Stage 2 Example Is Too Narrow

**Problem:** The single "Binary Search" example (array + text-badge) biases the model toward these types. When generating for a hashmap or tree topic, the model cargo-cults IDs like "a0", "a1" and text like "Idle".

**Fix:** Add a second diverse example or use more abstract placeholder values:
```
// Instead of: {"id":"a0","value":1}
// Use:        {"id":"<YOUR_ID>","value":"<YOUR_VALUE>"}
```
Or add a second example showing `tree` or `hashmap` type structure.

---

### MEDIUM — Explanation Body Length Inconsistency

**Problem:** Stage 2 prompt says "body up to 300 chars" but `buildStepsSchema` has `z.string().max(400)`. The model is constrained by the prompt (300) but could go to 400. This mismatch means:
- Short explanations that don't fully explain the teaching moment
- Wasted schema capacity

**Fix:** Update prompt to say "body up to 400 chars" to match the schema. Actually 400 chars is tight — consider if this should be higher (600?) for complex concepts.

---

### LOW — Stage 1 and Stage 3 Don't Receive `mode`

**Problem:** Mode (concept/dsa/lld/hld) is passed to Stage 0 but not to Stages 1, 3, 4. Stage 1 determines `type` and `layout` — the mode should inform this choice explicitly.

**Fix:** Pass mode to Stage 1 prompt:
```
Mode: {mode}
```
And to Stage 3 so popup style can reflect the mode (dsa → complexity callouts, lld → design pattern callouts).

---

### LOW — Stage 2 No Pre-Generation Scratchpad

**Problem:** For non-thinking models (Flash), the model goes directly from reading the prompt to outputting JSON. Complex topics with 10+ steps often result in mid-generation mistakes (step numbering drift, wrong visual IDs).

**Fix:** Since Stage 2 uses `generateJson` (free text + post-hoc parse), we can add a scratchpad invitation:
```
Before writing the JSON, briefly state (in 2 sentences): what are your {stepCount} teaching moments in order?
Then output the JSON below.
```
The scratchpad text before `{` can be stripped when parsing. This "plan then execute" pattern dramatically reduces generation errors on complex multi-step outputs.

---

## Research-Backed Techniques Not Yet Applied

Based on Context Engineering and Prompt Engineering best practices:

### 1. Primacy + Recency Positioning
Put the most critical constraint (the exact JSON schema shape) FIRST and the topic LAST. Current prompts put the topic last (good) but bury critical rules in the middle.

### 2. Consistent XML Tag Usage (Anthropic-specific)
Current prompts use XML tags inconsistently — Stage 2 uses them well, Stage 1 and Stage 3 don't. Claude (Anthropic BYOK) responds significantly better to consistent XML tags. Wrap all Stage 1 and Stage 3 context in `<context>...</context>` and instructions in `<instructions>...</instructions>`.

### 3. Avoiding Negative Instructions
"Do NOT copy any values from the example above" — negative instructions are less effective than positive ones. Replace with: "Generate entirely new values for your topic. The example above is only showing structure."

### 4. Output Anchoring (Prefilling for Anthropic)
For Anthropic models, prefill the assistant turn with `{"` to force JSON output without markdown fences. The Anthropic SDK supports this via `messages: [{ role: 'assistant', content: '{"' }]`.

### 5. Schema Mirroring in Prompt
Before the example JSON, show the schema as a comment inside the example:
```json
// Required structure:
// initialStates: { <each visual ID>: { <params> } }
// steps: [ { index, explanation: { heading, body }, actions: [...] } ]
```
This gives the model a mental map before seeing the filled-in example.

---

## Implementation Priority

| Priority | Fix | Files | Impact |
|----------|-----|-------|--------|
| P0 | Stage 3: inject step headings | `builders.ts`, `stage3-popups.md`, `pipeline.ts` | High |
| P0 | Stage 4: inject visualization context | `builders.ts`, `stage4-misc.md`, `pipeline.ts` | High |
| P1 | Stage 2: reorder sections | `stage2-steps.md` | High |
| P1 | Error message formatting | `builders.ts` | Medium |
| P1 | Step count ±1 tolerance | `validators/steps.ts` | Medium |
| P2 | Stage 0: increase word cap | `stage0-reasoning.md` | Medium |
| P2 | Stage 4: add system prompt | `builders.ts`, `pipeline.ts` | Medium |
| P2 | Body length consistency | `stage2-steps.md` | Low |
| P3 | Stage 2: scratchpad invitation | `stage2-steps.md` | Medium |
| P3 | Mode propagation to S1/S3/S4 | `builders.ts`, prompt files | Low |
| P3 | Negative→positive instruction | All prompt files | Low |

---

## What NOT to Change

- **The 6-stage structure** — correct decomposition
- **Stage 2 using generateJson** — Gemini's constrained decoding can't handle deep nesting
- **Stage 3 NOT receiving Stage 2 actions** — correct, action data would be context rot; headings only is enough
- **Error-guided retry pattern** — fundamentally sound, just format the errors better
- **Temperature per stage** — appropriate settings for each stage's task
- **Full-state snapshot model** — renderer requires it, do not switch to delta model
- **Stage 0 no system prompt / no few-shot** — correct for thinking models
