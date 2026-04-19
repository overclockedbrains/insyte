# JSON Payload Size Optimization: Research Synthesis

> **Status**: Research complete — ready for implementation decision
>
> **Scope**: Scene JSON size reduction for the Insyte AI-generated animation
> step system. All recommendations are filtered through the primary constraint:
> one-shot LLM generation reliability.
>
> **Source files**: agent-a-diff-patch.md, agent-b-command-event.md,
> agent-c-structural.md, agent-main-byte-analysis.md

---

## Preamble: What the Numbers Say

Before ranking approaches, concrete measurements from
`copilot-agent-architecture.json` establish the ground truth:

| Metric | Value |
|--------|-------|
| File size | 40,287 bytes |
| `agent-system` repeated across steps 1–8 | 10,716 bytes (27% of file) |
| Bytes per single system-diagram step | ~1,340 bytes |
| Fields that **never** change across steps | `icon`, `label` on nodes; `from`, `to`, `label`, `style` on edges |
| Fields that **do** change per step | `status` on components (active/normal); `active` on connections (bool) |
| Bytes if topology defined once + per-step overrides only | 1,934 bytes total for all 8 steps |
| **Reduction on that section** | **82%** |
| Full-file reduction (non-diagram sections unchanged) | ~22% (40KB → ~31KB) |

A critical structural observation: **the topology is already defined once** —
in `visuals[n].initialState`. Steps redundantly repeat it. The fix requires no
new data structures; only a change to what the AI writes in step actions.

---

## 1. LLM Reliability Ranking

Ordered from most to least reliable for one-shot generation, with specific
reasoning for each rank.

### Rank 1 — Topology-Split (VERY HIGH reliability)

The topology (`id`, `icon`, `label` on components; `from`, `to`, `label`,
`style` on connections) is defined once in `visuals[n].initialState`. Steps
specify only the dynamic overlay: which component IDs have a non-normal
`status`, and which connection IDs are `active`.

```json
{
  "target": "agent-system",
  "params": {
    "componentStates": { "orchestrator": "active", "planner": "active" },
    "activeConnections": ["plan-request"]
  }
}
```

Why this ranks highest:

- **Zero new syntax** — pure JSON, same structural vocabulary as today.
- **No operations, no paths, no indices** — the LLM writes
  `"orchestrator": "active"`, not `"/components/1/status"`.
- **Self-contained per step** — unspecified items default to `normal`/`false`;
  no cross-step reasoning required.
- **Semantically natural** — "which components are active in this step?" maps
  directly to the model's pedagogical reasoning. The AI already knows; it just
  needs to write less.
- **Simpler per step, not harder** — the model writes 2–3 IDs instead of
  6 full objects. Lower output volume means fewer opportunities for error.
- **Silent failure rate approaches zero** — the only failure mode is a
  wrong ID (e.g., `"ochestrator"` instead of `"orchestrator"`). If IDs are
  enumerated in the Zod schema, Structured Outputs prevent even that.

### Rank 2 — Connection Defaults / Field-Level Templates (HIGH)

Define `connectionDefaults: { style: "solid", active: false }` at the top
level. Connections only override what differs. Sub-agent C confirmed 15–25%
additional reduction. High reliability with Structured Outputs because the
schema marks which fields are optional; Claude respects this during generation.

### Rank 3 — RFC 7396 JSON Merge Patch (MEDIUM)

Simpler than RFC 6902 (no `op`/`path` syntax), but cannot target specific
array elements — must replace the whole array. A model that writes
`"components": []` intending "no change" wipes all nodes silently. Realistic
reduction: 60–80%.

### Rank 4 — RFC 6902 JSON Patch (LOW)

Sub-agent A documented multiple confirmed failure modes, all of which pass
Zod schema validation but produce wrong visual output:

- **Array index arithmetic errors** (most common): `"/components/2/status"`
  applies to the wrong node if the LLM miscounted.
- **Silent atomicity rollback**: one invalid patch in a sequence rolls back
  the entire step.
- **Off-by-one after removal**: removing element at index 2 shifts all
  subsequent indices; the next patch references the pre-shift position.

Best-case reduction: 92–96%. But with a realistic ~15–25% silent semantic
failure rate in one-shot generation — unacceptable for a no-review pipeline.

### Rank 5 — Command DSL (PROVEN FAILURE — do not reconsider)

Already validated in production with ISCL. Sub-agent B confirmed via published
research: LLMs hallucinate command names even with schema enforcement because
nothing prevents the model from producing a plausible-sounding token outside
the vocabulary. Grammar-constrained decoding would help but adds significant
implementation complexity and was unavailable when ISCL was designed. Even
with it, command ordering errors remain undetectable by schema validation.

---

## 2. Size / Reliability Tradeoff

