# Layout & Visualization Research
## Automatic Graph Layout and Animation Quality for Insyte

> Research date: April 11, 2026  
> Author: Research agent  
> Scope: Automatic layout algorithms, per-primitive layout strategies, animation quality, Scene JSON restructuring

---

## Executive Summary

The core diagnosis: **Insyte's AI generates pixel/grid positions for visual nodes, and this is the root cause of broken AI-generated scenes.** No LLM can reliably hallucinate coordinates that produce a clean, in-frame, non-overlapping diagram.

The correct architecture, used by every serious visualization tool (Mermaid, React Flow with dagre, algorithm-visualizer.org), is:

> **AI generates semantic structure → Layout engine computes positions → Renderer draws**

This document covers the full stack: which algorithms to use per primitive, how to restructure Scene JSON, which libraries to adopt, and how to achieve animation quality comparable to visualgo.net.

---

## Part 1 — Graph Layout Algorithms (Deep Technical Analysis)

### 1.1 Dagre (`@dagrejs/dagre`)

**What it is:** A JavaScript port of the Graphviz dot layout algorithm, purpose-built for directed acyclic graphs (DAGs). Used by React Flow, Mermaid.js (as its default renderer), and dozens of diagramming tools.

**How it works (the Sugiyama method):**
1. **Cycle removal** — any back-edges are temporarily reversed to make the graph acyclic.
2. **Layer assignment** — nodes are assigned to horizontal layers (ranks) using a longest-path algorithm. Nodes with no incoming edges go in layer 0 (top).
3. **Crossing minimization** — within each layer, node order is optimized using a median-based heuristic to minimize edge crossings (the Barth-Jünger-Mutzel algorithm).
4. **Coordinate assignment** — Brandes-Köpf algorithm assigns x coordinates so nodes are vertically aligned with their edges, balanced left/right.
5. **Edge routing** — edges are routed as polylines through virtual nodes placed between layers, giving the characteristic straight-then-bend routing.

**Output:** A graph object where every node has `{ x, y, width, height }` and every edge has a `points` array of waypoints.

**Quality characteristics:**
- Excellent for hierarchical / flow diagrams (compilers, state machines, dependency graphs)
- Nodes don't overlap (guaranteed by the algorithm)
- Minimizes edge crossings well for sparse graphs
- Consistent top-to-bottom or left-to-right directionality
- Struggles with dense graphs (many crossing edges) — the minimization is a heuristic, not optimal
- No support for circular layouts (hash rings, etc.)
- Edge bundling is not supported

**Key configuration options:**
- `rankdir`: `'TB'` (top-to-bottom), `'LR'` (left-to-right), `'BT'`, `'RL'`
- `nodesep`: minimum horizontal separation between nodes in the same rank (default 50px)
- `ranksep`: minimum vertical separation between ranks (default 50px)
- `edgesep`: separation between adjacent edges in the same rank
- `align`: `'UL'`, `'UR'`, `'DL'`, `'DR'` — shifts nodes toward a corner within their rank
- `marginx`, `marginy`: graph-level padding
- Per-node: `width`, `height` — dagre needs real pixel sizes to avoid overlap

**Bundle size:** ~120KB minified. Pure JavaScript, no WebAssembly.

**Verdict for Insyte:**
- **Best choice** for: `graph` type (general directed graphs), `system-diagram`, `recursion-tree` (as a DAG)
- **Not suitable for**: circular layouts, force-based organic graphs, simple linear structures

---

### 1.2 ELK.js (`elkjs`)

**What it is:** JavaScript port of the Eclipse Layout Kernel — a Java layout engine from the Eclipse IDE ecosystem. Substantially more powerful than dagre at the cost of complexity and bundle size.

**How it works:**
ELK exposes multiple layout algorithms as plug-in strategies. The most relevant:

1. **ELK Layered** (the flagship, analogous to Sugiyama/dagre but more capable):
   - Five-phase pipeline: cycle breaking → layering → crossing minimization → node placement → edge routing
   - Uses the Brandes-Rösnner layer assignment (smarter than longest-path for complex graphs)
   - Node placement: the Brandes-Köpf algorithm with quadrilateral bend minimization
   - Edge routing: supports orthogonal (Manhattan) routing with bend minimization — produces the clean right-angle connectors seen in Lucidchart and draw.io
   - Handles **port constraints** — edges can be forced to attach to specific sides of a node
   - Handles **hierarchical graphs** — compound nodes (nodes containing sub-graphs)

2. **ELK Force** (force-directed, based on KLay):
   - Good for undirected graphs where hierarchy doesn't matter
   - Produces organic, symmetric layouts
   - Can combine with layered (force for initial placement, then layered for hierarchy)

3. **ELK Radial** — circular/radial layouts, good for hash rings and ego-network graphs

4. **ELK Rectangle Packing** — packs rectangular nodes into a compact grid (useful for memory layout diagrams)

5. **ELK Stress** — stress-minimization layout (a variant of force-directed that minimizes graph-theoretic distance mismatches)

**Key differences from dagre:**
| Feature | Dagre | ELK Layered |
|---------|-------|-------------|
| Edge routing | Polyline | Orthogonal (Manhattan) or polyline |
| Port constraints | None | Full support |
| Hierarchical (compound) nodes | None | Full support |
| Edge labels | Basic | Positioned correctly with overlap avoidance |
| Self-loops | Broken | Handled |
| Bundle size | ~120KB | ~2MB (WebAssembly + WASM bridge) |
| Async API | Synchronous | Promise-based (WASM runs in worker) |
| Quality ceiling | Good | Excellent |

