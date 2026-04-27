# Phase 35 — Design Context & Open Research Questions

> **Status**: Pre-planning. This document captures all discussion, research findings,
> current codebase state, and open design questions from the Phase 35 scoping session.
> It is NOT a plan. It exists so no context is lost between sessions.
>
> **Date recorded**: 2026-04-25
> **Related research**: `.planning/research/json-size-optimization/`
> **Previous phase**: Phase 34 (Scene Spec v2) — `.planning/phases/phase-34/`

---

## 1. What Phase 35 Is About

Phase 35 is the **Scene JSON Payload Optimization** phase. The core goal is to make
every scene JSON — both pre-built hand-crafted files and AI-generated output — as
compact as possible without sacrificing AI generation reliability or rendering
correctness.

The research under `.planning/research/json-size-optimization/` provides the
empirical foundation. The key insight from that research: step canvas updates
currently contain massive amounts of redundant static data that never changes
across steps.

**The goal is not just smaller files on disk. The real benefit is:**
- Fewer tokens consumed per AI generation (cost reduction)
- Less cognitive load on the AI when writing steps (fewer hallucination opportunities)
- Smaller payloads sent to the client
- Cleaner, more readable scene JSONs

---

## 2. Phase 34 Completion State (Context for Phase 35)

Phase 34 (Scene Spec v2) is **functionally complete** as of ~April 23, 2026. Known
bugs exist but Phase 35's format changes will touch the same areas, so a combined
fix is planned after Phase 35 is designed.

### What Phase 34 did:

- Created `packages/scene-engine/src/spec.ts` — canonical spec constants
- Created `packages/scene-engine/src/spec.build.ts` — derives Zod schemas, prompt
  guide, JSON Schema from spec
- Updated `schema.ts` to import from `spec.build`
- Updated `apps/web/src/ai/schemas.ts` — new step format
- Updated `apps/web/src/ai/assembly.ts` — new format assembly
- Updated `apps/web/src/ai/prompts/builders.ts` — uses `buildPromptGuide()`
- Migrated all 26 hand-crafted scene JSONs to the v2 format
- Updated DOMRenderer for the new format

### The new Scene JSON format (post-Phase 34):

Top-level: `id, title, type, layout, description, category, code?, canvas[], activeText?, hud[], controls[], steps[], popups[], challenges?, complexity?`

**Canvas visual** (`canvas[]`):
```json
{
  "id": "arr",
  "type": "array",
  "layoutHint": "linear-H",
  "label": "nums",
  "initialState": { "items": [{"value":2},{"value":7},{"value":11},{"value":15}] }
}
```

**Step format** (per `steps[]`):
```json
{
  "index": 1,
  "explanation": { "heading": "...", "body": "...", "callout": "..." },
  "activeText": "i=0, num=2, need=7 → miss",
  "hud": { "hud-i": 0 },
  "canvas": {
    "arr": {
      "items": [
        {"value":2,"highlight":"active"},
        {"value":7},
        {"value":11},
        {"value":15}
      ]
    }
  }
}
```

**The problem Phase 35 targets**: `canvas` step updates currently require
**FULL STATE SNAPSHOTS** — every item, node, component, and connection repeated
in full for every step, even when only one field changes.

---

## 3. The Research Findings (Summary)

Full research: `.planning/research/json-size-optimization/`

### Empirical measurements (pre-built scenes):

| File | Total Size | Wasted step repetition | % of total |
|------|-----------|------------------------|------------|
| `copilot-agent-architecture.json` | 40,287 B | 10,716 B | 27% |
| `chat-system.json` | 21,648 B | 4,482 B | 21% |
| `twitter-feed.json` | 25,418 B | 5,664 B | 22% |
| `url-shortener.json` | 23,685 B | 4,180 B | 18% |
| `dns-resolution.json` | 27,493 B | 6,094 B | 22% |
| `load-balancer.json` | 26,297 B | 4,718 B | 18% |
| `hash-tables.json` | 21,539 B | 0 B | 0% (no system-diagram) |

