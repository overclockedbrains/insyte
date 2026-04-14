# Prompt Engineering Research — AI Pipeline Stages

**Date:** April 14, 2026

---

## Findings By Stage

### Stage 0 — Free Reasoning

**Model:** Gemini 2.5 Pro (thinking model)

#### Do NOT use a system prompt for Stage 0

Gemini 2.5 Pro and o3 are thinking models — they run an internal reasoning pass before producing output. These models have an architectural distinction from standard completion models that changes how system prompts behave:

- Google's Vertex AI documentation states that for thinking models, behavioral constraints and role definitions should be placed "at the very top of the prompt" to anchor the model's reasoning — not in a separate system instruction layer.
- Gemini 2.5 Pro cannot turn off thinking; it always reasons internally. The system instruction layer does not suppress or alter this internal chain; it only affects tone and persona for the final output.
- For Stage 0's purpose (free reasoning, plain text output, no schema), a system instruction would add latency (extra tokens processed before the user turn) without providing meaningful behavioral benefit.

**Recommendation:** Put everything in a single user turn for Stage 0. No system prompt. Use the Persona-Task-Context-Format (PTCF) framework directly in the user message body.

**Template structure for Stage 0:**
```
You are [role/persona]. [Task sentence]. [Context block]. [What to produce: free reasoning text].

Topic: {topic}
Mode: {mode}
```

The role definition at the top anchors the model's reasoning before it processes the task — this achieves what a system prompt would do, without the overhead of a separate message turn.

#### Do NOT use few-shot examples for Stage 0

This is a critical, counterintuitive finding that contradicts the few-shot-everywhere recommendation for other stages.

Multiple sources confirm that few-shot examples degrade performance on thinking models:

> "Few-shot examples and explicit Chain-of-Thought prompting can actually degrade performance with thinking models. Zero-shot prompts worked better than few-shot prompts for reasoning models."
> — Helicone, "How to Prompt Thinking Models like DeepSeek R1 and OpenAI o3"

> "For DeepSeek-R1, few-shot prompting often degrades performance because the model attempts to mimic the pattern of your examples rather than using its superior reasoning capabilities to solve the problem from scratch."
> — Helicone, 2025

> "Reasoning models often don't need few-shot examples to produce good results, so try to write prompts without examples first."
> — OpenAI, Reasoning Best Practices

The mechanism: thinking models reason from first principles. Providing examples shifts the model into pattern-matching mode, which short-circuits the very reasoning capability you are paying for. Stage 0 explicitly wants the model to think freely — examples constrain that.

**Recommendation:** No few-shot examples in Stage 0. Zero-shot only. State the planning questions explicitly and let the thinking model work.

#### Do NOT say "think step by step" for Stage 0

> "Since these models perform reasoning internally, prompting them to 'think step by step' or 'explain your reasoning' is unnecessary. In fact, some prompt engineering techniques, like instructing the model to 'think step by step,' may not enhance performance (and can sometimes hinder it)."
> — OpenAI, Reasoning Best Practices

The model is already doing this. The phrase adds tokens, not quality.

**Recommendation:** Ask what to produce, not how to think. Use the planning questions directly (What is this concept? What visuals represent it? What are the key teaching moments?).

#### Temperature for Stage 0

For Gemini 2.5 Pro as a thinking model, the relevant parameter is `thinkingBudget`, not temperature in the conventional sense:

- `thinkingBudget`: Set high for complex planning tasks (16,384–32,768 tokens). Stage 0 is exactly the kind of multi-step planning task that benefits from a high thinking budget.
- Temperature: Keep at 1.0 (Gemini's default for thinking models). For reasoning tasks, do not lower temperature below 0.7 — low temperature on a thinking model constrains the exploration of reasoning paths, which reduces answer quality on complex open-ended tasks. Temperature 0 is recommended for deterministic structured outputs (Stages 1–4), not for free reasoning.

**Recommendation:** Temperature 1.0, thinkingBudget 16384 for Stage 0. This is the opposite of Stages 1–4.

#### What the Stage 0 prompt needs to cover

Use numbered questions (research shows numbered lists outperform prose for instruction-following on multi-step tasks — covered in Cross-Stage Patterns). The questions should force the model to make decisions that downstream stages will execute:

1. What is this concept precisely?
2. What data structures or system components represent it visually?
3. What are the 3–4 key "aha" teaching moments a learner must experience?
4. What changes at each step — describe the data mutations?
5. How many steps? (Aim for 6–12.)
6. Which visual primitives? (enumerate the allowed list)

The full enumerated list of allowed visual types MUST appear in Stage 0 so the model's reasoning is constrained to valid primitives. This prevents Stage 1 from having to reject or ignore invalid visual type suggestions.

---

### Stage 1 — Scene Skeleton

**Model:** Gemini Flash (cheap, structured transcription)

#### System prompt: Yes, brief

Stage 1 uses `generateObject` with a Zod schema — it is a standard completion model task (not a thinking model), so system prompts work normally. A brief system prompt (1–2 sentences) establishes the role without adding noise.

**Recommended structure:**
- System prompt: role + constraint ("You are building an interactive CS visualization. Output only what the schema requires.")
- User turn: reasoning context + schema description + few-shot example + current topic

#### Few-shot: Yes, one example, placed before the topic

For structured output with `generateObject`, one canonical example dramatically improves schema adherence:

> "When you provide examples in a consistent format, you shift the probability distribution of the model's output toward completions that match your demonstrated pattern."
> — mem0.ai, Few-Shot Prompting Guide

> "Few-shot is particularly useful when you need consistent outputs at scale — compliance flags, structured extractions, custom formats."
> — mem0.ai, Few-Shot Prompting Guide

**Placement:** The few-shot example should appear AFTER the schema description and BEFORE the actual topic injection. The order is:
```
1. Role (system prompt or top of user turn)
2. Stage 0 reasoning context (injected as a block)
3. Schema description / field explanations
4. EXAMPLE block (FORMAT only, different topic)
5. Anti-copy guard instruction
6. Actual topic
```

This ordering matters: the example comes after the schema so the model reads the schema first and uses the example as confirmation of expected format, not as a definition. If the example precedes the schema, the model may infer schema from the example rather than reading the actual field definitions — which produces inconsistent results when the example doesn't cover all edge cases.

**Anti-copy guard (mandatory):** The few-shot topic MUST be different from the actual topic, and the prompt MUST include this exact instruction after the example block:
```
Do NOT copy any values from the example above. Generate fresh content for: {topic}
```

#### Temperature: 0.0–0.2 for Stage 1

Stage 1 is pure structured transcription — the model is converting Stage 0's already-decided reasoning into JSON fields. Creativity is actively harmful here:

> "For JSON extraction, set temperature to 0.0-0.1, as higher temperatures introduce the randomness that causes format drift."
> — Tetrate, LLM Temperature Settings: A Complete Guide

> "For any task involving structured output, start with temperature 0.0 and only increase if you have specific reasons to introduce variation."
> — Multiple sources

**Recommendation:** Temperature 0.1 for Stage 1. Not 0.0 — a tiny amount of variation prevents degenerate repetition across back-to-back similar topics, but keeps the output deterministically close to schema-valid.

#### Inject Stage 0 reasoning as a labeled block

Stage 0's reasoning must be injected into Stage 1's prompt as a clearly delimited block. Use markdown headers or XML-style delimiters:

```
Your planning reasoning from the previous step:
---
{stage0_reasoning}
---
```

This is not just context — it is the primary driver of Stage 1's output quality. The model is transcribing decisions already made in Stage 0. If Stage 0 reasoning is well-structured (which the numbered questions enforce), Stage 1 becomes trivially easy.

#### Visual ID naming constraints belong in Stage 1

Stage 2's biggest cross-reference hallucination risk is Stage 1 generating IDs that Stage 2 cannot reliably reproduce. The Stage 1 prompt should explicitly constrain ID format:

```
Visual IDs MUST be lowercase with hyphens only. Examples: arr, left-ptr, call-stack, hash-table.
Do NOT use camelCase, underscores, numbers as first character, or spaces.
```

This is the correct place for this rule because Stage 1 creates the IDs; Stage 2 only references them.

---

### Stage 2 — Steps + Explanations

**Model:** Gemini Pro or Claude Sonnet

#### System prompt: Yes, focused on pedagogical role

Stage 2 is the most cognitively complex stage — it requires both logical coherence (correct algorithm state transitions) and pedagogical coherence (explanations that match the animations). The system prompt should establish both roles:

```
You are an expert CS educator and interactive simulation author.
Your job: write step-by-step animations that teach a concept through visual change,
with explanations that justify every visual action.
```

Keep it under 3 sentences. The bulk of the instruction belongs in the user turn where context (Stage 0 + Stage 1) can anchor it.

#### Chain-of-thought: Explicit instruction PLUS schema ordering (both required)

The research is clear: schema field ordering alone is not sufficient. Both the structural signal and an explicit prompt instruction are needed for maximum effect.

**Schema ordering signal:** The `explanation` field MUST appear before the `actions` field in every step object. This forces left-to-right generation to produce the explanation tokens first, which then drive the action tokens. This is not a convention — it is mechanically enforced by constrained decoding.

> "It is recommended to structure JSON objects so that the content corresponding to the reasoning process of the LLM is generated before the content corresponding to the outcome of this reasoning process."
> — ACL 2025 / Focused Chain-of-Thought paper (arxiv 2511.22176)

> "If the reasoning field is not positioned first, it won't work properly — the model won't have had a chance to think first."
> — arxiv 2511.22176

**Explicit prompt instruction (also required):** Research on combined approaches shows that adding an explicit instruction on top of schema ordering improves accuracy further:

> "The research suggests that optimal accuracy requires both elements: explicit chain-of-thought reasoning fields combined with carefully designed schema ordering and field naming. Neither approach alone appears sufficient for maximum accuracy on complex tasks."
> — Multiple sources, 2025

Add this instruction explicitly in the Stage 2 prompt:
```
For each step, write the EXPLANATION FIRST — what should this step teach?
Then decide the ACTIONS — what should change on screen to show that teaching moment?
The explanation drives the animation. Not the other way around.
```

This verbalizes what the schema ordering enforces structurally, creating a redundant two-layer signal. One practitioner documented achieving "100% accurate answers nearly every time" by combining a `reasoning_steps` field at the start of the schema with an explicit instruction to reason before answering.

#### Anti-ID-hallucination: repeat the exact visual ID list as a constraint

Stage 2 `actions[].target` fields must exactly match visual IDs generated by Stage 1. This is the most hallucination-prone cross-reference in the pipeline.

Research on constrained enumeration for IDs confirms the core technique:

> "With a list of just 3 valid enum strings, GPT-4 sometimes output an entirely made-up value instead of using one of the three options."
> — Developer reports, 2025

> "Controlled vocabularies restrict models to a fixed set of terms, labels, or categories, which reduces hallucinations that come from models trying to be helpful in open-ended situations."
> — ML Mastery, 2025

Three-layer approach for Stage 2 ID cross-references:

**Layer 1 — Zod schema enum (strongest):** Define `target` as `z.enum([...visualIds])` in the Stage 2 schema. `generateObject` with constrained decoding will make it physically impossible to generate an invalid ID. This is the correct primary defense.

**Layer 2 — Explicit enumeration in the prompt:** Include the ID list as a labeled constraint near the top of the user turn (not buried in the middle where "lost in the middle" degrades attention):
```
Visual IDs available — use ONLY these exact strings as action targets:
- arr
- ptr
- status
```

Explicit enumeration is superior to prose description ("use the visual IDs from the skeleton") because models have a documented tendency to paraphrase or partially-match identifiers.

**Layer 3 — Inject the Stage 1 skeleton as a labeled block:** The model sees the full skeleton object, from which it can infer ID casing and spelling directly:
```
Scene skeleton from Stage 1:
---
{stage1_skeleton_json}
---
```

Placing the skeleton block near the START of the user turn (before the few-shot example) maximizes attention on it. The lost-in-the-middle effect means anything injected in the middle of a long prompt receives 30%+ less attention than content at the start or end.

#### Prompt length management for Stage 2

Stage 2 receives the longest prompt in the pipeline (topic + Stage 0 reasoning + Stage 1 skeleton + few-shot example + instructions). Context rot research provides specific guidance:

> "Context rot is the measurable degradation in LLM output quality that occurs as input context length increases. Even when a model's context window isn't close to full, adding more tokens degrades performance."
> — Chroma Research, 2025

> "The lost-in-the-middle effect causes models to attend well to the start and end of context but poorly to the middle, causing 30%+ accuracy drops."
> — Stanford / TACL 2024

**Structural recommendations to fight context rot in Stage 2:**

1. **Put the most critical content first and last.** Order: visual ID constraint list → Stage 1 skeleton → Stage 0 reasoning (condensed) → instructions → few-shot example → topic (final line). The topic goes last because it is short and the model attends well to final tokens. Critical constraints go first.

2. **Condense Stage 0 reasoning before injection.** Stage 0 can produce 500–1000 words of free text. For Stage 2, truncate or summarize to the key decisions only (visual choices, step count, key teaching moments). Do not inject the full raw Stage 0 output. Suggested max: 300 tokens for the Stage 0 excerpt.

3. **Use clear section delimiters.** XML-style tags or horizontal rules between sections reduce attention dilution:
   ```
   <visual-ids>arr, ptr, status</visual-ids>
   <skeleton>{ ... }</skeleton>
   <planning-context>{ ... condensed Stage 0 ... }</planning-context>
   <instructions>...</instructions>
   <example>...</example>
   ```
   Labeled sections help the model identify where each type of content starts and ends, reducing "distractor interference" where semantically similar content in different sections bleeds together.

4. **The Stage 2 prompt MUST stay under ~3000 tokens total.** Beyond this, the lost-in-the-middle effect measurably degrades adherence to the visual ID constraints that are the most critical Stage 2 requirement.

#### Few-shot for Stage 2: Yes, one example, same format as Stage 1

One well-chosen example showing the full structure of a `steps` object (initialStates + 2–3 example steps each with explanation-before-actions) is more valuable than any amount of written description. Use Binary Search as the canonical example topic across all stages (consistent example topic = less chance of confusion, well-known algorithm = model has strong priors).

**Temperature: 0.1–0.2 for Stage 2**

Slightly higher than Stage 1 because Stage 2 generates creative pedagogical text (explanation heading and body). Pure 0.0 produces repetitive, formulaic explanations. 0.2 allows enough variation in wording while keeping the structured fields deterministic.

---

### Stage 3 — Popups

**Model:** Gemini Flash

#### System prompt: Brief or none

Stage 3 is a very small, self-contained task. A brief system instruction works, but the prompt can also be self-contained in the user turn. Given the task is tiny, minimize overhead.

#### Few-shot: Yes, one small example

One popup example showing all fields (attachTo, showAtStep, hideAtStep, text, style) ensures the model understands the shape. Critical: the `attachTo` field in the example must match the example's visual IDs, not the actual topic's IDs. This reinforces that `attachTo` is always drawn from the provided visual ID list, not invented.

#### Anti-ID-hallucination: same technique as Stage 2, simpler

The `attachTo` field in Stage 3 is the same cross-reference problem as `target` in Stage 2 but smaller scale (typically 2–4 IDs). Same approach: Zod enum + explicit list in the prompt.

Critical: inject `{visualIds}` as a bullet-list constraint near the start of the prompt, not embedded in prose.

#### Stage 3 does NOT need Stage 0 or Stage 2 context

Stage 3 popups reference step indices (constrained by `showAtStep`/`hideAtStep` bounds in the schema) and visual IDs (constrained by enum). They do not need to know step content. The schema constraints are sufficient guards. Injecting Stage 2's full step output into Stage 3 would only add context rot risk without quality benefit.

#### Temperature: 0.3–0.5 for Stage 3

Popups contain the most human-readable creative text in the pipeline ("say WHY not just WHAT"). A slightly higher temperature than the structural stages allows more natural, varied popup text. The schema constraints prevent structural drift regardless of temperature.

---

### Stage 4 — Misc (Challenges + Controls)

**Model:** Cheapest available (Haiku / Gemini Flash Lite)

#### System prompt: None

Stage 4 is fully independent of all other stages — it only receives the topic string. No system prompt needed. The user turn is self-contained.

#### Few-shot: One example, but topic-differentiated

Challenges have a defined type progression (predict → break-it → optimize). One example showing all three types with the correct difficulty progression is more effective than describing the progression in prose.

#### Temperature: 0.5–0.7 for challenges, 0.1 for controls

Challenges are the most creative content in the pipeline — the "break-it" and "optimize" questions benefit from some variation to avoid formulaic outputs across topics. Controls (slider/toggle/button) are structural and should be generated deterministically.

The simplest implementation is a split: generate challenges at temperature 0.6, controls at temperature 0.1. If the schema combines them in one call, use 0.4 as a compromise.

#### No cross-reference risk in Stage 4

Stage 4 does not reference any IDs from other stages. No anti-hallucination constraints needed beyond the schema itself.

---

## Cross-Stage Patterns

### Pattern 1 — Schema Field Ordering as Chain-of-Thought (applies to Stage 2)

Every step object in Stage 2's schema MUST put `explanation` before `actions`. This is structural, not optional:

> "Because LLMs generate text left-to-right, the model must produce reasoning token-by-token before it can emit the answer, turning the schema into a chain-of-thought enforcer."
> — OpenAI Structured Outputs documentation

> "Applying this ordering pattern improved aggregation accuracy by 8 percentage points without any other changes."
> — arxiv 2511.22176 (Focused Chain-of-Thought)

Also verify that Vercel AI SDK's `generateObject` preserves Zod object key order when serializing to JSON Schema for the provider. If it doesn't, explicitly annotate the schema or use an ordered JSON Schema object. The field ordering only works if the JSON Schema sent to the provider reflects it.

### Pattern 2 — Instruction Formatting: Numbered Lists Win for Multi-Step Instructions

Research on formatting in prompts shows a consistent preference for numbered lists over prose for instruction-following:

> "Presenting options via bullet points generally yields better results, although there are some exceptions. Through a comprehensive experimental study spanning nine domain-specific tasks, bullet points generally yield better results than plain descriptions."
> — 2025 research, "Effect of Selection Format on LLM Performance" (arxiv 2503.06926)

> "Provide instructions as sequential steps using numbered lists or bullet points when the order or completeness of steps matters."
> — Multiple sources

Rules and constraints: numbered list.
Schema field descriptions: numbered or bulleted list.
Context/reasoning blocks: prose is fine.
Stage 0 planning questions: numbered list (these ARE instructions, not prose).

Do NOT use numbered lists for content fields (explanation headings, body text, popup text) — the model will start numbering its free-text responses if the surrounding prompt is heavily numbered.

### Pattern 3 — Anti-Copy Guard on Every Few-Shot Example

Every stage that uses a few-shot example (Stages 1, 2, 3, 4) MUST include this exact guard instruction immediately after the example block:

```
---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
```

The canonical few-shot topic is Binary Search across all stages. Using the same topic across stages is fine — it creates a coherent "reference visualization" that all stages can draw on without confusion.

### Pattern 4 — Critical Content at Start and End of Long Prompts

The lost-in-the-middle effect degrades attention by 30%+ on content placed in the middle of long context windows. For Stage 2 (the longest prompt):

- Start: visual ID constraints, skeleton
- Middle: reasoning context, instructions
- End: few-shot example + anti-copy guard + "Topic: {topic}"

The topic goes last because it is the most important sentence in the user turn — the model attends strongly to final tokens before generating its output.

### Pattern 5 — Error-Guided Retry (applies to Stages 1–4)

The current `retryStage` function sends the identical prompt on every retry. The model has zero information about what went wrong.

Industry standard (Instructor, 2025):

> "Instructor provides detailed error messages to the LLM during retries, helping it understand exactly what needs to be fixed. This approach cuts retry frequency by ~50% in production compared to blind retries."
> — Instructor, python.useinstructor.com/learning/validation/retry_mechanisms/

Every prompt builder for Stages 1–4 should accept an optional `lastError?: string` parameter. When present, append to the prompt:

```
---
Your previous attempt was rejected with this validation error:
"${lastError}"
Fix exactly that issue. Do not change anything else.
```

This is distinct from self-critique (asking the model to review its own output without external feedback), which multiple papers confirm makes outputs WORSE. The validator error IS the external signal. Feed it back in.

### Pattern 6 — Thinking Models: No Few-Shot, No CoT Instructions, No System Prompt

Stage 0 uses Gemini 2.5 Pro (thinking model). The rules for thinking models are the opposite of the rules for completion models:

| Standard completion model (Stages 1–4) | Thinking model (Stage 0) |
|---|---|
| Few-shot examples improve accuracy | Few-shot examples degrade accuracy |
| "Think step by step" helps | "Think step by step" is redundant/harmful |
| System prompt establishes useful context | Single user turn is sufficient |
| Low temperature (0.0–0.2) for structured tasks | Temperature 1.0 for free reasoning |
| Chain-of-thought must be prompted | Chain-of-thought is built-in |

Source: Helicone "How to Prompt Thinking Models" + OpenAI Reasoning Best Practices

### Pattern 7 — Delimiter Consistency Across All Stages

Use consistent delimiter patterns across all stage prompts. This helps when debugging and when injecting one stage's output into the next:

```
---             → section separator within a stage prompt
<block-name>    → labeled content block (context injection)
</block-name>
```

Avoid mixing markdown headers (`##`), XML tags, and horizontal rules randomly. Pick one convention and use it everywhere. XML-style tags are recommended for content blocks because they are unambiguous and Gemini responds well to structured markdown/XML formatting.

---

## Sources & Quotes

### Thinking Models — System Prompt vs User Prompt

**URL:** https://www.helicone.ai/blog/prompt-thinking-models  
**Title:** "How to Prompt Thinking Models like DeepSeek R1 and OpenAI o3"

> "Few-shot examples and explicit Chain-of-Thought prompting can actually degrade performance with thinking models. Zero-shot prompts worked better than few-shot prompts for reasoning models."

> "For DeepSeek-R1, few-shot prompting often degrades performance because the model attempts to mimic the pattern of your examples rather than using its superior reasoning capabilities to solve the problem from scratch."

> "Thinking models work best when given concise, direct, and structured prompts, as too much information can actually reduce accuracy."

---

**URL:** https://developers.openai.com/api/docs/guides/reasoning-best-practices  
**Title:** "Reasoning best practices — OpenAI API"

> "Reasoning models often don't need few-shot examples to produce good results, so try to write prompts without examples first."

> "Some prompt engineering techniques, like instructing the model to 'think step by step,' may not enhance performance and can sometimes hinder it."

> "Be specific about goals and constraints. If there are ways you explicitly want to constrain the model's response, explicitly outline those constraints."

---

**URL:** https://ai.google.dev/gemini-api/docs/thinking  
**Title:** "Gemini thinking — Google AI for Developers"

> "Gemini 2.5 and 3 series models automatically generate internal 'thinking' text to improve reasoning performance, so it's generally not necessary to have the model outline, plan, or detail reasoning steps in the returned response itself."

> "Thinking can't be turned off for Gemini 2.5 Pro."

---

**URL:** https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking  
**Title:** "Thinking — Generative AI on Vertex AI"

> "Place behavioral constraints and role definitions in the System Instruction or at the very top of the prompt to ensure they anchor the model's reasoning process."

> "When working with large contexts, place your specific instructions at the end of the prompt (after the data context)."

---

### Temperature Settings

**URL:** https://tetrate.io/learn/ai/llm-temperature-guide  
**Title:** "LLM Temperature Settings: A Complete Guide for Developers"

> "For applications that extract structured information from text or generate JSON, SQL, or other formatted output, use very low temperatures (0.0-0.2). More specifically, for JSON extraction, set temperature to 0.0-0.1."

> "For any task involving structured output, start with temperature 0.0 and only increase if you have specific reasons to introduce variation."

---

**URL:** https://medium.com/google-cloud/best-practices-for-prompt-engineering-with-gemini-2-5-pro-755cb473de70  
**Title:** "Best Practices For Prompt Engineering With Gemini 2.5 Pro"

> "Set temperature ≤ 0.3 to improve deterministic reasoning. Use this approach for multi-step tasks, financial computations, and legal analysis."

> "You should start with the temperature set to 0 or less than one, and increase the temperature as you regenerate prompts for more creative output."

---

### Chain-of-Thought in Structured Output

**URL:** https://arxiv.org/html/2511.22176v1  
**Title:** "Focused Chain-of-Thought: Efficient LLM Reasoning via Structured Input Information"

> "It is recommended to structure JSON objects so that the content corresponding to the reasoning process of the LLM is generated before the content corresponding to the outcome of this reasoning process."

> "If the reasoning field is not positioned first, it won't work properly — the model won't have had a chance to think first."

> "Applying this ordering pattern improved aggregation accuracy by 8 percentage points without any other changes."

---

**URL:** https://platform.openai.com/docs/guides/structured-outputs  
**Title:** "Structured model outputs — OpenAI API"

> "It can be useful to give the model a separate field for chain of thought to improve the final quality of the response."

> "Because LLMs generate text left-to-right, the model must produce the reasoning token-by-token before it can emit the answer, turning the schema into a chain-of-thought enforcer."

---

**URL:** https://www.dsdev.in/order-of-fields-in-structured-output-can-hurt-llms-output  
**Title:** "Order of fields in Structured output can hurt LLMs output"

> "For chain-of-thought reasoning to work effectively, the LLM needs to provide reasoning first before the answer, which means defining reasoning fields before answer fields in your structured output schema."

> "Adding a reasoning field increased model accuracy by 60% on the GSM8k dataset."

---

**Search result synthesis on combined approach (schema ordering + explicit instruction):**

> "The research suggests that optimal accuracy requires both elements: explicit chain-of-thought reasoning fields combined with carefully designed schema ordering and field naming. Neither approach alone appears sufficient for maximum accuracy on complex tasks."

---

### Few-Shot Placement

**URL:** https://mem0.ai/blog/few-shot-prompting-guide  
**Title:** "Few-Shot Prompting: Everything You Need to Know in 2026"

> "When you provide examples in a consistent format, you shift the probability distribution of the model's output toward completions that match your demonstrated pattern."

> "Few-shot is particularly useful when you need consistent outputs at scale — compliance flags, structured extractions, custom formats."

---

**URL:** https://community.openai.com/t/few-shot-prompting-with-structured-outputs/1045058  
**Title:** "Few-Shot Prompting with Structured Outputs — OpenAI Developer Community"

> "If there are any descriptions, schemas, or examples for few-shot learning in the prompt, they must present the same property ordering as is specified in the responseSchema."

---

**URL:** https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices  
**Title:** "Prompting best practices — Claude API Docs"

> "Wrap examples in `<example>` tags (multiple examples in `<examples>` tags) so Claude can distinguish them from instructions."

> "Include 3–5 examples for best results."

---

### Prompt Length and Context Rot

**URL:** https://research.trychroma.com/context-rot  
**Title:** "Context Rot: How Increasing Input Tokens Impacts LLM Performance — Chroma Research, 2025"

> "Context rot is the measurable degradation in LLM output quality that occurs as input context length increases. Even when a model's context window isn't close to full, adding more tokens degrades performance."

> "Every one of 18 frontier models tested exhibits this behavior at every input length increment tested."

---

**URL:** https://www.morphllm.com/context-rot  
**Title:** "Context Rot: Why LLMs Degrade as Context Grows — Morph"

> "The lost-in-the-middle effect: models attend well to the start and end of context but poorly to the middle, causing 30%+ accuracy drops."

> "Three compounding mechanisms: lost-in-the-middle effect, attention dilution (quadratic), and distractor interference."

---

**URL:** https://arxiv.org/html/2510.05381v1  
**Title:** "Context Length Alone Hurts LLM Performance Despite Perfect Retrieval"

> "Research from Stanford demonstrates that LLM performance drops 15–47% as context length increases."

---

### Anti-Hallucination for Cross-References

**URL:** https://gist.github.com/thomasdavis/c236d6a9b48a0d8c8e851e3d9f4310b8  
**Title:** "LLMs and UUIDs — GitHub Gist"

> "With a list of just 3 valid enum strings, GPT-4 sometimes output an entirely made-up value instead of using one of the three options."

> "In structured JSON outputs, the model sometimes invents new IDs or duplicates existing ones instead of sticking to the provided list."

---

**URL:** https://machinelearningmastery.com/5-practical-techniques-to-detect-and-mitigate-llm-hallucinations-beyond-prompt-engineering/  
**Title:** "5 Practical Techniques to Detect and Mitigate LLM Hallucinations — ML Mastery"

> "Controlled vocabularies restrict models to a fixed set of terms, labels, or categories, which reduces hallucinations that come from models trying to be helpful in open-ended situations by narrowing the range of possible outputs."

---

**URL:** https://www.aidancooper.co.uk/constrained-decoding/  
**Title:** "A Guide to Structured Outputs Using Constrained Decoding"

> "The most common method pairs an LLM with a finite state machine (FSM) that checks generated tokens against the desired output format and zeros out the probability of invalid tokens by setting logits to −∞."

This is what `generateObject` does internally. The Zod enum constraint on `target` makes invalid IDs physically impossible to generate.

---

### Error-Guided Retry

**URL:** https://python.useinstructor.com/learning/validation/retry_mechanisms/  
**Title:** "Retry Mechanisms — Instructor"

> "Instructor provides detailed error messages to the LLM during retries, helping it understand exactly what needs to be fixed."

> "With max_retries set, if the initial response fails validation, Instructor will automatically send the error context back to the LLM, creating a self-healing system that can recover from validation failures without developer intervention."

> "This approach cuts retry frequency by ~50% in production compared to blind retries."

---

### Instruction Formatting

**URL:** https://arxiv.org/html/2503.06926v2  
**Title:** "Effect of Selection Format on LLM Performance"

> "Presenting options via bullet points generally yields better results, although there are some exceptions. Through a comprehensive experimental study spanning nine domain-specific tasks, bullet points generally yield better results than plain descriptions."

---

**URL:** https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices  
**Title:** "Prompting best practices — Claude API Docs"

> "Provide instructions as sequential steps using numbered lists or bullet points when the order or completeness of steps matters."

> "For long-form content like reports and technical explanations, write in clear, flowing prose."

---

## Summary Table — Per-Stage Recommendations

| Stage | System Prompt | Few-Shot | Temperature | Key Pattern |
|---|---|---|---|---|
| Stage 0 (Reasoning) | None — single user turn | None — zero-shot only | 1.0, high thinkingBudget | Thinking model rules apply; no CoT prompt, no examples |
| Stage 1 (Skeleton) | Yes, 1–2 sentences | Yes, 1 example (Binary Search), after schema, before topic | 0.1 | Anti-copy guard; ID naming constraints; Stage 0 context block at start |
| Stage 2 (Steps) | Yes, pedagogical role | Yes, 1 example (Binary Search), after instructions, before topic | 0.2 | Explanation before actions (both schema ordering AND explicit instruction); visual IDs as enum + bullet list at start; context rot mitigation |
| Stage 3 (Popups) | Brief or none | Yes, 1 small example | 0.3–0.5 | attachTo as enum; no Stage 2 context needed; keep short |
| Stage 4 (Misc) | None | Yes, 1 example | 0.4–0.6 (challenges), 0.1 (controls) | Topic-only input; most creative stage; no cross-references |
