# Phase 3 — Visual Primitives

**Goal:** All 12 primitive components + 3 connectors + annotation system fully built, individually demonstrable, and registered in `PrimitiveRegistry`.

**Entry criteria:** Phase 2 complete. `SceneRenderer`, Zustand stores, and engine hooks all working.

---

## Tasks

### 3.1 — PrimitiveRegistry
Create `apps/web/src/engine/primitives/index.ts`:
- [ ] Define `PrimitiveProps` interface: `{ id: string; state: unknown; step: number; onHover?: (id: string) => void }`
- [ ] Import all 13 primitive components (12 original + `GridViz`)
- [ ] Export `PrimitiveRegistry: Record<string, React.ComponentType<PrimitiveProps>>`
- [ ] Mapping: `'array' → ArrayViz`, `'hashmap' → HashMapViz`, `'grid' → GridViz`, etc.

Also update `packages/scene-engine/src/types.ts` Visual type union to include `'grid'`:
- [ ] Add `'grid'` to the Visual `type` union string literal
- [ ] Update the corresponding Zod enum in `packages/scene-engine/src/schema.ts`

### 3.2 — ArrayViz
`apps/web/src/engine/primitives/ArrayViz.tsx`:
- [ ] Renders a horizontal row of cells: `[2][7][11][15]`
- [ ] State shape: `{ values: (string|number)[], highlights: { index: number, color: string }[], pointers: { index: number, label: string, color: string }[], windowHighlight?: { start: number, end: number } }`
- [ ] Cell: `min-w-[48px] h-12 border border-outline-variant flex items-center justify-center font-mono text-sm`
- [ ] Highlight animation: Framer Motion `animate={{ backgroundColor }}` spring transition
- [ ] Pointer arrows: SVG absolute-positioned arrows below cells with label
- [ ] Window highlight: translucent colored rectangle spanning start..end cells
- [ ] New cell entry: `initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}`

### 3.3 — HashMapViz
`apps/web/src/engine/primitives/HashMapViz.tsx`:
- [ ] Renders a key-value table: `[key | value]` rows
- [ ] State shape: `{ entries: { key: string; value: string; highlight?: 'insert'|'hit'|'miss'|'delete' }[], label: string }`
- [ ] Row animations: new row slides in from top (`y: -20 → 0, opacity: 0→1`)
- [ ] Hit animation: row glows green (`box-shadow: 0 0 12px rgba(58,223,250,0.6)`) for 600ms then fades
- [ ] Miss animation: row dims briefly with red tint
- [ ] Insert animation: new row fades in with primary glow
- [ ] Empty state: shows `"{ }"` centered in muted text

### 3.4 — LinkedListViz
`apps/web/src/engine/primitives/LinkedListViz.tsx`:
- [ ] Renders nodes as rounded boxes connected by animated SVG arrows
- [ ] State shape: `{ nodes: { id: string; value: string; next: string|null }[], headId: string|null }`
- [ ] Arrow between nodes: SVG path with arrowhead marker, animated stroke-dashoffset on "new connection"
- [ ] Node deletion: node `animate={{ scale:0, opacity:0 }}` then layout reflows
- [ ] Node insertion: new node fades in, arrows rewire with spring
- [ ] Reversed pointer: arrow direction flips with layout animation

### 3.5 — TreeViz
`apps/web/src/engine/primitives/TreeViz.tsx`:
- [ ] Renders binary/N-ary tree, auto-computed positions from structure
- [ ] State shape: `{ nodes: { id: string; value: string; children: string[]; highlight?: string }[], rootId: string }`
- [ ] Layout algorithm: simple top-down BFS positioning (not force-directed; trees have fixed hierarchy)
- [ ] SVG lines between parent and child nodes
- [ ] Traversal highlight: nodes animate `backgroundColor` to primary/secondary
- [ ] Current-node indicator: pulsing ring around active node

### 3.6 — GraphViz
`apps/web/src/engine/primitives/GraphViz.tsx`:
- [ ] Renders force-directed graph for general graphs (used for Number of Islands as grid graph)
- [ ] State shape: `{ nodes: { id: string; label: string; x: number; y: number; color?: string }[], edges: { from: string; to: string; directed?: boolean }[] }`
- [ ] Node positions from state (pre-computed, not runtime force layout — keep it predictable)
- [ ] BFS wave coloring: nodes animate to `secondary` color as they're visited
- [ ] DFS backtracking: visited nodes dim to `surface-container-highest`
- [ ] Edge highlight: edge turns `secondary` (cyan) when traversed

