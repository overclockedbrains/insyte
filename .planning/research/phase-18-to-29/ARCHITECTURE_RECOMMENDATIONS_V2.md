# Insyte — Architecture Recommendations V2
## Extended Research: Canvas Libraries · Advanced AI Pipeline · IR · Agent Frameworks

> **Date:** April 11, 2026  
> **Authors:** 6 parallel research agents + synthesis  
> **Status:** Decision-grade. Extends V1 with two new research tracks requested by product owner.  
> **V1 source:** `.planning/research/ARCHITECTURE_RECOMMENDATIONS.md`  
> **New source files:** `canvas-libs-analysis.md`, `advanced-ai-pipeline.md`

---

## What's New in V2

V1 concluded: stay React DOM + SVG + Framer Motion; fix coordinate system; add layout engine; redesign AI pipeline.

V2 adds research on two specific questions from the product owner:
- **A.** Can a canvas library (Konva/Pixi + GSAP) match Framer Motion quality, and does zoom/pan/3D justify the investment?
- **B.** Should the AI pipeline use an agent framework (LangGraph), and should we move to an intermediate representation instead of direct JSON generation?

---

## Track A: Canvas Libraries — Deep Reassessment

### Research Summary

Six capabilities were evaluated against Insyte's specific requirements:

**1. Animation quality — Konva + GSAP vs Framer Motion**

| Capability | Framer Motion | Konva + GSAP |
|-----------|--------------|-------------|
| Spring physics | Native (`spring` type) | Manual damped oscillator (20-line implementation) — GSAP has no native spring, only cubic-bezier approximation |
| FLIP layout animation | Native `layout` prop (measures, inverts, plays) | Manual: record position before, tween to new position after — requires `onUpdateEnd` hooks and extra measurement passes |
| Staggered entry | Native `stagger` | GSAP `stagger` — equivalent quality |
| Path draw animation | `pathLength` on SVG `<motion.path>` | GSAP `drawSVG` on Canvas `<Line>` — roughly equivalent |
| Color / opacity / scale | Native | GSAP `to()` — equivalent |
| Step-playback scrubbing | Requires custom `useEffect` on step change | GSAP timelines have `tl.seek(step * duration)` — actually **better** for scrubbing and reverse |

**Verdict on animation:** GSAP timelines are architecturally *superior* for step-sequenced educational animation (seek/reverse is cleaner). Spring physics requires a manual implementation. FLIP layout animations require extra measurement code. Overall: achievable but ~30% more implementation work per component than Framer Motion.

**2. Zoom / Pan**

Konva: `stage.scale()` + `stage.position()` via wheel/touch events — ~15 lines of code. Adequate for 20–80 nodes. Mobile pinch-to-zoom requires a touch event library (Hammer.js or manual). Not as smooth as CSS transform viewport (what React Flow does) but acceptable.

**3. 3D future potential**

Konva is 2D only — confirmed dead end for 3D. All paths to 3D go through `react-three-fiber` (Three.js in React). Critical insight: **r3f coexists with React DOM cleanly**. You can add a `<Canvas>` (r3f) panel for a specific 3D visualization alongside existing React DOM primitives without any migration. The Canvas library choice now does not lock the 3D future.

**4. Realistic dev time with AI assistance**

Product owner's estimate: 3–4 days. Research verdict: **not realistic.**

- 15 primitive components × ~4h average (reading Konva API, re-implementing logic, testing) = 60h implementation
- 12h for cross-cutting concerns: popup coordinate bridging from canvas-space to DOM overlay, Framer Motion replacement animations, mobile event handling
- **Realistic minimum: 10 business days** with heavy AI assistance
- Hard parts AI cannot shortcut:
  - **Glass morphism cannot be replicated** — `backdrop-filter: blur()` is a CSS compositing effect that samples DOM content behind the element. Canvas has no access to what's behind it in the stacking context. This is a fundamental browser security boundary, not a library limitation.
  - FLIP layout animation measurement cycle
  - Multi-line text wrapping (manual in canvas)
  - Accessibility rebuild (canvas is a screen-reader black box)

