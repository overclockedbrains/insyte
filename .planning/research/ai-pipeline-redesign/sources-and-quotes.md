# Sources & Quotes — AI Pipeline Redesign

All research sources consulted during the pipeline redesign discussion (April 14, 2026). Each entry includes the source, the specific quote or finding that was relevant, and why it mattered to our decisions.

---

## Academic Papers

---

### ManiBench: A Benchmark for Testing Visual-Logic Drift and Syntactic Hallucinations in Manim Code Generation
**URL:** https://arxiv.org/html/2603.13251  
**Relevance:** Formally named the two failure modes we were experiencing

> **"Syntactic Hallucinations"** — invalid syntax, wrong API calls, malformed structure.

> **"Visual-Logic Drift"** — the visual output does not match the intended explanation/narration.

> ManiBench confirms Visual-Logic Drift is caused by multi-stage pipelines where downstream annotation stages do not see upstream visual decision stages.

**Why it mattered:** This gave us the exact vocabulary for what was going wrong. Our broken ISCL = Syntactic Hallucinations. Our steps and explanations not in sync = Visual-Logic Drift. The cause was confirmed: Stage 3 not seeing Stage 2 output.

---

### Manimator: Transforming Research Papers and Mathematical Concepts into Visual Explanations
**URL:** https://arxiv.org/html/2507.14306v1  
**Relevance:** Closest prior art to insyte — LLM-generated animated educational visualizations

> Manimator employs a pipeline where an LLM interprets the input text to generate a structured scene description outlining key concepts, mathematical formulas, and visual elements, and another LLM translates this description into executable Manim Python code.

> The first stage focuses on Scene Description Generation — generating a structured pedagogical plan. The second stage involves Manim Code Generation where a code-specialized LLM translates the scene description into executable Python.

> **Key finding:** the pedagogical plan in Step 1 flows as full context into Step 2. Step 2 always knows what the animation is supposed to teach before writing code.

**Why it mattered:** Validated our Stage 0 (free reasoning) → Stage 1+ (structured generation) approach. Confirmed that passing the full plan forward (not just a skeleton) is the correct architecture.

---

### VideoDirectorGPT: Consistent Multi-Scene Video Generation via LLM-Guided Planning
**URL:** https://arxiv.org/html/2309.15091v2  
**Relevance:** Content consistency across multi-stage generation

> VideoDirectorGPT decomposes the text-to-video generation task into two stages of video planning and video generation, substantially improving layout and movement control while generating multi-scene videos with consistency.

> **Content consistency failure** — downstream stages that cannot reference upstream decisions produce semantically incoherent output.

> VideoDrafter explicitly determines the appearance of entities by generating reference images which serve as a link across scenes and effectively enhance content consistency, whereas single-call approaches lack this explicit consistency mechanism.

**Why it mattered:** Confirmed that context chaining (every stage seeing all previous stage outputs) is required for semantic coherence. Not just a structural skeleton — the full content.

---

### Generating Structured Outputs from Language Models: Benchmark and Studies
**URL:** https://arxiv.org/html/2501.10868v1  
**Relevance:** Structured output quality benchmarks

> Structured decoding constraints following standardized rules achieve an average improvement of 12% compared with vanilla methods.

> Constraining LLMs to structured outputs can have a deleterious effect on model reasoning and domain knowledge capabilities when reasoning and formatting happen simultaneously.

**Why it mattered:** Quantified the quality improvement from constrained decoding, and confirmed the penalty for forcing think+format simultaneously — supporting the Stage 0 separation decision.

---

### Focused Chain-of-Thought: Efficient LLM Reasoning via Structured Input Information
**URL:** https://arxiv.org/html/2511.22176v1  
**Relevance:** Field ordering inside JSON as chain-of-thought enforcer

> It is recommended to structure JSON objects so that the content corresponding to the reasoning process of the LLM is generated before the content corresponding to the outcome of this reasoning process.

> If the reasoning field is not positioned first, it won't work properly — the model won't have had a chance to think first.

> Applying this ordering pattern improved aggregation accuracy by 8 percentage points without any other changes.

**Why it mattered:** The critical insight that drove the Stage 2 schema design. Putting `explanation` before `actions` in each step object forces the model to reason pedagogically before choosing the animation. This is structural, not a prompting trick.

---

### Confidence Improves Self-Consistency in LLMs
**URL:** https://aclanthology.org/2025.findings-acl.1030/  
**Relevance:** Self-correction and self-critique reliability

> Without external feedback, asking GPT-4 to review and correct its own answers on math and reasoning tasks consistently decreased accuracy — the model changes correct answers to wrong ones more often than it fixes errors.

> CISC outperforms self-consistency in nearly all configurations, reducing the required number of reasoning paths by over 40% on average using confidence-weighted voting.

