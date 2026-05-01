# Gemini Server Key Mode — Per-Scene Cost Analysis

> **Date:** May 2, 2026  
> **Exchange rate:** 1 USD = ₹84.87 *(web search, May 1–2 2026: ~94.87 INR; conservative ₹84.87 used below — verify before financial decisions)*  
> **Pricing source:** [Google AI Developer Pricing](https://ai.google.dev/gemini-api/docs/pricing) — Standard Paid Tier  
> **Scope:** Server key mode only (`byokModel === null`). BYOK users bill against their own API keys.

---

## 1. Model Pricing Reference

All prices are **Standard Paid Tier**, prompts ≤ 200K tokens (all insyte prompts are well below this threshold).  
**Important:** Thinking tokens are billed at the **same output rate** — there is no separate discounted thinking tier.

| Model | Stages | Input / 1M tokens | Output† / 1M tokens | Input / 1M tokens (INR) | Output† / 1M tokens (INR) |
|---|---|---|---|---|---|
| `gemini-2.5-pro` | 0, 2 | **$1.25** | **$10.00** | **₹118.6** | **₹949.0** |
| `gemini-2.5-flash` | 1, 3 | **$0.30** | **$2.50** | **₹28.5** | **₹237.2** |
| `gemini-2.5-flash-lite` | 4 | **$0.10** | **$0.40** | **₹9.5** | **₹37.9** |

†Output billing includes thinking tokens at the same rate as regular output tokens.

Model assignment source: [`src/ai/model-routing.ts` — `STAGE_MODELS`](../../apps/web/src/ai/model-routing.ts)

---

## 2. Pipeline Stage Summary

| Stage | Purpose | Model | Thinking Budget | Max Output | Temperature | Fatal? |
|---|---|---|---|---|---|---|
| **0** | Free reasoning | `gemini-2.5-pro` | **16,384** (model uses ~2K–8K) | 8,192 | 1.0 | Yes |
| **1** | Scene skeleton JSON | `gemini-2.5-flash` | 2,048 | — | 0.1 | Yes |
| **2** | Steps + explanations | `gemini-2.5-pro` | **2,048** (nearly always fully consumed) | 16,384 | 0.2 | Yes |
| **3** | Popup annotations | `gemini-2.5-flash` | 2,048 | — | 0.4 | No |
| **4** | Challenge questions | `gemini-2.5-flash-lite` | 2,048* | — | 0.5 | No |
| **5** | Deterministic assembly | (no model) | — | — | — | Yes |

*Flash-Lite may not support thinking; budget is passed but likely ignored → $0 thinking cost for Stage 4.

**Thinking budget override:** Stage 0 is set to 16,384 via `buildStage0ProviderOptions()` in [`pipeline.ts:329`](../../apps/web/src/ai/pipeline.ts). All other stages inherit the registry default of 2,048 from [`registry.ts:83`](../../apps/web/src/ai/registry.ts).

---

## 3. Token Estimate Methodology

### Static prompt template sizes (characters → tokens at ~4 chars/token)

| Stage | Template file | Est. template tokens | System prompt tokens |
|---|---|---|---|
| 0 | `stage0-reasoning.md` (~1,800 chars) | ~450 | — |
| 1 | `stage1-skeleton.md` (~2,200 chars) | ~550 | ~15 |
| 2 | `stage2-steps.md` (~11,000 chars + 3 JSON examples) | ~2,800 | ~25 |
| 3 | `stage3-popups.md` (~2,000 chars) | ~500 | ~20 |
| 4 | `stage4-misc.md` (~2,300 chars) | ~575 | ~50 |

### Dynamic content injected per stage

| Injected field | Source | Tokens |
|---|---|---|
| `{topic}` | User prompt | ~5–20 |
| `{reasoning}` (Stage 1, 2) | Stage 0 text output | ~350–700 |
| `{skeletonJson}` (Stage 2) | Stage 1 output | ~150–400 |
| `{canvasIdsList}` (Stage 2, 3) | Skeleton canvas array | ~40–150 (scales with visual count) |
| `{promptGuide}` (Stage 2) | `buildPromptGuide()` from scene-engine | ~300–700 per visual type |
| `{stepSummaries}` (Stage 3, 4) | Stage 2 step headings | ~150–300 |

---

## 4. Per-Scene-Type Cost Breakdown

### 4a. Token estimates per stage

| Scene Type | Example Topics | Steps | Visuals |
|---|---|---|---|
| **Simple sequential** | Binary search, Bubble sort, Linear scan | 8 | 1 (linear/array) |
| **Dual sequential** | Two Sum, Frequency counter, Sliding window | 10 | 2 (array + map) |
| **Tree / graph identity** | BST insert/delete, BFS, DFS, Trie search | 10 | 1–2 (tree or graph) |
| **Complex graph algorithm** | Dijkstra, Kruskal, Bellman-Ford, LRU Cache | 12 | 2–3 (graph + aux visuals) |
| **Concept / system diagram** | Event loop, HTTP lifecycle, Consistent hashing | 8 | 1 (system-diagram) |

#### Simple Sequential (binary search, 8 steps, 1 linear/array)

| Stage | Model | Input tok | Output text tok | Thinking tok | Total output tok |
|---|---|---|---|---|---|
| 0 | Pro | ~460 | ~400 | ~2,500 | ~2,900 |
| 1 | Flash | ~975 | ~150 | ~500 | ~650 |
| 2 | Pro | ~3,945 | ~1,400 | ~2,048 | ~3,448 |
| 3 | Flash | ~625 | ~150 | ~350 | ~500 |
| 4 | Flash-Lite | ~755 | ~290 | — | ~290 |

#### Dual Sequential (Two Sum, 10 steps, array + map)

| Stage | Model | Input tok | Output text tok | Thinking tok | Total output tok |
|---|---|---|---|---|---|
| 0 | Pro | ~460 | ~500 | ~3,500 | ~4,000 |
| 1 | Flash | ~1,040 | ~220 | ~550 | ~770 |
| 2 | Pro | ~4,200 | ~2,350 | ~2,048 | ~4,398 |
| 3 | Flash | ~670 | ~200 | ~500 | ~700 |
| 4 | Flash-Lite | ~770 | ~320 | — | ~320 |

#### Tree / Graph Identity (BST / BFS, 10 steps)

| Stage | Model | Input tok | Output text tok | Thinking tok | Total output tok |
|---|---|---|---|---|---|
| 0 | Pro | ~460 | ~550 | ~4,500 | ~5,050 |
| 1 | Flash | ~1,040 | ~230 | ~600 | ~830 |
| 2 | Pro | ~3,970 | ~1,950 | ~2,048 | ~3,998 |
| 3 | Flash | ~660 | ~190 | ~500 | ~690 |
| 4 | Flash-Lite | ~770 | ~310 | — | ~310 |

#### Complex Graph Algorithm (Dijkstra, 12 steps, graph + 2 aux)

| Stage | Model | Input tok | Output text tok | Thinking tok | Total output tok |
|---|---|---|---|---|---|
| 0 | Pro | ~465 | ~700 | ~7,000 | ~7,700 |
| 1 | Flash | ~1,150 | ~300 | ~750 | ~1,050 |
| 2 | Pro | ~4,600 | ~4,260 | ~2,048 | ~6,308 |
| 3 | Flash | ~720 | ~250 | ~600 | ~850 |
| 4 | Flash-Lite | ~800 | ~380 | — | ~380 |

#### Concept / System Diagram (event loop, 8 steps)

| Stage | Model | Input tok | Output text tok | Thinking tok | Total output tok |
|---|---|---|---|---|---|
| 0 | Pro | ~460 | ~600 | ~4,000 | ~4,600 |
| 1 | Flash | ~1,040 | ~200 | ~500 | ~700 |
| 2 | Pro | ~3,810 | ~1,660 | ~1,800 | ~3,460 |
| 3 | Flash | ~640 | ~160 | ~400 | ~560 |
| 4 | Flash-Lite | ~760 | ~300 | — | ~300 |

---

### 4b. Cost per stage and total (USD + INR)

| Scene Type | Stage 0 | Stage 1 | Stage 2 | Stage 3 | Stage 4 | **Total (USD)** | **Total (INR)** |
|---|---|---|---|---|---|---|---|
| Simple sequential | $0.030 | $0.002 | $0.039 | $0.002 | <$0.001 | **~$0.073** | **~₹6.93** |
| Dual sequential | $0.041 | $0.002 | $0.049 | $0.002 | <$0.001 | **~$0.094** | **~₹8.92** |
| Tree / graph identity | $0.051 | $0.002 | $0.045 | $0.002 | <$0.001 | **~$0.100** | **~₹9.49** |
| Complex graph algorithm | $0.078 | $0.003 | $0.069 | $0.002 | <$0.001 | **~$0.152** | **~₹14.43** |
| Concept / system diagram | $0.047 | $0.002 | $0.039 | $0.002 | <$0.001 | **~$0.090** | **~₹8.54** |

**Cost range: $0.073 – $0.152 per scene (₹6.93 – ₹14.43)**

---

## 5. Stage-Level Cost Formula

For any stage, cost is computed as:

```
cost = (input_tokens × input_price_per_token)
     + ((output_text_tokens + thinking_tokens) × output_price_per_token)
```

Since thinking tokens are billed identically to output tokens, the formula simplifies to:

```
cost = input_tokens × (model_input_$/1M ÷ 1,000,000)
     + total_output_tokens × (model_output_$/1M ÷ 1,000,000)
```

### Stage 0 cost sensitivity to thinking tokens

Stage 0 uses `gemini-2.5-pro` at $10.00/1M output. Every 1,000 thinking tokens = **$0.010** (₹0.95).

| Stage 0 thinking usage | Extra cost vs. 2K baseline |
|---|---|
| 2,000 tokens (simple concept) | baseline |
| 4,000 tokens (+2K) | +$0.020 / +₹1.90 |
| 6,000 tokens (+4K) | +$0.040 / +₹3.80 |
| 8,000 tokens (+6K) | +$0.060 / +₹5.70 |
| 12,000 tokens (+10K) | +$0.100 / +₹9.49 |

This is why complex algorithms (Dijkstra, LRU Cache) can cost up to 2× a simple array problem.

---

## 6. Key Cost Drivers

| Driver | Share of total | Notes |
|---|---|---|
| **Stage 0 thinking** (Pro @ $10/1M) | 40–55% | Scales with topic complexity. Cap is 16,384 tokens. |
| **Stage 2 output** (Pro @ $10/1M) | 30–45% | Scales with step count × canvas complexity. |
| **Stage 2 thinking** (Pro @ $10/1M, capped at 2,048) | ~20% | Constant across all scene types (~$0.020). |
| **Stages 1, 3, 4** (Flash + Flash-Lite) | < 5% combined | Negligible regardless of scene type. |

**Insight:** Stages 1, 3, and 4 together cost roughly $0.004–$0.007, less than the rounding error on Stage 0.

---

## 7. Operational Cost Modifiers

### Query deduplication cache (free tier)
Implemented in [`app/api/generate/route.ts`](../../apps/web/app/api/generate/route.ts).
- If the exact topic was already generated: **$0.00** — returns cached scene from Supabase immediately.
- Popular topics (binary search, BFS, merge sort, linked list reversal) are cached after first generation.
- Effective cost per unique topic is paid once, then amortised over all subsequent views.

### Retry budget
Each stage (1–4) allows up to 2 retries on validation failure (configurable via `PIPELINE_MAX_RETRIES`).
- Stage 1 retry: +~$0.002–$0.003 per attempt
- Stage 2 retry: +~$0.040–$0.070 per attempt (most expensive)
- Stage 3/4 retry: +~$0.001–$0.003 per attempt (non-fatal, scene still completes)

A worst-case scene (Stage 2 fails twice) can cost up to ~3× the Stage 2 baseline.

### Context length tier
Pro pricing doubles to $2.50/1M input and $15.00/1M output for prompts > 200K tokens.  
Insyte prompts peak at ~4,600 input tokens (Stage 2, complex scene). **This tier never applies.**

---

## 8. At-Scale Cost Projections

| Daily unique generations | Daily cost (USD) | Daily cost (INR) | Monthly cost (USD) | Monthly cost (INR) |
|---|---|---|---|---|
| 10 scenes | $0.75–$1.55 | ₹71–₹147 | ~$22–$47 | ~₹2,100–₹4,500 |
| 50 scenes | $3.75–$7.75 | ₹356–₹735 | ~$112–$232 | ~₹10,600–₹22,000 |
| 100 scenes | $7.50–$15.50 | ₹712–₹1,471 | ~$225–$465 | ~₹21,300–₹44,100 |
| 200 scenes | $15.00–$31.00 | ₹1,424–₹2,941 | ~$450–$930 | ~₹42,700–₹88,300 |
| 500 scenes | $37.50–$77.50 | ₹3,560–₹7,353 | ~$1,125–$2,325 | ~₹106,800–₹220,700 |

**Note:** "Unique generations" = cache misses only. If 30% of requests hit the cache, effective cost is 30% lower.

---

## 9. Comparison: Server Key vs. BYOK (Gemini, same provider)

In BYOK mode the user's Gemini key is used but the same model routing applies (Pro → stage 0 and 2, Flash → stage 1 and 3, Flash-Lite → stage 4). Costs are identical per scene — the difference is **who pays**.

| Mode | Who is billed | Cache enabled | Use case |
|---|---|---|---|
| Server key | insyte's `GEMINI_API_KEY` | Yes (per topic dedup) | Free-tier users |
| BYOK (Gemini) | User's API key | No (always fresh) | Power users with own key |

---

## 10. Assumptions & Uncertainty

| Assumption | Impact if wrong |
|---|---|
| Stage 0 thinking: 2,500–7,000 tokens (varies by topic) | ±$0.05–$0.10 per scene |
| Stage 2 output text: scales with step count | Dijkstra-class scenes could hit $0.20+ if 15 steps generated |
| Flash-Lite thinking cost ≈ $0 | Negligible even if wrong (~$0.001) |
| Exchange rate 1 USD = ₹84.87 (web search: ~₹94.87, May 2026) | INR figures shift ±12% |
| No retries in happy path | Each Stage 2 retry adds ~$0.04–$0.07 |

**The biggest uncertainty is Stage 0 thinking depth.** Since Gemini 2.5 Pro is a reasoning model, it may use far fewer or far more thinking tokens depending on how familiar the topic is. Empirical logging of `usage.thoughtTokens` in production would tighten these estimates significantly.

---

*Analysis derived from: [`src/ai/model-routing.ts`](../../apps/web/src/ai/model-routing.ts), [`src/ai/pipeline.ts`](../../apps/web/src/ai/pipeline.ts), [`src/ai/registry.ts`](../../apps/web/src/ai/registry.ts), [`src/ai/client.ts`](../../apps/web/src/ai/client.ts), and prompt templates in [`src/ai/prompts/`](../../apps/web/src/ai/prompts/).*