**ELK.js API pattern:**
```javascript
import ELK from 'elkjs/lib/elk.bundled.js'
const elk = new ELK()

const graph = {
  id: "root",
  layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN' },
  children: [
    { id: "n1", width: 120, height: 40 },
    { id: "n2", width: 120, height: 40 },
  ],
  edges: [
    { id: "e1", sources: ["n1"], targets: ["n2"] }
  ]
}

const layout = await elk.layout(graph)
// layout.children[i].x, layout.children[i].y are now set
// layout.edges[i].sections[0].startPoint, endPoint, bendPoints are set
```

**Verdict for Insyte:**
- **Best choice** for: `system-diagram` (orthogonal routing looks like Lucidchart), complex `graph` types, any diagram where edge routing quality matters
- The 2MB bundle is a concern — lazy-load in a Web Worker, only when a `graph` or `system-diagram` primitive is present
- For simpler cases (trees, small graphs), dagre is adequate and much lighter

---

### 1.3 Cola.js (WebCola)

**What it is:** A constraint-based layout engine by Microsoft Research, designed for interactive diagrams where the user can drag nodes and the layout "springs back" while respecting constraints.

**How it works:**
- Uses a gradient descent optimizer (the VPSC — Variable Placement with Separation Constraints — algorithm)
- Constraints are expressed as: "node A must be at least X pixels to the left of node B", "group G must contain nodes N1 and N2", etc.
- Runs iteratively — call `.start(30)` for 30 iterations of constraint solving
- The result is not a static layout but a live physics simulation that can be ticked

