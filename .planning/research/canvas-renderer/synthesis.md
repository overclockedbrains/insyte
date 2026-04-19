# Canvas Renderer Research: Synthesis & Recommendations
**Research Date: April 2026 | Insyte Visual Explanation Platform**
**Source Sub-Reports**: [agent-a-2d-canvas-libraries.md](./agent-a-2d-canvas-libraries.md) | [agent-b-3d-hybrid.md](./agent-b-3d-hybrid.md) | [agent-c-competitive-trends.md](./agent-c-competitive-trends.md) | [agent-d-react-integration.md](./agent-d-react-integration.md)

---

## Overview

Four parallel research streams investigated: (A) 2D canvas libraries, (B) 3D/hybrid approaches, (C) competitive landscape and motion design, and (D) React integration patterns. All four streams converge on a consistent recommendation: **Konva.js + GSAP, Canvas2D, no Three.js**.

---

## 1. Primary Recommendation: Konva.js + GSAP

### The Stack

| Component | Choice | Version | Bundle (gzip) |
|---|---|---|---|
| Canvas renderer | **Konva.js** | 10.0.2+ | 54.9 KB |
| React binding | **react-konva** | v19 | included |
| Animation timeline | **GSAP** + `useGSAP()` | 3.x | ~30 KB |
| Graph layout | **dagre** or **d3-hierarchy** | latest | ~30–50 KB |
| **Total delta** | | | **~115–135 KB gzip** |

### Why Konva.js Beats the Alternatives

**vs Pixi.js**:
- Konva has native tweening; Pixi requires GSAP as external dependency (narrowing the gap)
- `react-konva` is mature (years of React integration); `@pixi/react` v8 is a major 2024 rewrite still stabilizing
- Konva's `Stage → Layer → Shape` JSX hierarchy maps naturally to Insyte's `SceneGraph` structure
- Pixi's WebGL advantage only materializes above ~500 nodes; Insyte targets 100–200
- **Choose Pixi only if**: node count grows to 500+, or mobile performance is critical

**vs Fabric.js**:
- Slowest benchmarks (9fps at 8k boxes vs Konva 23fps vs Pixi 60fps)
- No official React binding
- Design-editor focus, not animation-centric

**vs Full 3D (Three.js / R3F)**:
- +200–300 KB bundle for 2D content with no readability benefit
- Troika text is worse than DOM/Canvas text for educational labels
- -10–20% FPS impact even at 60 FPS starts
- Introduces significant accessibility regression (Troika text is non-selectable, poor screen reader support)
- Sub-agent B's conclusion: **"2D clarity beats 3D effects 10× over"**

### Why This Beats the Current DOMRenderer

| Problem | DOMRenderer | Konva.js + GSAP |
|---|---|---|
| Absolute positioning bugs | Layout via CSS absolute — browser reflow chain causes drift | Konva coordinates are canvas-native — no CSS layout involvement |
| Color transition glitches | Framer Motion color transitions conflict with layout animations | GSAP tweens color as a property, fully separated from layout |
| Entrance/exit animation conflicts | Framer Motion `layoutId` causes race conditions | GSAP timelines are explicit sequences — no implicit conflict |
| No depth/layering | Everything flat DOM | Konva `Layer` ordering gives explicit z-depth control |
| Visual ceiling | DOM/CSS hard limit | Canvas2D + CSS glow effects push visual quality significantly higher |

---

## 2. 3D Enhancement Layer

### Recommendation: CSS Post-Processing Only (0 KB Cost)

Sub-agent B found that all products that look "3D-premium" (Framer, Linear, Vercel) actually use enhanced DOM/SVG — not Three.js — for their interactive diagram content. 3D is reserved for isolated marketing hero sections only.

**Concrete enhancements that achieve a premium look at 0 additional KB:**