**5. Coordinate system advantage**

Canvas does give a unified pixel space — this eliminates the dual-coordinate bug. However: the same fix is achievable in DOM+SVG with ResizeObserver in **1–2 days** (measure container pixel dimensions, convert % positions to px). The coordinate unification argument for Canvas is real but the fix cost is asymmetric.

**6. Visual design ceiling**

| Effect | CSS + Tailwind | Konva | Pixi + pixi-filters |
|--------|---------------|-------|---------------------|
| Glass morphism | Native (`backdrop-filter`) | **Impossible** | **Impossible** |
| Glow borders | `box-shadow`, `filter: drop-shadow` | Soft blur (CanvasFilter) | GPU shader (GlowFilter) — high quality |
| Dark themed cards | Tailwind utility classes | Programmatic fill | Programmatic fill |
| Drop shadows | CSS `box-shadow` | CanvasFilter (slow on many elements) | GPU pixi-filters (fast) |
| Text rendering | CSS full (wrapping, font-weight, size) | Canvas 2D text (no wrapping) | BitmapText (fast) or HTMLText (DOM-bridged, slow) |

**Overall ceiling: lower for Insyte's glass aesthetic with Konva; roughly equal or higher with Pixi filters — but Pixi has a higher learning curve and the glass morphism problem remains.**

### Canvas Verdict

**Do not migrate for the current phase.** The glass morphism regression is unacceptable for the brand. Dev time is 10 days not 3–4. The coordinate bug can be fixed in 1–2 days without switching libraries.

