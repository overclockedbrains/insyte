# Phase 27 — Visual Quality & Animation System

**Goal:** Make Insyte's visualizations look and feel as polished as VisualGo and Lucidchart. This means: sub-step animation sequencing (prepare → act → settle), stable element identity enabling FLIP animations, a semantic color system used consistently across all primitives, a unified spacing/typography system, and correct Framer Motion usage driven by scene-graph diffing.

**Source research:** `ARCHITECTURE_V3.md` Part 4 §4.3, Part 5 (§5.1–5.5), `layout-and-visualization.md` Part 3 §3.4 (VisualGo), `existing-tools-analysis.md` §6 (VisualGo) + §8 (Anime.js), `ARCHITECTURE_RECOMMENDATIONS.md` (Animation Quality section)

**Estimated effort:** 5–6 days

**Prerequisite:** Phase 22 (scene graph diff provides the `added/removed/moved/changed` signals that drive animations) + Phase 25 (pipeline producing correctly structured scene data)

---

## Why Competitors Look Better: The Four Gaps

1. **No sub-step sequencing** — Insyte applies all state changes simultaneously on step advance. VisualGo sequences: highlight → action → settle (3 phases, ~600ms total). The user's eye can follow each individual change.

2. **Inconsistent element identity** — some primitives remount DOM elements on step change, losing animation continuity. Framer Motion's `layoutId` requires the same element to persist across steps.

3. **No semantic color system** — highlight colors differ per primitive. Users can't learn what "red" means across visualizations.

4. **Arbitrary spacing** — `SCALE_X = 70`, `SCALE_Y = 70` — tuned by feel, not consistent. Elements look misaligned at different sizes.

---

## What Actually Changes

### 1. `apps/web/src/engine/styles/colors.ts` — New file (semantic color system)

```typescript
export const HIGHLIGHT_COLORS = {
  // Resting state — element exists but is not the current focus
  default:  { bg: '#1e1e2e', border: '#313244', text: '#e2e8f0' },
  
  // Currently being examined / visited
  active:   { bg: '#2d1b69', border: '#7c3aed', text: '#e2e8f0' },
  
  // Being inserted / added to the structure
  insert:   { bg: '#1a3a2e', border: '#10b981', text: '#e2e8f0' },
  
  // Being deleted / removed from the structure
  remove:   { bg: '#3a1a1a', border: '#ef4444', text: '#e2e8f0' },
  
  // Cache / lookup hit — element found
  hit:      { bg: '#1a3a2e', border: '#10b981', text: '#10b981' },
  
  // Cache / lookup miss — element not found
  miss:     { bg: '#3a1a1a', border: '#ef4444', text: '#ef4444' },
  
  // Most recently used (LRU cache)
  mru:      { bg: '#2d1b69', border: '#7c3aed', text: '#7c3aed' },
  
  // Least recently used (LRU cache)
  lru:      { bg: '#1e2a3a', border: '#3b82f6', text: '#3b82f6' },
  
  // Current DP cell being computed
  current:  { bg: '#2a1a3a', border: '#a855f7', text: '#a855f7' },
  
  // Completed / filled DP cell
  filled:   { bg: '#1a2a1a', border: '#4ade80', text: '#4ade80' },
  
  // Comparison pivot / special marker
  pivot:    { bg: '#2a2000', border: '#f59e0b', text: '#f59e0b' },
  
  // Error / invalid state
  error:    { bg: '#3a1a1a', border: '#f87171', text: '#f87171' },
} as const

export type HighlightColor = keyof typeof HIGHLIGHT_COLORS

// Helper: resolve a highlight string from step state to color tokens
export function resolveHighlight(h: string | undefined): typeof HIGHLIGHT_COLORS[HighlightColor] {
  return HIGHLIGHT_COLORS[(h as HighlightColor) ?? 'default'] ?? HIGHLIGHT_COLORS.default
}
```

All 12 primitive components import `resolveHighlight` from this file. **No more per-component color strings.**

---

### 2. `apps/web/src/engine/styles/typography.css` — New file

