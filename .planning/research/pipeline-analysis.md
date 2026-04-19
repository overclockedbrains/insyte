# Pipeline Analysis — "Design copilot agent architecture" Output

**Date:** 2026-04-18  
**Pipeline version:** Phase 32 (4-stage skeleton architecture)  
**Sample output topic:** "Design copilot agent architecture"

---

## TL;DR

The pipeline is architecturally sound and produces schema-valid, pedagogically coherent output. The core idea (free reasoning → skeleton → steps → popups + challenges in parallel) is correct. But there are **5 concrete problems** ranging from a silent correctness bug (all MCQ answers index 1) to a context-starvation design flaw (Stage 3 sees no Stage 2 content). These are fixable with targeted prompt edits and one small builder change.

---

## What the Output Got Right

### 1. Structural correctness
- All 8 visual IDs in the skeleton match exactly in `initialStates` and action targets — no hallucinated IDs
- Step count declared (7) = steps delivered (7) — Check 4 passing
- Step indices 1–7 monotonically increasing — Check 3 passing
- All action params are non-empty — Check 6 passing
- System-diagram uses full-state snapshots (all components + connections repeated every step) — correct

### 2. Pedagogical narrative
The ReAct loop (Reason → Act → Observe) is explained clearly across 7 steps. The queue correctly dequeues across steps 2 and 5. The scratchpad (hashmap) correctly accumulates entries across steps 3 and 6. The connection `active` flags shift coherently to show data flow direction. The component `status` changes (active/normal) correctly highlight which component is processing at each moment.

