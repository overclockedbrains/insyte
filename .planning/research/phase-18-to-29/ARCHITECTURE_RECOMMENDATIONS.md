# Insyte — Architectural Recommendations
## Deep Research Synthesis: Rendering, Layout, Visualization Quality & AI Pipeline

> **Date:** April 11, 2026  
> **Authors:** 4 parallel research agents + synthesis pass  
> **Status:** Decision-grade. Use this document to drive Phase 17+ planning.  
> **Source files:** `rendering-approach.md`, `layout-and-visualization.md`, `ai-pipeline.md`, `existing-tools-analysis.md`

---

## Executive Summary (Read This First)

All four research tracks converged on the **same three root causes** for every problem raised:

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| Broken AI diagrams | AI generates pixel positions — this is a category error | Remove all XY from AI output; add a layout engine pass |
| Dual coordinate system bugs | SVG edges in pixel space, DOM nodes in % space | Unify into one SVG viewBox coordinate space |
| AI pipeline unreliability | 10–20KB JSON generation = referential integrity failures + attention decay | Multi-step pipeline; each segment small and independently validable |

**What NOT to do:** Do not switch to Canvas or WebGL. This would be 40–60 days of work with no user-visible improvement and active regressions (accessibility, text rendering, DevTools). The rendering stack is correct. The data pipeline feeding it is wrong.

**The right move:** Fix the data layer (Scene JSON + AI pipeline) and fix the coordinate model. The renderer stays.

---

## Problem 1: Rendering Approach

### Verdict: Stay on React DOM + SVG + Framer Motion

The research examined Canvas 2D, WebGL, SVG-only, and hybrid approaches in detail. The conclusion is definitive:

**React DOM + SVG + Framer Motion is the correct rendering approach for Insyte's use case.** The current visual bugs are caused by a data model problem (dual coordinate systems), not a renderer problem.

#### Why not Canvas 2D?

| Concern | Reality |
|---------|--------|
| Performance | Insyte has 20–80 nodes max. Canvas outperforms DOM at 500+ nodes. There is no problem to solve here. |
| Unified coordinates | Canvas does give one coordinate space — but this is achievable in DOM+SVG too (unified viewBox). |
| Accessibility | Canvas is a black box to screen readers. You'd need a parallel ARIA tree. Insyte is an educational tool — accessibility matters. |
| Text rendering | Canvas text has no CSS, no wrapping, no rich labels without manual measurement and splitting. Dynamic step popup text would become complex. |
| React integration | Canvas + React requires `useRef` + `useEffect` imperative pattern. No DevTools, no React component tree, loss of Framer Motion springs. |
| Migration cost | 40–60 dev days for full rewrite. 18–21 days for partial (react-konva). No user-visible improvement. |

#### Why not WebGL?

WebGL is for 100,000+ element scenes, particle systems, or GPU shader effects. It is overkill by 3 orders of magnitude for Insyte's scene complexity and adds extreme implementation complexity (shader authoring, text atlas management). Not worth discussing further.

#### What to fix instead: The Dual Coordinate System Bug

**The actual root cause of edge/node misalignment:**

```
DOM nodes:  positioned at  left: ${pos.x}%  top: ${pos.y}%  (percentage of container)
SVG edges:  drawn at       x * SCALE_X px   y * SCALE_Y px  (pixels from SVG origin)
```

These are independent coordinate systems. On a 1440px wide monitor they look correct (if you've tuned `SCALE_X = 70` for that width). On a 1024px display the DOM nodes shift to different pixel positions but the SVG lines stay at the same absolute pixel positions. They misalign.

**The fix (Option A — recommended, ~8 dev days):**

Migrate graph/tree/system-diagram primitives from the current dual-system to a **single unified SVG viewBox**:

```tsx
// Instead of DOM nodes + separate SVG overlay:
<div style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%` }}>
  <NodeBody />
</div>
<svg style={{ position: 'absolute', inset: 0 }}>
  <line x1={a.x * SCALE_X} y1={a.y * SCALE_Y} x2={b.x * SCALE_X} y2={b.y * SCALE_Y} />
</svg>