```css
/* Node value labels — value inside array cell, node label in tree/graph */
.viz-label-primary {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  color: var(--color-text-primary);
}

/* Secondary labels — key in hashmap, edge label, index numbers */
.viz-label-secondary {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 400;
  color: var(--color-text-muted);
}

/* Step popup text */
.viz-popup-text {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-text-primary);
}

/* Counter / stat values — large, prominent */
.viz-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

/* Array index labels */
.viz-index-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 400;
  color: var(--color-text-muted);
}
```

Import in globals.css. All primitives use these classes instead of hardcoded font styles.

---

### 3. `apps/web/src/engine/animation/useAnimateStep.ts` — New file (sub-step choreography)

```typescript
import { useAnimate } from 'framer-motion'

export type StepPhase = 'prepare' | 'act' | 'settle'

interface SubStep {
  phase: StepPhase
  targets: string[]    // CSS selectors or element refs
  props: Record<string, unknown>
  duration: number     // ms
  delay?: number
}

/**
 * Executes a sequence of sub-steps for a single step transition.
 * Each step = prepare (100ms) → act (300ms) → settle (200ms) = 600ms total at 1x speed.
 *
 * Usage in primitive components:
 *   const { scope, animateStep } = useAnimateStep()
 *   await animateStep([
 *     { phase: 'prepare', targets: ['.node-3'], props: { boxShadow: '0 0 12px #7c3aed' }, duration: 100 },
 *     { phase: 'act',     targets: ['.node-3'], props: { backgroundColor: '#2d1b69' }, duration: 300 },
 *     { phase: 'settle',  targets: ['.node-3'], props: { border: '1px solid #10b981' }, duration: 200 },
 *   ])
 */
export function useAnimateStep(speed: number = 1) {
  const [scope, animate] = useAnimate()
  
  const animateStep = async (subSteps: SubStep[]) => {
    for (const subStep of subSteps) {
      const scaledDuration = (subStep.duration / 1000) / speed  // convert ms to seconds, apply speed
      
      await animate(
        subStep.targets.join(', '),
        subStep.props,
        {
          duration: scaledDuration,
          delay: subStep.delay ? subStep.delay / 1000 / speed : 0,
          ease: subStep.phase === 'act' ? 'easeOut' : 'easeInOut',
        }
      )
    }
  }
  
  return { scope, animateStep }
}
```

---

### 4. DOMRenderer — Renders at GROUP level; primitive components own internal coordinate space

> **Coordinate model reconciliation (Phase 18 + 20 + 27):**
>
> - Phase 18 moved complex primitives (GraphViz, TreeViz, RecursionTreeViz, SystemDiagramViz) into a **unified SVG viewBox** — their internal nodes are positioned in SVG coordinate space, not DOM pixel space.
> - Phase 20's layout engine computes pixel positions for all nodes, but for SVG-viewBox primitives these are *SVG viewport coordinates* consumed by the primitive component, not DOM positions.
> - Therefore the DOMRenderer **must NOT** position individual `sceneGraph.nodes` with `position: absolute`. Instead it renders at the **GROUP level** (one `<motion.div>` per visual / group), positioned by the group's bounding box. Each primitive component handles internal node rendering in its own coordinate space (SVG viewBox for complex types, simple DOM for arrays/stacks/etc.).