| Approach | Uncompressed Reduction | LLM Reliability | Silent Failure Risk |
|----------|----------------------|-----------------|---------------------|
| Topology-split (sections affected) | **82%** | Very high | Near-zero |
| Topology-split (whole file) | **~22%** | Very high | Near-zero |
| + Connection defaults | +15–25% incremental | High | Near-zero (Structured Outputs) |
| Gzip on wire (no format change) | +70–85% on top | N/A (transport) | Zero |
| RFC 7396 Merge Patch | 60–80% | Medium | Low-medium |
| RFC 6902 Patch | 80–96% ideal | Low | **High — silent wrong state** |
| Binary (MessagePack) | 20–30% uncompressed | N/A (pipeline converts) | Zero |

**Best tradeoff**: The topology-split delivers more absolute reduction (82%
on the highest-repetition section) than RFC 6902 Patch in a realistic scenario
(~80%), while being orders of magnitude more reliable. The key insight: in this
format, only 2–3 boolean/enum fields change per step — the "patch" is trivially
small when expressed as named IDs, not as array path expressions.

---

## 3. Recommended Hybrid

Three layers, each independently deployable and independently valuable:

### Layer 1 — Topology-Split (primary win, immediate, zero reliability risk)

Formalise `visuals[n].initialState` as the canonical topology definition. Add
explicit `id` fields to connections (currently unnamed). Steps specify
`componentStates` and `activeConnections` only.

*Uncompressed saving*: ~82% on system-diagram sections (~22% whole-file on
copilot scene; higher % on larger scenes).

### Layer 2 — Connection Defaults (secondary, conservative)

Add `connectionDefaults: { style: "solid", active: false }` per visual.
Connections in `initialState` inherit these unless overridden. Reduces topology
definition size by ~15–25%. Low risk; Structured Outputs enforce the schema.

*Uncompressed saving*: +15–25% on top of Layer 1 for connection-heavy scenes.

### Layer 3 — Gzip Transport (free win, zero schema change)

Serve all scene JSONs with `Content-Encoding: gzip` or `brotli`. Sub-agent C
confirmed that on repetitive JSON, Gzip achieves 79–95% compression. Even the
current verbose format compresses ~80% on the wire. After Layer 1+2, the
already-reduced payloads compress further.

*Network saving on copilot scene*: ~40KB raw → ~8KB Gzip today; → ~4–5KB
Gzip after Layer 1+2.

**Combined effect on `copilot-agent-architecture.json`**:

| Stage | Size |
|-------|------|
| Current, on disk | 40,287 B |
| After Layer 1 | ~31,500 B |
| After Layer 1 + Layer 2 | ~27,000 B |
| After Layer 3 (Gzip, no format change) | ~8,000 B over wire |
| After Layer 1 + 2 + 3 | ~4,500–5,000 B over wire |

For a larger HLD scene (15 nodes, 20 edges, 15 steps), current format would be
~120KB; after Layer 1+2: ~45KB uncompressed, ~8KB Gzipped.

---

## 4. Concrete Example: Step 2 → Step 3 Transition

These are actual steps from `copilot-agent-architecture.json`.

What changes between steps 2 and 3 semantically:
- Same components active (orchestrator, planner)
- Connection active changes from `plan-request` (orchestrator→planner) to
  `plan-response` (planner→orchestrator)

### Current Format

**Step 2 — `agent-system` action (1,340 bytes)**:
```json
{
  "target": "agent-system",
  "params": {
    "components": [
      { "id": "user", "icon": "mobile", "label": "User", "status": "normal" },
      { "id": "orchestrator", "icon": "compute", "label": "Orchestrator", "status": "active" },
      { "id": "planner", "icon": "cloud", "label": "Planner (LLM)", "status": "active" },
      { "id": "executor", "icon": "layers", "label": "Tool Executor", "status": "normal" },
      { "id": "flight_api", "icon": "server", "label": "Flight API", "status": "normal" },
      { "id": "hotel_api", "icon": "server", "label": "Hotel API", "status": "normal" }
    ],
    "connections": [
      { "from": "user", "to": "orchestrator", "label": "Goal", "style": "solid", "active": false },
      { "from": "orchestrator", "to": "planner", "label": "Plan Request", "style": "solid", "active": true },
      { "from": "planner", "to": "orchestrator", "label": "Plan", "style": "dashed", "active": false },
      { "from": "orchestrator", "to": "executor", "label": "Tool Call", "style": "solid", "active": false },
      { "from": "executor", "to": "flight_api", "label": "", "style": "solid", "active": false },
      { "from": "executor", "to": "hotel_api", "label": "", "style": "solid", "active": false },
      { "from": "flight_api", "to": "executor", "label": "Observation", "style": "dashed", "active": false },
      { "from": "hotel_api", "to": "executor", "label": "Observation", "style": "dashed", "active": false },
      { "from": "executor", "to": "orchestrator", "label": "", "style": "dashed", "active": false },
      { "from": "orchestrator", "to": "user", "label": "Final Answer", "style": "dashed", "active": false }
    ]
  }
}
```

**Step 3 — `agent-system` action (1,340 bytes)**:
Identical to Step 2 except `connections[1].active: true → false` and
`connections[2].active: false → true`. The LLM re-emits all 1,340 bytes to
convey 2 boolean flips.

### Recommended Format