| Effect | Implementation | Visual Impact |
|---|---|---|
| **Active node glow** | `filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6))` via CSS class toggle when node becomes "active" | High — creates "focus plane" effect |
| **Glassmorphism HUD** | `backdrop-filter: blur(20px) saturate(1.5)` + `rgba` background on popup/step panels | High — matches 2026 premium product aesthetic |
| **Edge draw-on** | SVG `stroke-dasharray` + `stroke-dashoffset` CSS animation, 600–900ms ease-out-cubic | High — essential for diagram narrative |
| **Staggered entrance** | 150ms stagger between nodes/edges appearing, ease-out-cubic | Medium-High — choreographed feel |
| **Pulse on active element** | CSS `transform: scale(1.0 → 1.1 → 1.0)` 200ms ease-in-out, repeat every 2–3s | Medium — draws and holds attention |

**If 3D is ever desired**: Isolated, lazy-loaded R3F canvas for landing/marketing pages only. The diagram renderer should never ship Three.js.

---

## 3. Migration Path

The existing `RENDERER=dom|canvas` env-var flag already provides the parallel-development scaffold. All phases keep both renderers alive until final deprecation.

### Phase 0 — Setup (1–2 days)
- Install: `konva`, `react-konva`, `gsap`, `@gsap/react`, `dagre`
- Create `src/renderers/canvas/` directory structure alongside `src/renderers/dom/`
- Confirm env-var flag routes correctly to new `CanvasRenderer` skeleton

### Phase 1 — ArrayViz POC (1 week)
- Implement `ArrayViz` in Canvas: `Konva.Rect` cells, GSAP color tween on state change
- Wire to `SceneRendererProps` interface unchanged
- Benchmark: 40-cell array at 60fps with concurrent highlights?
- Goal: validate Konva stage setup, react-konva reconciler, `useGSAP` step-driven pattern

### Phase 2 — SystemDiagramViz (1–2 weeks)
- Nodes: `Konva.Group` (SVG icon image + label text)
- Edges: **SVG overlay** on top of Konva canvas — use native `stroke-dashoffset` animation for draw-on effect
- States: active/highlight/normal via GSAP color tweens
- Popups: remain as DOM layer positioned by canvas coordinates

### Phase 3 — TreeViz + GraphViz + DPTableViz (1–2 weeks)
- TreeViz: `Konva.Group` nesting, dagre layout in main thread (Web Worker if >30ms block)
- GraphViz: arbitrary edges (same SVG overlay pattern), force-directed or dagre layout
- DPTableViz: grid of `Konva.Rect`, GSAP stagger fill animations (Pattern B wave/overlap)

### Phase 4 — HUD + Popups (3–5 days)
- HUD overlays stay as DOM — no canvas benefit, and DOM gives better accessibility
- Popup annotations: DOM layer, anchor coordinates from Konva stage → DOM translation

### Phase 5 — Deprecate DOMRenderer (2–3 days)
- Once all primitives pass visual parity and performance tests, remove DOMRenderer
- Remove env-var flag; `CanvasRenderer` becomes the only renderer

---

## 4. Risk Matrix

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| **1** | **Edge draw-on**: Canvas2D has no native `stroke-dashoffset` equivalent | Medium | Use SVG overlay layer for all edges; Konva handles nodes only. Alternatively: GSAP frame-by-frame `Konva.Path` drawing. SVG approach is cleaner and matches existing SVG edge patterns. |
| **2** | **Text quality**: Canvas2D text is less crisp than DOM text; no copy-paste | Low-Medium | Keep all HUD labels, popup annotations, and step descriptions in DOM. Only canvas-embedded short labels (node IDs, values) use Konva text — these are acceptable at canvas resolution. |
| **3** | **Bundle size delta**: +115–135 KB gzip for Konva + GSAP | Low | Both are commonly CDN-cached. Code-split the canvas renderer module so it only loads on visualization pages. Konva (55KB) is smaller than Three.js alone (170KB). |
| **4** | **Accessibility**: Screen readers can't read canvas content | Medium | `role="img"` + `aria-label` (brief summary) + `aria-describedby` (structured table of nodes/edges in hidden DOM). Add `aria-live="polite"` region that announces step changes as text. HUD and popup content stays in accessible DOM. |
| **5** | **Animation conflict on rapid step changes**: new step fires before previous animation completes | Medium | GSAP context: kill in-progress timeline before starting new one via `ctx.revert()` inside `useGSAP` cleanup. GSAP `useGSAP()` auto-reverts on `dependencies` change — this is the default behavior when `dependencies: [step]` is provided. |