// Use a single SVG with foreignObject for node bodies:
<svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
  {edges.map(e => <path key={e.id} d={computePath(e)} />)}
  {nodes.map(n => (
    <foreignObject key={n.id} x={n.x - nodeW/2} y={n.y - nodeH/2} width={nodeW} height={nodeH}>
      <NodeBody node={n} />  {/* full React/HTML inside foreignObject */}
    </foreignObject>
  ))}
</svg>
```

**Result:** Edges are `<path>` elements in the same SVG coordinate space as their node `foreignObject` containers. They always connect to node centers. The coordinate system is one, not two. Framer Motion continues to work inside `foreignObject` elements.

**Auto-fit viewBox after layout:**
```tsx
// After layout engine runs, measure actual bounding box and set viewBox:
const bbox = computeBoundingBox(nodes) // { minX, minY, maxX, maxY }
const padding = 40
const viewBox = `${bbox.minX - padding} ${bbox.minY - padding} ${bbox.maxX - bbox.minX + padding*2} ${bbox.maxY - bbox.minY + padding*2}`
```
This guarantees diagrams are never clipped, regardless of canvas container dimensions.

#### Comparison Table

| Dimension | React DOM + SVG (fixed) | React-Konva (Canvas) | Full Canvas Rewrite |
|-----------|------------------------|---------------------|-------------------|
| Dev time to fix positioning | 8 days | 18–21 days | 40–60 days |
| User-visible improvement | High (bugs fixed) | Same as fixed DOM | Same |
| Accessibility | Full | Poor | Poor |
| Text rendering quality | CSS-grade | Canvas-grade (worse) | Canvas-grade |
| Framer Motion spring physics | Yes | Requires GSAP | Requires GSAP |
| React DevTools | Yes | No | No |
| Animation capability | High | High with GSAP | High with GSAP |
| Zoom/pan for complex diagrams | Needs CSS transform viewport | Built into Canvas | Built into Canvas |

---

## Problem 2: Visualization Quality & Layout

### The Single Biggest Insight Across All Research

> **Every tool that reliably produces clean diagrams — Mermaid, DiagramGPT/Eraser, React Flow with dagre — uses the same architecture:**
>
> `AI → semantic topology → Layout Engine → pixel positions → Renderer`
>
> **If AI is generating pixel positions, your layout will always be broken. This is architectural, not fixable with better prompts.**

### What AI Should Generate vs What a Layout Engine Should Compute

| Currently (broken) | Target (correct) |
|--------------------|-----------------|
| `{ "id": "n1", "x": 3.5, "y": 0.5 }` | `{ "id": "n1", "label": "Client" }` |
| `{ "nodes": [...], "edges": [...] }` with AI-chosen positions | `{ "nodes": [...], "edges": [...] }` — positions computed by dagre |
| AI picks `SCALE_X * x` for SVG edges | Layout engine outputs pixel coords, SVG uses them |

### Layout Algorithm Recommendations Per Primitive

| Primitive | Algorithm | Library | Notes |
|-----------|-----------|---------|-------|
| `tree`, `recursion-tree` | Reingold-Tilford (d3.hierarchy) | `d3-hierarchy` (15KB) | Best quality for binary/N-ary trees; guarantees no overlap; Reingold-Tilford is the industry standard |
| `graph` | Sugiyama/dagre | `@dagrejs/dagre` (120KB) | Directed graphs, DAGs, state machines; minimizes edge crossings; deterministic |
| `system-diagram` | ELK Layered OR dagre | `elkjs` (lazy) or dagre | ELK produces better orthogonal routing (Lucidchart quality); dagre is simpler; lazy-load ELK in a Worker |
| `array` | Trivial linear (arithmetic) | None | `x = i * (cellWidth + gap)` — no library needed |
| `stack` | Trivial vertical (arithmetic) | None | `y = i * (itemHeight + gap)` |
| `queue` | Trivial horizontal (arithmetic) | None | Same as array |
| `linked-list` | Trivial horizontal (arithmetic) | None | Same as array; arrows point right |
| `hashmap` | Slot grid (arithmetic) | None | Fixed N bucket rows; key-value pairs in each row |
| `dp-table`, `grid` | Trivial 2D grid (arithmetic) | None | `x = col * cellW, y = row * cellH` |
| `text-badge`, `counter` | Slot positioning | None | Fixed positions: top-left, top-right, bottom, etc. |

**Install:**
```bash
pnpm add @dagrejs/dagre d3-hierarchy
# elkjs: lazy-load only when system-diagram is present
```
Total additional weight: ~145KB, lazy-loaded on scene mount.

### Scene JSON Changes Required

#### Remove positions from Visual interface
```typescript
// BEFORE (broken — AI must hallucinate positions)
export interface Visual {
  id: string
  type: VisualType
  position?: { x: number; y: number }  // ← DELETE THIS
  initialState: unknown
}