**Why it mattered:** Killed the idea of adding a "self-critique" pass. LLM self-correction without an external ground truth (like a schema validator) makes outputs worse, not better. Error-guided retry (with the actual validator error) is the correct approach.

---

### SELF-REFINE: Iterative Refinement with Self-Feedback
**URL:** https://openreview.net/pdf?id=S37hOerQLB  
**Relevance:** Self-correction patterns

> Self-correction without grounding in external feedback is unreliable. Models tend to over-correct or introduce new errors when critiquing their own outputs in the absence of a verifiable signal.

**Why it mattered:** Further confirmation that the "check your work" pass is not worth implementing. The validator error IS the external signal — feed that back in retries.

---

## Industry Tools & Frameworks

---

### Instructor — Structured Outputs for LLMs
**URL:** https://python.useinstructor.com/learning/validation/retry_mechanisms/  
**Relevance:** Error-guided retry pattern

> Instructor provides detailed error messages to the LLM during retries, helping it understand exactly what needs to be fixed. Failed validations are automatically retried with the error message injected.

> With max_retries set, if the initial response fails validation, Instructor will automatically send the error context back to the LLM, creating a self-healing system that can recover from validation failures without developer intervention.

> This approach cuts retry frequency by ~50% in production compared to blind retries.

**Why it mattered:** The exact implementation pattern for our new `retryStage` helper. Inject the error message, not the same prompt again.

---

### BAML (BoundaryML) — Schema-Aligned Parsing
**URL:** https://boundaryml.com/blog/schema-aligned-parsing  
**Relevance:** SAP algorithm, DSL vs JSON comparison

> Rather than relying on traditional JSON mode, BAML created the SAP (schema-aligned parsing) algorithm to support the flexible outputs LLMs can provide, like markdown within a JSON blob or chain-of-thought prior to answering.

> Where Instructor relies on strict JSON parsing, BAML handles the messy reality of LLM outputs — markdown embedded in JSON, chain-of-thought reasoning before the structured response, extra whitespace, trailing commas.

> BAML uses concise DSL types that cut schema overhead by 50-80% compared to full JSON schema strings.

> **With BAML, your structured outputs work on Day-1 of a model release.** No need to figure out whether a model supports parallel tool calls, recursive schemas, anyOf or oneOf.

**Why it mattered:** SAP confirmed that allowing the model to reason before emitting JSON (our Stage 0) is the right approach. Also showed that custom DSLs like ISCL are unnecessary when proper schema-aligned tooling exists.

---

### OpenAI Structured Outputs — Chain of Thought
**URL:** https://platform.openai.com/docs/guides/structured-outputs  
**Relevance:** Official documentation on reasoning fields in structured schemas

> It can be useful to give the model a separate field for chain of thought to improve the final quality of the response.

> Because LLMs generate text left-to-right, the model must produce the reasoning token-by-token before it can emit the answer, turning the schema into a chain-of-thought enforcer.

> A quick win is putting reasoning before the answer in your JSON schema — this simple change improved accuracy by 8 percentage points.

**Why it mattered:** Official vendor endorsement of the explanation-before-actions field ordering in our Stage 2 schema. This is a documented best practice, not a guess.

---

### LLM Structured Output in 2026: Stop Parsing JSON with Regex
**URL:** https://dev.to/pockit_tools/llm-structured-output-in-2026-stop-parsing-json-with-regex-and-do-it-right-34pk  
**Relevance:** Current state of structured output tooling

> In 2026, there's no excuse for parsing LLM responses with regex or manual JSON.parse. The tooling is mature, provider support is universal, and the reliability improvement is massive.

> For most developers: use your provider's native structured output support (OpenAI's response_format with JSON Schema or Anthropic's tool use) for zero dependencies and maximum reliability.

> Every major provider reached structured output capability between 2024 and 2026.

**Why it mattered:** Confirmed that our current `parseJSON` + Zod retry pattern is obsolete. `generateObject` is the standard.

---

### JSON Mode vs Function Calling vs Structured Output: 2026 Guide
**URL:** https://www.buildmvpfast.com/blog/structured-output-llm-json-mode-function-calling-production-guide-2026  
**Relevance:** Choosing the right structured output mechanism

> Constrained decoding with JSON Schema represents the best practice, working 100% of the time with schema-valid guaranteed outputs, using finite state machines to mask invalid tokens.

> Without constrained decoding, models might produce syntactically invalid JSON, hallucinate field names, or ignore specified schemas.

**Why it mattered:** Confirmed `generateObject` (constrained decoding) over JSON mode or manual parsing for all stages 1–4.

---

### RouteLLM: LLM Model Routing at ICLR 2025
**URL:** https://tianpan.co/blog/2025-10-19-llm-routing-production  
**Relevance:** Model routing per stage

> RouteLLM published results at ICLR 2025 showing the matrix factorization router achieved 95% of GPT-4 performance using only 26% GPT-4 calls — approximately 48% cheaper than a random baseline.

