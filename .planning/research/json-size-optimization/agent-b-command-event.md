# Sub-Agent B: Command / Event-Based Approaches

> Research track: Lottie, Rive, CSS @keyframes, GSAP, Manim, D3/Vega-Lite,
> LLM structured-output reliability — assessed through the lens of one-shot
> LLM generation and the ISCL failure post-mortem.

---

## 1. Lottie / Rive Animation Formats

### Lottie (JSON-based)

Lottie is a JSON keyframe format with extensive nested metadata. Every shape,
layer, transform, and timing is represented as deeply nested objects with
numeric property keys (`"ty"`, `"k"`, `"ix"` etc.).

**LLM Generation Assessment**: Zero-shot LLM generation fails consistently.

- LottieGPT, OmniLottie, AnimTOON all confirm this in published research.
- AnimTOON achieves 98.8% token reduction by **separating SVG shapes
  (pre-provided) from animation keyframes (model-generated)**, focusing the
  model on ~166 tokens of animation commands. Direct Lottie JSON generation
  produces unsatisfactory success rates and malformed output.
- Takeaway: even purpose-built LLM animation pipelines require a split between
  "structure defined externally" and "animation described compactly". This is
  exactly the topology-split pattern.

### Rive (.riv binary)

- Binary format, not natively LLM-generatable without a text-based export layer.
- State machine model (animations + state machine transitions) — expressive but
  complex.
- No published research on LLM generation of Rive files.

---

## 2. CSS @keyframes / GSAP Timeline

**CSS @keyframes**: Percentage-based, declarative keyframe blocks. Each
percentage milestone specifies the full property value at that point in time.

**GSAP Timeline**: Code-based API (`gsap.to()`, `gsap.from()`, `gsap.set()`).
Properties are interpolated numerically.

**LLM Friendliness**: Code-based approaches (GSAP) are more LLM-friendly than
GUI tools because each command maps directly to a concrete mathematical
property change. LLMs excel at generating code that calls well-known APIs.
However, GSAP code generation requires JavaScript runtime — not a JSON schema
you can Zod-validate at ingest time.

---

## 3. Manim (Mathematical Animation)

Manim is code-based (Python), not data-based. Scenes are Python classes with
animation methods (`play()`, `Write`, `Create`, `Transform`).

**LLM Reliability with Multi-Stage Pipelines**: Tools like Manimator
(arXiv:2507.14306) use a two-stage pipeline: `text → structured scene
description → Manim Python code`. Two-stage generation reduces hallucination
vs. direct single-shot code generation.

**Relevance for Insyte**: The two-stage pattern (structured description first,
then serialised format second) is broadly applicable. However, Manim itself
requires Python execution, not static JSON.

---

## 4. D3 / Vega-Lite Animated Formats

**Animated Vega-Lite** (vis.csail.mit.edu) extends Vega-Lite with time-based
encoding channels, representing animation as time-varying data queries. It is
a declarative JSON specification language — the same paradigm as Insyte scenes.

**LLM Friendliness**: Declarative JSON specs with field mappings (standard data
channels) are more reliable than imperative command sequences. The vocabulary
is fixed (defined channels, encoding types) — the same constraint that makes
Insyte's current full-snapshot JSON reliable.

---

## 5. Why LLM-Generated Command Formats Fail (and What Fixes It)

### Failure Modes (from ISCL and Published Research)

| Failure Mode | What Happens | Detectability |
|-------------|-------------|---------------|
| Hallucinated command names | Model invents `SET_NODE_ACTIVE` when only `ACTIVATE_NODE` exists | Caught by schema validation |
| Missing required fields | Model omits `target` field on a known command | Caught by schema validation |
| Command ordering errors | Model puts `DEACTIVATE` before `ACTIVATE` in a sequence | **NOT caught** by schema validation |
| Reference errors | Model references `node-5` which doesn't exist | Caught if IDs are enumerated |
| Silent semantic errors | Correct command, wrong target ID | **NOT caught** unless ID validated against topology |

### What Makes a Format LLM-Reliable (Research Findings)

From OpenAI Structured Outputs production data and academic studies:

| Mechanism | Failure Rate |
|-----------|-------------|
| Prompt-only JSON extraction | 5–20% |
| JSON Mode (constrained decoder) | 2–5% |
| Full JSON Schema enforcement (Structured Outputs) | **<0.1%** |
| Grammar-constrained decoding (EBNF grammar) | Near-zero for syntax; semantic errors remain |

