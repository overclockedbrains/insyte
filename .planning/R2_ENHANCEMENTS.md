# R2 Enhancement Ideas

> Collected from the Phase 5 manual regression pass (April 2026).
> These are good ideas that are out of scope for R1. Revisit when planning R2 milestones.

---

## Canvas Interactivity

### Interactive Mode — Button-Triggered Visual Mutations
**Origin:** Bug #8 (controls don't work)

R1 buttons use `goToStep` — they jump to the step that demonstrates an operation. That's functional but not truly interactive.

R2 should support an `interactions` field on `Scene` that maps control events to arbitrary action lists, independent of step state:
```json
"interactions": [
  {
    "on": "btn-commit",
    "equals": "triggered",
    "actions": [
      { "target": "commit-graph", "action": "add-node", "params": { ... } }
    ]
  }
]
```
This enables a real "playground" mode where users build their own commit graphs, hash tables, etc. by pressing buttons — not just watching a scripted animation.

**Scope:** Requires new `interactions` field in `scene-engine` types + Zod schema, a `visualOverlayState` in the scene store (on top of step-computed state), and `applyInteractionActions()` in the store. Not trivial — R2.

---

### Draggable Canvas Nodes
**Origin:** Bug #14

Let users drag visual nodes (graph nodes, system diagram components) to rearrange them manually. Save positions to `localStorage` per scene slug.

Useful for: git-branching graph, system diagram visualizations, any GraphViz scene.

**Notes:** Framer Motion's `drag` prop makes this easy to add as an opt-in feature per primitive. Needs a `userPositions` override layer in the canvas renderer.

---

### Hover Tooltips on Canvas Elements
**Origin:** Bug #19

Each visual element should show a description tooltip on hover — what is this component, what does the current highlight state mean.

Could be driven by:
- A `tooltip?: string` field on each visual node/cell within the state
- Or a generic description in `visual.label` shown in a hovering popover

**Notes:** Phase 8 (chat + interactive layer) brings a tooltip primitive infrastructure — this is a natural addition there.

---

### Right-Click Context Menu on Canvas
**Origin:** Bug #20

Right-clicking a canvas element should show a context menu:
- "What is this?" → show description
- "Copy state" → copy current visual state as JSON
- "Highlight connected" → highlight connected nodes/edges

**Notes:** Good power-user feature. Keep scope small for initial impl — just "What is this?" is enough.

---

## Visual Design

### Different Node Types for Git (Branch vs Commit vs Tag)
**Origin:** Bug #17

Git branching visualization uses plain circle nodes for everything. Commits, branch pointers, and tags should have distinct visual shapes:
- Commit → filled circle
- Branch pointer → pill/rounded rectangle with branch name
- Tag → diamond or label pin
- HEAD → arrow pointer

**Notes:** Requires either extending `GraphViz` node shapes or introducing a dedicated `GitGraphViz` primitive for Phase 10 content pass.

---

### Code Visualization Side-by-Side (General)
**Origin:** Bug #22 (js-event-loop specifically)

For concept simulations that involve code execution (event loop, async patterns, closures), the `code-left-canvas-right` layout with an active-line code panel significantly improves comprehension. 

R1 fixes js-event-loop specifically (Phase 5.5 W7). For R2, evaluate all concept simulations for whether adding a code panel improves them, and author code snippets + `highlightByStep` mappings for those that do.

---

## Performance

### Canvas API / WebGL Rendering for Complex Scenes
**Origin:** Bug #7 (React DOM vs canvas API)

The R1 decision (Phase 2, DECISIONS.md) is React DOM + Framer Motion. This is the right call for R1 — developer velocity, accessibility, and animation quality outweigh performance concerns at current scene complexity.

For R2, if scenes with 50+ simultaneous animated nodes become common (large graph traversals, matrix operations), consider a hybrid approach:
- Keep React DOM for all UI chrome and simple primitives
- Introduce a `CanvasViz` or `WebGLViz` primitive for high-node-count simulations (number of islands on a 20×20 grid, large graph BFS)
- This is opt-in per primitive — no need to rewrite the whole engine

---

## UX

### Persistent Command Terminal Display
**Origin:** Bug #16 (extended)

R1 implements a HUD layer that pins TextBadge and Counter to fixed canvas positions. R2 could go further: a dedicated "terminal" strip at the bottom of the canvas that shows the current command being executed in a monospace, terminal-style component — with a blinking cursor and command history scrollback.

This is especially valuable for: git-branching, shell/OS simulations, DSA traces showing function calls.

---

## Visual Primitives (Deferred from R1)

### Complex Call-Stack Frame
**Origin:** FUTURE_IMPROVEMENTS.md

Support a complex `call-stack-frame` with local variables. While `StackViz` covers basic JS Event Loop simulation adequately for R1, more advanced scenarios may require detailed stack frame representations.

### Timeline / Sequence Diagram
**Origin:** FUTURE_IMPROVEMENTS.md

A `timeline` or `sequence-diagram` visualizer with swimlanes. This would be a natural R2 addition for simulating TCP handshakes, HTTP/2 multiplexing, and other similar temporal connection flows.

### String / Text-Stream Visualizer
**Origin:** FUTURE_IMPROVEMENTS.md

A `string` or `text-stream` visualizer with support for highlight ranges. This is an optimal choice for regex engine traces, tokenizers, or parser visualizations.

---

## Missing Implementation Carryovers (From R1)

### Server-Side API Key Logging Prevention
**Origin:** FUTURE_IMPROVEMENTS.md (Phase 7 Carryover)

The implementation of `generateSceneBrowserDirect.ts` to ensure that BYOK (Bring Your Own Key) credentials never touch the server during generation is missing and needs to be completed.

### Web Worker Deep Copy OOM Prevention
**Origin:** FUTURE_IMPROVEMENTS.md (Phase 9 Carryover)

Main thread OOM (Out of Memory) protection for Web Worker traces requires adding a `truncated: boolean` flag to `TraceData` along with a 1000-step guard limit in the execution sandbox. 

### Pyodide Initialization WASM Caching
**Origin:** FUTURE_IMPROVEMENTS.md (Phase 9 Carryover)

Improve WASM initialization times by caching Pyodide via a `CacheFirst` strategy using `@serwist/next`, which is currently uninstalled.

---

*Added: April 5, 2026. Source: Phase 5 manual regression (MANUAL_REGRESSION_BUGS.md).*