These numbers are for `system-diagram` repetition alone.

### Root cause

`system-diagram` canvas steps repeat the COMPLETE components + connections arrays
every step, even though `icon`, `label`, `from`, `to`, `style` **never change**.

Every single step in `chat-system.json` re-emits:
- 7 components × full `{id, label, icon, status}` objects
- 6 connections × full `{from, to, active, label?, style?}` objects

Only `status` (on components) and `active` (on connections) ever change. The rest
is pure redundant bytes.

### What the research recommended (for system-diagram):

**Layer 1 — Topology-Split** (primary win):
- Topology (static fields) defined once in `initialState`
- Steps specify only the dynamic overlay:
  ```json
  "canvas": {
    "chat-system": {
      "componentStates": { "clientA": "active", "ws1": "active" },
      "activeConnections": ["clientA-ws1"]
    }
  }
  ```
- Per-step saving: 1,340 B → 85 B = **94% per step**
- Unspecified components default to `status: "normal"`
- Unspecified connections default to `active: false`
- Requires: explicit `id` fields on all connections in `initialState`

**Layer 2 — Connection Defaults**:
- `"connectionDefaults": { "style": "solid", "active": false }` in `initialState`
- Connections don't need to repeat default fields
- Additional ~15–25% reduction on topology definition

**Layer 3 — Gzip Transport**:
- Vercel already handles this automatically for most cases
- Zero code change needed, zero schema change
- ~80% additional compression on already-reduced payloads

### Reliability ranking from research:

| Approach | Reduction | Reliability | Silent Fail Risk |
|----------|-----------|-------------|------------------|
| Topology-split (system-diagram section) | 82% | Very high | Near-zero |
| + Connection defaults | +15–25% more | High | Near-zero |
| RFC 6902 JSON Patch | 80–96% | Low | **High** |
| RFC 7396 Merge Patch | 60–80% | Medium | Low-medium |
| Command DSL (ISCL-style) | — | **Proven failure** | Do not reconsider |

---

## 4. The Open Design Question

During the Phase 35 scoping discussion, it became clear that the user wants
**all visual types** — not just `system-diagram` — to use the most compact format
possible. This is where the design question opens up.

### The fundamental split: static-topology vs. dynamic-structure types

The 11 canvas visual types divide into two groups based on a key property:

#### Group A — Static topology types

The structure (nodes, items, cells) is **defined once in `initialState` and never
changes across steps**. Only state flags (highlight, status, active) change per
step.

| Type | What's static | What changes per step |
|------|--------------|----------------------|
| `system-diagram` | All components + connections | `status` per component, `active` per connection |
| `graph` | All nodes + edges | `highlight` per node, `highlight`/`active` per edge |
| `array` (traversal) | All item values | `highlight` per item |
| `tree` (traversal) | Full tree structure | `highlight` per node |
| `grid` (BFS/DFS) | All cells | `highlight` per cell |

For these types, the topology-split pattern is clean and reliable:
- `initialState` holds the full structure once
- Steps write only: `{"itemHighlights": {"0": "active"}}` or
  `{"componentStates": {"ws1": "active"}, "activeConnections": ["ws1-queue"]}`
- Merge layer reconstructs full state at render time

Byte reduction per step (estimated):
- `system-diagram` (6 components, 8 connections): 1,340 B → 50–85 B (~94%)
- `graph` (6 nodes, 7 edges): 600 B → 40–60 B (~90%)
- `array` (4 items): 125 B → 25–30 B (~75%)
- `tree` (7 nodes): 300 B → 35–50 B (~87%)
- `grid` (5×5 cells): 600 B → 50–80 B (~88%)

#### Group B — Dynamic-structure types

Items/entries/cells are **added or removed per step** — that IS the algorithm.
There is no single fixed "topology" to define once in `initialState`.