**What it adds over dagre/ELK:**
- Node overlap removal that respects user-defined groups
- Interactive dragging with constraint preservation (nodes stay in groups, edges don't cross group boundaries)
- Flow constraints: force nodes into a loose hierarchy without strict rank assignment
- Good for **undirected** graphs where you want some hierarchy but also organic feel

**When NOT to use:**
- If you need deterministic, reproducible layouts — cola is iterative/stochastic
- If you don't need interactivity — dagre/ELK are simpler
- For educational step-by-step animations — cola's output changes each iteration

**Verdict for Insyte (R2):** Not a priority for the current phase. Relevant if/when Canvas Interactivity (draggable nodes) is implemented. At that point, cola provides the best "drag and it snaps back" UX.

---

### 1.4 Force-Directed Layout (D3-force)

**What it is:** A physics simulation where nodes repel each other (charge force) and edges act as springs (link force), reaching an energy equilibrium.

**How it works:**
- Every tick: compute repulsion forces between all node pairs (Barnes-Hut tree for O(n log n))
- Compute spring forces pulling linked nodes toward their rest length
- Apply centering force to prevent drift
- Integrate velocities with friction (alpha cooling) until equilibrium

**When it produces good results:**
- Undirected, organic-feeling graphs (social networks, knowledge graphs)
- Small to medium graphs (< 200 nodes) where exact positioning doesn't matter
- When users expect an organic, non-hierarchical layout

**When it fails:**
- DAGs, trees, flow graphs — force layout destroys the hierarchical signal
- Large graphs (> 300 nodes) — computation gets slow without a worker
- Educational animations — the layout is non-deterministic, so the same graph looks different every render, breaking reproducibility

**Verdict for Insyte:** Only appropriate for the hash-ring / consistent-hashing style graph (circular, undirected). For everything else (trees, DAGs, flow graphs), dagre or ELK is better. Do not use as the default layout.

---

### 1.5 Hierarchical Layout — The Sugiyama Method (for Trees/DAGs)

The Sugiyama method is the theoretical foundation behind dagre, ELK Layered, and Mermaid's layout. Worth understanding directly:

**Phase 1 — Cycle Removal:**
For a DAG this is a no-op. For general graphs, DFS is used to identify back-edges, which are reversed.

**Phase 2 — Layer Assignment:**
Each node gets a layer (rank). Two strategies:
- *Longest path*: assign every source to layer 0, then BFS forward. Nodes go as far down as possible. This is what dagre uses — fast, O(V+E).
- *Network simplex*: minimizes total edge length using a simplex-like optimizer. This is what ELK Layered uses — slower but produces tighter layouts.

**Phase 3 — Crossing Minimization:**
Within each pair of adjacent layers, reorder nodes to minimize edge crossings. This is NP-hard in general. Heuristics used:
- *Barycenter / median*: for each node, compute the average position of its neighbors in the adjacent layer; sort by this value. Two-pass (top-down then bottom-up), repeated until stable.
- Dagre uses barycenter. ELK uses a more sophisticated variant.

**Phase 4 — Coordinate Assignment:**
Assign actual x coordinates (nodes have a y from their layer). The Brandes-Köpf algorithm is the gold standard:
- Produces "block" alignments where nodes align with their dominant edges
- Four alignment passes (upper-left, upper-right, lower-left, lower-right), then balanced
- Guarantees minimum width

**Phase 5 — Edge Routing:**
Route edges through their waypoints. Options:
- Straight lines (fastest, least readable for long edges)
- Polylines through virtual nodes (dagre's default)
- Orthogonal routing (ELK) — all segments are horizontal or vertical, looks "professional"

---

### 1.6 Reingold-Tilford Algorithm (Binary Trees)

Specifically for drawing binary trees, the Reingold-Tilford (RT) algorithm (1981, refined by Buchheim-Jünger-Leipert in 2002) is the canonical solution.

**The core idea:**
- Position the tree so each node is centered over its children
- Position subtrees as close to each other as possible (compactness)
- Each subtree should look the same regardless of where it is in the tree (aesthetics)

**The algorithm:**
1. **Post-order traversal** to assign preliminary x positions:
   - Leaf nodes: assign x = 0 (relative to parent)
   - Internal node: center x between its two children's x positions
   - If that causes overlap with a neighbor subtree, shift the subtree right and record a "modifier" value

2. **Pre-order traversal** to apply accumulated modifiers:
   - Each node's final x = preliminary x + sum of all ancestor modifiers

3. **Y positions** are simply `depth * levelHeight`

**Result:** An O(n) algorithm that produces the aesthetically canonical binary tree layout — symmetric, compact, aligned by depth.

**Buchheim-Jünger-Leipert (2002 extension)** — fixes the O(n²) worst-case of the original RT algorithm, making it truly O(n) for N-ary trees.

**For Insyte's TreeViz:**
Currently, the AI provides pre-computed `x, y` coordinates (grid units). This should be replaced with a tree structure definition (parent-child relationships only), and an RT layout engine computes positions automatically.

---

### 1.7 Orthogonal Layout for System Diagrams

Orthogonal (or "Manhattan") routing routes all edges as horizontal-vertical segments only, with no diagonal lines. This is the visual standard for UML, architecture diagrams, and tools like Lucidchart, draw.io, and Microsoft Visio.

**Why it matters:**
- Diagonal lines in system diagrams look amateurish
- Orthogonal lines are much easier to read in complex diagrams
- The human eye follows right-angle turns more easily than arbitrary curves

**How to achieve it:**
- **ELK Layered with orthogonal edge routing** is the production-quality choice
- A simpler alternative: route a cubic Bézier with `controlPoint.x = target.x, controlPoint.y = source.y` — this is what SystemDiagramViz already does (the S-curve). It's a reasonable approximation.
- True orthogonal routing (like Lucidchart) requires a proper routing algorithm (e.g., the edge-crossing-aware orthogonal connector from the RAG paper). ELK provides this.

---

## Part 2 — Specialized Per-Primitive Layout

### 2.1 Array

**Layout:** Trivially 1D horizontal. No external library needed.
- N cells, each W pixels wide with G pixels gap
- Total width = N * (W + G) - G
- Center the entire row horizontally in the canvas

**Current state:** ArrayViz renders horizontally from data — position is fine. No x/y needed in JSON.

**Change required:** Remove `position` from array visuals entirely. The renderer centers the array automatically.

---

### 2.2 Stack and Queue

**Layout:** Trivially 1D vertical (stack) or horizontal (queue).
- Stack: items stacked bottom-to-top, each H pixels tall
- Queue: items laid out left-to-right

**Change required:** No x/y needed. Layout is implicit from the visual type.

---

### 2.3 Linked List

**Layout:** 1D horizontal chain with arrow connectors between nodes.
- N nodes, each W wide with arrow gap G between them
- Auto-wrap to multiple rows if N > threshold (e.g., > 8 nodes)

**Change required:** Remove x/y from linked-list nodes. Position is computed from node order (the array index in `nodes[]`).

---

### 2.4 Tree (Binary and N-ary)

**Algorithm:** Reingold-Tilford (RT) for binary trees; Buchheim-Jünger-Leipert for N-ary.

**Library options:**
1. **d3-hierarchy** (`d3.tree()`) — implements the RT algorithm for N-ary trees. Returns `{ x, y }` for each node normalized to [0,1]. Scale to canvas size. This is the best option: 8KB, pure JS, battle-tested.
2. **Custom RT implementation** — ~100 lines of code, zero dependency. Feasible.
3. **Dagre** — can handle trees (as DAGs) but overkill; d3-hierarchy is purpose-built.

**Input format AI should produce:**
```json
{
  "type": "tree",
  "initialState": {
    "root": {
      "id": "n1", "value": "8",
      "left": {
        "id": "n2", "value": "3",
        "left": { "id": "n4", "value": "1", "left": null, "right": null },
        "right": null
      },
      "right": {
        "id": "n3", "value": "10",
        "left": null,
        "right": null
      }
    }
  }
}
```
The renderer calls `d3.tree().size([canvasWidth, canvasHeight])(d3.hierarchy(root))` to get positions. **No x/y in JSON.**

**Note:** Currently TreeViz already uses a nested `root` format in the AI prompt (the scene-generation prompt shows `"root": { "value": "8", "left": null, ... }`). However TreeViz.tsx reads `nodes[]` with pre-computed x/y. There is a mismatch — the prompt says one format, the component expects another. This should be unified to the recursive root format with auto-layout.

---

### 2.5 Graph (Arbitrary Directed/Undirected)

**Algorithm:** Dagre for directed graphs; D3-force for undirected/organic graphs.

**Decision tree:**
- If edges have direction AND concept is hierarchical (BFS levels, dependency graph, state machine): **use dagre**
- If undirected AND semantic positions matter (hash ring, network topology): **use a circular/custom layout**
- If undirected AND organic feel wanted: **use D3-force** (but only for this case)

**Input format AI should produce:**
```json
{
  "type": "graph",
  "layoutHint": "dagre-LR",
  "initialState": {
    "nodes": [
      { "id": "a", "label": "A" },
      { "id": "b", "label": "B" }
    ],
    "edges": [
      { "from": "a", "to": "b", "directed": true }
    ]
  }
}
```
The renderer calls dagre with `rankdir: LR` and maps the output `{ x, y }` to DOM positions. **No x/y in JSON.**

The `layoutHint` field tells the renderer which algorithm and direction to use — this is semantic metadata the AI can reliably produce.

---

### 2.6 Recursion Tree

**Algorithm:** The recursion tree IS a tree (children are recursive calls). Use d3-hierarchy's tree layout.

Special handling:
- Memoized nodes should still appear in their correct tree positions (not collapsed)
- The tree is revealed incrementally (step by step) — the layout should be computed for the final full tree upfront, then nodes fade in at the right steps

**Input format AI should produce:** Same recursive `root` structure as the `tree` type. The `RecursionTreeViz` can share the same layout computation logic as `TreeViz`.

---

### 2.7 System Diagram (HLD/LLD)

**Algorithm:** ELK Layered with orthogonal edge routing (best quality) OR dagre (acceptable quality, lighter).

**Practical recommendation:** Start with dagre (rankdir: TB or LR). Upgrade to ELK for orthogonal routing when visual quality becomes a priority.

**Input format AI should produce:**
```json
{
  "type": "system-diagram",
  "layoutHint": "dagre-TB",
  "initialState": {
    "components": [
      { "id": "client", "label": "Client", "icon": "web" },
      { "id": "lb", "label": "Load Balancer", "icon": "layers" },
      { "id": "s1", "label": "Server 1", "icon": "server" }
    ],
    "connections": [
      { "from": "client", "to": "lb" },
      { "from": "lb", "to": "s1" }
    ]
  }
}
```
No x/y. The renderer runs dagre/ELK and assigns positions before mounting.

---

### 2.8 DP Table and Grid

**Layout:** Trivially computed from rows/cols.
- Cell size = fixed (e.g., 48x48px)
- Total width = cols * (cellSize + gap)
- Total height = rows * (cellSize + gap)
- Center in canvas

**Change required:** No x/y. Position is fully derived from the grid dimensions.

---

### 2.9 HashMapViz, CounterViz, TextBadge

**Layout:** These are information-display primitives, not graph primitives. They don't need layout algorithms. They should be positioned relative to the canvas using a simple slot system (top-left, top-right, bottom-left, etc.) or stacked vertically.

**Change required:** Instead of pixel x/y, the Visual gets an optional `slot` field:
```json
{ "id": "op", "type": "text-badge", "slot": "top-center" }
```
Available slots: `"top-left"`, `"top-center"`, `"top-right"`, `"bottom-left"`, `"bottom-center"`, `"bottom-right"`, `"left-center"`, `"right-center"`.

The renderer maps slots to absolute CSS positions (e.g., `top-center` → `top: 16px; left: 50%; transform: translateX(-50%)`).

---

## Part 3 — How Existing Tools Achieve Visual Quality

### 3.1 Mermaid.js

Mermaid takes abstract graph DSL → renders to SVG automatically. Key architectural lessons:

**How Mermaid uses dagre:**
1. Parse the Mermaid DSL text (e.g., `graph TD; A-->B; B-->C`) into an in-memory graph object
2. Call `dagre.layout(g)` where `g` is a `graphlib.Graph` instance with node widths/heights set
3. After dagre assigns `{ x, y }` to each node, render SVG nodes at those positions
4. Render edges by following `g.edge(e).points` (the polyline waypoints dagre computed)

**The key insight Mermaid demonstrates:**
- The DSL author only writes *topology* (who connects to whom)
- Mermaid's parser determines node *sizes* from label text length
- Dagre determines *positions* from sizes + topology
- The author never specifies a single pixel coordinate

This is exactly the architecture Insyte needs for AI-generated scenes.

**Mermaid's quality strengths:**
- Deterministic — same input always produces same output
- In-frame — dagre's coordinate space is bounded by the graph's total size
- Clean — nodesep/ranksep defaults are carefully tuned

---

### 3.2 React Flow with Dagre

React Flow (xyflow) is the leading React diagramming library. Its dagre integration pattern is instructive:

```javascript
import dagre from '@dagrejs/dagre'

const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))
dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 })

// Add nodes with their measured DOM sizes
nodes.forEach((node) => {
  dagreGraph.setNode(node.id, {
    width: node.measured?.width ?? 150,
    height: node.measured?.height ?? 40,
  })
})

edges.forEach((edge) => {
  dagreGraph.setEdge(edge.source, edge.target)
})

dagre.layout(dagreGraph)

// Apply computed positions back to React Flow nodes
const layoutedNodes = nodes.map((node) => {
  const nodeWithPosition = dagreGraph.node(node.id)
  return {
    ...node,
    position: {
      x: nodeWithPosition.x - (node.measured?.width ?? 150) / 2,
      y: nodeWithPosition.y - (node.measured?.height ?? 40) / 2,
    },
  }
})
```

**Critical detail:** Dagre positions nodes by their center. React Flow expects top-left. You must subtract half the node dimensions. The Insyte renderer must do the same conversion.

---

### 3.3 algorithm-visualizer.org

Algorithm Visualizer (github.com/algorithm-visualizer/algorithm-visualizer) takes a different approach from Insyte:

**Architecture:**
- Users write JavaScript/C++/Java code with tracer annotations embedded
- The tracers record state changes: `Array1DTracer`, `GraphTracer`, `LinkedListTracer`, etc.
- The trace is replayed in the browser as an animation

**Layout approach:**
- Each tracer has its own built-in layout. `GraphTracer` uses D3-force for general graphs.
- Layout is computed once when the trace starts, then node positions are fixed for the animation
- There is no AI — positions are deterministic from the tracer type

**Animation approach:**
- Replay is step-based: apply the next trace event, transition the visual
- Uses D3 for SVG manipulation with D3 transitions for animation
- Transitions are sequenced manually (await each one before applying next)

**What Insyte can learn:**
- The "tracer per data structure" model maps cleanly to Insyte's primitive system
- Auto-layout per tracer type eliminates position hallucination
- The step-replay model is identical to what Insyte already does

---

### 3.4 VisualGo.net

Visualgo (visualgo.net) is widely considered the gold standard for DSA animation quality.

**Why Visualgo's animations feel so clean:**
1. **Purposeful staging** — animations never all happen at once. Each element animates in sequence: first the pointer moves, then the value changes, then the highlight fires. The human eye can follow the story.
2. **Consistent timing** — all transitions use the same easing curve and similar durations. There's no jarring mix of fast and slow elements.
3. **Spatial stability** — node positions never change during the animation. The layout is fixed, and only state (color, value) changes. Moving a node AND changing its value in the same step is avoided.
4. **Semantic colors** — each highlight color has a consistent meaning throughout a session. Active = orange, visited = blue, current = red. Users learn the color language.
5. **Speed control** — all animations respect a global speed multiplier. The timing is always clean at any speed because the animation uses duration-based transitions, not frame-count-based.

**Visualgo's technical implementation:**
- jQuery + custom animation framework (legacy codebase)
- SVG for graph drawings with manual coordinate computation
- Step-by-step replay driven by a pre-computed state sequence
- Each animation is a single property tween (color, position, or value, never all three simultaneously)

**Key lesson for Insyte:** Framer Motion is already handling the animation mechanics well. The issue is animation *choreography* — multiple visuals changing at the same time with no sequencing. The step system needs to support sub-step sequencing (stagger) within a single step.

---

### 3.5 Eraser.io / DiagramGPT

Eraser.io's DiagramGPT generates Mermaid or Eraser DSL, not pixel coordinates. This is the exact architecture Insyte needs.

**How it constrains AI output:**
- The LLM is prompted to output a domain-specific language (Mermaid flowchart syntax)
- The DSL is parsed and validated before rendering
- Invalid DSL → retry with error context
- Positions are never in the LLM output — the layout engine (dagre, via Mermaid) computes them

**LucidChart's AI features** work similarly — the AI produces entity-relationship descriptions or flowchart step lists, and LucidChart's layout engine computes positions.

**Key takeaway:** AI output is always abstract/semantic. Never coordinate-based. This is the design principle Insyte must adopt.

---

## Part 4 — The Key Insight: AI Should Not Generate Positions

### Current vs. Proposed Data Flow

**Current (broken):**
```
User query → AI → Scene JSON with x/y coords → Renderer
```
Problem: AI halluccinates x/y → nodes overlap, go off-canvas, form ugly layouts

**Proposed (correct):**
```
User query → AI → Scene JSON with semantic topology → Layout Engine → x/y coords → Renderer
```

### What Intermediate Format the AI Should Generate

**For graph-type visuals (graph, system-diagram, recursion-tree, tree):**

The AI should produce:
- Node list with IDs and labels (and type/icon metadata)
- Edge list with source/target IDs
- A `layoutHint` string that tells the layout engine which algorithm to use

The AI should NOT produce:
- `x`, `y` coordinates on nodes
- Any pixel values related to positioning

**For trivial-layout visuals (array, stack, queue, linked-list, dp-table, grid):**
- These have no layout decisions. Position is 100% derived from the data structure.
- Remove `position` from these Visual types entirely.

**For canvas-placement of multiple visuals:**
- Instead of `position: { x: 50, y: 40 }` (percentage of canvas), use a `slot` system
- The canvas is divided into named regions. Each visual is assigned to a slot.
- The slot system is human-readable, reliable, and AI-friendly

### Proposed Scene JSON Changes

**Visual interface changes:**

```typescript
// BEFORE (current)
export interface Visual {
  id: string
  type: VisualType
  label?: string
  position?: { x: number; y: number }  // ← AI-generated, unreliable
  initialState: unknown
  showWhen?: Condition
}

// AFTER (proposed)
export type CanvasSlot =
  | 'center'
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'left-center' | 'right-center'

export type LayoutHint =
  | 'dagre-TB'   // dagre, top-to-bottom
  | 'dagre-LR'   // dagre, left-to-right
  | 'dagre-BT'   // dagre, bottom-to-top
  | 'tree-RT'    // Reingold-Tilford tree layout
  | 'circular'   // circular/ring layout (for hash rings)
  | 'force'      // D3-force (undirected, organic)
  | 'grid'       // regular grid (dp-table, 2D arrays)
  | 'linear-H'   // 1D horizontal (arrays, linked lists)
  | 'linear-V'   // 1D vertical (stacks)

export interface Visual {
  id: string
  type: VisualType
  label?: string
  slot?: CanvasSlot          // ← replaces position for info primitives
  layoutHint?: LayoutHint    // ← tells layout engine which algorithm to use
  initialState: unknown
  showWhen?: Condition
}
```

**Example AI-generated graph visual (after change):**
```json
{
  "id": "bfs-graph",
  "type": "graph",
  "label": "Graph",
  "slot": "center",
  "layoutHint": "dagre-LR",
  "initialState": {
    "nodes": [
      { "id": "s", "label": "S" },
      { "id": "a", "label": "A" },
      { "id": "b", "label": "B" },
      { "id": "c", "label": "C" }
    ],
    "edges": [
      { "from": "s", "to": "a", "directed": true },
      { "from": "s", "to": "b", "directed": true },
      { "from": "a", "to": "c", "directed": true },
      { "from": "b", "to": "c", "directed": true }
    ]
  }
}
```

**Example AI-generated tree visual (after change):**
```json
{
  "id": "bst",
  "type": "tree",
  "label": "Binary Search Tree",
  "slot": "center",
  "layoutHint": "tree-RT",
  "initialState": {
    "root": {
      "id": "n1", "value": "8", "highlight": "default",
      "left": {
        "id": "n2", "value": "3", "highlight": "default",
        "left": { "id": "n4", "value": "1", "highlight": "default", "left": null, "right": null },
        "right": null
      },
      "right": {
        "id": "n3", "value": "10", "highlight": "default",
        "left": null, "right": null
      }
    }
  }
}
```

**Example AI-generated system-diagram (after change):**
```json
{
  "id": "arch",
  "type": "system-diagram",
  "label": "System Architecture",
  "slot": "center",
  "layoutHint": "dagre-TB",
  "initialState": {
    "components": [
      { "id": "client", "label": "Client", "icon": "web" },
      { "id": "lb", "label": "Load Balancer", "icon": "layers" },
      { "id": "s1", "label": "Server 1", "icon": "server" },
      { "id": "s2", "label": "Server 2", "icon": "server" }
    ],
    "connections": [
      { "from": "client", "to": "lb" },
      { "from": "lb", "to": "s1" },
      { "from": "lb", "to": "s2" }
    ]
  }
}
```

### What This Means for the Layout Engine

A new module `apps/web/src/engine/layout/` should be created with:

```
layout/
  index.ts          — main entry: layoutScene(scene) → Scene with computed positions
  dagre-layout.ts   — applies dagre to graph/system-diagram nodes
  tree-layout.ts    — applies d3-hierarchy RT to tree/recursion-tree nodes
  linear-layout.ts  — computes positions for array/stack/queue/linked-list
  grid-layout.ts    — computes positions for dp-table/grid
  slot-layout.ts    — maps CanvasSlot → absolute CSS coordinates
```

The `SceneRenderer` calls `layoutScene(scene)` once on mount (or when a new scene is loaded), producing a "hydrated" scene with real pixel positions that the primitive components render directly.

---

## Part 5 — Animation Quality

### 5.1 anime.js — Key APIs and Quality Characteristics

Anime.js is a lightweight (~17KB) JavaScript animation library with a clean, declarative API.

**Core API:**
```javascript
import anime from 'animejs'

// Basic tween
anime({
  targets: '#node-a',
  translateX: 250,
  duration: 800,
  easing: 'easeInOutQuad',
})

// Timeline (sequenced animations)
const tl = anime.timeline({ easing: 'easeOutExpo', duration: 600 })
tl.add({ targets: '#pointer', translateX: newX })
  .add({ targets: '#node', backgroundColor: '#ff6b6b' }, '-=300') // overlap by 300ms

// Staggered animations
anime({
  targets: '.node',
  scale: [0, 1],
  delay: anime.stagger(50),
  duration: 400,
})
```

**Why anime.js produces high-quality animations:**
1. **Timeline with overlaps** — the `.add(props, '-=delay')` syntax allows overlapping animations, which is what makes multi-element animations feel choreographed rather than robotic
2. **SVG path animation** — `anime({ targets: 'path', strokeDashoffset: [anime.setDashoffset, 0] })` draws SVG paths progressively
3. **Spring physics** — `easing: 'spring(mass, stiffness, damping, velocity)'` — proper spring physics without a physics engine
4. **Stagger** — `anime.stagger(50)` applies increasing delays to a set of targets — produces the "cascade" effect
5. **Reversible** — `.reverse()` on a timeline plays it backwards, useful for undo/step-back

**Comparison to Framer Motion for step-based animations:**

| Criteria | anime.js | Framer Motion |
|----------|----------|---------------|
| Timeline sequencing | Excellent (first-class) | Manual (orchestrate prop) |
| React integration | None (imperative) | Native (declarative) |
| SVG animation | Excellent | Limited |
| Bundle size | ~17KB | ~100KB |
| Spring physics | Supported | Excellent (default) |
| Layout animations | None | Excellent (AnimatePresence, layout prop) |
| Step-back (reverse) | Easy (timeline.reverse()) | Requires manual state recompute |
| Learning curve | Low | Medium |

**Verdict for Insyte:** Framer Motion is already in use and is the right choice for **component-level** animations (node enter/exit, highlight state changes). Its `layout` prop and `AnimatePresence` are excellent for these cases and tightly integrated with React's state model.

However, for **multi-step choreography** within a single step (e.g., "pointer moves → value updates → highlight fires" in sequence), Framer Motion's orchestration is awkward. A small wrapper utility using `async/await` + Framer Motion's `useAnimate` hook can solve this without adding anime.js as a dependency.

---

### 5.2 GSAP vs Framer Motion for Step-Based Educational Viz

**GSAP (GreenSock Animation Platform):**
- Industry standard for complex, sequenced animations
- The `gsap.timeline()` API is the best timeline API available in JavaScript
- `ScrollTrigger`, `Flip` (auto-detect layout changes and animate between them), `DrawSVG`
- Superior performance on SVG manipulation
- Licensing: free for most uses, commercial license required for SaaS products (notable for Insyte)
- Bundle: ~80KB (core) + plugins

**Framer Motion:**
- Best React-native animation library
- `layout` prop: when a component re-renders with a new position/size, Framer automatically FLIP-animates between old and new (this is exactly what layout changes look like)
- `AnimatePresence` for mount/unmount animations
- `useAnimate` hook for imperative sequencing
- Spring physics are the default — feels natural
- No licensing concerns

**For Insyte specifically:** Framer Motion's `layout` prop is extremely valuable for the auto-layout refactor. When the layout engine recomputes positions and the tree re-renders, Framer Motion will automatically animate nodes from their old positions to new positions — this is exactly the "algorithm visualization" animation that would take complex imperative code in GSAP.

**Decision:** Continue with Framer Motion. Add `useAnimate` for within-step sequencing.

---

### 5.3 How Good Educational Viz Tools Sequence Animations

**The three-phase model (used by VisualGo and algorithm-visualizer.org):**

Every meaningful step in an educational visualization should follow:
1. **Focus** — highlight what is about to change (pointer moves, element glows)
2. **Action** — the operation occurs (value changes, edge is drawn, node moves)
3. **Result** — show the outcome (new highlight color, result badge)

In Framer Motion terms, this maps to:
- Phase 1: animate `boxShadow` or `borderColor` change (instant visual cue)
- Phase 2: animate the value change (scale up, then back)
- Phase 3: animate to the settled state (success/error color)

This three-phase model should be encoded in how the primitives handle highlight transitions, not in the Scene JSON itself.

**What makes VisualGo feel clean (technical breakdown):**
1. **Single property per frame** — VisualGo never animates position AND color simultaneously. Insyte should follow this: if a node moves and changes color in the same step, stagger them.
2. **Fixed node positions** — the node graph layout never changes. Only states change. This spatial stability is what makes the animation readable.
3. **Semantic highlights** — consistent color meanings across all scenes. Insyte's current highlight system (`'active'`, `'insert'`, `'remove'`, `'hit'`, `'miss'`) is already correct.
4. **Speed control that works** — VisualGo applies speed as a global multiplier on all animation durations. Insyte's playback controls should feed a `speedMultiplier` to Framer Motion's `transition.duration`.
5. **Text narration synced to animation** — the explanation text and code highlight change in sync with the visual animation, not before or after it. Insyte's step-based system already supports this but timing could be tightened.

---

### 5.4 Framer Motion Specific APIs for Insyte

**`layout` prop — the auto-layout killer feature:**
```tsx
// When a node's parent re-renders and its CSS position changes,
// Framer Motion automatically detects the position delta and animates
<motion.div layout key={node.id} style={{ top: node.y, left: node.x }}>
  {node.label}
</motion.div>
```
When the layout engine runs and updates positions, adding `layout` to all node `<motion.div>` elements means the animation from old to new positions is free — no code needed.

**`AnimatePresence` — for node add/remove:**
```tsx
<AnimatePresence>
  {nodes.map(node => (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
    />
  ))}
</AnimatePresence>
```
This makes node insertion/deletion visually explicit — a critical affordance in DSA animations.

**`useAnimate` — for within-step sequencing:**
```tsx
const [scope, animate] = useAnimate()

async function applyStep(step) {
  // Phase 1: focus
  await animate('#pointer', { scale: 1.3 }, { duration: 0.15 })
  // Phase 2: action
  await animate('#node-value', { opacity: 0 }, { duration: 0.1 })
  setNodeValue(step.newValue)
  await animate('#node-value', { opacity: 1 }, { duration: 0.15 })
  // Phase 3: result
  await animate('#node', { backgroundColor: successColor }, { duration: 0.3 })
}
```

**`staggerChildren` with `variants` — for cascade effects:**
```tsx
const containerVariants = {
  visible: { transition: { staggerChildren: 0.05 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

<motion.div variants={containerVariants} animate="visible">
  {cells.map(cell => (
    <motion.div key={cell.id} variants={itemVariants} />
  ))}
</motion.div>
```
This produces the "array cells appear one by one" effect that VisualGo uses for initialization.

---

## Part 6 — Recommendations for Insyte

### 6.1 Library Picks by Visual Type

| Primitive | Layout Algorithm | Library | Notes |
|-----------|-----------------|---------|-------|
| `array` | Linear horizontal | None (trivial) | Remove position from JSON |
| `stack` | Linear vertical | None (trivial) | Remove position from JSON |
| `queue` | Linear horizontal | None (trivial) | Remove position from JSON |
| `linked-list` | Linear horizontal + auto-wrap | None (trivial) | Remove position from JSON |
| `dp-table` | Grid | None (trivial) | Remove position from JSON |
| `grid` | Grid | None (trivial) | Remove position from JSON |
| `tree` | Reingold-Tilford | `d3-hierarchy` | Use recursive root structure |
| `recursion-tree` | Reingold-Tilford | `d3-hierarchy` | Same as tree, share layout logic |
| `graph` | Sugiyama (dagre) | `@dagrejs/dagre` | Add `layoutHint` to Visual |
| `system-diagram` | Sugiyama (dagre) or ELK | `@dagrejs/dagre` → ELK later | Start with dagre, upgrade to ELK for orthogonal routing |
| `hashmap` | Slot-based | None (slot system) | Use `slot: "center"` |
| `counter` | Slot-based | None (slot system) | Use `slot` for placement |
| `text-badge` | Slot-based | None (slot system) | Use `slot` for placement |
| `bezier-connector` | N/A | Framer Motion | Positions derived from connected visuals |

**Dependencies to add:**
```bash
pnpm add @dagrejs/dagre d3-hierarchy
pnpm add -D @types/dagre
```
Total additional bundle: ~130KB (dagre) + ~15KB (d3-hierarchy) = ~145KB, lazy-loaded on scene mount.

---

### 6.2 How to Restructure Scene JSON

**Phase A — Immediate wins (no breaking changes):**
1. Add `layoutHint?: LayoutHint` to the `Visual` interface (optional field, backward compatible)
2. Add `slot?: CanvasSlot` to the `Visual` interface (optional field)
3. Update the AI generation prompt to stop providing x/y for graph/tree/system-diagram types
4. Update the AI prompt to provide `layoutHint` instead
5. Build the layout engine module that runs on scene load

**Phase B — Breaking changes (coordinate with hand-crafted scenes):**
1. Remove `position` from `Visual` interface (was optional, rarely used correctly anyway)
2. Migrate all 24 hand-crafted Scene JSONs to use `slot` + `layoutHint`
3. Update `SceneRenderer` to run the layout engine before rendering
4. Update primitive components to remove their hardcoded `SCALE_X/SCALE_Y` constants

**Migration of hand-crafted scenes:**
- The 24 pre-built scenes use positions that were hand-tuned. For `array`, `stack`, `queue` types: positions are irrelevant (layout is trivial). Remove them.
- For `tree` and `graph` types: the pre-built scenes already provide x/y relative grid coordinates. These scenes will need migration to use the recursive root format (tree) or position-less node lists (graph) + layoutHint.
- For `system-diagram` scenes: migrate from raw x/y pixel positions to component lists + connectionlists + layoutHint.

---

### 6.3 AI Prompt Changes Required

**Remove from the AI generation prompt:**
- All examples that show `"x": 1, "y": 1` on graph/tree/system-diagram nodes
- Instructions to place `position: { x, y }` on visuals

**Add to the AI generation prompt:**
- `layoutHint` field documentation with allowed values
- `slot` field documentation with allowed values
- Instruction: "Never provide x or y coordinates on nodes. The layout engine computes positions."
- Updated examples showing the semantic-structure format for each visual type

**Updated params table (excerpt for the prompt):**
```
| tree           | root (recursive)      | { "root": { "id": "n1", "value": "8", "highlight": "default", "left": {...}, "right": null }, "layoutHint": "tree-RT" } |
| graph          | nodes + edges + layoutHint | { "nodes": [{ "id": "a", "label": "A" }], "edges": [{ "from": "a", "to": "b" }], "layoutHint": "dagre-TB" } |
| system-diagram | components + connections + layoutHint | { "components": [...], "connections": [...], "layoutHint": "dagre-LR" } |
```

---

### 6.4 Animation Approach

**Keep:** Framer Motion for all component-level animations. The `layout`, `AnimatePresence`, spring physics, and `variants` APIs are the right tools.

**Add:** A lightweight `useStepAnimator` hook that sequences within-step animations using `useAnimate`:
```typescript
// apps/web/src/engine/hooks/useStepAnimator.ts
// Wraps Framer Motion's useAnimate with a step-sequencing API
// Allows: await animator.focus(target) → animator.action(target) → animator.settle(target)
```

**Tuning recommendations:**
1. All transitions should reference `settings.animationSpeed` (a value in `settings-store.ts`) as a duration multiplier
2. Node position changes (when auto-layout runs) should use `layout` prop for free FLIP animation
3. Highlight changes should use spring physics (natural, snappy)
4. SVG edge drawing (new edges appearing) should use `pathLength` animation (currently done correctly)
5. The step timer (`duration` field on steps) should use the same speed multiplier

---

### 6.5 Implementation Priority Order

**Sprint 1 — Foundation (highest impact):**
1. Install `@dagrejs/dagre` and `d3-hierarchy`
2. Build `apps/web/src/engine/layout/` module
3. Add `layoutHint` + `slot` to `Visual` interface (additive, non-breaking)
4. Implement dagre layout for `graph` and `system-diagram`
5. Implement d3-hierarchy layout for `tree` and `recursion-tree`
6. Update `SceneRenderer` to call layout engine on scene load
7. Update AI prompt to stop generating x/y for these types

**Sprint 2 — Migration:**
1. Update `TreeViz` and `RecursionTreeViz` to accept recursive root structure
2. Migrate all hand-crafted scenes to semantic format
3. Implement slot system for info primitives
4. Remove `SCALE_X/SCALE_Y` constants from `GraphViz` and `TreeViz`

**Sprint 3 — Quality:**
1. Implement `slot` → CSS position mapping in `SceneRenderer`
2. Add `layout` prop to all positioned `motion.div` elements in primitives
3. Build `useStepAnimator` for within-step sequencing
4. Wire speed multiplier through to all transition durations

---

## Appendix A — Library Quick Reference

### @dagrejs/dagre
- **Repo:** github.com/dagrejs/dagre
- **Bundle:** ~120KB minified
- **Install:** `pnpm add @dagrejs/dagre`
- **API:** Synchronous. Create a `graphlib.Graph`, add nodes with sizes, add edges, call `dagre.layout(g)`, read `g.node(id).x` / `g.node(id).y`
- **Config:** `rankdir` (TB/LR/BT/RL), `nodesep`, `ranksep`, `marginx`, `marginy`

### d3-hierarchy
- **Repo:** github.com/d3/d3-hierarchy
- **Bundle:** ~15KB minified
- **Install:** `pnpm add d3-hierarchy`
- **API:** `d3.tree().size([width, height])(d3.hierarchy(rootNode))` → call `.descendants()` to get all nodes with `.x`, `.y`
- **Used by:** Observable, many D3 examples, Mermaid (internally)

### elkjs (future upgrade)
- **Repo:** github.com/kieler/elkjs
- **Bundle:** ~2MB (WebAssembly)
- **Install:** `pnpm add elkjs`
- **API:** Promise-based. `new ELK().layout(graph)` where graph is an ELK JSON graph
- **When to add:** When orthogonal edge routing quality is prioritized for system-diagram

### Framer Motion (already installed)
- **Key APIs to use:** `layout` prop, `AnimatePresence`, `useAnimate`, `variants` + `staggerChildren`, spring `transition`

---

## Appendix B — Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary graph layout | dagre | Lighter than ELK, synchronous API, well-documented, used by Mermaid and React Flow |
| Tree layout | d3-hierarchy | Purpose-built for RT algorithm, tiny bundle, battle-tested |
| Force-directed | Skip | Non-deterministic, wrong for educational step-by-step animations |
| ELK | Deferred | Adopt when orthogonal routing becomes a quality priority |
| Animation library | Framer Motion (keep) | Already installed, React-native, `layout` prop is ideal for auto-layout |
| Position format | Slot + layoutHint | AI-reliable, semantic, eliminates coordinate hallucination |
| Tree data format | Recursive root | Natural for binary trees, matches how AI thinks about trees, enables RT layout |
| Graph data format | Nodes/edges list + layoutHint | Clean, matches dagre's input format, no coordinates needed |
