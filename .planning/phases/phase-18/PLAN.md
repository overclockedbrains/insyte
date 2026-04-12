# Phase 18 — Coordinate System Unification

**Goal:** Eliminate the dual coordinate system bug that causes edges to never connect to node centers. Migrate graph/tree/system-diagram primitives from the broken (DOM % + SVG px) dual-system to a single unified SVG viewBox with `<foreignObject>` node bodies.

**Source research:** `ARCHITECTURE_RECOMMENDATIONS.md` Phase B, `rendering-approach.md` §1 + §6, `ARCHITECTURE_V3.md` Part 4 §4.2, `canvas-libs-analysis.md` §5

**Estimated effort:** 6–8 days

**Prerequisite:** Phase 17 (Ollama + custom LLM support — no direct code dependency, ordering only)

---

## Root Cause

```
Current state (broken):
  DOM nodes:  left: ${pos.x}%   top: ${pos.y}%       ← percentage of container div
  SVG edges:  x * SCALE_X px    y * SCALE_Y px        ← pixels from SVG's own origin

  These are DIFFERENT coordinate systems.
  On a 1440px monitor with SCALE_X=70 tuned for that width: looks correct.
  On a 768px display: DOM nodes shift but SVG lines stay at same absolute px → misalign.
```

The fix does NOT require migrating to Canvas. It requires **one coordinate space** for everything. Two approaches are combined:

**Fix A (CanvasCard):** ResizeObserver measures container px dimensions. All percentage-based positions converted to px at runtime. Both DOM nodes and SVG edges use the same px coords.

**Fix B (Complex primitives):** Migrate GraphViz, TreeViz, RecursionTreeViz, SystemDiagramViz from (DOM + SVG overlay) to a **single SVG viewBox with `<foreignObject>`** for node bodies. Edges are `<path>` elements in the same SVG coordinate space as their `<foreignObject>` containers — they always connect perfectly.

---

## What Actually Changes

### 1. `apps/web/src/components/CanvasCard.tsx` — Edit

Add ResizeObserver to measure container dimensions in pixels:

```typescript
const containerRef = useRef<HTMLDivElement>(null)
const [dims, setDims] = useState({ w: 0, h: 0 })

useEffect(() => {
  const el = containerRef.current
  if (!el) return
  
  // Initial measurement
  setDims({ w: el.clientWidth, h: el.clientHeight })
  
  // Track changes (window resize, panel resize, etc.)
  const ro = new ResizeObserver(([entry]) => {
    setDims({
      w: entry.contentRect.width,
      h: entry.contentRect.height,
    })
  })
  ro.observe(el)
  return () => ro.disconnect()
}, [])

// Convert % positions to px — shared across all primitives
const toPx = useCallback((pos: { x: number; y: number }) => ({
  x: (pos.x / 100) * dims.w,
  y: (pos.y / 100) * dims.h,
}), [dims])

// Pass dims and toPx down via context
// (or pass as props — depends on whether primitives render inside CanvasCard)
```

Create a `CanvasContext` to provide `dims` and `toPx` to all child primitives without prop-drilling:

```typescript
// apps/web/src/engine/CanvasContext.ts
export interface CanvasContextValue {
  width: number
  height: number
  toPx: (pos: { x: number; y: number }) => { x: number; y: number }
}

export const CanvasContext = React.createContext<CanvasContextValue>({
  width: 800, height: 600,
  toPx: (p) => ({ x: p.x * 8, y: p.y * 6 }),  // fallback
})

export const useCanvas = () => React.useContext(CanvasContext)
```

---

### 2. `apps/web/src/components/primitives/GraphViz.tsx` — Rewrite core rendering

**Before (broken):**
```tsx
// Nodes: DOM absolute % positioning
<div style={{ position: 'absolute', left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}>
  <NodeBody node={node} />
</div>

// Edges: SVG with independent pixel scaling
<svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
  <line x1={edge.from.x * SCALE_X} y1={edge.from.y * SCALE_Y} x2={edge.to.x * SCALE_X} y2={edge.to.y * SCALE_Y} />
</svg>
```

**After (unified SVG viewBox):**
```tsx
// Single SVG with both edges and node bodies
<svg
  viewBox={viewBox}
  style={{ width: '100%', height: '100%', overflow: 'visible' }}
  preserveAspectRatio="xMidYMid meet"
>
  {/* Edges are SVG paths in viewBox coordinate space */}
  {edges.map(e => (
    <motion.path
      key={e.id}
      d={edgePath(e.from, e.to)}
      stroke={edgeColor(e)}
      strokeWidth={1.5}
      fill="none"
      markerEnd="url(#arrowhead)"
      layoutId={`edge-${e.id}`}
    />
  ))}
  
  {/* Node bodies via foreignObject — HTML/React inside SVG coordinate space */}
  {nodes.map(n => (
    <foreignObject
      key={n.id}
      x={n.x - NODE_W / 2}
      y={n.y - NODE_H / 2}
      width={NODE_W}
      height={NODE_H}
    >
      {/* Full React + Tailwind inside foreignObject */}
      <motion.div
        layoutId={`node-${n.id}`}
        className="w-full h-full rounded-lg border border-purple-500/30 bg-[#1e1e2e] flex items-center justify-center"
        animate={{ borderColor: n.highlighted ? '#7c3aed' : '#313244' }}
      >
        <span className="font-mono text-sm text-white">{n.label}</span>
      </motion.div>
    </foreignObject>
  ))}
  
  {/* Arrow marker definition */}
  <defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7c3aed" />
    </marker>
  </defs>
</svg>
```

