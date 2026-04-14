# Semantic Caching

**Tier:** 3 — Deferred  
**Status:** Not yet researched. Decision: implement after pipeline stabilizes.

---

## The Problem

Users ask insyte similar questions constantly. "How does binary search work?" and "explain binary search" and "binary search algorithm" all mean the same thing. Each one currently triggers a full 5-stage AI pipeline run costing ~$0.05–0.15 per generation.

Redis research found that **31% of LLM queries in production exhibit semantic similarity** — meaning nearly a third of all queries could be served from cache if insyte had semantic matching. At scale that's a direct cost reduction.

---

## Why It's Tier 3 (Not Tier 1)

This is a cost optimization, not a quality improvement. The pipeline needs to be correct and stable first before it's worth optimizing for cost. Also, semantic caching has a cold-start problem — the cache is only useful once there's enough production traffic to populate it. It's not relevant until there are real users.

**Revisit when:** insyte has enough traffic that API costs are a visible line item.

---

## What We Already Know (from AI pipeline research)

From Redis research (redis.io/blog/prompt-caching-vs-semantic-caching):
- Semantic caching retrieves stored responses based on embedding similarity, not exact string match
- 31% of enterprise LLM queries have semantic duplicates
- Standard approach: embed the query → cosine similarity against stored queries → if similarity > threshold, return cached result

The threshold is the key tuning parameter. Too low (0.85) = wrong cache hits. Too high (0.99) = misses obvious duplicates.

---

## Questions Research Should Answer

1. **Granularity** — cache at Stage 0 output level (the free reasoning)? Or cache the full assembled Scene? Full scene is simpler but Stage 0 is cheaper and the most expensive stage.
2. **Embedding model choice** — which embedding model gives best semantic similarity for CS/algorithm topic queries? `text-embedding-3-small` vs. Gemini embeddings vs. Cohere?
3. **Cache store** — Upstash Redis (serverless, works with Vercel) vs. self-hosted vs. a dedicated vector DB (Pinecone, Qdrant)?
4. **Threshold tuning** — what similarity score actually means "same topic" for algorithm queries? "Quicksort" and "merge sort" are related but should NOT be cache-equivalent.
5. **Cache invalidation** — when a prompt changes (new pipeline version), old cached scenes become stale. Strategy?
6. **Privacy** — are user queries stored as embeddings? What are the privacy implications?

---

## What a Good Research Output Looks Like

- A recommended architecture: what gets cached, at what stage, with which store
- A validated similarity threshold for the algorithm/CS domain
- A cost model: estimated savings at N queries/day
- An implementation sketch compatible with the existing Next.js + Vercel stack