**Rules that reduce LLM error rates**:

1. **JSON over custom syntax** — LLMs have vast JSON training data; custom DSLs
   have almost none.
2. **Minimal vocabulary** — fewer command types = fewer hallucination targets.
   ISCL had ~12 commands; a topology-split format has 0 commands (just two JSON
   keys).
3. **Declarative over imperative** — "what state is active at step N" vs "execute
   this operation on state". LLMs reason better about final-state than about
   operation sequences.
4. **Self-contained over reference-based** — "components active in this step:
   [user, orchestrator]" vs "apply patch relative to step 3 state". No
   cross-step reasoning required.
5. **Required fields only** — optional fields invite omission. Every field in a
   step should be either required or have an unambiguous default.

### Why a New Command Format Could Outperform ISCL

If you were to build a command format today, combining:
- JSON Schema enforcement (Anthropic Structured Outputs, available on Sonnet 4.6)
- Grammar-constrained decoding (prevents hallucinated token choices)
- Closed-vocabulary command set (3–5 commands maximum)

...you could achieve <1% failure rate even with commands. But the complexity vs.
the topology-split approach (which achieves the same reliability with zero new
concepts) makes this unattractive.

---

## 6. Expressiveness Across Viz Types

Can a flat command / override format express all current primitive types?

| Viz Type | Dynamic Fields (change per step) | Topology-Split Representation |
|----------|----------------------------------|-------------------------------|
| SystemDiagramViz | `component.status`, `connection.active` | `componentStates: {id: status}`, `activeConnections: [id]` |
| ArrayViz | `items[n].status`, `items[n].value` | `itemStates: {index: status}` or `{index: {status, value}}` |
| TreeViz | `node.status`, `node.children` | `nodeStates: {id: status}` |
| GraphViz | `node.status`, `edge.active` | Same as SystemDiagramViz |
| DPTableViz | `cell[row][col].status`, `cell[row][col].value` | `cellStates: {"r0c2": {status, value}}` |

All types reduce to the same pattern: topology defined once (ids, labels,
structure), steps specify only the dynamic overlay.

---

## Summary

**Reliability verdict vs ISCL: BETTER** if using JSON Schema + constrained
decoding. **SAME or WORSE** with custom syntax and no enforcement.

**Why it avoids ISCL failure modes**: Enforced JSON schemas + grammar-constrained
decoding prevent hallucinated command names (only valid tokens allowed at each
position), field omission (required fields + validation), and ordering errors
(flat objects have no ordering). The topology-split format eliminates the need
for commands entirely.

**Key remaining risk**: LLMs still struggle with cross-step state references.
The topology-split design sidesteps this — each step is self-contained (missing
= defaults to normal/inactive) — so this risk does not materialise.

---

## Sources

- [OmniLottie: Generating Vector Animations via Parameterized Lottie Tokens (arXiv:2603.02138)](https://arxiv.org/pdf/2603.02138)
- [LottieGPT: Tokenizing Vector Animation for Autoregressive Generation (arXiv:2604.11792)](https://arxiv.org/html/2604.11792v1)
- [AnimTOON GitHub](https://github.com/srk0102/AnimTOON)
- [Manimator: Transforming Research Papers into Visual Explanations (arXiv:2507.14306)](https://arxiv.org/html/2507.14306v1)
- [Animated Vega-Lite: Unifying Animation with a Grammar of Interactive Graphics](https://vis.csail.mit.edu/pubs/animated-vega-lite/)
- [Structured Output and JSON Mode Guide 2026 — TokenMix](https://tokenmix.ai/blog/structured-output-json-guide)
- [Beyond JSON Mode: Reliable Structured Outputs from LLMs in Production](https://tianpan.co/blog/2025-10-29-structured-outputs-llm-production)
- [Generating Structured Outputs from LLMs: Benchmark (arXiv:2501.10868)](https://arxiv.org/html/2501.10868v1)
- [Constrained Decoding: Grammar-Guided Generation — mbrenndoerfer](https://mbrenndoerfer.com/writing/constrained-decoding-structured-llm-output)
- [Grammar-Constrained Decoding for Structured NLP Tasks without Finetuning (arXiv:2305.13971)](https://arxiv.org/abs/2305.13971)