// AFTER (correct — layout engine computes positions at render time)
export interface Visual {
  id: string
  type: VisualType
  layoutHint?: LayoutHint           // ← AI sets algorithm hint
  slot?: SlotPosition               // ← for info primitives
  initialState: unknown
}

export type LayoutHint = 'dagre-TB' | 'dagre-LR' | 'dagre-BT' | 'tree-RT' | 'force' | 'radial'
export type SlotPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'overlay-top' | 'overlay-bottom'
```

#### Change graph/tree node format — remove x/y from initialState
```typescript
// BEFORE (AI must emit XY for graph nodes)
graph.initialState = {
  nodes: [{ id: "n1", label: "Client", x: 1, y: 2 }],  // ← x/y = hallucinated
  edges: [{ from: "n1", to: "n2" }]
}

// AFTER (AI emits topology only; layout engine computes positions)
graph.initialState = {
  nodes: [{ id: "n1", label: "Client" }],  // ← no positions
  edges: [{ from: "n1", to: "n2", label: "HTTP" }]
}
// positions computed by dagreLayout(nodes, edges) at render time
```

#### Add a LayoutEngine layer to the rendering pipeline

```typescript
// apps/web/src/engine/layout/index.ts
export function computeLayout(visual: Visual): PositionedVisual {
  switch (visual.type) {
    case 'tree':
    case 'recursion-tree':
      return applyD3HierarchyLayout(visual)
    case 'graph':
      return applyDagreLayout(visual, visual.layoutHint ?? 'dagre-TB')
    case 'system-diagram':
      return applyDagreLayout(visual, 'dagre-LR')  // left-to-right for system diagrams
    case 'array':
    case 'linked-list':
    case 'queue':
      return applyLinearLayout(visual)
    case 'stack':
      return applyStackLayout(visual)
    case 'dp-table':
    case 'grid':
      return applyGridLayout(visual)
    case 'hashmap':
      return applyHashmapLayout(visual)
    case 'text-badge':
    case 'counter':
      return applySlotLayout(visual)
  }
}
```

This layout pass runs once when the scene loads and after any step that adds/removes nodes. The output `PositionedVisual` has concrete pixel coordinates. The renderer consumes these — never coordinates from AI output.

### Animation Quality

**Keep Framer Motion.** The `layout` FLIP prop will animate nodes automatically when the layout engine recomputes positions (e.g., when a tree node is inserted and siblings shift). This gives VisualGo-quality smooth rearrangement for free.

**Add `useAnimate` for within-step choreography:**
```typescript
// VisualGo's key trick: break each step into sub-steps
// Step 3: "insert node" becomes:
//   1. highlight target slot (200ms)
//   2. animate new node in (300ms)
//   3. animate edge connection (200ms)
//   4. highlight result (100ms)
// Total: 800ms, but it feels like a smooth, readable sequence
```

Use Framer Motion's `animate()` function (not the component prop) for sequenced within-step animations:
```typescript
import { animate, stagger } from 'framer-motion'

