# Rendering Approach Analysis for Insyte

> Written: April 2026  
> Status: Decision-grade research — informs architectural planning for Phase 16+  
> Context: Insyte is a React + SVG + Framer Motion visualization platform (Next.js 15, TypeScript, Zustand) rendering educational simulations from a Scene JSON DSL.

---

## Table of Contents

1. [Current State Diagnosis](#1-current-state-diagnosis)
2. [React DOM — The Current Approach](#2-react-dom--the-current-approach)
3. [HTML Canvas (2D)](#3-html-canvas-2d)
4. [WebGL / GPU Rendering](#4-webgl--gpu-rendering)
5. [SVG-Only Rendering](#5-svg-only-rendering)
6. [Hybrid Approaches](#6-hybrid-approaches)
7. [Reference Architecture Analysis](#7-reference-architecture-analysis)
8. [Insyte-Specific Considerations](#8-insyte-specific-considerations)
9. [Trade-off Comparison Table](#9-trade-off-comparison-table)
10. [Recommendation](#10-recommendation)
11. [Migration Complexity Estimate](#11-migration-complexity-estimate)
12. [Hybrid Path That Preserves Existing Work](#12-hybrid-path-that-preserves-existing-work)

---

## 1. Current State Diagnosis

### What Insyte currently does

The rendering stack is a **React DOM + HTML + SVG hybrid driven by Framer Motion**. Every primitive is a React component. Edges and connectors are SVG `<line>` / `<path>` elements rendered inside SVG islands that are absolutely positioned inside the DOM. Node bodies (graph nodes, tree nodes, system diagram boxes) are `<motion.div>` elements, absolutely positioned via percentage-based coordinates (`left: ${x}%`, `top: ${y}%`, `transform: translate(-50%, -50%)`).

The canvas zone is a plain `div` with `position: relative` and `overflow: auto`. Primitives are laid out in one of two modes:

- **Absolute layout** — when a visual has a `position` field (`x`, `y` in 0–100 percent space). Used for graphs, trees, system diagrams.
- **Flow layout** — `flex flex-col items-center gap-4`. Used when no positions are specified. Stacks primitives vertically.

SVG elements (edges, connectors) are drawn in coordinate spaces that are *separate* from the DOM coordinate space of their node bodies. The SVG uses scaled integer grid coords (`x * SCALE_X`, `y * SCALE_Y`) while the DOM nodes use percentage-based positioning relative to the container. These two systems must stay in sync, and they currently do not share a common coordinate model — they use independent heuristics (`SCALE_X = 70`, `SCALE_Y = 70` in GraphViz; `SCALE_X = 60`, `SCALE_Y = 80` in TreeViz).

### The core positioning problem

When AI generates node positions (e.g., `{ x: 3.5, y: 0.5 }`), those numbers are grid units multiplied by a hardcoded scale. The SVG draws edges between `x * SCALE_X` pixels from its own top-left origin. The DOM node is at `left: ${pos.x}%` of the canvas container. These are *different coordinate systems* — one is absolute pixels from an SVG origin, the other is a percentage of a flex container that can be any width. They cannot be made consistent without knowing the container's rendered dimensions at paint time.

This is the root cause of "visual elements not lining up with connectors" and why AI-generated positions feel unpredictable — the same JSON looks correct on a 1440px wide monitor and broken on a 1024px one.

### Known friction points (observed from code)

| Symptom | Root cause |
|---------|-----------|
| Edges don't connect to node centers | Dual coordinate systems (SVG px vs DOM %) |
| AI-generated positions collide or overflow | No collision detection, no canvas boundary awareness |
| TreeViz SVG clips when tree is deep | SVG has no explicit height, `overflow: visible` on a zero-height container |
| SystemDiagramViz overflow issues | `minWidth: Math.min(maxCompX, 520)` hard cap creates cut-off on large diagrams |
| Framer Motion `layout` prop causes cascade re-renders | When one node animates layout, React re-renders siblings |
| DP table cells re-mount on step change | `AnimatePresence` wraps individual cells — `rows * cols` animation instances |

---

## 2. React DOM — The Current Approach

### How it works in Insyte

Scene JSON is parsed into React component trees. Each visual maps to a component in `PrimitiveRegistry`. State transitions are driven by `computeVisualStateAtStep()` — a pure function that replays actions on `initialState`. Framer Motion handles all animation: spring physics on `animate`, layout animations via `layout` / `layoutId`, and entrance/exit via `AnimatePresence`.

### When React re-render overhead hurts

React's reconciler is optimized for tree diffing, not for high-frequency positional updates. Re-render overhead becomes measurable in these scenarios:

**1. Large node counts.** Each Framer Motion `<motion.div>` is a React element with its own animation state machine. A recursion tree for `fib(8)` produces 67 nodes. A DP table for Longest Common Subsequence with 10x10 inputs produces 100 cells, each wrapped in `AnimatePresence`. At step change, React diffs the full subtree and Framer Motion schedules animation updates for each instance. At 50+ nodes, this can produce janky transitions on mid-range devices (Chrome DevTools: scripting time > 16ms per frame).

**2. Framer Motion `layout` animations.** When `layout` prop is used (e.g., LinkedListViz uses `layout` on `<motion.div>` for `AnimatePresence mode="popLayout"`), Framer Motion must read the DOM layout *before and after* the update (two forced reflows), then animate between them using FLIP. This is costly when multiple layout-animated siblings exist simultaneously.

**3. The `animate` object with computed values.** Animating `backgroundColor`, `borderColor`, `boxShadow`, and `color` simultaneously (as in GraphViz node `animate` prop) means Framer Motion interpolates 4 CSS properties per frame per node. At 60fps with 20 nodes, that's 20 × 4 × 60 = 4,800 property interpolations per second, all going through React's synthetic event system.

**4. Global Zustand subscription.** `computeVisualStateAtStep` is called for every visible primitive on every step change. In CanvasCard, every active primitive subscribes to `currentStep` via `usePlayback()`. A step change triggers re-render of all primitives simultaneously (no batching by visual).

### How Framer Motion interacts with complex layout

Framer Motion v12 (Insyte uses `^12.38.0`) uses the FLIP (First, Last, Invert, Play) technique for `layout` animations. This requires:
1. Reading the element's bounding rect before update (First)
2. Triggering the React update
3. Reading the bounding rect after update (Last)
4. Applying an inverse CSS transform to snap back to First position (Invert)
5. Removing the inverse transform in the next frame (Play)

Steps 1 and 3 force layout recalculations. When multiple elements use `layout` simultaneously, Framer Motion batches FLIP measurements using ResizeObserver, but each measurement still requires a forced layout read from the browser. For the LinkedListViz with `AnimatePresence mode="popLayout"`, every node insertion/deletion forces a full FLIP cycle on all siblings.

Framer Motion's `AnimatePresence` also maintains an internal registry of exiting elements — it holds them in the DOM until their `exit` animation completes. During a fast playback (speed > 1x), AnimatePresence can accumulate multiple exiting nodes simultaneously, each running its own animation, causing DOM node count to temporarily spike.

### Layout calculation problems with percentage positioning

The current absolute layout system positions nodes at `left: ${pos.x}%` / `top: ${pos.y}%` of the canvas container. This has three compounding problems:

**A. Container size is dynamic.** The canvas zone is `flex-1 min-h-0`, which means its dimensions are determined by the remaining viewport space after the playback controls and control bar are rendered. This is not known until after the browser paints — so any coordinate calculation that happens during render (before `useEffect`) is operating on stale or zero dimensions.

**B. Aspect ratio changes break layouts.** A node at `(50%, 50%)` is the center on any screen. But a graph that uses relative spacing (nodes at `x: 1, 2, 3` scaled to `70px` apart) will have its SVG edges drawn at `70px`, `140px`, `210px` in pixel space, while the DOM nodes sit at `14.2%`, `28.6%`, `42.8%` of whatever the container width is. On a 500px canvas, the DOM node at 14.2% is at pixel 71 — close enough. On a 320px mobile canvas, it's at 45px — completely misaligned.

**C. AI-generated coordinates are unbounded.** The Scene JSON allows any float for `position.x` and `position.y`. The renderer clamps them at `%` units (so `x: 150` becomes `left: 150%`, overflowing the canvas). There is no validation or normalization in `CanvasCard` — the Zod schema allows `position: { x: number, y: number }` with no bounds.

---

## 3. HTML Canvas (2D)

### What it is

The HTML `<canvas>` element exposes a 2D rasterization API (`CanvasRenderingContext2D`). You call imperative drawing commands (`fillRect`, `arc`, `bezierCurveTo`, `fillText`) and the browser rasterizes them to a pixel buffer. There is no retained scene graph — you own the render loop.

### What it enables vs React

**Unified coordinate system.** Everything drawn on a canvas shares one pixel coordinate space from `(0, 0)` at top-left. Edges and nodes are always in the same space. No split between DOM position and SVG coordinates. This alone eliminates Insyte's primary positioning bug class.

**Zoom and pan are trivial.** You store a `transform = { scale, translateX, translateY }` and apply it at the start of each `ctx.save()` block. All subsequent draws are in transformed space. Implementing a zoom-to-fit on scene load, or pinch-to-zoom on mobile, is a 30-line implementation.

**Performance ceiling is much higher.** Drawing 500 nodes and 1000 edges takes ~2ms in Canvas 2D. The same graph in React DOM would require 500 React elements, 500 Framer Motion instances, 1000 SVG elements — all reconciled on each update. Canvas skips the React reconciler entirely.

**Full control over hit testing.** You implement `onMouseMove` yourself, check if the cursor falls within each node's bounding box, and respond. This is more work but gives full control over interaction.

### What animation/transition support exists

Canvas 2D has **no built-in animation or interpolation**. You must implement or use a library:

- **`requestAnimationFrame` loop** — manual approach; write a lerp/spring function, update a value each frame, redraw.
- **Tween libraries** — GSAP (GreenSock Animation Platform) is the gold standard. It interpolates any numeric value with spring physics, easing, staggering, timelines, and pause/resume control. GSAP v3 targets arbitrary objects, not DOM elements — so you can animate a plain JavaScript `{ x: 0, y: 0 }` object and use its values in your `drawFrame()` function.
- **Popmotion** — the animation engine underlying Framer Motion, usable standalone. Exports `animate`, `spring`, `keyframes` as pure functions that drive arbitrary numeric values.
- **D3 transitions** — D3's transition system can drive arbitrary datum interpolation; you bind data, define a transition, and D3 updates the bound values each frame.

### Canvas libraries — Konva.js, Fabric.js, Pixi.js

**Konva.js**
- A retained-mode Canvas library that brings a scene graph (Layers, Groups, Shapes) back on top of Canvas 2D.
- Provides drag-and-drop, hit testing, selection, and event delegation built in.
- `react-konva` wrapper gives you JSX for Konva shapes — you write `<Circle>`, `<Line>`, `<Text>` components.
- Animations via `Konva.Tween` or by integrating with GSAP.
- **Best fit for:** diagram-style tools where you want retained-mode event handling and React component model but need Canvas's coordinate model.
- **Downside:** Konva adds ~50KB gzipped and its rendering pipeline is slower than raw Canvas for particle-heavy or large-graph scenarios (it's still a JavaScript scene graph above Canvas 2D).

**Fabric.js**
- Similar to Konva but older. Focused on interactive image editing, object selection/manipulation.
- No React integration. Less relevant for data visualization.
- **Not recommended** for Insyte.

**Pixi.js (2D Canvas / WebGL)**
- A hybrid renderer: automatically uses WebGL when available, falls back to Canvas 2D.
- Extremely fast. Used by game studios and high-frequency trading dashboards.
- Has a retained scene graph (`Container`, `Sprite`, `Graphics`).
- `@pixi/react` provides a React integration.
- **Best fit for:** particle systems, 60fps animated diagrams with hundreds of elements.
- **Downside:** heavy dependency (~350KB gzipped for full bundle), overkill for Insyte's 20-50 node visualizations, and text rendering requires texture atlases (complex for dynamic labels).

### Tradeoffs: accessibility, text rendering, React integration

| Concern | Canvas 2D | Notes |
|---------|-----------|-------|
| Accessibility (a11y) | Poor | Canvas is a black box to screen readers. You must maintain a separate ARIA tree (e.g., `role="img"` + `aria-label`, or off-screen DOM table). |
| Text rendering | Limited | Canvas text uses the browser's font rasterizer but has no text wrapping, no rich text, no CSS-class fonts without explicit loading. Dynamic labels with line breaks require manual measurement and splitting. |
| React integration | Possible | `react-konva` or `@pixi/react` give JSX APIs. Raw Canvas requires `useRef` + `useEffect` + manual imperative updates. React DevTools don't show Canvas internals. |
| Selection / copy-paste | Not built in | Must implement manually. |
| DevX / debugging | Harder | No browser inspector for individual canvas elements. |

---

## 4. WebGL / GPU Rendering

### What it enables that Canvas 2D doesn't

WebGL is a JavaScript API for the GPU's rasterization pipeline. Every draw call goes through programmable vertex and fragment shaders on the GPU. This unlocks:

- **True 60fps at scale** — 100,000 nodes rendered in under 1ms (GPU throughput dwarfs CPU Canvas 2D).
- **Complex visual effects at no CPU cost** — glow effects, bloom, blur, gradients computed in shaders rather than with `ctx.filter`.
- **Instanced rendering** — draw 1,000 identical node shapes with one draw call by passing instance data (position, color) as a buffer.

### Libraries

**Three.js**
- The dominant 3D WebGL library. Also supports 2D via orthographic camera.
- Huge ecosystem, extensive examples.
- Overhead for purely 2D use cases: you're using 1% of its capability, carrying 100% of its bundle (~600KB minified).
- **Not recommended** for Insyte.

**regl / TWGL**
- Low-level WebGL helpers that remove boilerplate but keep you close to the metal.
- Require writing GLSL shaders. High expertise requirement.
- **Not recommended** unless Insyte needs custom shader effects.

**Pixi.js (WebGL mode)**
- As noted above, Pixi automatically uses WebGL.
- Its WebGL renderer uses sprite batching: thousands of elements in one draw call.
- `@pixi/react` integration makes it approachable.
- Still has text rendering complexity.

### Is WebGL overkill for educational visualization?

**Yes, definitively.** Insyte's visual primitives are:
- Graphs/trees: 20–80 nodes, 30–120 edges. A Canvas 2D renderer handles this trivially.
- DP tables: max ~20×20 = 400 cells.
- System diagrams: 5–15 boxes, 10–30 connections.
- Arrays: up to ~30 cells.
- Linked lists: up to ~20 nodes.

None of these exceed ~150 DOM elements at peak complexity. React DOM with optimized selectors and memoization handles this comfortably. Canvas 2D handles it with headroom. WebGL provides zero perceptible benefit for this scale. The additional complexity (shader authoring, text atlas management, loss of CSS, loss of accessibility primitives) adds weeks of development time for no user-visible gain.

**The only compelling WebGL argument** would be if Insyte added large-scale network topology diagrams (1000+ nodes) or real-time streaming data visualization. Neither is in R1, R2, or R3 scope.

---

## 5. SVG-Only Rendering

### How D3.js uses SVG

D3 (Data-Driven Documents) treats SVG as the primary rendering target. Its mental model: bind data arrays to SVG element selections, then use `enter()`/`exit()`/`update()` to synchronize the DOM with data changes. D3 provides:

- **Layout algorithms** — `d3-hierarchy` computes Reingold-Tilford tree layouts; `d3-force` runs physics simulation for graph layout; `d3-pack` does circle packing.
- **Scale functions** — maps data domains to pixel ranges.
- **Path generators** — `d3.linkHorizontal()`, `d3.line()`, `d3.arc()` generate SVG path `d` strings from data.
- **Transition system** — interpolates SVG attributes/styles over time with easing.

D3 is not a React-compatible library by design — it mutates the DOM imperiously. Using D3 with React requires choosing a strategy:
1. **D3 owns the DOM** — use a single `<svg>` ref and let D3 manage everything inside it (bypasses React reconciler).
2. **React owns the DOM** — use D3 only for calculations (layouts, scales, path generators), pass computed values as props to React-rendered SVG elements.

Strategy 2 is the correct approach when React is in the stack. It preserves React's unidirectional data flow and works with Framer Motion.

### SVG animation capabilities vs Canvas

SVG has three animation mechanisms:
1. **SMIL animations** (`<animate>`, `<animateTransform>`) — native browser animations, no JavaScript, poor cross-browser support and effectively deprecated.
2. **CSS transitions/animations** on SVG attributes — works for `opacity`, `transform`, `fill` (as CSS custom properties), but not for SVG-specific attributes like `d` path data or `stroke-dashoffset` directly (though modern Chrome supports some).
3. **JavaScript-driven** — Framer Motion, GSAP, or raw `requestAnimationFrame` update SVG attributes. This is the current Insyte approach for edges (`animate={{ pathLength: 1 }}`).

SVG has one killer advantage for Insyte: **text is real DOM text**. Every node label is an actual `<text>` element (or a `<foreignObject>` wrapping a `<div>`). It participates in accessibility, can be selected/copied, renders with browser text hinting, and supports CSS typography.

### SVG performance at scale

SVG performance degrades with node count because:
1. Every SVG element is a DOM node, participating in the browser's accessibility tree and CSS cascade.
2. Style changes on SVG elements trigger style recalculation across the subtree.
3. Each `<path>` with complex `d` attribute data requires the browser's path tessellation engine.

In practice:
- Under 200 SVG elements: excellent performance, no perceptible lag.
- 200–1000 elements: begins to show frame drops on complex interactions. Filtering/culling helps.
- 1000+ elements: degrades significantly. D3-based network graphs at this scale typically switch to Canvas or WebGL.

For Insyte's target of 20–80 nodes per visualization, SVG is fully adequate. The TreeViz for `fib(8)` (67 nodes) and the ConsistentHashing graph (13 nodes max) both fall well within the performant SVG range.

### The gap: SVG lacks a unified coordinate model across React components

The biggest SVG limitation for Insyte is the same as the React DOM limitation: **there is no natural way to draw an SVG edge between two React-rendered SVG elements that live in different component subtrees**. D3 sidesteps this by owning the entire `<svg>` element. React-rendered SVG must either:

- Put everything inside one `<svg>` (works, but makes responsive sizing harder and loses React component encapsulation)
- Or use DOM measurement (`getBoundingClientRect`) after mount to discover positions, then draw connectors — which requires a `useEffect` → setState → re-render cycle that causes visible one-frame snaps.

---

## 6. Hybrid Approaches

### Canvas for visualization + React for UI chrome

This is the pattern used by Figma, Excalidraw, and most professional diagram tools. The architecture is:

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Application Shell                       │
│                                                                  │
│  ┌──────────────┐   ┌─────────────────────┐   ┌─────────────┐  │
│  │  Left Panel  │   │    Canvas Element    │   │ Right Panel │  │
│  │  (React DOM) │   │  (raw Canvas or      │   │ (React DOM) │  │
│  │              │   │   Konva/Pixi layer)  │   │             │  │
│  │  Controls    │   │                      │   │  Playback   │  │
│  │  Explanation │   │  Nodes, edges,       │   │  Controls   │  │
│  │  Code view   │   │  labels, animations  │   │             │  │
│  └──────────────┘   └─────────────────────┘   └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

React manages all UI surrounding the canvas. The canvas element manages the visualization area using its own render loop. React sends state updates to the canvas via a ref or a message interface (usually a plain JavaScript object or Zustand store that the canvas render loop reads each frame).

**Pros:** Best performance for the visualization area; React handles all UI (no loss of accessibility for controls, code panel, explanation panel).

**Cons:** The canvas area loses accessibility; React and Canvas state must be kept in sync; debugging becomes harder (Canvas internals invisible to React DevTools); any React-style feature (suspense, streaming) in the canvas area must be re-implemented.

### React Flow's approach

React Flow (xyflow) is a library for building node-based UIs with React. Its architecture is instructive:

- **Coordinate model:** A single `viewport` transform (`x`, `y`, `zoom`) is maintained in the `ReactFlowProvider` context. All nodes are rendered as DOM elements inside a single container. The container has `transform: translate(${x}px, ${y}px) scale(${zoom})` applied to it. This means zoom/pan transforms the *container*, not individual elements.
- **Edges are SVG:** Rendered in a single `<svg>` element that covers the full canvas area, positioned absolutely and matched in size to the canvas. Edge paths are computed from node positions (retrieved via `nodeInternals` which tracks rendered DOM positions).
- **Performance:** React Flow uses `useMemo` and `React.memo` aggressively. Each node component is memoized; edges are recomputed only when their source/target positions change. The `nodeInternals` map is updated via `useResizeObserver` on each node — this means positions are always in sync with the rendered DOM.
- **Why it works:** The key insight is that React Flow uses `getBoundingClientRect` / ResizeObserver to *measure* node positions after React renders them, then uses those measurements to draw SVG edges. It embraces the "measure after render" pattern rather than fighting it.

**Lesson for Insyte:** The positioning problem can be solved within the current React + SVG approach by adopting React Flow's measurement pattern — letting React render nodes first, then using ResizeObserver/refs to get their actual pixel positions, then drawing SVG edges against those positions.

### How Mermaid generates diagrams and positions elements

Mermaid is a text-to-diagram tool. Its rendering pipeline is:
1. Parse text syntax (Markdown-like) into an AST.
2. Pass the AST to a layout engine. Mermaid uses **Dagre** (a directed graph layout algorithm) for flowcharts, Elk.js for more complex layouts, and custom algorithms for sequence/gantt/pie charts.
3. The layout engine computes (x, y, width, height) for every node and control points for every edge. All in a single unified coordinate space.
4. Render to SVG by injecting the computed coordinates into SVG elements.

Mermaid's output is static SVG — no animation. The power is entirely in step 2: using a proper layout algorithm (Dagre, Elk) rather than hand-coded coordinates.

**Lesson for Insyte:** AI-generated coordinates are fragile because AI doesn't know the canvas dimensions, font sizes, or node sizes at generation time. A layout algorithm run *in the browser at scene load time* would compute correct positions for any screen size, eliminating the positioning class of bugs entirely.

### How Excalidraw renders

Excalidraw is a whiteboard application. Its rendering architecture:
- All shapes (rectangles, ellipses, lines, text) are rendered to an HTML `<canvas>` element using Rough.js (a hand-drawn sketch aesthetic library on top of Canvas 2D).
- A second transparent `<canvas>` overlay handles hit testing and selection highlights.
- React manages the application state (selected elements, tool mode, collaboration state) but does **not** render shapes — it only re-triggers `canvas.drawFrame()`.
- Text editing uses a `<textarea>` positioned over the canvas (React DOM) — while editing, a real text input appears in canvas coordinates; once committed, Excalidraw draws the text to canvas itself.

Excalidraw's approach works because:
- All content is informal/freehand — no need for accessibility of individual shapes.
- Text editing is a brief mode, handled by a real textarea for that window.
- The unified Canvas coordinate system means zoom/pan works perfectly.

**Lesson for Insyte:** Excalidraw's approach would require rewriting all 15 primitives in Canvas 2D, rebuilding the animation system, and sacrificing accessibility of individual nodes (screen readers can't read "node labeled A is highlighted" in a Canvas). This is a significant cost for educational software.

### Eraser.io's approach

Eraser.io is a technical diagramming tool used by engineering teams. Based on public information:
- It uses a Canvas + SVG hybrid: shapes rendered on Canvas for performance, labels and text as real DOM/SVG elements overlaid.
- Collaboration cursors as DOM elements.
- This hybrid gives Canvas performance for rendering while preserving DOM text for selection/copy.

---

## 7. Reference Architecture Analysis

### Why React Flow achieves its performance

React Flow's performance is not due to Canvas — it uses React DOM + SVG throughout. It achieves good performance by:

1. **Viewport transform on a single container** — instead of updating each node's position on pan/zoom, it updates `transform` on one container element. One CSS property change vs. N × 2 property changes.
2. **Memoized nodes** — `React.memo` on node components prevents re-render when only unrelated nodes change.
3. **ResizeObserver for position tracking** — no polling, no `setInterval`, no `getBoundingClientRect` in the render path. Positions are measured asynchronously and cached.
4. **SVG edge batching** — all edges share one `<svg>` element, so there is only one SVG reflow root.
5. **Lazy edge path computation** — edge paths are computed only when source/target positions change (via `useMemo` with position dependencies).

### How D3 avoids React's re-render overhead

When D3 owns the SVG DOM directly (Strategy 1 above), it bypasses React's reconciler entirely. D3's `selection.join()` creates/updates/removes DOM elements natively, then applies transitions with WAAPI or raw CSS. This is faster than React diffing for large, frequently-updating graphs, but loses React's benefits (DevTools, concurrent features, error boundaries, streaming).

D3 used only for calculations (Strategy 2) adds zero overhead — it's just math functions.

---

## 8. Insyte-Specific Considerations

### Does step-by-step animation change the calculus?

Yes — significantly in favor of the current approach. Step-by-step animation in Insyte works by:
1. User advances a step (or timer fires).
2. `computeVisualStateAtStep(scene, visualId, step)` recomputes visual state as a pure function.
3. React re-renders primitives with new state props.
4. Framer Motion animates from previous state to new state via spring physics.

This model is **extremely well-suited to React DOM + Framer Motion** because:
- State transitions are discrete (step N → step N+1), not continuous (60fps stream).
- Framer Motion spring interpolation fills the time between steps with smooth motion automatically.
- The `animate` prop on `motion.div` handles "what should the final state be" — Framer Motion handles "how to get there."

With Canvas 2D, you would need to:
- Maintain a JavaScript object for each node's current animated state (position, color, scale).
- Run a `requestAnimationFrame` loop continuously.
- Compute interpolated values each frame using a spring or lerp function.
- Redraw the entire canvas each frame (or diff-and-redraw regions, which is complex).
- Handle "at rest" detection to stop the loop (or run it continuously, wasting CPU).

The Framer Motion model is simpler for Insyte's discrete-step use case. Canvas animation would require re-implementing what Framer Motion already provides.

### Does AI-generated positioning make a particular approach better or worse?

AI-generated coordinates make any positional rendering approach fragile if positions are in an unbounded, display-size-agnostic space. This is not a React DOM problem — it's a coordinate model problem.

**Approaches and their resistance to bad AI coordinates:**

| Approach | Resistance | Why |
|----------|-----------|-----|
| Current (% absolute) | Low | Bad coords → nodes outside canvas, edges misalign |
| React DOM + layout algorithm | High | AI provides topology (node IDs, edges), algorithm computes positions |
| Canvas + layout algorithm | High | Same benefit — algorithm is independent of renderer |
| Canvas + AI % coords | Low | Same problem as current, just on Canvas |
| SVG unified space + layout algo | High | Best: unified coords + auto-layout |

The key insight: **the coordinate problem is orthogonal to the rendering technology**. Switching to Canvas does not fix AI coordinate quality. Introducing a layout algorithm (Dagre, ELK, D3-hierarchy for trees) fixes it regardless of renderer.

### What approach handles 20-50 node graphs, trees, and system diagrams best?

At Insyte's scale (20–80 nodes, 5–40 edges, 1–5 active primitives per scene), performance is not the constraint. The constraints are:

1. **Developer experience** — fast iteration on primitives, easy to add new visual types.
2. **Animation quality** — smooth spring-physics transitions, Framer Motion's spring model is excellent.
3. **Text rendering** — node labels must be readable, selectable, accessible.
4. **Coordinate accuracy** — edges must connect to node centers at any viewport size.
5. **AI-generated scene compatibility** — positions generated by AI must look correct.
6. **Accessibility** — educational content must be screen-reader accessible (to at least a reasonable degree).

React DOM + SVG satisfies constraints 1, 2, 3, 6 today. The only failures are in constraint 4 (due to dual coordinate systems) and constraint 5 (due to unvalidated AI coordinates). Both of these can be fixed within the existing stack.

---

## 9. Trade-off Comparison Table

| Criterion | React DOM + SVG (current) | HTML Canvas 2D (Konva) | WebGL (Pixi.js) | SVG-only (D3 calcs) |
|-----------|--------------------------|------------------------|-----------------|---------------------|
| Dev experience | Excellent — JSX, React DevTools, hot reload | Good — react-konva gives JSX | Moderate — @pixi/react, but limited debugging | Good — pure calculations + React SVG |
| Animation quality | Excellent — Framer Motion springs | Good — GSAP or Popmotion needed | Excellent — GPU-driven | Excellent — Framer Motion springs |
| Text rendering | Excellent — real DOM text | Poor — manual ctx.fillText, no wrapping | Very poor — texture atlases | Excellent — real SVG text |
| Coordinate accuracy | Poor (current) → Good (with fix) | Excellent — unified pixel space | Excellent — unified pixel space | Poor (current) → Good (with fix) |
| Accessibility | Good — semantic HTML, ARIA | Poor — opaque to screen readers | Poor — opaque to screen readers | Good — SVG has ARIA support |
| Performance (20-80 nodes) | Excellent | Excellent | Excellent | Excellent |
| Performance (500+ nodes) | Moderate | Good | Excellent | Poor |
| Zoom / pan | Complex — requires viewport transform | Simple | Simple | Complex — same as React DOM |
| AI coord compatibility | Low (fixable) | High (unified space) | High (unified space) | Low (fixable) |
| Migration cost from current | Zero (incremental fixes) | Very high — full rewrite | Very high — full rewrite + shaders | Low — use D3 for layout math only |
| Collision avoidance | Not built in | Not built in | Not built in | Via layout algorithm |
| React 19 / streaming compat | Full | Partial (canvas updates async) | Partial | Full |
| Bundle size impact | Zero (no new deps) | +50KB (react-konva) | +350KB (pixi.js) | +~15KB (d3-hierarchy, d3-force) |
| Debuggability | Excellent | Moderate | Poor | Excellent |

---

## 10. Recommendation

### Primary Recommendation: Stay on React DOM + SVG, Fix the Coordinate System

Do not migrate to Canvas 2D or WebGL. The performance characteristics at Insyte's scale do not justify the migration cost, and the actual problems (coordinate misalignment, AI-generated position quality) can be solved within the current stack.

**The two changes that fix the root causes:**

#### Fix 1: Adopt a single unified SVG coordinate space per primitive

Collapse the dual coordinate system (SVG pixels + DOM percentages) into one. For primitives that render both nodes (DOM) and edges (SVG), render *everything* inside a single `<svg>` element using `<foreignObject>` for node bodies. This gives one coordinate space and lets edges connect to exact node centers.

```
Before (broken):
  <div style={{ left: `${pos.x}%` }}>   ← DOM, % space
    [node body]
  </div>
  <svg>
    <line x1={pos.x * SCALE_X} />       ← SVG, pixel space
  </svg>

After (correct):
  <svg viewBox="0 0 W H">
    <line x1={nodeCenter.x} y1={nodeCenter.y} x2={...} y2={...} />
    <foreignObject x={nodeLeft} y={nodeTop} width={nodeW} height={nodeH}>
      [node body as HTML]
    </foreignObject>
  </svg>
```

The SVG `viewBox` is fixed (e.g., `0 0 800 600`) and the SVG element itself uses `width: 100%` with `viewBox` preserving aspect ratio. All coordinates are in viewBox units — consistent regardless of screen size.

#### Fix 2: Replace AI-generated absolute positions with a browser-side layout algorithm for graph/tree/system primitives

For primitives that render graph-like structures (GraphViz, TreeViz, RecursionTreeViz, SystemDiagramViz), the Scene JSON should provide **topology** (node IDs, labels, edges), not pixel positions. A layout algorithm running in the browser computes positions at scene load time.

Recommended libraries:
- **`d3-hierarchy`** (from D3, ~8KB) — Reingold-Tilford algorithm for trees. Takes a hierarchy object, outputs `x, y` for each node. Handles any tree shape correctly.
- **`d3-dag`** (~30KB) or **`@dagrejs/dagre`** (~20KB) — Directed acyclic graph layout. For graphs and recursion trees.
- **`elkjs`** (~150KB, substantial) — Eclipse Layout Kernel ported to JS. Used by React Flow's premium layouts. Handles complex compound graphs, but heavy.

For Insyte's graph sizes, Dagre is the right call: small, battle-tested, handles directed graphs well, used by Mermaid.

The Scene JSON format stays unchanged for simple visuals (ArrayViz, StackViz, DPTableViz — these don't need layout algorithms). Only graph/tree visuals benefit from this change, and the change is backward-compatible: if `position` is provided in the JSON, use it; if absent, run the layout algorithm.

#### Fix 3 (Bonus): Implement a ResizeObserver-based position cache for popup anchoring

The popup positioning problem (popups showing at wrong coordinates) can be fixed by measuring the actual rendered position of the `attachTo` visual after paint, caching it, and using that measurement for popup placement — the same pattern React Flow uses.

### What this achieves

| Problem | Before | After |
|---------|--------|-------|
| Edges misalign with nodes | Frequent | Eliminated — unified SVG space |
| AI-generated positions look broken | Common | Rare — layout algorithm handles topology |
| Popups drift from nodes | Occasional | Fixed — ResizeObserver measurement |
| Trees clip at bottom | Frequent | Fixed — viewBox auto-sizes to node extent |
| System diagrams cut off | Occasional | Fixed — viewBox scales to component extent |
| Performance at 50+ nodes | Good | Unchanged (already adequate) |
| Developer onboarding | Already good | Unchanged |
| Framer Motion spring animations | Already excellent | Unchanged |
| React DevTools / debugging | Already excellent | Unchanged |
| Accessibility | Good | Maintained |

---

## 11. Migration Complexity Estimate

### Option A (Recommended): Fix coordinate system within React DOM + SVG

| Task | Effort |
|------|--------|
| Refactor GraphViz to use single SVG + foreignObject | 1–2 days |
| Refactor TreeViz to use single SVG + foreignObject | 1–2 days |
| Refactor RecursionTreeViz to use single SVG + foreignObject | 1 day |
| Refactor SystemDiagramViz to use single SVG + foreignObject | 1–2 days |
| Add d3-hierarchy layout for TreeViz | 0.5 days |
| Add dagre layout for GraphViz | 0.5 days |
| Add auto-layout fallback in CanvasCard when position absent | 0.5 days |
| Add viewBox auto-sizing based on node extents | 0.5 days |
| ResizeObserver popup anchoring | 0.5 days |
| Regression test all 24 scenes | 1 day |
| **Total** | **~8 days** |

Existing primitives that do not use cross-component edges (ArrayViz, HashMapViz, StackViz, QueueViz, DPTableViz, LinkedListViz, TextBadgeViz, CounterViz) require **zero changes**.

### Option B: Migrate graph/tree primitives to react-konva (Canvas)

| Task | Effort |
|------|--------|
| Install and configure react-konva | 0.5 days |
| Rewrite GraphViz as Konva Stage/Layer/Circle/Line | 2–3 days |
| Rewrite TreeViz as Konva Stage/Layer | 2 days |
| Rewrite RecursionTreeViz as Konva Stage/Layer | 2 days |
| Rewrite SystemDiagramViz as Konva Stage/Layer | 2–3 days |
| Replace Framer Motion animations with GSAP/Tween | 3–4 days |
| Handle text rendering (Konva Text has limited CSS) | 1–2 days |
| Handle accessibility for Canvas nodes | 2–3 days (complex) |
| Handle responsive sizing (Konva Stage sizing) | 1 day |
| Regression test | 2 days |
| **Total** | **~18–21 days** |

Result: 2.5x the effort of Option A, with no user-visible improvement (same node count, same animation quality), but with degraded accessibility and text rendering, and loss of React DevTools visibility.

### Option C: Full Canvas rewrite (all primitives)

Not recommended. Would require rewriting all 15 primitives, all animation logic, all text rendering, and rebuilding the accessibility story. Estimated 40–60 days of work. Zero benefit at Insyte's scale.

---

## 12. Hybrid Path That Preserves Existing Work

If the team wants a phased improvement without a hard cutover, here is a safe incremental path:

### Phase A — Layout algorithms (Week 1)
- Install `d3-hierarchy` and `@dagrejs/dagre` (both small, no breaking changes).
- Add a `computeTreeLayout(nodes, rootId)` util that returns `{ id, x, y }[]` using `d3-hierarchy`.
- Add a `computeGraphLayout(nodes, edges)` util using Dagre.
- Modify TreeViz and GraphViz to use these layouts when the Scene JSON does not provide explicit positions.
- This alone fixes 80% of the AI-generated positioning problems with zero visual disruption to working scenes (explicit positions still honored).

### Phase B — Unified SVG coordinate model (Week 2)
- Refactor GraphViz, TreeViz, RecursionTreeViz to render inside a single `<svg>` with `viewBox`.
- Use `<foreignObject>` for node bodies that need HTML (to preserve CSS styling).
- This fixes edge-to-node alignment for good.
- Existing scenes that provided explicit positions: pipe them through the SVG coordinate transform (multiply by a scale to fit the viewBox, instead of using percentages).

### Phase C — SystemDiagramViz unification (Week 3)
- Apply the same SVG + viewBox approach to SystemDiagramViz.
- SystemDiagramViz currently uses pixel coordinates directly (`.x`, `.y` as `left`/`top` px values) — move these into viewBox units.
- Add Dagre-based auto-layout for system diagrams that don't specify positions.

### Phase D — ResizeObserver popup anchoring (Week 3, parallel)
- Implement a `useNodePositions` hook that tracks the rendered bounding box of each visual.
- Use these measurements in `CanvasCard` for popup placement instead of `visual.position.y + 18`.

### After Phase A–D
- All 24 scenes render correctly at any viewport size.
- AI-generated scenes lay out correctly without manual position tuning.
- The rendering stack is still 100% React + SVG + Framer Motion — zero new abstractions to learn.
- All existing Framer Motion animations (spring physics, `animate`, `AnimatePresence`) continue working unchanged.
- No bundle size increase beyond ~30KB for d3-hierarchy + dagre.

---

## Summary

Insyte's rendering problems are **not a React DOM limitation** — they are a coordinate model design flaw and an AI position quality problem. The current React + SVG + Framer Motion stack is the right choice for Insyte's scale, step-by-step playback model, accessibility requirements, and developer experience needs. Canvas 2D and WebGL solve problems Insyte does not have (massive node counts, particle systems, continuous 60fps streams) while introducing problems Insyte does have (accessibility, text rendering, React integration).

The pragmatic path forward is a 3-week incremental fix: add layout algorithms for auto-positioning, unify the SVG coordinate space to eliminate the dual-system misalignment, and measure popup positions after render. This preserves all existing code, animations, and scene JSON files while eliminating the entire class of positioning bugs.
