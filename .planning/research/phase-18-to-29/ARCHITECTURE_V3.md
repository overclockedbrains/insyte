# Insyte — Architecture V3 (Complete)
## Scene Graph · IR · Layout · Rendering · AI Pipeline · State · Visual Quality

> **Date:** April 11, 2026  
> **Status:** Single authoritative architecture document. Supersedes V1 and V2.  
> **Sources:** 6 research agents (rendering, layout, existing tools, AI pipeline, canvas libs, advanced IR/agents) + synthesis  
> **Scope:** Everything needed to build a production-grade Insyte — not just rendering and pipeline, but state, interaction, representation, and visual quality.

---

## Executive Summary

Four root-cause problems. Three layers of fixes.

**Root Causes:**
1. AI generates pixel positions → spatial hallucination (a category error)
2. Dual coordinate system (SVG px vs DOM %) → edges never connect to node centers
3. Single 10–20KB JSON generation → referential integrity failures, all-or-nothing failure
4. No formal scene graph → no diffing, no incremental updates, no clean step evolution

**Three Layers of Fix:**
- **Representation layer**: ISCL intermediate format → 5-stage pipeline → scene graph with positions computed by layout engine
- **Rendering layer**: Unified SVG viewBox for complex primitives, ResizeObserver coordinate normalization, Framer Motion correctly used for step choreography
- **Visual quality layer**: Animation sequencing principles, spacing system, color hierarchy — why competitors look better and how to match them