```typescript
// apps/web/src/components/renderers/DOMRenderer.tsx
import { useEffect } from 'react'
import { animate, AnimatePresence, motion } from 'framer-motion'
import { diffSceneGraphs } from '@insyte/scene-engine'

export function DOMRenderer({ sceneGraph, step, isPlaying, speed }: SceneRendererProps) {
  const prevGraph = usePrevious(sceneGraph)
  
  // Diff-driven animations operate on group containers, not individual nodes
  useEffect(() => {
    if (!prevGraph) return
    const diff = diffSceneGraphs(prevGraph, sceneGraph)
    
    // Animate added groups (new visuals entering): scale in
    const addedGroupIds = new Set(diff.added.map(n => n.groupId))
    addedGroupIds.forEach(gid => {
      animate(`#sg-group-${gid}`, { scale: [0, 1.05, 1], opacity: [0, 1] }, { duration: 0.3 / speed })
    })
    
    // Animate removed groups: scale out
    const removedGroupIds = new Set(diff.removed.map(n => n.groupId))
    removedGroupIds.forEach(gid => {
      animate(`#sg-group-${gid}`, { scale: 0, opacity: 0 }, { duration: 0.2 / speed })
    })
    
    // Node-level state changes (color, highlight) are handled inside the primitive component
    // by forwarding the sceneGraph nodes to it — the component reads its group's nodes from the graph
    
    // New edges draw-on: forwarded to primitive via sceneGraph update
    diff.addedEdges.forEach(edge => {
      animate(`#sg-edge-${edge.id}`, { pathLength: [0, 1] }, { duration: 0.3 / speed })
    })
  }, [sceneGraph, step, speed])
  
  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        {[...sceneGraph.groups.values()].map(group => {
          const { bbox } = group
          return (
            <motion.div
              key={group.id}
              id={`sg-group-${group.id}`}
              layoutId={group.id}        // FLIP animates when group bbox shifts (e.g. tree grows)
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'absolute',
                left: bbox.x,
                top: bbox.y,
                width: bbox.width,
                height: bbox.height,
              }}
              transition={{
                layout: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 / speed },
              }}
            >
              {/*
               * PrimitiveComponent receives the group's nodes + edges from the sceneGraph.
               * Complex primitives (GraphViz, TreeViz, etc.) render internally via SVG viewBox.
               * Simple primitives (ArrayViz, StackViz, etc.) render via straightforward DOM layout.
               * Either way, internal coordinate decisions belong to the primitive, not the DOMRenderer.
               */}
              <PrimitiveComponent
                group={group}
                sceneGraph={sceneGraph}
                speed={speed}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/**
 * PrimitiveComponent — selects the right visual component for a group.
 * Passes the group's positioned nodes and routed edges from the sceneGraph.
 */
function PrimitiveComponent({
  group, sceneGraph, speed,
}: {
  group: SceneGroup
  sceneGraph: SceneGraph
  speed: number
}) {
  const nodes = group.nodeIds.map(id => sceneGraph.nodes.get(id)!).filter(Boolean)
  const edges = [...sceneGraph.edges.values()].filter(
    e => group.nodeIds.includes(e.from) || group.nodeIds.includes(e.to)
  )
  const visualType = nodes[0]?.type
  
  // Each primitive component decides internally whether to use SVG viewBox (GraphViz, TreeViz,
  // RecursionTreeViz, SystemDiagramViz — already migrated in Phase 18) or DOM layout
  // (ArrayViz, StackViz, QueueViz, etc.). The layout positions in `nodes` are always
  // in the primitive's own coordinate space, computed by the layout engine in Phase 20.
  return <PrimitiveRegistry type={visualType} nodes={nodes} edges={edges} speed={speed} />
}
```

---

### 5. Stable element identity across all primitives

Every primitive component must use **stable, content-based IDs** for all nodes. The ID must not change when the node's value changes — only when the node is added or removed.

**Rule:** `layoutId` for Framer Motion FLIP = `"${visualId}__${nodeId}"` — same ID from step 0 to step N.

**ArrayViz — stable cell IDs:**
```typescript
// WRONG: key=index — cell at index 0 is always "cell-0" regardless of content
cells.map((c, i) => <Cell key={i} ... />)

// CORRECT: key=stable identifier — the physical slot, not the value
cells.map((c, i) => (
  <motion.div
    key={`${visualId}-slot-${i}`}
    layoutId={`${visualId}-slot-${i}`}
    // Value changes animate in-place via motion props, no remount
    animate={{ backgroundColor: resolveHighlight(c.h).bg }}
  />
))
```

**TreeViz — stable node IDs:**
```typescript
// Each tree node gets its ID from the data, not position
// TreeNode.id field (added in Phase 19 schema)
nodes.map(n => (
  <motion.foreignObject key={n.id} layoutId={n.id} ... />
))
```

---

### 6. Fix DP table cell remounting

**Problem:** `AnimatePresence` wraps individual cells. On step change, all 100 cells (10×10) remount simultaneously, causing 100 animation instances firing at once.

**Fix:** Don't use AnimatePresence for DP table cells. Use `motion.animate` imperatively for color changes only:

```typescript
// DPTableViz.tsx
const { scope, animate } = useAnimate()

useEffect(() => {
  // Animate only the cells that changed since the last step
  changedCells.forEach(({ row, col, highlight }) => {
    const colors = resolveHighlight(highlight)
    animate(
      `[data-cell="${row}-${col}"]`,
      { backgroundColor: colors.bg, borderColor: colors.border },
      { duration: 0.25 / speed }
    )
  })
}, [currentStep])

// Render: stable cells, no AnimatePresence, data-cell attribute for targeting
return (
  <div ref={scope} className="grid">
    {cells.map((row, ri) =>
      row.map((cell, ci) => (
        <div key={`${ri}-${ci}`} data-cell={`${ri}-${ci}`} className="viz-cell">
          {cell.value}
        </div>
      ))
    )}
  </div>
)
```

---

### 7. Speed multiplier integration

All animation durations are divided by the `speed` multiplier from the playback store:

```typescript
// In every animated component:
const { speed } = usePlaybackStore()

// At 1x: 300ms act phase
// At 2x: 150ms act phase
// At 0.5x: 600ms act phase
const ACT_DURATION = 0.3 / speed
const PREPARE_DURATION = 0.1 / speed
const SETTLE_DURATION = 0.2 / speed
```

---

### 8. Keyboard controls

Add keyboard event handlers to the simulation page:

```typescript
// apps/web/src/hooks/usePlaybackKeyboard.ts
export function usePlaybackKeyboard() {
  const { stepForward, stepBack, reset, play, pause, setSpeed, isPlaying } = usePlaybackStore()
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when user is typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      switch (e.key) {
        case ' ':       e.preventDefault(); isPlaying ? pause() : play(); break
        case 'ArrowRight': e.preventDefault(); stepForward(); break
        case 'ArrowLeft':  e.preventDefault(); stepBack(); break
        case 'Home':       e.preventDefault(); reset(); break
        case '1':          setSpeed(0.5); break
        case '2':          setSpeed(1); break
        case '3':          setSpeed(1.5); break
        case '4':          setSpeed(2); break
      }
    }
    
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, stepForward, stepBack, reset, play, pause, setSpeed])
}
```

Add `usePlaybackKeyboard()` to the simulation page layout.

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `apps/web/src/engine/styles/colors.ts` | New | Semantic HIGHLIGHT_COLORS |
| `apps/web/src/engine/styles/typography.css` | New | Typography hierarchy |
| `apps/web/src/engine/animation/useAnimateStep.ts` | New | Sub-step choreography hook |
| `apps/web/src/components/renderers/DOMRenderer.tsx` | Edit | Scene-graph diff → targeted animations |
| `apps/web/src/components/primitives/ArrayViz.tsx` | Edit | Stable IDs, semantic colors |
| `apps/web/src/components/primitives/TreeViz.tsx` | Edit | Stable IDs, semantic colors |
| `apps/web/src/components/primitives/GraphViz.tsx` | Edit | Stable IDs, semantic colors |
| `apps/web/src/components/primitives/LinkedListViz.tsx` | Edit | Stable IDs, FLIP fix |
| `apps/web/src/components/primitives/DPTableViz.tsx` | Edit | Fix cell remounting |
| `apps/web/src/components/primitives/HashMapViz.tsx` | Edit | Semantic colors |
| `apps/web/src/components/primitives/StackViz.tsx` | Edit | Semantic colors |
| `apps/web/src/components/primitives/QueueViz.tsx` | Edit | Semantic colors |
| `apps/web/src/components/primitives/RecursionTreeViz.tsx` | Edit | Semantic colors, stable IDs |
| `apps/web/src/components/primitives/SystemDiagramViz.tsx` | Edit | Semantic colors |
| `apps/web/src/components/primitives/CounterViz.tsx` | Edit | Typography class |
| `apps/web/src/components/primitives/TextBadgeViz.tsx` | Edit | Typography class |
| `apps/web/src/hooks/usePlaybackKeyboard.ts` | New | Keyboard controls |
| `apps/web/src/app/s/[slug]/page.tsx` | Edit | Wire keyboard hook |