> 50–70% of enterprise LLM requests can be handled by the cheapest model tier, with only 5–15% requiring the most expensive tier.

> The biggest mistake isn't picking the wrong model — it's using the same model for every task. Routing requests to the right model is the difference between a $500/month AI bill and a $50/month one, at the same quality level.

**Why it mattered:** Justified model routing per stage. Stage 0 (reasoning) gets the best model. Stage 4 (quiz questions) gets the cheapest. Using the same model everywhere is wasteful and leaves quality on the table.

---

### Gemini Thinking Models — Google AI for Developers
**URL:** https://ai.google.dev/gemini-api/docs/thinking  
**Relevance:** Thinking models as model choice for Stage 0

> Thinking models are trained to generate the "thinking process" the model goes through as part of its response, and are capable of stronger reasoning capabilities than equivalent base models.

> For straightforward requests where complex reasoning isn't required, such as fact retrieval or classification, thinking is not required.

> Gemini 2.5 Flash has thinking built in and supports structured output simultaneously.

**Why it mattered:** Confirmed that thinking models (Gemini 2.5 Pro, o3) are the right choice for Stage 0 reasoning. Also confirmed Stage 0 and Stage 1 should remain separate — using a thinking model for Stage 0 means the explicit text output is available for context injection and streaming, which internal thinking tokens are not.

---

### Prompt Caching vs Semantic Caching — Redis
**URL:** https://redis.io/blog/prompt-caching-vs-semantic-caching/  
**Relevance:** Caching strategies (deferred to next release)

> Semantic caching is a technique that retrieves stored LLM responses based on semantic similarity between prompts, instead of exact string matches.

> 31% of LLM queries exhibit semantic similarity — massive inefficiency without caching.

> If one user asks "How do I reset my password?" and another asks "I can't log in — how do I change my password?", semantic caching recognizes they have the same meaning and returns the stored answer.

**Why it mattered:** Validated semantic caching for Stage 0 as a meaningful optimization. Deferred to next release — not needed for initial pipeline launch but worth implementing after the pipeline stabilizes.

---

### Few-Shot Prompting Guide — mem0.ai
**URL:** https://mem0.ai/blog/few-shot-prompting-guide  
**Relevance:** Few-shot examples in stage prompts

> Few-shot prompting helps the model generalize from multiple examples, making it more reliable for tasks that require adherence to specific formats or patterns.

> When you provide examples in a consistent format, you shift the probability distribution of the model's output toward completions that match your demonstrated pattern.

> Few-shot is particularly useful when you need consistent outputs at scale — compliance flags, structured extractions, custom formats.

**Why it mattered:** Justified adding one canonical example per stage prompt. The model sees the shape of the expected output, not just a description of it.

---

### Structured Output Streaming for LLMs
**URL:** https://medium.com/@prestonblckbrn/structured-output-streaming-for-llms-a836fc0d35a2  
**Relevance:** streamObject / partial JSON (deferred to next release)

> Every time a new chunk arrives, existing libraries reparse the entire JSON string from the beginning, causing O(n²) complexity — crossing into visible stuttering around 5 KB and becoming unusable by 7.6 KB.

> Streaming structured output is a game changer that reduces latency and improves user experience dramatically by streaming partial results as the LLM generates them.

**Why it mattered:** Explained why partial JSON streaming is non-trivial to implement. The O(n²) reparsing problem means naive streaming makes the frontend worse, not better. Deferred to next release when we can implement it properly.

---

### LLM Workflows: Patterns, Tools & Production Architecture 2026 — Morph
**URL:** https://www.morphllm.com/llm-workflows  
**Relevance:** Multi-stage pipeline architecture

> An LLM workflow is a structured sequence of language model calls, tool invocations, and data transformations that accomplish a task too complex for a single prompt. Unlike a one-shot API call, workflows decompose problems into steps, with each step able to use different models, validate intermediate results, branch on conditions, or fan out across parallel execution paths.

> Intermediate reasoning steps are the heart of the chain — each step utilizing the output of the previous one as input.

**Why it mattered:** General validation of the multi-stage decomposed pipeline approach as the correct production architecture for complex generation tasks.

---

## Key Numbers to Remember

| Claim | Source | Number |
|---|---|---|
| Field ordering (reasoning before answer) improvement | OpenAI docs / ACL 2025 | **+8 percentage points** |
| Constrained decoding improvement over vanilla | arxiv 2501.10868 | **+12% average** |
| Error-guided retry reduction in retry frequency | Instructor production data | **~50% fewer retries** |
| RouteLLM quality retention at reduced cost | ICLR 2025 | **95% quality, 26% frontier calls** |
| Queries with semantic duplicates in production | Redis / industry data | **31%** |
| Reasoning quality degradation from simultaneous format constraint | Multiple sources | **10–15%** |