### 3.7 — StackViz
`apps/web/src/engine/primitives/StackViz.tsx`:
- [ ] Vertical LIFO visualization: items stack from bottom up
- [ ] State shape: `{ items: string[]; highlight?: number }`
- [ ] Push: new item slides down from top with spring
- [ ] Pop: top item scales to 0 and fades, others drop down
- [ ] TOP label floating above top element

### 3.8 — QueueViz
`apps/web/src/engine/primitives/QueueViz.tsx`:
- [ ] Horizontal FIFO visualization: items enter from right, exit from left
- [ ] State shape: `{ items: string[]; highlight?: number }`
- [ ] Enqueue: new item slides in from right
- [ ] Dequeue: leftmost item slides out to left and fades
- [ ] FRONT and BACK labels at each end

### 3.9 — DPTableViz
`apps/web/src/engine/primitives/DPTableViz.tsx`:
- [ ] 2D grid, fills cell by cell
- [ ] State shape: `{ rows: number; cols: number; cells: { value: string|number; highlight?: 'current'|'dependency'|'filled' }[][], rowLabels?: string[], colLabels?: string[] }`
- [ ] Cell fill animation: `initial={{ scale:0 }} animate={{ scale:1 }}` with primary glow on "current"
- [ ] Dependency arrows: SVG arrows from dependency cells to current cell
- [ ] For 1D DP (climbing stairs): renders as single row

### 3.10 — RecursionTreeViz
`apps/web/src/engine/primitives/RecursionTreeViz.tsx`:
- [ ] Expanding call tree — nodes appear as recursion unfolds
- [ ] State shape: `{ nodes: { id: string; label: string; result?: string; status: 'pending'|'computing'|'memoized'|'complete'; children: string[] }[], rootId: string }`
- [ ] New node entry: `initial={{ opacity:0, scale:0 }} animate={{ opacity:1, scale:1 }}`
- [ ] Memoized nodes: different background (`surface-container-highest`) + "cached" badge
- [ ] Pruned subtrees: grayed out with strikethrough when memoization prevents recomputation

### 3.11 — SystemDiagramViz
`apps/web/src/engine/primitives/SystemDiagramViz.tsx`:
- [ ] Architecture boxes with optional icons + labels
- [ ] State shape: `{ components: { id: string; label: string; icon?: string; x: number; y: number; status?: 'normal'|'active'|'overloaded'|'dead' }[], connections: { from: string; to: string; label?: string; style?: 'solid'|'dashed'; active?: boolean }[] }`
- [ ] Component box: `rounded-2xl border border-outline-variant px-4 py-3 bg-surface-container`
- [ ] Active status: primary glow border
- [ ] Overloaded: red/error glow + shake animation
- [ ] Dead: grayscale + opacity 0.4, strikethrough label
- [ ] Connections: SVG paths (solid or dashed), `DataFlowDot` travels along active connections
- [ ] `showWhen` filtering: hides components/connections when condition not met

### 3.12 — TextBadgeViz
`apps/web/src/engine/primitives/TextBadgeViz.tsx`:
- [ ] Floating text label: `text = "complement = 9 - 2 = 7"` displayed in a pill
- [ ] State shape: `{ text: string; style?: 'default'|'highlight'|'success'|'error' }`
- [ ] Framer Motion: content change fades out old → fades in new (0.15s)

### 3.13 — CounterViz
`apps/web/src/engine/primitives/CounterViz.tsx`:
- [ ] Animated number counter
- [ ] State shape: `{ value: number; label: string; color?: 'primary'|'secondary'|'error' }`
- [ ] Number change: Framer Motion `animate={{ opacity: [0, 1] }}` with number rolling up effect

### 3.14 — GridViz
`apps/web/src/engine/primitives/GridViz.tsx`:
- [ ] Renders a 2D grid of cells for pathfinding and matrix-style visualizations (replaces the GraphViz workaround used in `number-of-islands`)
- [ ] State shape:
  ```typescript
  {
    rows: number;
    cols: number;
    cells: {
      state: 'empty' | 'wall' | 'visited' | 'path' | 'start' | 'end' | 'active';
      value?: string | number;
    }[][];
    currentCell?: { row: number; col: number };  // highlighted cursor
  }
  ```
- [ ] Each cell: fixed-size square (`w-8 h-8`), color driven by `state`:
  - `empty`: `bg-surface-container border border-outline-variant/20`
  - `wall`: `bg-surface-container-highest`
  - `visited`: `bg-primary/20 border-primary/30`
  - `path`: `bg-secondary/40 border-secondary` + secondary glow
  - `start`: `bg-primary border-primary` (solid fill)
  - `end`: `bg-secondary border-secondary` (solid fill)
  - `active`: pulsing `bg-primary/60` — the cell being evaluated this step
