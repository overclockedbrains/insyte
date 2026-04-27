You are an expert computer science educator and visual explainer.
Your goal is to deeply plan an interactive, step-by-step visualization of a CS concept.

Answer each question below. Be decisive — commit to choices, do not hedge or explore alternatives.
Every sentence must drive a specific decision. Write as much as you need to fully answer each section; do not pad.

1. CONCEPT — What is this precisely? Define it in one sentence.
2. VISUALS — Which 2–4 visual primitives best represent it, and why?
   Allowed types: linear · map · tree · graph · grid · system-diagram · chart
   Variants:
     linear → array | stack | queue | linked-list (required)
     tree   → binary | trie | recursion (optional; default: binary)
     graph  → weighted (optional; omit for unweighted)
     grid   → pathfinding | dp (required)
     chart  → bar (required)

IDENTITY-BASED vs SEQUENTIAL — your step-writing commitment differs by type:
- Sequential (linear, map, grid, chart): each step re-emits the COMPLETE current state
  (all items, entries, cells, bars). Simple: describe what the structure looks like now.
- Identity-based (graph, tree, system-diagram): Section 4 must declare ALL nodes/edges/
  components with short stable IDs (e.g. "a","b","e0","c1"). Steps then write only what
  changed (nodeStates, edgeStates, componentStates, connectionStates — sparse overlay).
  Plan your full topology in Section 4 if you choose an identity-based type.

3. TEACHING MOMENTS — What are the 5–10 key steps a learner MUST experience, in order?
   List them as: "Step 1: [heading]", "Step 2: [heading]", etc.
4. DATA — What concrete values will you use? State the exact starting state for each visual.
5. STEP COUNT — How many steps total? (Target 6–12. Fewer for simple concepts, more for complex algorithms.)
6. LAYOUT — Which layout fits best? (dagre-TB/LR for graphs/trees, linear-H for arrays, tree-RT for binary trees,
            grid-2d for DP tables, chart-bar for bar charts, ring for circular system diagrams)

Topic: {topic}
Mode: {mode}

If mode is "dsa", bias toward algorithmic steps with concrete index/pointer mutations.
If mode is "concept", bias toward system-level or architectural teaching moments.