async function playInsertAnimation(nodeRef: Element, edgeRef: Element) {
  await animate(nodeRef, { scale: [0, 1.1, 1], opacity: [0, 1] }, { duration: 0.3 })
  await animate(edgeRef, { pathLength: [0, 1] }, { duration: 0.2 })
  await animate(nodeRef, { backgroundColor: ['#7c3aed', '#1e1e2e'] }, { delay: 0.1 })
}
```

**Do not switch to anime.js.** Anime.js is excellent but Framer Motion already handles everything Insyte needs with better React integration and FLIP layout support. The correct move is using Framer Motion more correctly (within-step sequencing via `animate()` function, not just component props).

---

## Problem 3: AI → Visualization Quality

### Why AI Output Is Unreliable for Direct Rendering

The research identified seven distinct failure modes in the current pipeline:

1. **Attention decay on visual IDs** — by the time `steps[]` are generated (tokens 2000–5000), the model's effective attention on `visuals[].id` values (emitted at tokens 0–500) is statistically much weaker. Steps reference IDs that don't exist in visuals.

2. **Spatial reasoning is a category error** — LLMs have no model of 2D canvas space. They cannot detect node overlap, respect canvas bounds, or produce balanced layouts. XY coordinates emitted by LLMs are random numbers that happen to be in valid integer range.

3. **Structured output mode prevents syntax errors only** — OpenAI/Vercel `Output.object()` constrained decoding prevents malformed JSON, but `params` fields use `z.record(z.string(), z.any())`. Inside that open field, the model can emit anything. This is where most semantic failures occur.

4. **Referential integrity across a long document** — the schema requires step indices in explanations/popups to match the actual step count; action targets to match visual IDs; `highlightByStep` length to match step count. These are foreign key constraints. LLMs do not enforce relational constraints.

5. **All-or-nothing failure** — one Zod error anywhere in the 20KB document fails the entire generation. There is no partial recovery.

6. **Cognitive load overload** — 16 visual types, 5 action formats, cross-field consistency requirements — all in one generation pass. Cognitive load increases hallucination rates.

7. **Schema change brittleness** — adding one new visual type requires updating the prompt, the schema, the docs table, and all examples simultaneously.

### The Mermaid Insight — The Most Important Architectural Lesson

Mermaid **never** produces broken layouts because its input grammar **physically cannot express pixel positions**. There are no XY coordinates in Mermaid syntax. This means:

- The AI (when generating Mermaid) cannot hallucinate a broken position even if it tries
- The layout engine always runs, always produces collision-free output
- The diagram always fits its container (viewBox auto-fit)

**The lesson for Insyte: design the AI output format so that broken layout is impossible by construction, not by constraint.**

---

## Problem 4: AI Pipeline Rethink

### Current Pipeline (Why It Fails)

```
prompt → single AI call → 10–20KB Scene JSON → Zod → render
          └─ 4,000–8,000 output tokens
             └─ referential integrity failures
                └─ spatial hallucinations
                   └─ all-or-nothing failure
```

### Highest-ROI Immediate Fix (Ship Before Full Pipeline Redesign)

**Add `semanticValidate()` to catch cross-reference failures before they reach the renderer.**

This does not change the pipeline — it adds a validation layer that catches the most common failures and enables targeted single-field retries:

```typescript
// apps/web/src/ai/semanticValidate.ts
export interface SemanticError {
  path: string
  message: string
}

