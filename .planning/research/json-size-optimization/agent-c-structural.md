# Sub-Agent C: Structural JSON Optimizations

> Research track: define-once / reference-by-ID, enum compression, connection
> templates, property inheritance, binary formats — assessed for LLM reliability
> within the existing JSON architecture.

---

## 1. Reference-by-ID / Define-Once Patterns

### Pattern

Define components at the top level once; reference by ID in step actions.

```json
{
  "componentDefs": {
    "node-1": { "type": "node", "label": "Start", "icon": "mobile" },
    "node-2": { "type": "node", "label": "End", "icon": "server" }
  },
  "steps": [
    {
      "index": 1,
      "actions": [{
        "target": "g1",
        "params": {
          "visibleComponents": ["node-1", "node-2"],
          "connections": [{ "source": "node-1", "target": "node-2" }]
        }
      }]
    }
  ]
}
```

### LLM Reliability

**Moderate risk without constraints; high reliability with Structured Outputs.**

- Without schema enforcement: LLMs frequently hallucinate references to
  undefined IDs, create new component definitions mid-stream instead of
  referencing existing ones, or use inconsistent ID capitalisation.
- With Claude Structured Outputs (available on Sonnet 4.6+): the schema
  compiles to a grammar that constrains valid token choices. IDs can be
  enumerated as `z.enum([...])` in the Zod schema — the model can only
  produce valid IDs.

**Expected size reduction**: 25–35% for a 9-step scene with 6 nodes and 8 edges.

---

## 2. Enum / String Compression (Key Name Shortening)

Compressing field names (`"status"` → `"s"`, `"components"` → `"c"`) or using
numeric enums for values.

### Why This Fails

- LLMs struggle with abbreviated field names even with in-prompt examples.
  Semantic drift occurs — models invent full-form alternatives or mismap
  compressed names to the wrong field.
- One study showed 70% error improvement using Pydantic validation with fallback
  enum handlers, but this requires post-processing, not generation-time
  assurance.
- Compression gain: 8–15%. Hallucination risk without constraints: ~25%.

**Recommendation: Skip entirely.** The compression gain does not justify the
reliability cost. Field names must stay full and semantic for reliable LLM
generation.

---

## 3. Connection Templates / Defaults

### Pattern

```json
{
  "connectionDefaults": { "style": "solid", "active": false },
  "steps": [
    {
      "actions": [{
        "target": "g1",
        "params": {
          "connections": [
            { "source": "n1", "target": "n2" },
            { "source": "n2", "target": "n3", "style": "dashed" }
          ]
        }
      }]
    }
  ]
}
```

Connections that don't override a field inherit the default.

### LLM Reliability

**High with Structured Outputs.** The schema explicitly marks which fields are
optional vs required; Claude respects this during generation. Optional fields
with clear defaults are well-handled when the schema is enforced.

**Expected size reduction**: 15–25% (eliminates `style` and `active` on ~70%
of connections that use the default values).

---

## 4. Property Inheritance / Delta Encoding (Base State)

Define a base state once; each step specifies only what changed.

### Why This Is High Risk

- JSON Whisperer research (arXiv:2510.04717) shows LLMs generating deltas
  frequently **miss related updates across steps**. In animation sequences,
  a property that changes in step 1 but should persist in steps 2–3 is often
  forgotten in delta generation.
- The full-snapshot approach naturally avoids this — each step is self-contained.
- EASE (Explicitly Addressed Sequence Encoding) achieved 31% token reduction
  while keeping edit quality within 5% of full regeneration, but requires
  sophisticated prompt engineering and a validation layer that checks final
  states match expectations.

**Expected size reduction**: 30–40% theoretically; 10–20% silent error rate
(steps N+1..N+k forgetting to re-apply changes made at step N).

**Recommendation**: Only pursue if a post-generation validation pass (diff
against expected final states) is added. Without it, silent errors in complex
scenes will reach users.

---

## 5. Binary Formats (MessagePack / BSON)

| Format | Uncompressed vs JSON | With Gzip |
|--------|---------------------|-----------|
| MessagePack | 20–30% smaller | Same as Gzip'd JSON (compression dominates) |
| BSON | ~10% larger (length metadata) | Slightly worse than Gzip'd JSON |
| JSON + Gzip | baseline | **70–90% reduction** |

### Key Finding

When combined with standard Gzip/Brotli, JSON compresses identically to
binary formats. The compression algorithm dominates, not the serialisation
format. Binary formats add pipeline complexity (AI generates JSON, convert to
binary, client converts back) for zero net gain at the transport layer.

