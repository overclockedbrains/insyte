# AI Output Evaluation & Quality Metrics

**Tier:** 2  
**Status:** Not yet researched

---

## The Problem

After the new AI pipeline ships, how do you know if it's actually better?

Right now there's no systematic answer to this. You can tell if output is **structurally valid** (Zod passes) but not if it's **educationally correct**. A scene can:
- Pass all validators
- Animate smoothly
- Teach binary search completely wrong (wrong midpoint formula, wrong termination condition)
- Generate an explanation that contradicts what the animation shows

The pipeline redesign fixes Syntactic Hallucinations and Visual-Logic Drift structurally. But it can't guarantee the *content* is correct. Without an eval harness, every prompt or model change is a blind flight — you have no way to detect regressions.

This also matters for model routing decisions: "is Gemini Flash good enough for Stage 1?" can only be answered if you can measure quality.

---

## Why It Matters to Insyte

- The new pipeline represents a major change. You need to know it's better, not just feel like it is.
- Model routing (cheapest model per stage) requires quality benchmarks to justify.
- Prompt changes will happen constantly. Without evals, a prompt tweak that seems fine can quietly degrade output quality across a range of topics.
- At scale, you can't manually review every generated scene.

---

## What Research Likely Exists

**LLM-as-Judge approaches:**
- **G-Eval (Liu et al., 2023)** — use a strong LLM to score outputs on defined dimensions (coherence, factual accuracy, relevance). Published results show high correlation with human judgments.
- **MT-Bench (Zheng et al., 2023)** — multi-turn benchmark using GPT-4 as judge. The framework (not just the benchmark) is applicable.
- **FActScore** — factual accuracy scoring for LLM outputs by breaking claims into atomic facts and verifying each.

**Educational content quality:**
- Automated scoring of worked examples and explanations is an active area in CS education research
- Rubrics for algorithmic correctness (does the explanation match the actual algorithm behavior?)

**Regression testing for AI pipelines:**
- `promptfoo` — open source LLM eval/regression framework
- `braintrust` — eval platform with CI integration
- `evals` (OpenAI) — the framework they use internally, open-sourced

---

## Questions Research Should Answer

1. **What dimensions to score?** — Factual correctness of the algorithm explanation? Step count plausibility? Explanation-action coherence (the drift metric)?
2. **LLM-as-judge reliability** — which judge models are reliable for this domain? What prompts produce consistent scores?
3. **Automation** — can this run in CI on every pipeline change? What does a lightweight harness look like?
4. **Golden dataset** — how many reference topics are needed for meaningful regression coverage? (Binary search, merge sort, BFS are obvious candidates)
5. **Speed vs. cost tradeoff** — a full eval run on every PR might be expensive. What's the minimum viable eval?

---

## What a Good Research Output Looks Like

- A defined set of evaluation dimensions with rubrics (e.g., "Algorithm Correctness," "Explanation-Step Coherence," "Step Count Plausibility")
- A recommended eval stack (probably `promptfoo` or similar, run against a golden set of 10-20 topics)
- A lightweight CI integration plan: what runs on every PR vs. what runs on release
- Example eval prompt for LLM-as-judge for the insyte domain specifically
