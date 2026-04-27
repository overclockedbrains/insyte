# LLM Structured Generation Architecture: Research Synthesis

> **Status**: Research complete — reference for Phase 35 design decisions and future pipeline work
>
> **Scope**: Patterns used by similar apps that generate structured JSON via LLM for
> visualization/animation. Framed against insyte's 6-stage pipeline and Phase 35 open questions.
>
> **Date**: 2026-04-26

---

## Context

Insyte generates Scene JSON (topology + per-step state overlays) using a 6-stage async pipeline.
The core problem: the LLM must produce valid, compact, semantically consistent structured output
reliably across many visual types. This research surveys how similar systems handle this in 2025–2026.

---

## Pattern 1: Schema-Aligned Parsing (SAP)

**What it is**: Instead of hard-rejecting malformed LLM output (Zod throws), a SAP parser recovers
valid structured data from near-miss outputs — extracting the *intent* even if the model hallucinated
an extra field or used a slightly wrong key name.

**Reference**: BAML (BoundaryML) — [blog post](https://boundaryml.com/blog/schema-aligned-parsing)

**Key insight**: Validation should be a lenient *parser*, not a hard reject. Partial valid data is
better than a full retry.

**Relevance to insyte**:
- Current `validators/index.ts` uses Zod which hard-throws on any schema violation, forcing a full
  pipeline retry.
- SAP would let Stage 2 output a slightly non-conformant step and still recover a valid scene — much
  cheaper than retrying all 6 stages.
- Directly addresses OQ5: if format enforcement is decoupled from the prompt, `buildPromptGuide()`
  doesn't need to perfectly describe two coexisting step formats.

---

## Pattern 2: Topology-Split (Static Structure + Dynamic Overlays)

**What it is**: Decompose LLM output into two separate passes:
1. **Topology** (components, connections, layout) — generated once, never repeated
2. **State overlays** (per-step diffs) — generated cheaply as sparse patches

**References**:
- VISTA architecture ([source](https://www.emergentmind.com/topics/llm-visualization-integration))
  uses "granular single-purpose agents with explicit IO schemas" — topology agent + state agent
- Google InstructPipe ([blog](https://research.google/blog/instructpipe-generating-visual-blocks-pipelines-with-human-instructions-and-llms/))
  represents pipelines as a DAG JSON, generated in two passes: structure first, then node params

**Key insight**: The LLM never needs to repeat what it already said. Static topology is generated
once; per-step generation only describes *what changes*.

**Relevance to insyte**:
- This is exactly the Phase 35 Group A direction (`system-diagram`, `graph`, `array`, `tree`, `grid`).
- VISTA's carry-over semantics: "not listed = no change" (not reset to default). This is more
  LLM-friendly than OQ3's "reset to default" option because the model doesn't need to explicitly
  null out unchanged fields.
- For Stage 1 (skeleton) + Stage 2 (steps): Stage 1 produces topology, Stage 2 produces only
  `componentStates`/`itemHighlights` overlays. This matches the insyte pipeline cleanly.

---

## Pattern 3: Post-Generation Critic Agent

**What it is**: A separate lightweight LLM call after main generation that validates structural
consistency and optionally auto-corrects. Called "critic agent" or "review agent" in multi-agent
literature.

**References**:
- MAR (Multi-Agent Reflexion) — [arxiv](https://arxiv.org/html/2512.20845): critic with varied
  reasoning strategies outperforms longer single-model prompts
- MCP-SIM framework ([Nature npj AI](https://www.nature.com/articles/s44387-025-00057-z)):
  pre-scan → work → review agent loop with explicit stopping criteria
- Tri-agent audit ([arxiv](https://arxiv.org/html/2601.08839)): formal stability guarantees for
  recursive critique loops

**Key insight**: A critic running in parallel or post-Stage 2 is cheaper than embedding validation
logic into the main generation prompt (which makes the prompt longer and hurts output quality).

**Relevance to insyte**:
- Instead of lengthening Stage 2's prompt to teach two step formats (OQ5 concern), a post-Stage-2
  critic could validate sparse overlay consistency and patch malformed steps.
- The critic can be a small/fast model (Haiku 4.5, Gemini Flash) since it only needs to check
  structural rules, not generate creative content.
- Would replace/augment current `validators/steps.ts` which only catches structural errors, not
  semantic ones (e.g., referencing a componentId that doesn't exist in the skeleton).

---

## Pattern 4: Tool Calling > JSON Mode

**What it is**: Wrapping expected LLM output as a function/tool call definition rather than asking
for raw JSON. Models are more heavily fine-tuned on tool-call patterns than on arbitrary JSON
schemas.

**Reference**: Benchmarks in [structured output generation study](https://arxiv.org/html/2501.10868v1)
consistently show tool calling outperforms JSON mode on schema adherence.

**Relevance to insyte**:
- Current pipeline uses Vercel AI SDK's `generateObject` with Zod schemas (which maps to JSON mode
  under the hood for some providers).
- Switching Stage 2 and Stage 3 to `generateObject` with explicit tool definitions (or using
  Anthropic's native `tool_use`) would likely reduce hallucinated fields.
- Low-effort change, potentially high impact on malformed-step rate.

---

## Pattern 5: Constrained Decoding (for open/local models)

**What it is**: Token-level enforcement of JSON schema during generation — invalid tokens are masked,
making schema violations structurally impossible.

**References**:
- Outlines: FSM-based, supports Pydantic/JSON Schema ([awesome-llm-json](https://github.com/imaurer/awesome-llm-json))
- XGrammar: CFG-level expressiveness at FSM-level speed, ~100x faster than traditional grammar
  methods ([constrained decoding list](https://github.com/Saibo-creator/Awesome-LLM-Constrained-Decoding))
- llguidance (Microsoft, Rust): ~50µs per token on 128K vocab

**Relevance to insyte**:
- Not applicable today (Gemini 2.5 Pro is a cloud API — constrained decoding happens server-side
  or not at all).
- Relevant if insyte ever supports Ollama/local models via BYOK — XGrammar or llguidance would
  guarantee schema-valid output without any retry logic.
- Anthropic's tool_use mode already does constrained decoding natively on their end.

---

## Pattern 6: Schema-as-Contract (single source of truth)

**What it is**: The Zod/Pydantic schema is used to auto-generate: (a) prompt guide instructions,
(b) critic agent validation rules, (c) runtime parser, (d) UI types. All derived from the same
schema definition so they can never drift apart.

**References**:
- [Instructor library](https://github.com/imaurer/awesome-llm-json): auto-generates LLM prompts
  from Pydantic schemas
- [Schema-Driven UIs for LLM Applications (2026)](https://medium.com/@ramu.ramaiah/schema-driven-uis-for-llm-applications-cde53e02ff02):
  schema as single source of truth for both LLM interaction and UI rendering

**Relevance to insyte**:
- `buildPromptGuide()` in `apps/web/src/ai/prompts/builders.ts` is currently hand-written and
  can drift from `packages/scene-engine` Zod types.
- A schema-derived prompt guide would auto-update when the schema changes — critical for Phase 35
  since the step format is changing significantly.
- Medium-effort refactor; high long-term value.

---

## Comparison Table

| Pattern | Effort | Impact | Phase 35 relevance |
|---|---|---|---|
| Tool calling > JSON mode | Low | Medium | Reduces step hallucinations immediately |
| Schema-Aligned Parsing | Medium | High | Eliminates hard-reject retries |
| Topology-split (2-pass) | Already in plan | Very High | Core of Phase 35 Group A |
| Critic agent (post-gen) | Medium | High | Validates sparse overlay consistency |
| Schema-as-contract | Medium | High | Prevents prompt/schema drift as formats evolve |
| Constrained decoding | N/A (cloud APIs) | High (future) | Only relevant when local models supported |

---

## Open Question Resolutions

| OQ | Recommendation from research |
|---|---|
| OQ3: "reset to default" vs. carry-over | **Carry-over** ("not listed = no change"). VISTA and InstructPipe both use this. LLM-friendlier: model only describes changes, never needs to explicitly null unchanged fields. |
| OQ5: Two coexisting step formats in `buildPromptGuide()` | Use SAP (Pattern 1) so format enforcement is in the parser, not the prompt. Then the prompt guide only needs to describe intent, not be exhaustive. Consider a critic agent (Pattern 3) for consistency checks. |

---

## Recommended next steps

1. **Short-term (Phase 35)**: Adopt carry-over semantics for OQ3. Keeps prompts simpler.
2. **Short-term**: Switch Stage 2/3 from JSON mode to tool calling — one-line Vercel AI SDK change.
3. **Medium-term**: Replace `validators/index.ts` hard-reject with a lenient SAP-style recovery pass.
4. **Medium-term**: Derive `buildPromptGuide()` output from Zod schema at runtime to prevent drift.
5. **Long-term**: Add a post-Stage-2 critic agent call (cheap model, structural validation only).

---

## Sources

- [BAML Schema-Aligned Parsing](https://boundaryml.com/blog/schema-aligned-parsing)
- [VISTA Architecture](https://www.emergentmind.com/topics/llm-visualization-integration)
- [InstructPipe (Google Research)](https://research.google/blog/instructpipe-generating-visual-blocks-pipelines-with-human-instructions-and-llms/)
- [MAR Multi-Agent Reflexion](https://arxiv.org/html/2512.20845)
- [MCP-SIM self-correcting multi-agent](https://www.nature.com/articles/s44387-025-00057-z)
- [Tri-agent audit framework](https://arxiv.org/html/2601.08839)
- [Structured Output Generation Benchmark](https://arxiv.org/html/2501.10868v1)
- [XGrammar / Constrained Decoding list](https://github.com/Saibo-creator/Awesome-LLM-Constrained-Decoding)
- [llguidance constrained decoding](https://mbrenndoerfer.com/writing/constrained-decoding-structured-llm-output)
- [Awesome LLM JSON (Instructor etc.)](https://github.com/imaurer/awesome-llm-json)
- [Schema-Driven UIs for LLM Apps (2026)](https://medium.com/@ramu.ramaiah/schema-driven-uis-for-llm-applications-cde53e02ff08)
- [Generative UI Frameworks Guide 2026](https://medium.com/@akshaychame2/the-complete-guide-to-generative-ui-frameworks-in-2026-fde71c4fa8cc)
- [JSONSchemaBench](https://openreview.net/pdf?id=FKOaJqKoio)
- [Schema Reinforcement Learning](https://arxiv.org/html/2502.18878v1)