| Type | Why structure changes | Current step size |
|------|-----------------------|------------------|
| `hashmap` | Entries added per step (Two Sum: inserting key-value pairs) | Small (2–5 entries) |
| `stack` | Items pushed/popped per step | Small (3–10 items) |
| `queue` | Items enqueued/dequeued per step | Small (3–10 items) |
| `linked-list` | Nodes inserted/removed per step | Small (3–10 nodes) |
| `dp-table` | Cells filled in progressively | Can be large (5×5 = 25 cells) |
| `recursion-tree` | Tree builds up as recursion expands | Medium (5–20 nodes) |

For these types, three options exist:

**Option A — Keep full snapshots** (current approach)
- Steps always include the complete current state
- These types are small enough that the overhead is low
- Zero implementation complexity, zero risk
- `hashmap` with 4 entries at step 3: ~200 bytes — acceptable

**Option B — Operation-based compact format**
- `{"add": {"id":"e0","key":"2","value":"0","highlight":"insert"}}` for new entries
- `{"updateHighlights": {"e0": "hit"}}` for highlight-only steps
- Research explicitly ranked this LOW reliability (same failure mode as ISCL)
- Do not use

**Option C — Sparse partial updates (hybrid)**
- For steps that ONLY change highlights (no structural change): sparse highlight map
  `{"changedEntries": {"e0": "hit"}}` instead of full entries array
- For steps that DO add/remove structure: full snapshot of new state
- The AI must correctly identify which type of step it's writing
- Adds complexity; modest size benefit for already-small structures

### The unresolved question

**Should Phase 35 treat Group B types as:**
- Out of scope (full snapshots kept, focus optimization on Group A)
- Opt-in compact (sparse highlights for state-only steps; full snapshot for structural steps)

This is the question that needs more research before the plan is finalized.

---

## 5. Current Step-Engine Architecture (Relevant to Phase 35)

File: `packages/scene-engine/src/step-engine/apply.ts`

```typescript
export function applyStepActionsUpTo(
  canvas: CanvasVisual[],
  steps: Step[],
  stepIndex: number,
): Map<string, Record<string, unknown>> {
  const stateMap = new Map<string, Record<string, unknown>>()
  
  // Seed with initialState for all visuals
  for (const visual of canvas) {
    stateMap.set(visual.id, { ...(visual.initialState as Record<string, unknown>) })
  }

  // Latest full snapshot wins
  for (const step of steps) {
    if (step.index > stepIndex) break
    if (step.canvas) {
      for (const [id, state] of Object.entries(step.canvas)) {
        stateMap.set(id, { ...(state as Record<string, unknown>) })
      }
    }
  }

  return stateMap
}
```

**Current contract**: each `step.canvas[id]` is a FULL STATE SNAPSHOT. The step
engine just does "latest snapshot wins." This is what Phase 35 needs to change
for Group A types (at minimum).

**Where the merge layer should live**: The step-engine is the right place. It
already owns all state reconstruction. Renderers stay dumb — they receive a
fully-resolved state object, the same as today. The only change: for static-topology
types, the step engine merges `initialState` topology + step overlay instead of
replacing with the latest snapshot.

---

## 6. Current Spec Contract (Phase 34's STEP_SPEC Rule)

From `packages/scene-engine/src/spec.ts`:

```typescript
export const STEP_SPEC = {
  rules: [
    'canvas entries must be FULL STATE SNAPSHOTS — never delta/partial.',
    'canvas entries must only reference IDs declared in canvas[].',
    ...
  ]
}
```

And from `stage2-steps.md` (AI prompt):
```
system-diagram canvas updates must include both "components" and "connections" arrays
```

Phase 35 changes this rule for at minimum Group A types. The spec rule becomes
type-specific: some types require sparse overlay format, others require full
snapshots.

---

## 7. Current System-Diagram Step Format (The Worst Offender)