**What NOT to do:** Canvas/WebGL migration (10 days, glass morphism regression, no user-visible improvement). LangGraph (overkill for deterministic orchestration). Extended thinking without IR (band-aid, doesn't fix structural problems).

---

## Part 1: Scene Architecture

### 1.1 The Scene Graph

Currently Insyte has "visuals" and "steps" but no formal scene graph model. This is the missing layer between the AI output and the renderer. Every serious visualization tool (React Flow, Mermaid, algorithm-visualizer) maintains an explicit scene graph.

**What a scene graph is:**

```typescript
// apps/web/src/engine/scene-graph/types.ts

interface SceneGraph {
  // Nodes — things that exist on the canvas
  nodes: Map<string, SceneNode>
  // Edges — directed connections between nodes
  edges: Map<string, SceneEdge>
  // Groups — logical containers (a "hashmap" visual groups bucket nodes)
  groups: Map<string, SceneGroup>
  // Viewport — the camera (for zoom/pan)
  viewport: Viewport
}

interface SceneNode {
  id: string
  type: VisualType
  // Computed by layout engine — NEVER set by AI
  x: number
  y: number
  width: number
  height: number
  // Visual state at the current step (computed by applyStepActions)
  state: Record<string, unknown>
  // Which group this node belongs to (if any)
  groupId?: string
  // Layout hint from Scene JSON (drives which algorithm is used)
  layoutHint?: LayoutHint
  // Slot position for info primitives (text-badge, counter)
  slot?: SlotPosition
}

interface SceneEdge {
  id: string
  from: string   // source node ID
  to: string     // target node ID
  label?: string
  directed: boolean
  highlighted: boolean
  // Computed by layout engine — waypoints for edge routing
  waypoints: { x: number; y: number }[]
}

interface SceneGroup {
  id: string
  nodeIds: string[]
  label?: string
  // Bounding box computed from member node positions
  bbox: { x: number; y: number; width: number; height: number }
}

interface Viewport {
  translateX: number
  translateY: number
  scale: number
}
```

**How the scene graph evolves across steps:**

The scene graph has two components:
1. **Topology** (nodes, edges, groups) — changes when a step adds/removes a node or edge
2. **State** (visual properties per node) — changes every step

```typescript
// The key function that drives all rendering:
function computeSceneGraphAtStep(scene: Scene, stepIndex: number): SceneGraph {
  // 1. Determine topology at this step (which nodes/edges exist)
  const topology = computeTopologyAtStep(scene.visuals, scene.steps, stepIndex)
  
  // 2. Run layout engine on the current topology
  //    Layout only re-runs if topology changed (memoized by topology hash)
  const positioned = computeLayout(topology)
  
  // 3. Apply step actions to get visual state per node
  const state = applyStepActionsUpTo(scene.steps, stepIndex)
  
  // 4. Merge positioned topology + state into scene graph
  return mergeToSceneGraph(positioned, state)
}
```

**How it enables diffing and animations:**

When step index advances from N to N+1:
```typescript
const prev = computeSceneGraphAtStep(scene, N)
const next = computeSceneGraphAtStep(scene, N + 1)

const diff = diffSceneGraphs(prev, next)
// diff.added   → new nodes/edges (animate in: scale [0→1], opacity [0→1])
// diff.removed → deleted nodes/edges (animate out: opacity [1→0])
// diff.moved   → nodes that changed position (FLIP animate between positions)
// diff.changed → nodes whose state changed (animate property change: color, highlight)
```

Framer Motion's `layoutId` + `AnimatePresence` map directly onto this diff structure:
- `diff.added` → new element entering `AnimatePresence`
- `diff.removed` → element exiting `AnimatePresence`
- `diff.moved` → same `layoutId`, position changed → automatic FLIP animation
- `diff.changed` → same element, `animate` prop updated → Framer Motion interpolates

**The scene graph is the missing bridge between the step data (what the AI describes) and the renderer (what Framer Motion animates).**

---

### 1.2 How AI → Scene Graph → Layout → Renderer Connects

```
AI (ISCL)
  ↓
ISCL Parser → ISCLParseResult { visualDecls, steps, annotations }
  ↓
Scene JSON Assembler → Scene { visuals (no positions), steps, explanation, popups }
  ↓  [stored in Supabase, loaded by SceneRenderer]
Scene JSON
  ↓
computeSceneGraphAtStep(scene, stepIndex)
  ├── computeTopologyAtStep() → topology { nodes (no positions), edges }
  ├── computeLayout(topology) → positioned topology { nodes (with x,y,w,h), edges (with waypoints) }
  └── applyStepActionsUpTo() → state { nodeId → visualState }
  ↓
SceneGraph { nodes (positioned + state), edges (routed), groups, viewport }
  ↓
SceneRenderer → React component tree → Framer Motion animations
```

The **key insight**: positions flow from the layout engine, never from AI or Scene JSON. The scene graph is recomputed on every step change (memoized — only re-layouts when topology changes).

---

### 1.3 Step & State Model

**How state evolves per step:**

Each `Visual` has an `initialState`. Each `Step` has `actions` that mutate state. The state at step N is computed by replaying all actions from step 0 through step N:

```typescript
// packages/scene-engine/src/parser.ts
export function computeVisualStateAtStep(
  visual: Visual,
  steps: Step[],
  stepIndex: number
): VisualState {
  let state = { ...visual.initialState }
  
  for (let i = 0; i <= stepIndex; i++) {
    const step = steps[i]
    const actions = step.actions.filter(a => a.target === visual.id)
    for (const action of actions) {
      state = applyAction(state, action)
    }
  }
  
  return state
}
```

This is a **pure function** — same inputs always produce same output. This is critical for step navigation (jump to any step, go back).

**The applyAction contract:**

Every action sends the **full visual state** at that step (not just a delta). This was already in the system prompt ("always emit the complete state") — formalizing it here makes the contract explicit:

```typescript
// CORRECT: full state on every step
{ action: 'set', target: 'arr', params: { cells: [{v:1,h:'active'},{v:3},{v:5}] } }

// WRONG: delta
{ action: 'highlight', target: 'arr', params: { index: 0, color: 'active' } }
```

Full state on every step means:
- No state accumulation bugs (applying delta twice = wrong result; applying full state twice = same result)
- Perfect random-access to any step (no need to replay all prior steps to get delta history)
- Simpler renderer (just render the state, don't track deltas)

**Topology changes across steps:**

Some steps add or remove nodes (e.g., tree insertion adds a node; recursion tree expands). These are **topology changes** that trigger a layout re-run:

```typescript
function computeTopologyAtStep(visuals: Visual[], steps: Step[], stepIndex: number) {
  let nodes = visuals.map(v => ({ id: v.id, type: v.type, layoutHint: v.layoutHint }))
  
  for (let i = 0; i <= stepIndex; i++) {
    for (const action of steps[i].actions) {
      if (action.action === 'add-node') nodes.push(action.params)
      if (action.action === 'remove-node') nodes = nodes.filter(n => n.id !== action.params.id)
    }
  }
  
  return nodes
}
```

Layout re-runs are memoized by topology hash — if no nodes were added/removed, the cached layout is reused.

---

## Part 2: Intermediate Representation — ISCL Complete Specification

### 2.1 Why an IR (The Core Argument)

The current pipeline asks the LLM to produce 4,000–8,000 tokens of cross-referentially consistent JSON in one pass. The failures are architectural:

| Failure | Root Cause | IR Fix |
|---------|-----------|--------|
| Invalid step-to-visual target | Attention decay over long output | Visual IDs in ISCL header — parser validates all references |
| Out-of-range `appearsAtStep` | Model can't count its own steps | Step count implicit in ISCL — parser counts, injects as constraint |
| Broken XY positions | LLMs have no spatial reasoning | ISCL grammar has no XY syntax — impossible by construction |
| All-or-nothing failure | Single 8KB output | 5 small independent segments — failures are isolated |
| Schema changes break prompts | Tight coupling AI ↔ renderer | ISCL decouples: change parser, not AI prompt |

LLMs also produce fewer semantic errors in line-oriented text DSLs than deeply-nested JSON. Mermaid benchmarks: near-zero semantic error rate vs 15–20% for equivalent AST JSON. Mechanism: lower perplexity per token, simpler positional encoding load for sequential text.

### 2.2 ISCL Grammar (Complete)

```
# ─── Top-level declarations ───────────────────────────────────────────
SCENE "<title>"
TYPE <concept | dsa-trace | lld | hld>
LAYOUT <text-left-canvas-right | canvas-only | code-left-canvas-right>

# ─── Visual declarations ───────────────────────────────────────────────
# IDs established here are the ONLY valid targets in all subsequent lines
VISUAL <type> <id> [HINT <layoutHint>] [SLOT <slotPosition>]

# type:         array | hashmap | linked-list | tree | graph | stack | queue |
#               dp-table | grid | recursion-tree | system-diagram | text-badge | counter
# layoutHint:   dagre-TB | dagre-LR | tree-RT | linear-H | linear-V | radial | force
# slotPosition: top-left | top-right | bottom-left | bottom-right | overlay-top | overlay-bottom | center

# ─── Step declarations ─────────────────────────────────────────────────
# STEP 0 must always be init (no SET lines on step 0)
# Steps must be monotonically numbered from 0
STEP <n> : init
STEP <n> : SET <id> <field>=<value> [| SET <id> <field>=<value> ...]

# field/value examples:
#   cells=[{v:1,h:active},{v:3}]            (array)
#   entries=[{key:foo,value:bar,h:insert}]  (hashmap)
#   items=[{value:X,h:active}]              (stack/queue)
#   nodes=[{id:n1,label:A}] edges=[{from:n1,to:n2}]  (graph/system-diagram)
#   root={value:8,left:{value:4},right:null}           (tree)
#   value=42                                (counter)
#   text="message here"                     (text-badge)

# ─── Explanation ────────────────────────────────────────────────────────
# Step indices validated against STEP count at parse time
EXPLANATION
  <n> : "<heading>" | "<body markdown>"
  <n> : "<heading>" | "<body markdown>"

# ─── Popups ─────────────────────────────────────────────────────────────
# <id> validated against VISUAL ids at parse time
# AT <n> validated against step count at parse time
POPUP <id> AT <n> [UNTIL <n>] : "<text>" [STYLE <info|success|warning|insight>]

# ─── Challenges ─────────────────────────────────────────────────────────
CHALLENGES
  <predict|break-it|optimize|scenario> : "<text>"
  <predict|break-it|optimize|scenario> : "<text>"

# ─── Controls (optional) ────────────────────────────────────────────────
CONTROL slider <id> "<label>" MIN <n> MAX <n> DEFAULT <n>
CONTROL toggle <id> "<label>" [on|off]
CONTROL button <id> "<label>"
```

### 2.3 ISCL Example — Binary Search

```
SCENE "Binary Search"
TYPE dsa-trace
LAYOUT code-left-canvas-right

VISUAL array arr HINT linear-H
VISUAL counter left-ptr SLOT top-left
VISUAL counter right-ptr SLOT top-right
VISUAL counter mid-ptr SLOT overlay-top
VISUAL text-badge status SLOT bottom

STEP 0 : init
STEP 1 : SET arr cells=[{v:1},{v:3},{v:5},{v:7},{v:9}] | SET left-ptr value=0 | SET right-ptr value=4 | SET status text="Target = 7. Search begins."
STEP 2 : SET mid-ptr value=2 | SET arr cells=[{v:1},{v:3},{v:5,h:active},{v:7},{v:9}] | SET status text="mid=2, arr[2]=5. 5 < 7, search right."
STEP 3 : SET left-ptr value=3 | SET arr cells=[{v:1},{v:3},{v:5},{v:7},{v:9}]
STEP 4 : SET mid-ptr value=3 | SET arr cells=[{v:1},{v:3},{v:5},{v:7,h:active},{v:9}] | SET status text="mid=3, arr[3]=7. Found!"
STEP 5 : SET arr cells=[{v:1},{v:3},{v:5},{v:7,h:hit},{v:9}] | SET status text="Target found at index 3 in O(log n)."

EXPLANATION
  0 : "Binary Search" | "Binary search finds a target in a sorted array by repeatedly halving the search space. Time complexity: O(log n)."
  2 : "Narrow Right" | "arr[mid] < target means the answer is in the right half. Discard the left half entirely."
  4 : "Target Found" | "arr[mid] equals target. Search complete after 2 comparisons for 5 elements."

POPUP arr AT 2 UNTIL 3 : "mid = (0+4)/2 = 2" STYLE info
POPUP arr AT 4 : "Found at index 3!" STYLE success

CHALLENGES
  predict : "How many steps does binary search take for 1,024 elements?"
  break-it : "What happens if the array is not sorted? Why does binary search break?"
  optimize : "How would you find the leftmost occurrence of a duplicate target?"
```

### 2.4 ISCL Parser Output Contract

```typescript
interface ISCLParseResult {
  ok: boolean
  error?: { line: number; message: string }
  
  // Only present when ok === true
  parsed?: {
    title: string
    type: SceneType
    layout: SceneLayout
    
    // Ground truth for all downstream validation
    visualIds: Set<string>
    visualDecls: { id: string; type: VisualType; layoutHint?: LayoutHint; slot?: SlotPosition }[]
    stepCount: number
    
    // Raw step data (initialState filled in by Stage 2a)
    steps: {
      index: number
      sets: { visualId: string; field: string; rawValue: string }[]
    }[]
    
    // Already validated against visualIds and stepCount
    explanation: { stepIndex: number; heading: string; body: string }[]
    popups: { attachId: string; showAt: number; hideAt?: number; text: string; style: PopupStyle }[]
    challenges: { type: ChallengeType; text: string }[]
    controls: { type: ControlType; id: string; label: string; config: Record<string, unknown> }[]
  }
}
```

### 2.5 Control vs Autonomy Model

The ISCL pipeline creates a **planner/executor split**:

```
PLANNER (Stage 1 — AI)
  Decides: what visuals to use, how many steps, narrative arc
  Output: ISCL script — intent, not implementation
  Cannot hallucinate positions (grammar prevents it)
  Cannot produce invalid references (parser catches them)

EXECUTOR (Stages 2–4 — AI, grounded by planner output)
  Receives: visual IDs, step count as hard constraints in the prompt
  Fills in: initialState, step params, annotation text
  Cannot invent new IDs (they come from Stage 1)
  Cannot go out of bounds (step count comes from Stage 1)

ASSEMBLER (Stage 5 — deterministic, zero AI)
  Merges all segments
  Validates cross-references
  Runs layout engine → positions
  Produces final Scene JSON
```

**Control gradient:**

| Component | Who controls | Deterministic? |
|-----------|-------------|----------------|
| Which visuals to show | AI (Stage 1) | No — creative |
| How many steps | AI (Stage 1) | No — creative |
| Visual IDs | AI (Stage 1), then parser enforces | Parser: yes |
| Step indices | Parser counts ISCL STEP lines | Yes |
| Pixel positions | Layout engine (Stage 5) | Yes |
| referential integrity | Parser + semanticValidate() | Yes |
| Narrative text | AI (Stages 1, 3) | No — creative |

**The architecture gives AI maximum freedom over creative decisions (what to show, how to explain) and zero freedom over structural decisions (IDs, positions, indices).** This is the right balance.

### 2.6 Incremental / Event-Driven Generation

Rather than batch generation, the pipeline emits **progressive events** to the client. This drives the streaming skeleton UX:

```typescript
// Server-side async generator
async function* generateScene(topic: string): AsyncGenerator<GenerationEvent> {
  
  // Stage 1: ISCL plan → immediate skeleton
  const iscl = await callLLM(stage1Prompt(topic))
  const parsed = parseISCL(iscl)
  if (!parsed.ok) { yield { type: 'error', stage: 1, error: parsed.error }; return }
  
  yield {
    type: 'plan',
    title: parsed.parsed!.title,
    visualCount: parsed.parsed!.visualDecls.length,
    stepCount: parsed.parsed!.stepCount,
    layout: parsed.parsed!.layout,
  }
  // Client: skeleton renders (title, placeholder nodes × visualCount, step counter)
  
  // Stages 2a + 2b: parallel
  const [states, steps] = await Promise.all([
    callLLM(stage2aPrompt(parsed.parsed!)).then(r => validateStates(r, parsed.parsed!)),
    callLLM(stage2bPrompt(parsed.parsed!)).then(r => validateSteps(r, parsed.parsed!)),
  ])
  
  yield { type: 'content', states, steps }
  // Client: actual primitive nodes render with initial state, step actions loaded
  
  // Stage 3: annotations
  const annotations = await callLLM(stage3Prompt(parsed.parsed!, steps))
    .then(r => validateAnnotations(r, parsed.parsed!))
  
  yield { type: 'annotations', explanation: annotations.explanation, popups: annotations.popups }
  // Client: explanation panel fills in, popups registered
  
  // Stage 4: misc (can overlap with stage 3)
  const misc = await callLLM(stage4Prompt(topic))
  
  // Stage 5: deterministic assembly
  const raw = assemble(parsed.parsed!, states, steps, annotations, misc)
  const validated = semanticValidate(raw)
  if (validated.errors.length > 0) {
    // Targeted retry: only re-run the segments with errors
    yield { type: 'retry', errors: validated.errors }
    // ... retry logic
  }
  const positioned = applyLayout(raw)
  
  yield { type: 'complete', scene: positioned }
  // Client: play button activates, challenges section appears
}
```

**Client-side event handling:**

```typescript
// apps/web/src/hooks/useSceneGeneration.ts
function useSceneGeneration(topic: string) {
  const setScene = useSceneStore(s => s.setScene)
  
  for await (const event of streamGeneration(topic)) {
    switch (event.type) {
      case 'plan':
        // Show skeleton with correct placeholder count
        setScene({ skeleton: true, title: event.title, visualCount: event.visualCount })
        break
      case 'content':
        // Render actual primitives, enable step navigation
        setScene(s => ({ ...s, skeleton: false, visuals: event.states, steps: event.steps }))
        break
      case 'annotations':
        setScene(s => ({ ...s, explanation: event.explanation, popups: event.popups }))
        break
      case 'complete':
        setScene(event.scene)
        break
    }
  }
}
```

**Batch vs streaming comparison:**

| | Batch (current) | Event-driven (target) |
|--|----------------|----------------------|
| Time to first content | 6–8s (or failure) | ~1.5s (skeleton from Stage 1) |
| Failure recovery | Full retry | Targeted retry of failed segment |
| User perception | "Loading..." then instant render | Progressive reveal |
| Error visibility | All-or-nothing | Stage-specific error messages |

---

## Part 3: Layout Engine

### 3.1 The Core Principle

> AI generates semantic topology (what exists and how it connects). The layout engine computes geometry (where everything is). These two concerns are completely separated.

Every reliable diagram tool uses this architecture: Mermaid (dagre), Eraser/DiagramGPT (dagre), React Flow (dagre/ELK). The grammar of each tool's input format physically prevents expressing pixel positions — so broken layout is impossible by construction.

ISCL achieves the same for Insyte: no XY in the grammar, layout engine always runs.

### 3.2 Algorithm Per Primitive

| Primitive | Algorithm | Library | Config |
|-----------|-----------|---------|--------|
| `tree`, `recursion-tree` | Reingold-Tilford | `d3-hierarchy` (15KB) | `d3.tree().nodeSize([80, 60])` |
| `graph` | Sugiyama/dagre | `@dagrejs/dagre` (120KB) | `rankdir: TB or LR per layoutHint` |
| `system-diagram` | dagre-LR | `@dagrejs/dagre` | `rankdir: LR, nodesep: 60, ranksep: 80` |
| `array`, `linked-list`, `queue` | Linear arithmetic | None | `x = i * (cellWidth + gap)` |
| `stack` | Vertical arithmetic | None | `y = i * (itemHeight + gap)` reversed |
| `dp-table`, `grid` | Grid arithmetic | None | `x = col * cellW, y = row * cellH` |
| `hashmap` | Bucket-row arithmetic | None | Buckets as rows, KV pairs in each row |
| `text-badge`, `counter` | Named slot map | None | `slot → {x%, y%}` of canvas zone |

**Install:** `pnpm add @dagrejs/dagre d3-hierarchy` (~135KB total, lazy-loaded on scene mount)

### 3.3 `computeLayout()` Architecture

```typescript
// apps/web/src/engine/layout/index.ts

export interface PositionedNode {
  id: string
  x: number          // center x in pixels
  y: number          // center y in pixels
  width: number
  height: number
}

export interface PositionedEdge {
  id: string
  from: string
  to: string
  waypoints: { x: number; y: number }[]  // edge routing path
}

export interface LayoutResult {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
  // Used to set SVG viewBox: `${minX-pad} ${minY-pad} ${width+2pad} ${height+2pad}`
}

export function computeLayout(
  visuals: Visual[],
  currentState: Record<string, VisualState>
): LayoutResult {
  const results: LayoutResult[] = []
  
  for (const visual of visuals) {
    switch (visual.type) {
      case 'tree':
      case 'recursion-tree':
        results.push(applyD3HierarchyLayout(visual, currentState[visual.id]))
        break
      case 'graph':
        results.push(applyDagreLayout(visual, currentState[visual.id], visual.layoutHint ?? 'dagre-TB'))
        break
      case 'system-diagram':
        results.push(applyDagreLayout(visual, currentState[visual.id], 'dagre-LR'))
        break
      case 'array':
      case 'linked-list':
      case 'queue':
        results.push(applyLinearLayout(visual, currentState[visual.id]))
        break
      case 'stack':
        results.push(applyStackLayout(visual, currentState[visual.id]))
        break
      case 'dp-table':
      case 'grid':
        results.push(applyGridLayout(visual, currentState[visual.id]))
        break
      case 'hashmap':
        results.push(applyHashmapLayout(visual, currentState[visual.id]))
        break
      case 'text-badge':
      case 'counter':
        results.push(applySlotLayout(visual, visual.slot ?? 'top-right'))
        break
    }
  }
  
  return mergeLayoutResults(results)
}
```

**Auto-fit viewBox:**
After layout, the SVG viewBox is set to fit the computed bounding box:
```typescript
const { minX, minY, maxX, maxY } = layout.boundingBox
const pad = 40
const viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
```
Diagrams are never clipped, regardless of container dimensions.

**Layout memoization:**
Layout is expensive for large graphs. Memoize by topology hash:
```typescript
const layoutCache = new Map<string, LayoutResult>()

function getCachedLayout(visuals: Visual[], state: Record<string, VisualState>): LayoutResult {
  const topoHash = hashTopology(visuals, state)  // hash of node IDs + edge list only (not visual state)
  if (layoutCache.has(topoHash)) return layoutCache.get(topoHash)!
  const result = computeLayout(visuals, state)
  layoutCache.set(topoHash, result)
  return result
}
```

---

## Part 4: Rendering Architecture

### 4.1 Renderer Decision — React DOM + SVG + Framer Motion

**Verdict: Stay. The rendering stack is correct. The data pipeline was wrong.**

After deep research into Canvas 2D (Konva.js), WebGL (Pixi.js), and hybrid approaches:

- **Canvas migration cost**: 10 business days minimum (not 3–4). 15 components × ~4h each + 12h cross-cutting concerns.
- **Glass morphism is impossible in Canvas**: `backdrop-filter: blur()` is a CSS compositing effect. Canvas has no access to DOM content behind it — fundamental browser security boundary, not a library gap.
- **Node scale**: 20–80 nodes. Canvas outperforms DOM at 500+ nodes. No performance problem to solve.
- **Accessibility**: Canvas is a screen-reader black box. Insyte is educational — accessibility matters.

The coordinate misalignment bug was caused by a **data model problem** (dual coordinate systems), not by using React DOM. Fixing the data model (ResizeObserver + unified SVG viewBox) takes 1–2 days.

### 4.2 The Dual Coordinate System Bug (Root Cause)

Current broken state:
```
DOM nodes:   left: ${pos.x}%   top: ${pos.y}%     (percentage of container)
SVG edges:   x * SCALE_X px    y * SCALE_Y px      (pixels from SVG top-left)
```

These are independent coordinate systems. On 1440px wide, if SCALE_X=70 was tuned for that width, edges look connected. On 768px mobile, DOM nodes are at different pixels but SVG edges are at the same absolute pixels. They misalign.

**Fix A — ResizeObserver normalization (1–2 days):**
```tsx
// CanvasCard.tsx
const containerRef = useRef<HTMLDivElement>(null)
const [dims, setDims] = useState({ w: 0, h: 0 })

useEffect(() => {
  const ro = new ResizeObserver(([e]) => setDims({ w: e.contentRect.width, h: e.contentRect.height }))
  ro.observe(containerRef.current!)
  return () => ro.disconnect()
}, [])

// Layout engine outputs pixel coords (from dagre/d3-hierarchy)
// These pixel coords are passed to both DOM nodes and SVG edges
// → single coordinate space
```

**Fix B — Unified SVG viewBox for complex primitives (graph, tree, system-diagram):**
```tsx
<svg viewBox={viewBox} style={{ width: '100%', height: '100%' }}>
  {/* Edges in SVG pixel space */}
  {edges.map(e => <motion.path key={e.id} d={edgePath(e)} />)}
  
  {/* Node bodies as foreignObject — HTML/React inside SVG pixel space */}
  {nodes.map(n => (
    <foreignObject key={n.id} x={n.x - n.w/2} y={n.y - n.h/2} width={n.w} height={n.h}>
      <NodeBody node={n} />
    </foreignObject>
  ))}
</svg>
```

Edges and nodes now share one coordinate space. Edge endpoints always connect to node centers.

### 4.3 Framer Motion — Used Correctly

**Current usage (suboptimal):** Framer Motion props update on React state changes. Every step change re-renders all primitives simultaneously.

**Correct usage — scene-graph diffing → targeted animations:**

```typescript
// SceneRenderer.tsx
const prevGraph = usePrevious(currentGraph)
const diff = useMemo(() => diffSceneGraphs(prevGraph, currentGraph), [prevGraph, currentGraph])

// Only animate changed nodes
diff.added.forEach(node => animate(`#${node.id}`, { scale: [0, 1], opacity: [0, 1] }, { duration: 0.3 }))
diff.removed.forEach(node => animate(`#${node.id}`, { opacity: 0, scale: 0 }, { duration: 0.2 }))
diff.changed.forEach(({ node, changes }) => {
  // Animate only the changed properties
  animate(`#${node.id}`, changes, { duration: 0.25 })
})
// diff.moved nodes: layoutId handles FLIP automatically via Framer Motion
```

**Within-step animation choreography (VisualGo's technique):**

VisualGo's animations feel smooth because each step is broken into sub-steps with sequential timing. Implement with Framer Motion's imperative `animate()`:

```typescript
async function animateInsertStep(nodeRef: Element, edgeRef: Element, badgeRef: Element) {
  // 1. Highlight target position
  await animate(badgeRef, { text: 'Inserting at index 2...' }, { duration: 0.1 })
  // 2. New node materializes
  await animate(nodeRef, { scale: [0, 1.1, 1], opacity: [0, 1] }, { duration: 0.3 })
  // 3. Edge draws in
  await animate(edgeRef, { pathLength: [0, 1] }, { duration: 0.2 })
  // 4. Success state
  await animate(nodeRef, { borderColor: '#10b981' }, { duration: 0.15 })
  await animate(badgeRef, { text: 'Inserted!' }, { duration: 0.1 })
}
```

Total: 750ms per sub-step animation. Educational, readable, smooth.

### 4.4 Future Scalability — Hybrid Renderer Consideration

**When DOM+SVG would become inadequate:**
- Node count exceeds ~200 (React reconciler overhead becomes measurable)
- Zoom/pan is a core UX feature (CSS transform viewport needed)
- Real-time force simulation (60fps physics with 100+ nodes)

**Hybrid approach (future, not now):**
If Insyte eventually needs zoom/pan as a first-class feature (whiteboard mode), the correct path is:
1. Keep React DOM for UI chrome (controls, explanation panel, popups)
2. Add CSS transform viewport wrapper around the canvas zone: `transform: translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
3. Manage viewport state in Zustand (not React state — no re-render on pan/zoom)

This is what React Flow does. Zero Canvas library migration required.

**3D future:** `react-three-fiber` panels added per-primitive when needed. r3f coexists with React DOM — independent decision.

### 4.5 Renderer Interface Contract

The Scene Graph (§1.1) is the natural boundary between all upstream logic (ISCL, layout engine, Zustand state) and the renderer. Making this boundary an explicit TypeScript interface allows a Canvas renderer to be built in parallel against the same contract, with a one-line switch when ready.

**The interface:**

```typescript
// packages/scene-engine/src/renderer-interface.ts

export interface SceneRendererProps {
  sceneGraph: SceneGraph   // positions + states, produced by layout engine
  step: number             // current step index
  isPlaying: boolean
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
}

// A renderer is just a React component satisfying this signature
export type SceneRenderer = (props: SceneRendererProps) => ReactNode
```

**How CanvasCard consumes it:**

```typescript
// apps/web/src/components/CanvasCard.tsx

import { DOMRenderer } from './renderers/DOMRenderer'
import { CanvasRenderer } from './renderers/CanvasRenderer' // built separately

const RENDERER: SceneRenderer =
  process.env.NEXT_PUBLIC_RENDERER === 'canvas' ? CanvasRenderer : DOMRenderer

export function CanvasCard({ scene }: { scene: Scene }) {
  const { step, isPlaying } = usePlaybackStore()
  const sceneGraph = useMemo(() => buildSceneGraph(scene, step), [scene, step])

  return <RENDERER sceneGraph={sceneGraph} step={step} isPlaying={isPlaying} />
}
```

**What each renderer owns vs. does not own:**

| Owns (renderer decides) | Does NOT own (shared above the interface) |
|------------------------|------------------------------------------|
| Visual primitives (React nodes vs Konva shapes) | Scene JSON → ISCL → layout engine pipeline |
| Animation library (Framer Motion vs GSAP) | SceneGraph data structure and types |
| Edge drawing (SVG vs Konva.Line) | Zustand playback state |
| Styling (CSS/Tailwind vs programmatic fill) | semanticValidate() + retry logic |
| Zoom/pan handling | Step computation and state diffing |
| Interaction hit detection | Explanation panel, HUD, challenge UI |

**What the Canvas team needs to start:**
1. `SceneGraph` + `SceneRendererProps` types exported from `packages/scene-engine`
2. A dev fixture that produces a real `SceneGraph` from a sample scene file
3. The `NEXT_PUBLIC_RENDERER=canvas` env flag wired in `CanvasCard`

They never touch AI, ISCL, or layout code. The DOM renderer ships to production unaffected.

**What the main team needs to do (once, ~2–4h):**
Extract current rendering logic from `CanvasCard` into a `DOMRenderer` component that satisfies `SceneRenderer`. This forces the clean boundary to be defined before too many primitives accumulate.

---

## Part 5: Visual Quality System

### 5.1 Why Competitors Look Better

VisualGo and Lucidchart look better than current Insyte visualizations for four specific reasons:

1. **Stable element IDs across steps** — same node IDs from step 0 to step N. Framer Motion's `layoutId` can then FLIP-animate nodes between positions. Current Insyte: some primitives remount elements on step change (losing animation continuity).

2. **Sub-step animation sequencing** — each step is broken into 3–5 timed micro-animations. See: highlight → action → settle. Current Insyte: all changes apply simultaneously on step change.

3. **Consistent spacing system** — all spacing derived from a base unit. VisualGo's node sizes and gaps follow strict multiples. Current Insyte: primitive components have independent spacing constants (SCALE_X=70, SCALE_Y=70 — arbitrary).

4. **Color hierarchy** — background → structure → highlight → active → error — each with clear semantic meaning and contrast ratio. Lucidchart: 4-level color hierarchy. Current Insyte: highlight colors applied inconsistently across primitives.

### 5.2 Animation Principles

**Principle 1: Every state change has a duration.** No instant snaps. Even a counter incrementing should animate over 200ms.

**Principle 2: Sub-step sequencing.** Break each step into phases:
```
Phase A: prepare (100ms) — highlight where the action will happen
Phase B: act    (300ms) — perform the primary animation
Phase C: settle (200ms) — confirm result, update secondary elements
Total:           600ms per step (comfortable at 1x speed, snappy at 2x)
```

**Principle 3: Stable IDs = continuity.** Node IDs must not change across steps. If `arr-cell-0` exists at step 0 and step 5, Framer Motion's `layoutId="arr-cell-0"` gives free FLIP animation when its position changes. Never remount existing nodes.

**Principle 4: Spring physics for position changes, linear for color changes.**
- Position changes: spring (`stiffness: 300, damping: 30`) — feels physical
- Color/opacity changes: linear or ease-out — snappy, not springy
- Entry: ease-out scale + opacity — purposeful appearance
- Exit: ease-in scale + opacity — graceful disappearance

**Principle 5: Matching speed controls.** At 2x speed, all durations halve. Use a global `SPEED_MULTIPLIER` constant and divide all durations by it.

### 5.3 Spacing System

All spacing derived from a base unit of `8px`:

```typescript
// apps/web/src/engine/layout/spacing.ts
export const SPACING = {
  xs:  4,   // 0.5 base
  sm:  8,   // 1 base  — inner padding
  md:  16,  // 2 base  — element gap
  lg:  24,  // 3 base  — section gap
  xl:  32,  // 4 base  — primitive separation
  xxl: 48,  // 6 base  — canvas padding
} as const

// Per-primitive defaults (all multiples of 8)
export const PRIMITIVE_SIZING = {
  array: { cellWidth: 48, cellHeight: 48, gap: 8 },
  stack: { itemWidth: 120, itemHeight: 40, gap: 8 },
  queue: { itemWidth: 80, itemHeight: 40, gap: 8 },
  linkedList: { nodeWidth: 64, nodeHeight: 40, gap: 32 }, // 32 for arrow room
  tree: { nodeSize: [80, 60] },    // d3-hierarchy nodeSize
  graph: { nodeWidth: 100, nodeHeight: 40, nodesep: 40, ranksep: 60 },
  systemDiagram: { nodeWidth: 120, nodeHeight: 48, nodesep: 60, ranksep: 80 },
  hashmap: { bucketHeight: 40, keyWidth: 80, valueWidth: 80, gap: 4 },
  dpTable: { cellWidth: 48, cellHeight: 48, gap: 2 },
  counter: { width: 80, height: 48 },
  textBadge: { maxWidth: 200, padding: 12 },
} as const
```

**Layout uses these constants instead of arbitrary SCALE_X/SCALE_Y values.** This ensures:
- Consistent spacing across all primitives
- Predictable auto-fit viewBox results
- Easy global resize (change one constant)

### 5.4 Typography Hierarchy

```css
/* apps/web/src/engine/styles/typography.css */

/* Node labels — value inside array cell, node in tree/graph */
.viz-label-primary {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  color: var(--color-text-primary);  /* #e2e8f0 */
}

/* Secondary labels — key/value in hashmap, edge labels */
.viz-label-secondary {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-secondary);  /* #94a3b8 */
}

/* Step popup text */
.viz-popup-text {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-text-primary);
}

/* Counter / stat values */
.viz-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);  /* #7c3aed */
}
```

### 5.5 Color Semantic System

Every highlight color has one semantic meaning, used consistently across all primitives:

```typescript
// apps/web/src/engine/styles/colors.ts
export const HIGHLIGHT_COLORS = {
  default:  { bg: '#1e1e2e', border: '#313244', text: '#e2e8f0' },  // resting state
  active:   { bg: '#2d1b69', border: '#7c3aed', text: '#e2e8f0' },  // currently being examined
  insert:   { bg: '#1a3a2e', border: '#10b981', text: '#e2e8f0' },  // being added
  remove:   { bg: '#3a1a1a', border: '#ef4444', text: '#e2e8f0' },  // being deleted
  hit:      { bg: '#1a3a2e', border: '#10b981', text: '#10b981' },  // cache hit / found
  miss:     { bg: '#3a1a1a', border: '#ef4444', text: '#ef4444' },  // cache miss / not found
  mru:      { bg: '#2d1b69', border: '#7c3aed', text: '#7c3aed' },  // most recently used
  lru:      { bg: '#1e2a3a', border: '#3b82f6', text: '#3b82f6' },  // least recently used
  current:  { bg: '#2a1a3a', border: '#a855f7', text: '#a855f7' },  // DP current cell
  filled:   { bg: '#1a2a1a', border: '#4ade80', text: '#4ade80' },  // DP filled cell
  error:    { bg: '#3a1a1a', border: '#f87171', text: '#f87171' },  // error state
} as const
```

All primitives import from this single source. No more per-component color strings. Consistent highlight semantics across the entire product.

---

## Part 6: Interaction & State Model

### 6.1 Step Playback System

```typescript
// apps/web/src/stores/playback-store.ts (current — formalize this)

interface PlaybackState {
  currentStep: number
  totalSteps: number
  isPlaying: boolean
  speed: 1 | 1.5 | 2 | 0.5   // multiplier
  stepDuration: number          // ms per step at 1x speed (default: 800ms)
}

interface PlaybackActions {
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBack: () => void
  jumpTo: (step: number) => void
  reset: () => void
  setSpeed: (speed: PlaybackState['speed']) => void
}
```

**Auto-play loop:**
```typescript
useEffect(() => {
  if (!isPlaying) return
  if (currentStep >= totalSteps - 1) { pause(); return }
  
  const timer = setTimeout(() => stepForward(), stepDuration / speed)
  return () => clearTimeout(timer)
}, [isPlaying, currentStep, speed])
```

**Keyboard controls:**
- `Space` → play/pause
- `→` → step forward
- `←` → step back
- `Home` → reset
- `1/2/3` → speed 0.5x / 1x / 2x

### 6.2 State Transitions

The complete state lifecycle per step change:

```
User action (next step)
  ↓
playback-store.stepForward() → currentStep++
  ↓
useSceneGraph(scene, currentStep) [memoized]
  ↓
computeSceneGraphAtStep(scene, currentStep)
  ├── computeTopologyAtStep()     → has topology changed? (new node added/removed?)
  │     YES → getCachedLayout() invalidated → computeLayout() runs dagre/d3-hierarchy
  │     NO  → getCachedLayout() returns cached result (fast path)
  └── applyStepActionsUpTo()      → currentState per visual
  ↓
diffSceneGraphs(prevGraph, currentGraph)
  ↓
SceneRenderer receives diff
  ├── added nodes → AnimatePresence: enter animation
  ├── removed nodes → AnimatePresence: exit animation
  ├── moved nodes → layoutId FLIP: position tween
  └── state-changed nodes → animate() call: color/value transition
  ↓
Framer Motion executes animations (spring physics for position, ease for color)
  ↓
ExplanationPanel: finds explanation sections where appearsAtStep <= currentStep
  ↓
PopupOverlay: finds popups where showAtStep <= currentStep < hideAtStep
  ↓
CodePanel (DSA mode): highlights line at code.highlightByStep[currentStep]
```

### 6.3 Scene Update from AI Chat Patches

When AI chat responds with a scene patch:

```typescript
// apps/web/src/ai/applyDiff.ts
function applyPatch(scene: Scene, patch: ScenePatch): Scene {
  // Patch can: add steps, update popup text, add explanation sections
  // Cannot: modify existing steps (would break step navigation history)
  // Cannot: change visual topology (would require re-layout)
  
  return {
    ...scene,
    steps: [...scene.steps, ...patch.addSteps ?? []],
    popups: [...scene.popups, ...patch.addPopups ?? []],
    explanation: [...scene.explanation, ...patch.addExplanations ?? []],
  }
}
```

After applying patch, the scene graph recomputes at the current step. New steps are accessible via step navigation. Canvas glows briefly (Framer Motion `animate` on the canvas container border).

---

## Part 7: Semantic Validation

### 7.1 `semanticValidate()` — Full Implementation

Catches cross-reference failures that Zod (type-level) cannot catch:

```typescript
// apps/web/src/ai/semanticValidate.ts
export interface SemanticError { path: string; message: string }

export function semanticValidate(scene: Scene): { ok: boolean; errors: SemanticError[] } {
  const errors: SemanticError[] = []
  const visualIds = new Set(scene.visuals.map(v => v.id))
  const stepCount = scene.steps.length

  // 1. Step action targets
  scene.steps.forEach((step, si) =>
    step.actions.forEach((action, ai) => {
      if (!visualIds.has(action.target))
        errors.push({ path: `steps[${si}].actions[${ai}].target`,
          message: `Unknown target "${action.target}". Valid: ${[...visualIds].join(', ')}` })
    })
  )

  // 2. Explanation step indices
  scene.explanation.forEach((exp, i) => {
    if (exp.appearsAtStep >= stepCount)
      errors.push({ path: `explanation[${i}].appearsAtStep`,
        message: `${exp.appearsAtStep} >= stepCount ${stepCount}` })
  })

  // 3. Popup step indices and attachTo IDs
  scene.popups.forEach((popup, i) => {
    if (popup.showAtStep >= stepCount)
      errors.push({ path: `popups[${i}].showAtStep`,
        message: `${popup.showAtStep} >= stepCount ${stepCount}` })
    if (popup.hideAtStep !== undefined && popup.hideAtStep > stepCount)
      errors.push({ path: `popups[${i}].hideAtStep`,
        message: `${popup.hideAtStep} > stepCount ${stepCount}` })
    if (!visualIds.has(popup.attachTo))
      errors.push({ path: `popups[${i}].attachTo`,
        message: `Unknown visual "${popup.attachTo}"` })
  })

  // 4. DSA code highlight length
  if (scene.code?.highlightByStep?.length !== undefined &&
      scene.code.highlightByStep.length !== stepCount)
    errors.push({ path: 'code.highlightByStep',
      message: `Length ${scene.code.highlightByStep.length} != stepCount ${stepCount}` })

  return { ok: errors.length === 0, errors }
}
```

### 7.2 Targeted Retry

On semantic errors, only retry the failed segment (not full regeneration):

```typescript
// In Stage 5 assembly
const validation = semanticValidate(scene)
if (!validation.ok) {
  // Classify errors by which segment produced them
  const stepErrors = validation.errors.filter(e => e.path.startsWith('steps'))
  const annotationErrors = validation.errors.filter(e => 
    e.path.startsWith('explanation') || e.path.startsWith('popups'))
  
  if (stepErrors.length > 0) {
    // Retry Stage 2b with error context
    steps = await callLLM(stage2bRetryPrompt(parsed, steps, stepErrors))
  }
  if (annotationErrors.length > 0) {
    // Retry Stage 3 with error context
    annotations = await callLLM(stage3RetryPrompt(parsed, annotations, annotationErrors))
  }
  // Re-assemble and re-validate
}
```

Expected impact: **40–60% failure reduction** from semantic validation alone, before ISCL is implemented.

---

## Part 8: Schema Changes Required

### 8.1 Visual Type Changes

```typescript
// packages/scene-engine/src/types.ts

// REMOVE:
// position?: { x: number; y: number }

// ADD:
export type LayoutHint =
  | 'dagre-TB' | 'dagre-LR' | 'dagre-BT' | 'dagre-RL'
  | 'tree-RT'
  | 'linear-H' | 'linear-V'
  | 'force' | 'radial'

export type SlotPosition =
  | 'top-left' | 'top-right'
  | 'bottom-left' | 'bottom-right'
  | 'overlay-top' | 'overlay-bottom'
  | 'center'

export interface Visual {
  id: string
  type: VisualType
  label?: string
  layoutHint?: LayoutHint         // drives layout algorithm selection
  slot?: SlotPosition             // for info primitives (text-badge, counter)
  initialState: unknown
  showWhen?: Condition
}
```

### 8.2 Graph/Tree Node Format (Remove XY from initialState)

```typescript
// BEFORE (AI must emit XY — hallucination guaranteed):
graph.initialState = {
  nodes: [{ id: "n1", label: "Client", x: 1, y: 2 }],
  edges: [{ from: "n1", to: "n2" }]
}

// AFTER (AI emits topology only — layout engine computes x/y):
graph.initialState = {
  nodes: [{ id: "n1", label: "Client" }],
  edges: [{ from: "n1", to: "n2", label: "HTTP" }]
}
```

### 8.3 System Prompt Changes

Remove all XY examples from the params table:

```
// BEFORE (teaches hallucination):
| graph | nodes + edges | { "nodes": [{ "id": "a", "x": 1, "y": 1 }] }

// AFTER:
| graph | nodes + edges | { "nodes": [{ "id": "a", "label": "A" }], "edges": [{ "from": "a", "to": "b" }] }
// Positions are computed automatically. NEVER include x or y on graph or tree nodes.
```

Add explicit instructions:
1. "Generate visuals[] first. The IDs you assign are the ONLY valid targets for step actions, popup attachTo, and explanation references. Copy them exactly when generating steps."
2. "Count your STEP declarations before writing explanation appearsAtStep values. They must be < step count."
3. "Never include x, y, width, or height on graph, tree, or system-diagram nodes."

---

## Part 9: Decisions, Risks & Roadmap

### 9.1 Complete Decision Table

| Problem | Decision | Reasoning |
|---------|----------|-----------|
| Rendering approach | Stay React DOM + SVG + Framer Motion | Canvas = 10 dev days + glass morphism regression. Data layer was wrong, not renderer. |
| Coordinate system | ResizeObserver + unified SVG viewBox | 1–2 days. Same result as Canvas migration at 1/10 the cost. |
| Layout | dagre + d3-hierarchy, remove XY from schema | All serious tools use this. Layout problems become structurally impossible. |
| AI → positions | Remove from AI output entirely | LLMs have no spatial model. Grammar-level prevention is the only reliable fix. |
| AI pipeline | ISCL + 5-stage pipeline | 80–90% hallucination reduction. IR tokens are smaller, parser validates references. |
| Agent framework | Skip LangGraph. Hand-coded async generator. | Deterministic orchestration ≠ agent autonomy. 40 lines, zero bundle. |
| Extended thinking | Use as bridge until ISCL ships | 40–70% quick win. Drop after ISCL makes it redundant. |
| 3D future | react-three-fiber panels on-demand | Coexists with React DOM. Independent decision. |
| Canvas (future) | Reconsider if product pivots to whiteboard | Konva + GSAP if that happens. Not now. |
| Animation quality | Framer Motion used correctly (diff-driven) | Scene graph diffing + layoutId FLIP + sub-step choreography matches VisualGo quality. |

### 9.2 Implementation Roadmap

#### Tier 1 — Immediate (3–5 days, no architecture change)
1. Enable extended thinking on current single-call pipeline
2. Implement `semanticValidate()` + targeted retry
3. Remove XY from system prompt, add ID-copy instruction
4. Fix TreeViz/RecursionTreeViz SVG height bug
5. Add position bounds clamping in CanvasCard (`max 0–100%`)

#### Tier 2 — Coordinate Fix (6–8 days)
6. ResizeObserver coordinate normalization in CanvasCard
7. Unified SVG viewBox + `<foreignObject>` for GraphViz, TreeViz, RecursionTreeViz, SystemDiagramViz
8. Auto-fit viewBox after layout
9. ResizeObserver-based popup anchoring

#### Tier 3 — Layout Engine (5–6 days)
10. Install `@dagrejs/dagre` + `d3-hierarchy`
11. Remove `position` from Visual type + Zod schema
12. Add `layoutHint` + `slot` to Visual
13. Implement `computeLayout()` dispatcher
14. Implement layout memoization by topology hash
15. Wire layout engine into `computeSceneGraphAtStep()`
16. Update all 24 Scene JSONs (remove positions, add layoutHints)

#### Tier 4 — Scene Graph & Animation Quality (4–5 days)
17. Implement `SceneGraph` type + `computeSceneGraphAtStep()`
18. Implement `diffSceneGraphs()` → added/removed/moved/changed
19. Refactor SceneRenderer to consume scene graph diff
20. Implement sub-step animation choreography in animated primitives
21. Implement `SPACING` + `HIGHLIGHT_COLORS` constants; apply across all primitives

#### Tier 5 — ISCL + Multi-Stage Pipeline (10–12 days)
22. Document ISCL grammar + build parser (`apps/web/src/ai/iscl/`)
23. Stage 1–4 prompts (stage1-iscl.ts, stage2a-states.ts, stage2b-steps.ts, stage3-annotations.ts, stage4-misc.ts)
24. Async generator pipeline orchestrator (refactor `generateScene.ts`)
25. Assembly + layout step (`assembleScene.ts`)
26. Update streaming UX: events → skeleton → content → complete

### 9.3 Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Remove positions from Scene JSON — 24 files to update | Medium | Layout engine for trivial types (array, stack) produces identical layout; validate against screenshots |
| SVG `<foreignObject>` Safari quirks | Medium | Test on Safari 17. Fallback: retain DOM+SVG dual system on Safari via user-agent detection |
| ISCL parser edge cases (multi-line values, special chars) | Low | Fuzz test with 50 AI-generated ISCL scripts before production rollout |
| Multi-stage pipeline latency increase (~2–3s more) | Low | Parallel stages 2a+2b; streaming events hide latency behind skeleton UX |
| dagre produces poor layout for dense graphs | Low | ELK as fallback for system-diagram type (lazy-loaded WASM in Worker) |

---

## Further Reading

- [Rendering Approach — Full Analysis](.planning/research/rendering-approach.md)
- [Layout & Visualization — Full Analysis](.planning/research/layout-and-visualization.md)
- [AI Pipeline — Full Analysis](.planning/research/ai-pipeline.md)
- [Existing Tools Analysis](.planning/research/existing-tools-analysis.md)
- [Canvas Libraries Deep-Dive](.planning/research/canvas-libs-analysis.md)
- [Advanced AI Pipeline & IR](.planning/research/advanced-ai-pipeline.md)