export function semanticValidate(scene: Scene): SemanticError[] {
  const errors: SemanticError[] = []
  const visualIds = new Set(scene.visuals.map(v => v.id))
  const stepCount = scene.steps.length

  // Check 1: step action targets must reference real visual IDs
  scene.steps.forEach((step, si) => {
    step.actions.forEach((action, ai) => {
      if (!visualIds.has(action.target)) {
        errors.push({
          path: `steps[${si}].actions[${ai}].target`,
          message: `Target "${action.target}" does not match any visual ID. Valid IDs: ${[...visualIds].join(', ')}`
        })
      }
    })
  })

  // Check 2: explanation step indices must be in bounds
  scene.explanation.forEach((exp, i) => {
    if (exp.appearsAtStep >= stepCount) {
      errors.push({
        path: `explanation[${i}].appearsAtStep`,
        message: `appearsAtStep ${exp.appearsAtStep} exceeds step count ${stepCount}`
      })
    }
  })

  // Check 3: popup step indices must be in bounds
  scene.popups.forEach((popup, i) => {
    if (popup.showAtStep >= stepCount) {
      errors.push({
        path: `popups[${i}].showAtStep`,
        message: `showAtStep ${popup.showAtStep} exceeds step count ${stepCount}`
      })
    }
    if (popup.hideAtStep !== undefined && popup.hideAtStep > stepCount) {
      errors.push({
        path: `popups[${i}].hideAtStep`,
        message: `hideAtStep ${popup.hideAtStep} exceeds step count ${stepCount}`
      })
    }
    if (!visualIds.has(popup.attachTo)) {
      errors.push({
        path: `popups[${i}].attachTo`,
        message: `attachTo "${popup.attachTo}" does not match any visual ID`
      })
    }
  })

  // Check 4: highlightByStep length must equal step count (DSA mode)
  if (scene.code?.highlightByStep) {
    if (scene.code.highlightByStep.length !== stepCount) {
      errors.push({
        path: 'code.highlightByStep',
        message: `Length ${scene.code.highlightByStep.length} must equal step count ${stepCount}`
      })
    }
  }

  return errors
}
```

**Use semantic errors to drive targeted retry:**
```typescript
// Instead of: full scene regeneration on any failure
// Do: send semantic errors back to AI with targeted fix request
if (semanticErrors.length > 0) {
  const fixPrompt = `The generated Scene JSON has the following semantic errors. Fix ONLY the affected fields:
${semanticErrors.map(e => `- ${e.path}: ${e.message}`).join('\n')}

Current scene (do not regenerate — patch it):
${JSON.stringify(problemFields, null, 2)}`
  // Retry only the broken segments
}
```

**Estimated impact: 40–60% reduction in visible failures with no pipeline architecture change.**

### The Target Multi-Step Pipeline

After the immediate fix stabilizes things, the full pipeline redesign looks like this:

```
Stage 1: Semantic Plan (~400 tokens output)
  ↓  AI declares: visual IDs + types, step count, narrative arc, controls
  ↓  Validate: IDs unique, types valid
  ↓  Output: { visuals: [{id, type}], stepCount: 9, narrative: "...", controls: [...] }

Stage 2a: Visual States (~600 tokens) — PARALLEL with 2b
  ↓  AI receives: visual ID list from Stage 1
  ↓  AI generates: initialState for each visual (no positions)
  ↓  Validate: correct params format per visual type

Stage 2b: Step Sequence (~2,000 tokens) — PARALLEL with 2a
  ↓  AI receives: visual IDs as a constrained enum in the prompt (model selects, not invents)
  ↓  AI receives: stepCount declared in Stage 1
  ↓  AI generates: steps[] with actions that reference those IDs
  ↓  Validate: all targets exist in visual ID list

Stage 3: Annotations (~900 tokens)
  ↓  AI receives: exact step count, visual IDs
  ↓  AI generates: explanation[] + popups[]
  ↓  Validate: all indices within bounds, all attachTo IDs valid

Stage 4: Misc (~300 tokens)
  ↓  AI generates: challenges[] + controls[] config
  ↓  Fully independent — no cross-references to validate

Stage 5: Deterministic Assembly (zero AI tokens)
  ↓  Merge all segments into Scene JSON
  ↓  Run Zod validation + semanticValidate()
  ↓  Run layout engine (dagre/d3-hierarchy) → compute XY positions
  ↓  Auto-fit SVG viewBox to computed layout bounding box
  ↓  Scene is ready to render
```

**Key properties of this pipeline:**

- Each segment is small (~400–2000 tokens) — well within the low-error zone
- Segments 2a and 2b run in parallel — wall-clock time similar to current approach
- Visual IDs are passed as input (in the prompt) to steps generation — model never needs to "remember" what it emitted
- Step count is passed as input to annotations — index bounds errors become impossible
- Positions are never generated by AI — layout engine computes them deterministically
- Failures are isolated: a bad step segment doesn't invalidate visuals or annotations
- Retry is targeted: only re-run the failed segment with the validation errors

**Wall-clock comparison:**
- Current pipeline: 6–8 seconds (single call, often fails)
- New pipeline: ~9–11 seconds (multiple calls with parallelism) but with dramatically higher reliability
- With streaming UX: skeleton appears immediately from Stage 1 output (~1.5s), nodes populate after Stage 2 (~4s), full scene ready after Stage 5 (~9s)

### Schema Redesign Alongside Pipeline

**Simplify the action format — eliminate the discriminated union:**

```typescript
// BEFORE: discriminated union that fails on any wrong branch
type Action = 
  | { action: 'set', target: string, params: {...} }
  | { action: 'push', target: string, params: {...} }
  | { action: 'pop', target: string, params: {...} }