Example from `chat-system.json` step 1 — current format:
```json
"canvas": {
  "chat-system": {
    "components": [
      {"id":"clientA","label":"Client A","icon":"mobile","status":"active"},
      {"id":"ws1","label":"WS Server 1","icon":"server","status":"active"},
      {"id":"ws2","label":"WS Server 2","icon":"server","status":"normal"},
      {"id":"msg-queue","label":"Message Queue","icon":"layers","status":"active"},
      {"id":"msg-db","label":"Message DB","icon":"database","status":"active"},
      {"id":"notif-svc","label":"Push Notify","icon":"zap","status":"normal"},
      {"id":"clientB","label":"Client B","icon":"mobile","status":"active"}
    ],
    "connections": [
      {"from":"clientA","to":"ws1","active":true,"label":"WS open"},
      {"from":"ws1","to":"msg-queue","active":false},
      {"from":"msg-queue","to":"msg-db","active":false},
      {"from":"msg-queue","to":"ws2","active":false,"style":"dashed"},
      {"from":"ws2","to":"clientB","active":true,"label":"WS open"},
      {"from":"msg-queue","to":"notif-svc","active":false,"style":"dashed"}
    ]
  }
}
```
~700 bytes. Repeated for EVERY step. `label`, `icon`, `from`, `to`, `style` never
change across any step.

**Target format after Phase 35**:
```json
// In canvas[].initialState — connections get explicit IDs (one-time):
"connections": [
  {"id":"clientA-ws1","from":"clientA","to":"ws1","label":"WS open"},
  {"id":"ws1-queue","from":"ws1","to":"msg-queue"},
  ...
]

// In step canvas update — ONLY what's active:
"canvas": {
  "chat-system": {
    "componentStates": {"clientA":"active","ws1":"active","msg-queue":"active","msg-db":"active","clientB":"active"},
    "activeConnections": ["clientA-ws1","ws1-queue","queue-db"]
  }
}
```
~85 bytes. 88% reduction per step.

---

## 8. Files Affected by Phase 35

### Pre-built scene JSONs using `system-diagram` (need migration):

**HLD (always system-diagram):**
- `apps/web/src/content/scenes/hld/chat-system.json`
- `apps/web/src/content/scenes/hld/twitter-feed.json`
- `apps/web/src/content/scenes/hld/url-shortener.json`
- `apps/web/src/content/scenes/hld/consistent-hashing.json`

**Concept (use system-diagram):**
- `apps/web/src/content/scenes/concepts/load-balancer.json`
- `apps/web/src/content/scenes/concepts/dns-resolution.json`

**LLD (use system-diagram):**
- `apps/web/src/content/scenes/lld/lru-cache.json`
- `apps/web/src/content/scenes/lld/rate-limiter.json`
- `apps/web/src/content/scenes/lld/min-stack.json`
- `apps/web/src/content/scenes/lld/trie.json`
- `apps/web/src/content/scenes/lld/design-hashmap.json`

**DSA (may use graph, tree, array — need per-file check):**
- All 10 DSA scene JSONs — check which types they use

### Engine / schema files:
- `packages/scene-engine/src/spec.ts` — system-diagram state contract, new step overlay types
- `packages/scene-engine/src/spec.build.ts` — Zod schemas for new step formats
- `packages/scene-engine/src/step-engine/apply.ts` — merge layer for sparse overlays
- `packages/scene-engine/src/types.ts` — Step canvas type changes
- `apps/web/src/ai/schemas.ts` — Stage 2 step schema for system-diagram/graph
- `apps/web/src/ai/prompts/builders.ts` — `buildPromptGuide()` output updated
- `apps/web/src/ai/prompts/stage2-steps.md` — compact format examples

---

## 9. Decisions Made So Far