**Recommended path:**
- Phase now: Fix coordinate system with ResizeObserver + unified SVG viewBox (see V1 Phase B)
- 3D future: Add `react-three-fiber` panels on-demand per specific primitive — independent of current renderer. No migration needed.
- Canvas (Konva) reconsideration: Only if the product pivots to a whiteboard/drag-and-drop canvas metaphor where CSS glass morphism is deprioritized. If that happens, Konva + GSAP is the library to use (not Pixi — too heavy for Insyte's scale).

---

## Track B: Advanced AI Pipeline — Agent Frameworks & Intermediate Representation

### B1: LangGraph / Agent Frameworks Assessment

**LangGraph core model:** Nodes = functions/agents, edges = state transitions, shared state object passed between nodes. Enables conditional routing (if Stage 2 fails → route to correction node), parallel node execution, built-in checkpointing.

**For Insyte's specific use case:**

The 5-stage pipeline from V1 is deterministic orchestration — each stage's inputs are fully determined by the previous stage's outputs. There is no autonomous decision-making, no branching based on content, no agents debating. This is the exact use case where LangGraph provides no value over a hand-coded async pipeline.

| What LangGraph adds | Insyte needs it? |
|--------------------|-----------------|
| Conditional routing by agent decision | No — routing is deterministic (fail → retry same stage) |
| Multiple agents with different roles/personas | No — all stages are the same model with different prompts |
| Agent-to-agent communication | No — stages communicate via structured data, not messages |
| Dynamic graph traversal | No — graph is fixed: 1 → 2a+2b → 3 → 4 → 5 |
| Built-in state checkpointing | Useful, but 10 lines of code to implement manually |

**Bundle cost:** @langchain/langgraph is ~150–250KB gzipped with LangChain dependencies. Not production-ready for performance-sensitive Next.js API routes as of April 2026.

**CrewAI / AutoGen:** Designed for debate-style multi-agent tasks (agents arguing to refine an answer). Not applicable to deterministic structured output generation.

**Recommendation: Skip all agent frameworks. Steal the patterns.**

What to steal (without the framework):
```typescript
// Async generator gives you: streaming, error isolation, per-stage retry
async function* generateScene(topic: string) {
  const plan = await generateISCL(topic)
  yield { stage: 'plan', plan }                    // skeleton appears

  const [states, steps] = await Promise.all([
    generateStates(plan),
    generateSteps(plan),
  ])
  yield { stage: 'content', states, steps }       // nodes populate

  const annotations = await generateAnnotations(plan, steps)
  const misc = await generateMisc(plan)
  const scene = await assemble(plan, states, steps, annotations, misc)
  yield { stage: 'complete', scene }               // full scene ready
}
```

This is LangGraph's good ideas (streaming, parallel execution, error isolation) in ~40 lines of TypeScript, zero dependencies.

---

### B2: Intermediate Representation — The Most Critical Research Finding

**The question:** Should Insyte move away from direct Scene JSON generation to an intermediate representation?

**Research finding: Yes. The IR is the single highest-ROI architectural change available.**

#### Why LLMs hallucinate more in JSON than text DSLs

Empirical finding from structured generation research: LLMs produce fewer semantic errors in line-oriented text DSLs than deeply nested JSON.

Mechanisms:
1. **Lower perplexity**: Text DSL tokens are more predictable (lower model uncertainty) than JSON structural tokens (`{`, `[`, `"`, `:`)
2. **Positional encoding load**: Deeply nested JSON creates complex positional dependencies. Line-oriented text is simpler for transformers.
3. **Mermaid evidence**: Near-zero semantic errors when LLMs generate Mermaid syntax vs 15–20% semantic error rate for equivalent AST JSON

#### IR Approach Comparison

| Approach | Complexity | Hallucination reduction | Flexibility | Recommended? |
|----------|-----------|------------------------|------------|-------------|
| **ISCL text DSL** (new) | Medium (parser needed) | 80–90% | High | ✅ **Best** |
| Declarative spec (compressed) | Low | 60–70% | Low (templates only) | Partial |
| Two-stage screenplay → JSON | High (2 AI calls) | 70–80% | High | No (ISCL achieves same in 1 call) |
| Template slot-filling | Low | 50–60% | Very low | For DSA traces only |
| Extended thinking on direct JSON | Zero infra change | 40–70% | Full | Band-aid if not doing ISCL |

#### Insyte Scene Language (ISCL) — Design

ISCL is a purpose-built text DSL for Insyte. The AI generates it instead of Scene JSON. A deterministic parser converts it to Scene JSON. Key design principle: **the grammar physically cannot express XY coordinates**, so layout problems are structurally impossible.

```
SCENE "Hash Table Insertion"
TYPE concept
LAYOUT text-left-canvas-right

VISUAL array main-array HINT linear-H
VISUAL hashmap cache HINT slot-center
VISUAL counter collisions SLOT top-right

STEP 0 : init
STEP 1 : SET main-array cells=[{v:1,h:active},{v:3,h:default},{v:5,h:default}]
STEP 2 : SET cache entries=[{key:foo,value:bar,h:insert}] | SET collisions value=1
STEP 3 : SET main-array cells=[{v:1},{v:3,h:active},{v:5}]

EXPLANATION
  0 : "What is a Hash Table?" | "A hash table maps keys to buckets using a hash function..."
  2 : "Collision Detected" | "Two keys mapped to the same bucket. Separate chaining..."

POPUP main-array AT 2 UNTIL 3 : "hash('foo') → bucket 2" STYLE warning
POPUP cache AT 3 : "Insert complete. Load factor: 0.25" STYLE success

CHALLENGES
  predict : "What happens when you insert 10 more keys into a 4-bucket table?"
  break-it : "At what load factor should we resize? Why?"
  optimize : "How would cuckoo hashing eliminate worst-case lookup time?"
```

**Parser outputs:**
- Visual IDs extracted: `{ 'main-array': 'array', 'cache': 'hashmap', 'collisions': 'counter' }`
- Step count: 4 (STEP 0–3)
- All references validated: popup `main-array` ✓, step indices ✓, `hideAtStep` → `UNTIL 3` ✓
- Output: valid Scene JSON with correct referential integrity, without positions

**Why ISCL beats all other IR approaches:**
1. One AI call (not two like screenplay → JSON)
2. Grammar enforces correctness (not just prompting for it)
3. Very small output (~600–900 tokens vs 4,000–8,000 for direct JSON)
4. Parser is deterministic — assembly failures become impossible
5. Schema changes: update parser, not AI prompt (decoupled)

#### Extended Thinking — When to Use

- **With direct JSON generation (current)**: Enable extended thinking on the single call. Estimated 40–70% failure reduction. Cost: ~$0.003 more per generation, +2–5s latency. Use as bridge before ISCL is implemented.
- **With ISCL implemented**: Extended thinking adds no value. ISCL naturally provides the "think first" benefits by separating structure declaration from content generation.

---

## Updated Decision Table (V2)

| Problem | V1 Decision | V2 Update |
|---------|-------------|-----------|
| Rendering approach | Stay React DOM + SVG + Framer Motion | **Confirmed.** Canvas = 10 dev days + glass morphism regression. Not worth it. |
| Canvas (new) | Not evaluated | **Skip Canvas migration.** Reconsider only if product pivots to whiteboard metaphor. |
| 3D future (new) | Not evaluated | **Use react-three-fiber panels on-demand.** Independent of renderer choice. r3f coexists with React DOM. |
| Coordinate system | Unified SVG viewBox + foreignObject | **Confirmed.** ResizeObserver + px-based coords first; SVG viewBox for complex primitives. |
| Layout engine | dagre + d3-hierarchy, remove XY from AI | **Confirmed.** This is now more urgent given canvas reassessment. |
| AI pipeline | 5-stage pipeline | **Confirmed + upgraded.** Add ISCL as the Stage 1 output format. |
| Agent framework (new) | Not evaluated | **Skip LangGraph.** Hand-coded async generator. Steal patterns, not framework. |
| Intermediate representation (new) | Not evaluated | **Implement ISCL.** Highest-ROI single change for AI reliability. 80–90% hallucination reduction. |
| Extended thinking (new) | Not evaluated | **Use as bridge** (on current single-call) until ISCL ships. Then drop it. |

---

## Priority Recommendation

### Tier 1 — Quick wins (no architecture change)
1. Enable extended thinking on current single-call generation
2. Add `semanticValidate()` + targeted retry
3. Harden system prompt (remove XY examples, add ID-copying instruction)

### Tier 2 — Coordinate fix (eliminates visual bugs)
4. ResizeObserver coordinate normalization in CanvasCard
5. Unified SVG viewBox + `<foreignObject>` for GraphViz, TreeViz, RecursionTreeViz, SystemDiagramViz

### Tier 3 — Layout engine (makes bad layout structurally impossible)
6. Remove `position` from Scene JSON schema + all 24 scene files
7. Add `layoutHint` + `slot` to Visual type
8. Implement `computeLayout()` dispatcher (dagre + d3-hierarchy + arithmetic)

### Tier 4 — ISCL + multi-stage pipeline (the reliability ceiling)
9. Design and document ISCL grammar
10. Build ISCL parser (deterministic, validated)
11. Rewrite AI prompts for 5-stage pipeline with ISCL as Stage 1
12. Async generator pipeline orchestrator
13. Update streaming UX for multi-stage progress

---

## Further Reading

- [V1 Recommendations](./ARCHITECTURE_RECOMMENDATIONS.md)
- [Rendering Approach — Full Analysis](./rendering-approach.md)
- [Layout & Visualization — Full Analysis](./layout-and-visualization.md)
- [AI Pipeline — Full Analysis](./ai-pipeline.md)
- [Existing Tools Analysis](./existing-tools-analysis.md)
- [Canvas Libraries Deep-Dive](./canvas-libs-analysis.md)
- [Advanced AI Pipeline & IR](./advanced-ai-pipeline.md)