// AFTER: one universal action type
interface Action {
  target: string           // validated against visual IDs from Stage 1
  params: Record<string, unknown>  // full state snapshot at this step
}
```

The move from discriminated action types to "send full state on every step" (which the current prompt already instructs) eliminates the action-type mismatch failures. Each step's `params` is the complete visual state — no branching, no wrong variant.

**Remove XY from schema entirely:**
```typescript
// Remove from Visual interface:
// position?: { x: number; y: number }  ← delete

// Remove from system prompt examples:
// "x": 1, "y": 1  ← delete from all graph/tree node examples
```

**Add a `layoutHint` to replace positions:**
```typescript
export interface Visual {
  id: string
  type: VisualType
  label?: string
  layoutHint?: 'dagre-TB' | 'dagre-LR' | 'tree-RT' | 'linear-H' | 'linear-V' | 'slot-center' | 'slot-top-left' | 'slot-top-right'
  initialState: unknown
  showWhen?: Condition
}
```

The AI selects a layout hint from a small enum — no numeric hallucination possible. The layout engine translates the hint to an algorithm.

### Prompt Engineering Guidelines

Based on the research, apply these immediately to the system prompt:

1. **Remove all XY examples from the prompt table:**
   ```
   # BEFORE (teaches AI to hallucinate positions):
   | graph | nodes + edges | { "nodes": [{ "id": "a", "x": 1, "y": 1 }] }
   
   # AFTER:
   | graph | nodes + edges | { "nodes": [{ "id": "a", "label": "A" }], "edges": [...] }
   # The layout engine computes x/y automatically. NEVER include x or y on nodes.
   ```

2. **Declare visual IDs explicitly at the top of the output:**
   ```
   # Add to prompt:
   Start the JSON with visuals[]. The IDs you assign there are the ONLY valid targets 
   for step actions, popup attachTo, and explanation references. Generate steps[] AFTER 
   visuals[] and copy the IDs exactly.
   ```

3. **Count steps explicitly before generating them:**
   ```
   # Add to prompt:
   Before generating steps[], state the exact step count you plan to use. Then generate 
   exactly that many steps. Use the same count for all appearsAtStep and showAtStep values.
   ```

4. **Reduce schema cognitive load** — move the full params table out of the system prompt into few-shot examples. The prompt table is ~1,200 tokens of cognitive overhead on every call.

---

## Summary: What to Build and In What Order

### Phase A — Immediate (no architecture change, high ROI)
**Estimated: 3–4 days**

1. **Add `semanticValidate()`** — catches visual ID reference errors, out-of-range step indices, popup attachTo mismatches. Use errors to drive targeted retry rather than full regeneration.
2. **Remove XY from system prompt examples** — stop teaching the AI to hallucinate positions. Add explicit instruction: "Never include x or y on graph/tree nodes."
3. **Add bounds clamping in CanvasCard** — `position.x = Math.max(0, Math.min(100, pos.x))` and same for Y — prevents off-screen overflow as a defensive measure.
4. **Fix SVG height bug in TreeViz/RecursionTreeViz** — give SVG an explicit computed height, remove `overflow: visible` on zero-height containers.

### Phase B — Coordinate System Fix (core rendering fix)
**Estimated: 8 days**

5. **Migrate graph/tree/system-diagram to unified SVG viewBox + foreignObject** — eliminates the dual coordinate system bug. Edges always connect to node centers. Works at any container size.
6. **Add auto-fit viewBox** — measure bounding box after layout, set viewBox to fit. Diagrams are never clipped.
7. **Add ResizeObserver-based popup anchoring** — popup positions track actual rendered node positions.

### Phase C — Layout Engine (the architectural fix)
**Estimated: 5–6 days**

8. **Remove `position` from Visual interface in scene-engine** — breaking change, requires updating all 24 Scene JSONs and the Zod schema.
9. **Add `layoutHint` and `slot` to Visual** — replace positions with semantic layout instructions.
10. **Implement `computeLayout()` dispatcher** — calls dagre for graphs, d3-hierarchy for trees, trivial arithmetic for arrays/stacks. Returns positioned visuals with concrete pixel coordinates.
11. **Wire layout engine into SceneRenderer** — layout runs once on scene mount; re-runs when step actions add/remove nodes.
12. **Update system prompt** — remove XY examples, add layoutHint enum, add explicit "never emit positions" instruction.
13. **Update all 24 Scene JSONs** — remove positions from graph/tree nodes, add `layoutHint` fields.

### Phase D — Multi-Step AI Pipeline (the quality ceiling fix)
**Estimated: 10–12 days**

14. **Implement Stage 1 (Semantic Plan)** — small first call that establishes visual IDs and step count as ground truth.
15. **Implement Stage 2a+2b in parallel** — visual states and step sequence with IDs as prompt input.
16. **Implement Stage 3 (Annotations)** — with exact step count as constraint.
17. **Implement Stage 4 (Misc)** — challenges, controls.
18. **Implement Stage 5 (Assembly)** — merge, validate, layout pass, emit.
19. **Update streaming UX** — skeleton from Stage 1, node populate from Stage 2, complete from Stage 5.

---

## Risk Analysis

| Change | Risk | Mitigation |
|--------|------|-----------|
| Remove positions from Scene JSON | Breaking change to all 24 hand-crafted scenes | Layout engine must produce identical output for trivial types (arrays, stacks) — validate against screenshots |
| Unified SVG viewBox | foreignObject has browser quirks (especially Safari text rendering) | Test on Safari. Fallback: absolute div + position:absolute child SVG for Safari if needed |
| Multi-step AI pipeline | Higher latency (~9–11s vs 6–8s) | Parallel stages 2a+2b keep wall-clock manageable; streaming UX hides most latency |
| Dagre for recursion-tree | Dagre treats it as DAG — may not produce ideal recursive-tree aesthetics | Use d3-hierarchy instead (Reingold-Tilford) which is purpose-built for trees |
| ELK for system diagrams | 2MB WASM bundle | Lazy-load in a Web Worker, only when a system-diagram visual is present |

---

## One-Paragraph Decision for Each Problem

**Rendering:** Stay on React DOM + SVG + Framer Motion. Migrate complex primitives (graph, tree, system-diagram) from the broken dual coordinate system (DOM % + SVG px) to a single unified SVG viewBox with `<foreignObject>` node bodies. This is ~8 days of focused work and eliminates the root cause of all edge/node misalignment bugs.

**Layout:** Remove all XY position fields from the AI output format and the Scene JSON schema. Add a layout engine layer (`computeLayout()`) that dispatches to dagre for graphs, d3-hierarchy for trees, and trivial arithmetic for linear structures. Add `layoutHint` and `slot` fields to Visual so the AI communicates layout intent without emitting coordinates. Auto-fit the SVG viewBox to the computed bounding box on every layout run.

**AI Quality:** Add `semanticValidate()` immediately for a 40–60% quick win. Then redesign the pipeline into 5 stages: semantic plan → parallel (visual states + steps) → annotations → misc → deterministic assembly. Each stage produces a small, independently validable JSON segment. Visual IDs are passed as prompt input to downstream stages — the model reads them rather than recalling them. Positions are computed by the layout engine in Stage 5, not generated by the AI at any stage.

**AI Pipeline:** The current `prompt → 20KB JSON → render` architecture is fundamentally flawed due to LLM attention decay, referential integrity requirements, and spatial reasoning impossibility. The fix is not better prompts — it is a different architecture. The five-stage pipeline above (with parallel stages 2a+2b) achieves similar wall-clock time while making each individual generation task small enough to be reliable. The layout engine eliminates the coordinate generation problem entirely.

---

## Further Reading

- [Rendering Approach — Full Analysis](./rendering-approach.md)
- [Layout & Visualization — Full Analysis](./layout-and-visualization.md)
- [AI Pipeline — Full Analysis](./ai-pipeline.md)
- [Existing Tools Analysis — Full Analysis](./existing-tools-analysis.md)
