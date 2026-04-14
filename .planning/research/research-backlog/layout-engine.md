# Layout Engine & Visual Placement

**Tier:** 2  
**Status:** Not yet researched

---

## The Problem

ELK (Eclipse Layout Kernel) is on a feature branch as of April 2026 — not merged to main. The current layout is hardcoded/manual. This is an active unresolved engineering problem.

But the deeper question isn't just "which layout library to use" — it's: **what properties does a layout algorithm need to have for algorithm step visualization specifically?**

General-purpose graph layout (Dagre, ELK, D3-force) optimizes for readability of a static graph. Insyte has a different and harder problem: the layout must remain **stable across animation steps** as the data structure changes. A binary tree node that's at position (300, 200) in step 3 should not jump to (450, 150) in step 4 just because the tree was rebalanced. Semantic continuity matters more than optimal geometry at any single step.

---

## Why It Matters to Insyte

- Broken layout is one of the most visually jarring things a user can encounter
- Manual positioning doesn't scale to AI-generated scenes — the AI has no idea where elements are
- Unstable layouts across steps break the user's mental model of the data structure
- ELK being on a feature branch means there's already investment here that needs a clear decision

---

## Questions Research Should Answer

1. **Layout stability** — what algorithms/strategies guarantee that nodes don't relocate between steps when their position hasn't semantically changed?
2. **Layout-per-primitive** — should arrays, trees, graphs, and stacks each use a different layout strategy? Almost certainly yes — what's the right one per type?
3. **ELK specifically** — what are ELK's layout options, and which algorithms are appropriate for which insyte visualization types (hierarchical tree → `layered`, graph → `stress`, array → no algorithm needed)?
4. **Incremental layout** — some layout engines support incremental updates (only recompute affected nodes). Does ELK? Does Dagre?
5. **Scene JSON integration** — should layout be computed at scene assembly time (Stage 5), at render time, or stored in the JSON? What does the Scene JSON need to carry for layout to work?

---

## Prior Art to Look At

- **ELK documentation** — layout algorithms, options, WASM build for browser
- **Dagre** — simpler, more widely used in browser, but less powerful
- **D3-force** — physics-based, terrible for stability, likely wrong choice
- **Cytoscape.js** — has multiple layout algorithms, good for interactive graphs
- **Graphviz WASM builds** — dot/neato/etc. in browser
- **Prior insyte research** — `phase-18-to-29/layout-and-visualization.md` already has some analysis here, read that first before doing new research

---

## What a Good Research Output Looks Like

- A clear decision: which layout library/algorithm per visualization primitive type
- A stability strategy: how to prevent node position jumps between steps
- A concrete answer on where layout computation happens in the pipeline
- Any Scene JSON schema changes needed to support the chosen approach