- [ ] Cell state transitions: Framer Motion `animate={{ backgroundColor }}` spring
- [ ] Grid renders inside a scrollable container if rows×cols exceeds canvas bounds
- [ ] `currentCell` indicator: ring overlay using `motion.div` with `layout` animation
- [ ] Used by: `number-of-islands` (Phase 9), and any future pathfinding simulations (A*, BFS maze)

### 3.15 — Connector components
Create `apps/web/src/engine/connectors/`:

**`BezierConnector.tsx`:**
- [ ] SVG `<path>` with cubic bezier from (x1,y1) to (x2,y2) via control points
- [ ] Inactive style: `stroke: #48474d`, `strokeWidth: 2`
- [ ] Active style: `stroke: #3adffa`, `strokeWidth: 2`, `filter: drop-shadow(0 0 8px #3adffa)`
- [ ] Props: `from: {x,y}`, `to: {x,y}`, `active?: boolean`

**`StraightArrow.tsx`:**
- [ ] SVG line + arrowhead marker
- [ ] Props: `from: {x,y}`, `to: {x,y}`, `color?: string`, `label?: string`
- [ ] Animated tip: arrowhead pulses when `active`

**`DataFlowDot.tsx`:**
- [ ] Animated dot that travels along an SVG path
- [ ] Props: `pathD: string`, `color?: string`, `duration?: number`, `repeat?: boolean`
- [ ] Uses Framer Motion `motion.circle` with `offsetDistance` or `pathLength` animation
- [ ] Loops continuously when `repeat: true`

### 3.16 — Annotation components
Create `apps/web/src/engine/annotations/`:

**`StepPopup.tsx`:**
- [ ] Floating popup card attached to a visual element
- [ ] Props: `text: string`, `style?: 'info'|'success'|'warning'|'insight'`
- [ ] Entry animation: `initial={{ opacity:0, y:8, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }}`
- [ ] Glass morphism: `.glass-panel .glow-border rounded-2xl p-3 text-sm`
- [ ] Style variants: info=default, success=secondary glow, warning=error glow, insight=primary glow

**`ExplanationPanel.tsx`:**
- [ ] Scrollable left panel containing `ExplanationSection[]`
- [ ] Auto-scrolls to the section whose `appearsAtStep <= currentStep` (most recent)
- [ ] Active section: subtle left border in primary color
- [ ] Callout blocks: `"▸ Try this: ..."` in `bg-primary/10 rounded-lg p-3 text-sm`
- [ ] Markdown rendering: use a lightweight parser (e.g. `react-markdown` or manual heading/bold detection)

**`CodePanel.tsx`:**
- [ ] Shiki syntax-highlighted code view
- [ ] Props: `code: Scene['code']`, `currentStep: number`
- [ ] Active line: `background: rgba(183,159,255,0.12)` on the line at `highlightByStep[currentStep]`
- [ ] Active line glow: `box-shadow: inset 3px 0 0 #b79fff`
- [ ] Font: `font-mono text-sm`, line numbers displayed
- [ ] Copy button top-right: copies raw source to clipboard

---

## Exit Criteria
- [ ] All 13 primitives render without TypeScript errors when given their expected state shape
- [ ] `PrimitiveRegistry['array']` resolves to `ArrayViz`, `PrimitiveRegistry['grid']` resolves to `GridViz`
- [ ] ArrayViz: highlights, pointer arrows, and window highlight all animate correctly
- [ ] HashMapViz: hit/miss/insert animations fire at correct steps
- [ ] StepPopup: appears/disappears on step change with correct animation
- [ ] ExplanationPanel: auto-scrolls to correct section as steps advance
- [ ] CodePanel: active line highlights correctly at each step
- [ ] DataFlowDot: dot visibly travels along the SVG path
- [ ] No hardcoded colors — all colors from DESIGN.md token classes

---

## Key Notes
- **Use `ui-ux-pro-max` skill** when deciding exact visual layouts for any primitive
- All primitives receive pre-computed `state` from `computeVisualStateAtStep()` — they do NOT read from the Zustand store directly. They are pure display components.
- Framer Motion `layout` prop on list containers enables smooth reordering without custom FLIP code
- For `TreeViz` and `GraphViz`, positions should come from the Scene JSON (pre-computed), not be auto-calculated at runtime — this keeps behavior predictable and testable
- `CodePanel` requires Shiki to run server-side or be lazy-loaded; use `shiki/bundle/web` for browser compatibility
- `GridViz` replaces the `GraphViz` workaround for grid-based problems — update `number-of-islands.json` in Phase 9 to use `'grid'` type instead of `'graph'`