### 3. Schema compliance
All Zod validators pass. The output went through without retries (or we'd see the error guidance section in the prompt). This is good news — the schema enforcement layer is working.

---

## What Needs Improvement (Ranked by Impact)

---

### BUG 1 — Stage 4: All MCQ correct answers are index `1` (Silent bias)

**Severity: High**

All three challenges in Stage 4 output have `"answer": 1`:
```json
{ "answer": 1, "type": "predict" }
{ "answer": 1, "type": "break-it" }
{ "answer": 1, "type": "optimize" }
```

This is almost certainly model bias — LLMs systematically prefer placing correct answers at index 1 (second option) in MCQs. The current Stage 4 prompt has zero guidance on answer distribution. A learner who clicks index 1 for all three will get 100% — not because they understood, but because of a predictable bias.

**Root cause:** Stage 4 prompt (`stage4-misc.md`) has no instruction about varying the correct answer index across challenges.

**Fix:** Add one rule: *"Place the correct answer at a different index for each challenge — do not use the same index more than once across the 3 challenges."*

---

### BUG 2 — Stage 3: Popup on `final-answer` shows BEFORE the visual has content

**Severity: High**

Stage 3 output:
```json
{ "attachTo": "final-answer", "showAtStep": 6, "hideAtStep": 7, "style": "success" }
```

But in Stage 2 output, `final-answer` only gets populated at **step 7**:
```json
{ "target": "final-answer", "params": { "text": "The population of Paris...", "style": "success" } }
```

At step 6, `final-answer` still shows its initial state: `"No answer yet."`. The "success" popup appears on an empty-looking visual. This is a timing bug caused by Stage 3 having no visibility into when each visual gets meaningful content.

**Root cause:** Stage 3 deliberately receives no Stage 2 content (see comment in `builders.ts`: *"Stage 2 content adds context rot with no benefit"*). This was the right call for context window management, but it creates timing blindness.

**Fix:** Pass a **condensed step summary** to Stage 3 — just the step headings, not the full JSON. ~50 tokens total. Add one rule: *"Only attach a popup to a visual that has meaningful content at that step — if a visual shows placeholder text, the popup will appear on a blank visual."*

---

### FLAW 3 — Stage 2: External Services node never activates during tool calls

**Severity: Medium**

In steps 2 and 5 (when the agent invokes `get_capital` and `get_population`), the system-diagram correctly sets `tools` to `status: "active"` and the `agent → tools` connection to `active: true`. But `services` stays `status: "normal"` and `tools → services` stays `active: false` — even though the tool is described as making an "API Call" to External Services.

This is a missed teaching moment. The whole point of the `services` component is to show that tools reach out to external systems.

**Root cause:** The `VISUAL_PARAMS_REFERENCE` for `system-diagram` in `builders.ts` only says *"Set status='active' on a component and active=true on a connection to highlight the active call."* It doesn't tell the model WHICH components to activate under which pedagogical conditions.

**Fix:** Add a concrete note to the system-diagram reference: *"When a tool is being invoked and it calls an external service, set `services` to `status: 'active'` and the `tools → services` connection to `active: true` as well."*

---

### FLAW 4 — Stage 2: `tool-observation` reset to "No observation yet." is semantically wrong

**Severity: Medium**

At step 4 (re-reasoning after the first observation), the action resets `tool-observation` to:
```json
{ "text": "No observation yet.", "style": "default" }
```

But the observation "Paris" was already stored in the scratchpad at step 3. "No observation yet." is factually incorrect at this point in the flow — there HAS been an observation, it's just been committed to memory. This could confuse learners into thinking the observation was lost.

**Root cause:** Stage 2 doesn't have guidance on what text to use when "clearing" a text-badge that has been committed to another visual. The model defaults to the initial state text, which is wrong mid-flow.

**Fix:** Add to the text-badge notes in `VISUAL_PARAMS_REFERENCE`: *"When clearing a transient state that was committed to another visual (e.g., an observation stored in the hashmap), use a past-tense text like 'Stored in scratchpad.' rather than the initial placeholder."*

---

### FLAW 5 — Stage 0: Word count constraint is ignored AND counterproductive

**Severity: Low-Medium**

Stage 0 prompt says *"Keep your response under 400 words."* The actual reasoning output for "copilot agent architecture" is approximately 700 words across 6 structured sections. The model ignores this constraint entirely — which is actually fine, because the quality of the longer reasoning is higher.

More importantly, the 400-word constraint conflicts with the goal of Stage 0: to give Stage 1 and Stage 2 enough context to make good decisions. Truncated reasoning leads to a thinner skeleton and shallower steps.

Additionally, the Stage 0 output currently has **no consistent structure**. Sometimes the model writes it as headers (### 1., ### 2.) which is good. Sometimes it writes flowing prose. Stage 1 and Stage 2 receive this inside `<planning-context>` tags and have to parse it — but inconsistent structure means inconsistent extraction.

**Fix:** Remove the 400-word constraint. Instead, specify a structured format that the model should follow (e.g., numbered sections 1–6 matching the 6 questions). This makes the reasoning reliably parseable by downstream stages.

---

### FLAW 6 — Stage 2 prompt: body char limit inconsistency

**Severity: Low**

- Stage 2 prompt instructions say: *"Explanations: heading up to 80 chars, body up to 300 chars"*  
- But `schemas.ts` `buildStepsSchema` has: `body: z.string().max(400)`

The model is told 300 but the schema allows 400. If the model generates a 350-char body it's technically valid per schema but violates the prompt instruction. This inconsistency could cause a retry if someone tightens the schema later. The two should agree.

**Fix:** Either change the prompt to say 400, or tighten the schema to 300. Given that 300 chars is already sufficient for pedagogical body text, tighten the schema to `max(300)` to match the prompt.

---

## Architecture Assessment

### What's fundamentally right

The **4-stage skeleton architecture** is the right design:
- Stage 0 as a pure thinking stage (no schema, thinking model, high temp) is correct — you get much richer conceptual framing than if you jumped straight to skeleton generation
- Stage 1's skeleton-first approach means Stage 2 has constrained visual IDs, preventing hallucination
- Stage 3 + Stage 4 parallel is correct — they're genuinely independent
- The deterministic assembly at Stage 5 is the right separation of concerns

### What the research confirms

From the context-engineering research:
- **Context engineering > prompt engineering**: the biggest lever is what you pass between stages, not how you word individual prompts. The Stage 3 timing bug is a pure context engineering failure.
- **Semantic validation ≠ structural validation**: we have both (Zod + `validateSteps`), which is correct. But the MCQ answer-index bias is a *semantic* failure that no schema can catch — it requires prompt-level constraints.
- **Constrained decoding**: our use of `z.enum(visualIds)` for action targets is exactly this pattern — token-level prevention of hallucination. It's working.

### What the research suggests we should add

The biggest gap identified by research is **cross-stage semantic consistency**. Specifically:
- Stage 3 needs a minimal "what's on screen at each step" summary — not the full JSON, just headings. ~50 tokens. This solves BUG 2 completely.
- Stage 4's answer-index distribution should be an explicit constraint. The model doesn't self-regulate this.

---

## Proposed Changes Summary

| # | Stage | File | Change | Impact |
|---|-------|------|--------|--------|
| 1 | Stage 4 | `stage4-misc.md` | Add answer-index diversity rule | Fixes MCQ bias bug |
| 2 | Stage 3 | `stage3-popups.md` + `builders.ts` | Inject step headings; add timing rule | Fixes popup timing bug |
| 3 | Stage 2 | `builders.ts` `VISUAL_PARAMS_REFERENCE` | Add services activation note | Fixes missed teaching moment |
| 4 | Stage 2 | `builders.ts` `VISUAL_PARAMS_REFERENCE` | Add text-badge clearing guidance | Fixes "No observation yet." confusion |
| 5 | Stage 0 | `stage0-reasoning.md` | Remove 400-word cap; add structured format | Better downstream context |
| 6 | Stage 2 | `stage2-steps.md` + `schemas.ts` | Harmonize body limit (300 vs 400) | Consistency |

---

## What NOT to change

- **The 4-stage architecture** — it's correct
- **Stage 3 not seeing full Stage 2 JSON** — the comment in builders.ts is right; passing the full JSON would be context rot. Only the condensed step headings are needed.
- **The retry + error-guidance pattern** — `appendErrorGuidance` is effective; the model corrects specific issues rather than hallucinating fixes
- **The dynamic `z.enum(visualIds)` anti-hallucination layer** — working as designed
- **Full-state snapshot requirement for system-diagram** — the Stage 2 output correctly repeats all components/connections every step; this is the right approach for the renderer

---

## Output Quality Verdict

**Score: 7.5/10**

The output is usable and pedagogically correct in its core narrative. The architecture story (User → Agent → Tools → Services, with ReAct loop) is well-told. The data mutations are accurate. But the popup timing bug and MCQ bias are visible quality issues that a user would notice. The "No observation yet." reset and missing services activation are subtler but would make an attentive learner question the visualization.

With the 6 proposed changes, expected score: **9/10**. The remaining 1 point is inherent LLM variance — some topics will always produce better visualizations than others.