**viewBox computation:**
```typescript
function computeViewBox(nodes: LayoutNode[], padding = 40): string {
  if (nodes.length === 0) return '0 0 400 300'
  
  const minX = Math.min(...nodes.map(n => n.x - NODE_W / 2)) - padding
  const minY = Math.min(...nodes.map(n => n.y - NODE_H / 2)) - padding
  const maxX = Math.max(...nodes.map(n => n.x + NODE_W / 2)) + padding
  const maxY = Math.max(...nodes.map(n => n.y + NODE_H / 2)) + padding
  
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
}
```

The SVG `viewBox` auto-fits to the content. No clipping regardless of container dimensions.

---

### 3. `apps/web/src/components/primitives/TreeViz.tsx` — Rewrite core rendering

Same pattern as GraphViz:
- Remove `SCALE_X = 60`, `SCALE_Y = 80` constants
- Use `<foreignObject>` for node bodies
- Use `<path>` for tree edges (curved or straight)
- `viewBox` computed from node positions + padding

Tree-specific edge path (straight line from parent center to child center):
```typescript
function treeEdgePath(parent: LayoutNode, child: LayoutNode): string {
  return `M ${parent.x} ${parent.y + NODE_H / 2} L ${child.x} ${child.y - NODE_H / 2}`
}
// Or cubic bezier for curved:
function treeEdgeBezier(parent: LayoutNode, child: LayoutNode): string {
  const midY = (parent.y + child.y) / 2
  return `M ${parent.x} ${parent.y + NODE_H / 2} C ${parent.x} ${midY} ${child.x} ${midY} ${child.x} ${child.y - NODE_H / 2}`
}
```

---

### 4. `apps/web/src/components/primitives/RecursionTreeViz.tsx` — Rewrite core rendering

Same pattern as TreeViz. The memoization highlight (gray-out for pruned nodes) renders inside the `<foreignObject>` — CSS class applied normally.

---

### 5. `apps/web/src/components/primitives/SystemDiagramViz.tsx` — Rewrite core rendering

Same SVG viewBox pattern. Edges use bezier curves:

```typescript
// S-curve bezier for horizontal layout (LR)
function systemEdgePath(from: LayoutNode, to: LayoutNode): string {
  const mx = (from.x + to.x) / 2
  return `M ${from.x + NODE_W / 2} ${from.y} C ${mx} ${from.y} ${mx} ${to.y} ${to.x - NODE_W / 2} ${to.y}`
}
```

Remove the `minWidth: Math.min(maxCompX, 520)` hard cap — viewBox handles fitting automatically.

---

### 6. `apps/web/src/components/StepPopup.tsx` — Edit (ResizeObserver-based anchoring)

Popups currently anchor to DOM element percentage positions. After the SVG viewBox migration, popup anchor points are SVG `<foreignObject>` positions.

```typescript
// Use getBoundingClientRect() of the foreignObject to position popup in DOM space
const anchorRef = useRef<SVGForeignObjectElement>(null)
const [popupPos, setPopupPos] = useState({ x: 0, y: 0 })

useEffect(() => {
  if (!anchorRef.current) return
  
  const update = () => {
    const rect = anchorRef.current!.getBoundingClientRect()
    setPopupPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,  // 8px above the node
    })
  }
  
  update()
  const ro = new ResizeObserver(update)
  ro.observe(anchorRef.current)
  return () => ro.disconnect()
}, [])
```

Popup renders as a fixed-position DOM element (not inside SVG) at the computed DOM coordinates.

---

### 7. Safari `<foreignObject>` Compatibility

Safari has known quirks with `<foreignObject>` — specifically, text rendering inside `foreignObject` may have sub-pixel issues on certain Safari versions.

**Mitigation strategy:**
- Use `xmlns="http://www.w3.org/1999/xhtml"` on the HTML root inside foreignObject
- Test on Safari 16+ (current supported range)
- If Safari text rendering is unacceptable: fall back to SVG `<text>` elements for simple node labels, `<foreignObject>` for complex node bodies only

```tsx
<foreignObject x={...} y={...} width={...} height={...}>
  <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%' }}>
    {/* Node content */}
  </div>
</foreignObject>
```

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `apps/web/src/engine/CanvasContext.ts` | New | Shared px dimensions + conversion |
| `apps/web/src/components/CanvasCard.tsx` | Edit | ResizeObserver, provide CanvasContext |
| `apps/web/src/components/primitives/GraphViz.tsx` | Rewrite rendering | Unified SVG viewBox |
| `apps/web/src/components/primitives/TreeViz.tsx` | Rewrite rendering | Unified SVG viewBox |
| `apps/web/src/components/primitives/RecursionTreeViz.tsx` | Rewrite rendering | Unified SVG viewBox |
| `apps/web/src/components/primitives/SystemDiagramViz.tsx` | Rewrite rendering | Unified SVG viewBox |
| `apps/web/src/components/StepPopup.tsx` | Edit | ResizeObserver anchoring |

---

## Expected Impact

| Symptom | Before | After |
|---------|--------|-------|
| Edges not connecting to node centers | Present on all non-1440px screens | Eliminated — one coordinate space |
| Content clipping on small containers | Common (hard-coded caps) | Eliminated — auto-fit viewBox |
| SVG height bug in TreeViz | Clip on deep trees | Fixed — computed height |
| Popup misalignment | Present | Fixed — getBoundingClientRect |
| Responsive layout correctness | Broken on mobile | Correct at any container size |

---

## Not Covered in This Phase

- XY positions are still in Scene JSON (from AI generation). Phase 20 removes them entirely.
- Layout algorithm (dagre/d3-hierarchy) is not yet wired in — positions still come from Scene JSON (or AI). Phase 21 adds the layout engine.
- The coordinate unification here applies at the rendering level. After Phase 21, positions will come from the layout engine instead of Scene JSON.