**Recommendation: Skip binary formats.** Apply Gzip on the wire instead — free,
zero schema change, zero LLM impact.

---

## 6. Repetition Analysis (Your Actual Scenes)

Measured across all existing scene files:

| File | Total Size | System-Diagram in Steps | % of Total | Repetitions |
|------|-----------|------------------------|------------|-------------|
| copilot-agent-architecture.json | 40,287 B | 10,716 B | 27% | 8× |
| chat-system.json | 21,648 B | 4,482 B | 21% | 5× |
| twitter-feed.json | 25,418 B | 5,664 B | 22% | 5× |
| url-shortener.json | 23,685 B | 4,180 B | 18% | 7× |
| dns-resolution.json | 27,493 B | 6,094 B | 22% | 10× |
| load-balancer.json | 26,297 B | 4,718 B | 18% | 9× |
| hash-tables.json | 21,539 B | 0 B | 0% | 0 |

System-diagram repetition accounts for **18–27% of total file bytes** across
all HLD/concept scenes that use SystemDiagramViz. DSA scenes (hash-tables.json)
use different viz types and have zero system-diagram repetition — different
optimisations apply.

**Theoretical maximum deduplication** (define-once for static fields):
- In `copilot-agent-architecture.json`: only `status` (components) and `active`
  (connections) change across steps. `icon`, `label`, `from`, `to`, `label`,
  `style` are 100% static.
- Result: 82% reduction on the system-diagram section (1,934 B vs 10,716 B),
  ~22% overall file reduction.

---

## 7. Hybrid Define-and-Override (Safest Optimisation)

The sweet spot: combine topology-split with connection defaults.

```json
{
  "visuals": [{
    "id": "agent-system",
    "type": "system-diagram",
    "initialState": {
      "components": [
        { "id": "user", "icon": "mobile", "label": "User", "status": "normal" },
        { "id": "orchestrator", "icon": "compute", "label": "Orchestrator", "status": "normal" }
      ],
      "connections": [
        { "id": "goal-flow", "from": "user", "to": "orchestrator",
          "label": "Goal", "style": "solid", "active": false },
        { "id": "plan-request", "from": "orchestrator", "to": "planner",
          "label": "Plan Request", "style": "solid", "active": false }
      ]
    }
  }],
  "steps": [
    {
      "index": 2,
      "actions": [{
        "target": "agent-system",
        "params": {
          "componentStates": { "orchestrator": "active", "planner": "active" },
          "activeConnections": ["plan-request"]
        }
      }]
    }
  ]
}
```

**LLM Reliability**: Very high.
- No index arithmetic — no array patching.
- No new commands — just a map and an array of strings.
- Self-contained per step — missing entries default to `normal` / `false`.
- IDs can be enumerated in Zod schema → Structured Outputs guarantees valid IDs.

**Expected size reduction**: 30–35% uncompressed on system-diagram files,
scaling with scene complexity. With Gzip on wire: 80–90% end-to-end.

---

## Summary

**Max reduction without format change (Gzip only)**: **80%** on wire.

**Max reduction with conservative structural changes (topology-split + connection
defaults + Structured Outputs)**: **~40–45% uncompressed**, then **~87%
Gzipped**. The format change saves ~9–16KB per scene; Gzip recovers most of the
rest regardless.

**Safest optimisation**: Topology-split — define static fields once in
`visuals[n].initialState`, steps specify only `componentStates` and
`activeConnections`. This is the single change with the highest reliability,
largest absolute saving, and lowest cognitive overhead for the LLM.

---

## Sources

- [JSON Whisperer: Efficient JSON Editing with LLMs (arXiv:2510.04717)](https://arxiv.org/html/2510.04717v1)
- [Structured Outputs — Anthropic API Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [LLM Structured Output in 2026 — DEV Community](https://dev.to/pockit_tools/llm-structured-output-in-2026-stop-parsing-json-with-regex-and-do-it-right-34pk)
- [Optimizing JSON for LLMs — DEV Community](https://dev.to/mattlewandowski93/optimizing-json-for-llms-1dgf)
- [Data Serialization Comparison: JSON, YAML, BSON, MessagePack — SitePoint](https://www.sitepoint.com/data-serialization-comparison-json-yaml-bson-messagepack/)
- [JSON Compression Guide — Moldstud](https://moldstud.com/articles/p-step-by-step-guide-to-compressing-json-for-enhanced-mobile-app-performance)
- [Alternative Binary Formats and Compression — Lucid Blog](https://lucid.co/techblog/2019/12/06/json-compression-alternative-binary-formats-and-compression-methods)