---

## 5. Proof-of-Concept Scope

### First Primitive: ArrayViz

**Why ArrayViz first:**
- Simplest structure: a row of `Konva.Rect` cells — no layout algorithm
- Exercises the core loop: step change → diff → GSAP tween → canvas redraw
- Visible, testable result in <1 day of setup
- Validates: Konva stage setup, `react-konva` reconciler, `useGSAP` with `dependencies: [step]`, step-driven prop flow through `SceneRendererProps`

**Demo to Build:**

1. **Initial state**: 20-cell array, all cells gray (`#374151`)
2. **Step 1**: Cells 3 and 7 highlight — color tween to comparison blue (`#3B82F6`), 300ms ease-out-cubic
3. **Step 2**: Cells 3 and 7 swap positions — x-coordinate GSAP tween, 500ms ease-out-back, labels follow
4. **Step 3**: Cell at position 7 marks as "sorted" — color tween to green (`#10B981`), scale pulse 1.0 → 1.1 → 1.0 (200ms)
5. **Speed prop**: `speed` prop multiplies all animation durations (0.5 = fast, 2.0 = slow)
6. **Mid-animation step change**: kill in-progress timeline, jump to new state, start new animation

**Definition of Success:**
- 60fps at 40 cells with concurrent highlights
- Step transitions feel smooth and readable (400–500ms feels "educational", not game-like)
- Step-change mid-animation gracefully kills previous and starts new with no visual artifacts
- `SceneRendererProps` interface unchanged — DOMRenderer still works side-by-side

---

## Motion Design Specifications (Summary)

Based on Sub-agent C's competitive analysis of Brilliant, NYT Graphics, Observable, and Pudding.cool:

| Context | Easing | Duration |
|---|---|---|
| Node entrance | `cubic-bezier(0.215, 0.61, 0.355, 1)` (ease-out-cubic) | 200–300ms |
| Position shift | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` (ease-out-back) | 400–500ms |
| Color transition | `cubic-bezier(0.645, 0.045, 0.355, 1)` (ease-in-out-cubic) | 250–350ms |
| Edge draw-on | `cubic-bezier(0.215, 0.61, 0.355, 1)` (ease-out-cubic) | 600–900ms |
| Exit/fade | `cubic-bezier(0.55, 0.055, 0.675, 0.19)` (ease-in-cubic) | 200–300ms |

**Stagger pattern for multi-element reveals**: Wave/Overlap — groups of 3, 100ms between groups (60% overlap), total 400ms for 9 elements. Feels natural, not mechanical.

**Semantic color convention:**
- Future/Unvisited: `#6B7280` (gray), 40% opacity
- Current/Active: `#3B82F6` (blue), 100% opacity, + glow
- Completed: `#10B981` (green), 60% opacity
- Comparison: `#F59E0B` (amber), 80% opacity
- Error/Conflict: `#EF4444` (red) with pulse

---

## Decision Summary

| Question | Answer |
|---|---|
| Primary renderer | **Konva.js 10.x + react-konva v19** |
| Animation library | **GSAP 3.x + `@gsap/react` useGSAP()** |
| 3D involvement | **None for diagrams** — CSS `drop-shadow` + `backdrop-filter` only |
| Edge draw-on | **SVG overlay** (native `stroke-dashoffset`) over Konva canvas |
| HUD/Popups | **DOM** (not canvas) — better accessibility and flexibility |
| Graph layout | **dagre** (main thread; Web Worker if >30ms) |
| First POC | **ArrayViz** — simplest, validates full stack in <1 week |
| WebGPU | Monitor for 2027+ — not needed at current scale |
| Accessibility | `role="img"` + `aria-live` step announcements — minimal viable, sufficient |