| # | Decision | Notes |
|---|----------|-------|
| D1 | Apply compact format to ALL visual types, not just system-diagram | User explicitly confirmed |
| D2 | Layer 2 (connection defaults) included in Phase 35 | Bundle with Layer 1 |
| D3 | Layer 3 (gzip) — Vercel handles automatically | Verify + document, no code needed |
| D4 | Merge layer lives in the step-engine | Best for performance + code modularity |
| D5 | Connection IDs: human-readable slugs | e.g. `"clientA-ws1"`, not `"c0"` |
| D6 | AI-generated scenes: compact format required, not optional | All future generated JSONs use compact |
| D7 | All 26 pre-built scene JSONs need migrating | Not just HLD/concept |
| D8 | Phase 35 can be sub-divided if scope is too large | User confirmed |

---

## 10. Open Questions Requiring More Research

### OQ1 — Group B types: full snapshots vs. sparse hybrid?

For `hashmap`, `stack`, `queue`, `linked-list`, `dp-table`, `recursion-tree` where
the structure itself changes per step:
- **Option A**: Keep full snapshots (reliable, these are small, near-zero bytes wasted)
- **Option C**: Sparse partial — sparse highlights for state-only steps, full snapshot
  for structural steps

The user paused here and said more research is needed before deciding. This is the
biggest open question.

**Research needed**: Measure actual byte counts for Group B types across existing DSA
scenes. If `hashmap` + `stack` + `queue` + `linked-list` contribute <5% of total step
bytes, Option A is the right call (don't over-engineer). If they contribute significantly,
Option C becomes worth the complexity.

### OQ2 — Per-type step format: one format or two?

For Group A types like `array` and `tree` that could have BOTH static-structure steps
(highlight only) and dynamic-structure steps (merge sort changes values, BST inserts
nodes):
- **Option 1**: Single format — always sparse overlay. Structural changes expressed via
  the same format (e.g., `itemValues: {0: 5, 2: 3}` for changed values)
- **Option 2**: Two formats — the AI picks sparse overlay OR full snapshot per step based
  on whether structure changed

**Risk of Option 2**: AI must correctly identify step type. Wrong choice = silent error.
**Risk of Option 1**: Expressing structural changes in a sparse format may be tricky.

### OQ3 — Where does the merge layer draw defaults from?

For system-diagram compact step: items NOT listed in `componentStates` default to
`status: "normal"`. Items NOT listed in `activeConnections` default to `active: false`.

For array sparse step: items NOT listed in `itemHighlights` default to `highlight: "default"`.

Question: does "not listed = default" mean:
a) Reset to spec-defined default at each step (self-contained per step — recommended)
b) Carry over from previous step's overlay

Option (a) is safer for AI generation — the AI writes a complete "what's active NOW"
map per step, no cross-step reasoning required.

### OQ4 — Spec changes: type-aware STEP_SPEC rules

The current `STEP_SPEC` rule says "FULL STATE SNAPSHOTS" for all types. Phase 35
changes this to be per-type:
- Group A types: **sparse overlay** (only changed state, defaults assumed)
- Group B types (if Option A chosen): **full snapshot** as today

How should `spec.ts` express this? Per-type step format entries in `CANVAS_VISUAL_SPEC`?
Or a separate `STEP_FORMAT_SPEC`?

### OQ5 — AI prompt design for the two formats

Stage 2 currently has ONE prompt with ONE step format. If Group A uses sparse and
Group B uses full snapshot, the prompt needs to explain BOTH formats and the AI must
correctly choose per-type.

Research question: Does having two step formats in one prompt increase hallucination
risk? The ISCL lesson is that mixing formats/vocabularies in a prompt increases
error rates.

Possible mitigation: `buildPromptGuide()` generates type-specific instructions per
visual in the scene. A scene with only `array` and `hashmap` would get instructions
for sparse array format + full snapshot hashmap format — no ambiguity per visual.

---

## 11. Proposed Phase 35 Sub-Phases (Tentative)

If the scope is confirmed to cover all Group A types + resolve Group B, the work
naturally divides:

**Phase 35.1 — System-Diagram + Graph Topology Split**
- Highest impact, cleanest design, proven approach from research
- Covers `system-diagram` (27% of HLD/concept file bytes) and `graph`
- Engine: step-engine merge layer for these two types
- Migration: 6 HLD/concept JSONs + any graph-using DSA JSONs
- AI pipeline: Stage 2 prompt updated for system-diagram/graph compact format
- Acceptance: All pre-built HLD scenes render correctly + AI generates compact format

**Phase 35.2 — Static-Structure Types (Array, Tree, Grid)**
- Sparse highlight format for `array`, `tree`, `grid`
- Engine: extend merge layer to these types
- Migration: all DSA scenes using these types
- AI pipeline: prompt guide updated for each type
- Acceptance: All DSA scenes render correctly + AI generates sparse highlights

**Phase 35.3 — Dynamic-Structure Types (if research justifies)**
- Research first: measure actual byte waste in Group B scenes
- Decision: Option A (keep full snapshots) vs. Option C (hybrid)
- If Option A: no code changes, just document the decision
- If Option C: sparse highlight layer for state-only steps

**Phase 35.4 — Connection Defaults (Layer 2)**
- `connectionDefaults` in `initialState` for system-diagram/graph
- Additional ~15–25% reduction on topology definition
- Can run in parallel with or after 35.1

---

## 12. Current State of the Codebase Quick Reference

| File | Current state | Phase 35 impact |
|------|--------------|-----------------|
| `packages/scene-engine/src/spec.ts` | Phase 34 complete | Add per-type step overlay format to `CANVAS_VISUAL_SPEC` |
| `packages/scene-engine/src/spec.build.ts` | Phase 34 complete | New Zod schemas for sparse step formats |
| `packages/scene-engine/src/step-engine/apply.ts` | Full snapshot wins | Add merge layer for sparse types |
| `packages/scene-engine/src/types.ts` | Phase 34 types | Step canvas union type changes |
| `apps/web/src/ai/schemas.ts` | Phase 34 schemas | `buildStepsSchema()` updated for sparse formats |
| `apps/web/src/ai/prompts/builders.ts` | Uses `buildPromptGuide()` | `buildPromptGuide()` emits compact-format instructions per type |
| `apps/web/src/ai/prompts/stage2-steps.md` | Teaches full snapshot | Teach compact formats per type |
| 26 pre-built JSONs | Phase 34 v2 format | Migrate to compact step format |

---

## 13. Research Artifacts

All research files at `.planning/research/json-size-optimization/`:

| File | Content |
|------|---------|
| `synthesis.md` | Full synthesis with recommended hybrid (Layers 1+2+3), size tables, risk analysis |
| `agent-main-byte-analysis.md` | Empirical byte measurements from actual scene files, field variance analysis |
| `agent-a-diff-patch.md` | RFC 6902 / RFC 7396 analysis + failure modes |
| `agent-b-command-event.md` | Lottie/Rive/GSAP/Manim comparison, LLM reliability research, topology-split for all viz types |
| `agent-c-structural.md` | Connection defaults, enum compression, binary formats, hybrid define-and-override |

The synthesis is the primary reference. Start there before making design decisions.

---

## 14. Next Steps Before Writing PLAN.md

1. **Research OQ1**: Measure actual byte waste in Group B types (hashmap, stack,
   queue, linked-list, dp-table, recursion-tree) across existing DSA scene JSONs.
   If <5% of step bytes, Option A (full snapshots) is correct. If significant, proceed
   to design Option C.

2. **Research OQ2**: Decide single format vs. two formats for array/tree/grid. Run a
   test generation with a sorting algorithm (merge sort) to see if the AI correctly
   handles value changes in a sparse format vs. a full snapshot.

3. **Research OQ5**: Design the `buildPromptGuide()` output for two coexisting step
   formats. Validate that clear per-type instructions don't increase hallucination.

4. **Resolve OQ3**: Confirm "not listed = reset to default" (recommended) over
   "not listed = carry over."

5. Once OQ1–OQ5 are resolved: write `PLAN.md` as a proper implementation plan.