**Topology defined once in `visuals[0].initialState`** (add explicit IDs to
connections — this is a one-time schema addition):
```json
"connections": [
  { "id": "goal-flow",      "from": "user",          "to": "orchestrator", "label": "Goal",         "style": "solid",  "active": false },
  { "id": "plan-request",   "from": "orchestrator",  "to": "planner",      "label": "Plan Request", "style": "solid",  "active": false },
  { "id": "plan-response",  "from": "planner",       "to": "orchestrator", "label": "Plan",         "style": "dashed", "active": false },
  ...
]
```

**Step 2 — `agent-system` action (85 bytes)**:
```json
{
  "target": "agent-system",
  "params": {
    "componentStates": { "orchestrator": "active", "planner": "active" },
    "activeConnections": ["plan-request"]
  }
}
```

**Step 3 — `agent-system` action (85 bytes)**:
```json
{
  "target": "agent-system",
  "params": {
    "componentStates": { "orchestrator": "active", "planner": "active" },
    "activeConnections": ["plan-response"]
  }
}
```

**Per-step saving**: 1,340 B → 85 B = **94% per step**.

**Estimated full scene size**: ~31,500 bytes (~22% reduction uncompressed).
Over the wire with Gzip: ~5–6KB (87% total reduction from 40KB raw).

---

## 5. ISCL Lesson Applied

ISCL failed on four specific dimensions. Here is how the topology-split
approach avoids each:

| ISCL Failure Mode | What Happened | How Topology-Split Avoids It |
|-------------------|--------------|------------------------------|
| **Hallucinated command names** | LLM invented `SET_NODE_ACTIVE` when only `ACTIVATE_NODE` existed | No command names — `componentStates` and `activeConnections` are standard JSON keys, not a command vocabulary |
| **Missing required fields** | LLM omitted `target` parameter on commands | Both new params are optional (missing = use defaults); no required-field failure mode exists |
| **Command ordering errors** | LLM put `DEACTIVATE` before `ACTIVATE` within a step | No ordering — a flat map and a flat array have no sequence semantics |
| **Subtle semantic errors** | Correct command, wrong target ID; scene looked right but wasn't | Wrong ID is detectable if IDs are enumerated as `z.enum([...])` in the Zod schema; Structured Outputs prevents invalid IDs at generation time |

The additional structural difference: **ISCL required the LLM to learn a new
language.** The topology-split requires the LLM to write a shorter version of
the same JSON it already masters. The cognitive shift is minimal: "instead of
writing all 6 nodes every step, only list the active ones."

---

## 6. Top 3 Risks Before Committing

### Risk 1: AI prompt accuracy for the new format

The generation prompt must clearly communicate the new step format. The risk is
the LLM reverting to the verbose full-snapshot format because that is what
dominates its training context.

*How to validate*: Run 20 test generations with the updated prompt across
diverse topics (HLD, concept, DSA). Measure: (a) what % produce the compact
format vs reverting to full snapshots; (b) what % hallucinate non-existent IDs.
Target: >95% valid IDs, >90% using compact format consistently.

### Risk 2: Runtime state reconstruction correctness

The renderer currently receives a complete `components` + `connections` array
and renders it directly. With topology-split, a merge layer must reconstruct
full state per step: take `visuals[n].initialState`, apply `componentStates`
overrides, mark only `activeConnections` as active, default everything else.
Any bug in this merge (e.g., stale state from a previous step) creates
hard-to-diagnose visual errors that look correct locally but fail on certain
step sequences.

*How to validate*: Unit-test the merge function exhaustively. Run a migration
script to convert the existing 8 scenes to the new format, then do a
frame-by-frame visual comparison against the current renderer output.

### Risk 3: Migration of existing scenes and future status values

Eight existing AI-generated scenes use the verbose format and must be migrated.
A converter must handle: connections without IDs (need stable IDs assigned),
steps where zero components are active (empty `componentStates: {}`), and any
edge cases in DSA scenes that use different viz types.

Additionally: the current scenes use only `status: "active"` and
`status: "normal"`. If future scene types introduce `"error"`, `"warning"`, or
`"complete"` statuses, the `componentStates` map handles them naturally
(`{"node-1": "error"}`). Validate this in the Zod schema before committing to
avoid a second migration.

*How to validate*: Write the converter, run on all 8 scenes, verify visually.
Test a scene with a third status value before finalising the schema.

---

## Summary Recommendation

**Implement Layer 1 (topology-split) first.**

It is the highest-impact, highest-reliability change available. Implementation
steps:

1. Add explicit `id` fields to all connections in `visuals[n].initialState`
   across existing scenes (migration script).
2. Update the Zod schema: `system-diagram` step params accept
   `componentStates: Record<string, NodeStatus>` and
   `activeConnections: string[]` instead of full arrays.
3. Add a runtime merge layer that reconstructs full state from `initialState` +
   step overrides (merge, not patch — no index arithmetic).
4. Update the AI generation prompt to explain the compact step format with 2–3
   annotated examples.

This delivers 82% reduction on the highest-repetition section with zero new
cognitive load on the AI, avoids every ISCL failure mode, and leaves the door
open for Layer 2 (connection defaults) and Layer 3 (Gzip) once Layer 1 is
validated in production.
