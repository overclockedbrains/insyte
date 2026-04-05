# Phase 5 Regression — Bug Resolution Log

> Source: MANUAL_REGRESSION_BUGS.md  
> Triage + implementation: April 5, 2026 (Phase 5.5 sprint)

---

## Bug 1 — Table/card design too round
**Status: PARTIALLY FIXED**  
**Fix:** Reduced CanvasCard cell borders from heavy `border-x-4 border-b-4` → `border-x-2 border-b-2` in `StackViz.tsx`. Canvas card outer `rounded-3xl` preserved intentionally (product aesthetic). Data cell radius reduced via border weight reduction. Full radius system audit deferred.  
**Deferred:** Global `--radius` token audit for data cells specifically → Phase 13 (polish pass).

---

## Bug 2 — Console warnings about color codes
**Status: FIXED**  
**Fix:** Framer Motion cannot interpolate CSS custom properties (`var(--color-*)`) or CSS functions (`color-mix()`). Replaced all such values in `animate` props across `StackViz.tsx`, `QueueViz.tsx`, and `ArrayViz.tsx` with interpolatable rgba hex literals:
- `color-mix(in srgb, var(--color-secondary) 20%, transparent)` → `rgba(58, 223, 250, 0.2)`
- `var(--color-surface-container)` → `#19191f`
- `color-mix(in srgb, var(--color-primary) 40%, transparent)` → `rgba(183, 159, 255, 0.3)`
- etc.

---

## Bug 3 — Everything needs labels, no type info visible
**Status: FIXED**  
**Fix:** `visual.label` already existed in the scene JSON schema but was never rendered. Two changes:
1. Added `label?: string` to `PrimitiveProps` interface in `primitives/index.ts`
2. `CanvasCard.tsx` now wraps each visual in a container that renders `visual.label` as a small mono uppercase header (10px, tracking-widest, dimmed) above the primitive

---

## Bug 4 — Too many shadows, animations hard to read
**Status: FIXED**  
**Fix:** Shadow audit across all primitives:
- `SystemDiagramViz.tsx`: Active shadow reduced from `0 0 20px color-mix(...)` → `0 0 12px rgba(183,159,255,0.2)`. Overloaded shadow removed entirely (border color only).
- `CounterViz.tsx`: `textShadow` on number value removed.
- `ArrayViz.tsx`: All glow blurs reduced from 12px → 6px, opacity from 40% → 30%.
- `StackViz.tsx`: Highlight glow reduced from `0 0 12px rgba(58,223,250,0.6)` → `0 0 8px rgba(58,223,250,0.35)`.
- `QueueViz.tsx`: Same glow reduction as StackViz.

---

## Bug 5 — Objects scattered, not at correct positions
**Status: FIXED**  
**Fix:** Root cause was that `visual.position` (x%, y%) existed in every scene JSON but `CanvasCard.tsx` completely ignored it — all visuals stacked in a vertical flex column. Implemented absolute positioning in `CanvasVisualization`:
- Canvas visuals now render at `left: {x}%, top: {y}%, transform: translate(-50%, -50%)`
- Per-type `maxWidth` budgets prevent overflow (system-diagram: 460px, queue: 320px, graph: 480px, others: 260px)
- Fallback to flex-col stacking for scenes with no position data

---

## Bug 6 — No color legend / users don't know what colors mean
**Status: DEFERRED**  
**Reason:** Adding a legend overlay requires careful placement that doesn't obscure the new absolute-positioned canvas. The HUD layer (Bug 16 fix) sets up the infrastructure for this.  
**Deferred to:** Phase 6 polish or Phase 13 — add a compact inline legend row (4 dots: purple=active, cyan=found/hit, red=error/miss, blue=compare) as part of the ControlBar footer.

---

## Bug 7 — Website slow, why not use canvas API?
**Status: BY DESIGN / DEFERRED**  
**Decision:** React DOM + Framer Motion was the intentional Phase 2 architectural decision (documented in `DECISIONS.md`). Benefits: developer velocity, accessibility, animation quality at current scene complexity. Canvas API considered premature optimization.  
**Deferred to:** Phase 13 — if scenes with 50+ simultaneous animated nodes become common, introduce opt-in `CanvasViz`/`WebGLViz` primitives for high-node-count simulations. Also captured in `R2_ENHANCEMENTS.md`.

---

## Bug 8 — Canvas bottom controls don't work (Commit, Create Branch, Merge, Rebase)
**Status: FIXED (step-navigation) + DEFERRED (true interactivity)**  
**Fix:** Controls rendered correctly but button clicks had zero effect — the engine is purely step-driven with no event→action mechanism. Added `goToStep` config to `ButtonControl.tsx`: when a button has `"goToStep": N` in its config, clicking pauses playback and jumps to step N.  
Updated scene JSONs:
- `git-branching.json`: Commit→step 0, Create Branch→step 2, Merge→step 5, Rebase→step 8
- `load-balancer.json`: Kill Server 2→step 6, Add Server→step 7, Traffic Spike→step 9
- `js-event-loop.json`: Run Snippet→step 0

**Deferred (true interactive mode):** Buttons triggering arbitrary visual mutations independent of steps requires an `interactions` field in the scene schema + overlay state in the store. Captured in `R2_ENHANCEMENTS.md`.

---

## Bug 9 — Animations too fast, no step advance indicator
**Status: FIXED**  
**Fix:** Added a 2px animated progress bar inside `PlaybackControls.tsx`. It sweeps from 0%→100% over `1/speed` seconds during auto-play, keyed on `currentStep` so it resets on each step change. Implemented using Framer Motion `motion.div` with `ease: 'linear'` transition. The outer PlaybackControls container gained `relative overflow-hidden` to contain it.

---

## Bug 10 — Canvas vertically scrollable / overflow
**Status: IMPROVED (not eliminated)**  
**Fix:** Root cause was visual stack in flex-col + `SystemDiagramViz` hardcoded `min-h-[600px]`. Changes:
- `SystemDiagramViz.tsx`: `min-h-[600px]` → computed from max component y coordinate + 80px padding
- Absolute positioning (Bug 5 fix) naturally reduces overflow since visuals are bounded within the canvas area
- Primitive internal padding reduced (`p-8` → `p-4`) across ArrayViz, QueueViz
- `overflow-auto` kept intentionally — some complex scenes may legitimately need scroll

---

## Bug 11 — Colors visually off
**Status: FIXED**  
**Fix:** Same root cause as Bug 2. FM ignoring non-interpolatable CSS vars meant colors fell back to browser defaults (transparent/white), making cells appear broken. Fixed by Bug 2 changes.

---

## Bug 12 — js-event-loop unreadable animations
**Status: FIXED**  
**Fix:** Multiple root causes addressed:
1. Absolute positioning (Bug 5) puts call-stack left (20%), queues center (50%), web-apis right (80%) — the intended layout
2. StackViz widened to 200px and items truncate with tooltip
3. Labels added to each visual (Call Stack, Microtask Queue, etc.)
4. Layout switched to `code-left-canvas-right` so the JS code is visible alongside the animation
5. Code field added to `js-event-loop.json` with `highlightByStep` mapping all 12 steps to their active line

---

## Bug 13 — dns-resolution not enough gaps between servers
**Status: FIXED**  
**Fix:** Updated all component x/y positions in `dns-resolution.json` (initialState + all step action params):
- browser: `(60, 200)` → `(60, 240)`
- resolver: `(220, 200)` → `(250, 240)`
- root-ns: `(380, 80)` → `(450, 80)`
- tld-ns: `(380, 200)` → `(450, 240)`
- auth-ns: `(380, 320)` → `(450, 400)`

Result: horizontal gap 160px → 200px+, vertical gap 120px → 160px.

---

## Bug 14 — Draggable nodes?
**Status: DEFERRED (R2)**  
**Reason:** Feature idea, not a bug. Requires per-primitive `drag` prop + `userPositions` override layer in store.  
**Captured in:** `R2_ENHANCEMENTS.md` — "Draggable Canvas Nodes"

---

## Bug 15 — git-branching: position issue, text overflows
**Status: FIXED**  
**Fix:**
1. `GraphViz.tsx`: Inner `div.relative` wrapper now has explicit pixel dimensions computed from `maxX * SCALE_X + 96` width and `maxY * SCALE_Y + 96` height. SVG gets matching explicit dimensions. No more collapsed 0×0 container.
2. SCALE increased from 60 → 70 for better node spacing
3. Node size increased from `w-12 h-12` (48px) → `w-14 h-14` (56px)
4. Node labels use `white-space: pre-wrap` at 9px font size for multi-line labels like `"C3'\n(rebased)"`
5. Absolute positioning (Bug 5) centers the whole graph in the canvas

---

## Bug 16 — Commands and counters should be at fixed constant position
**Status: FIXED**  
**Fix:** Introduced a HUD layer in `CanvasCard.tsx` that separates informational overlays from canvas primitives:
- `text-badge` visuals → rendered in an `absolute top-3` strip, always centered at the top of the canvas regardless of step
- `counter` visuals → rendered in an `absolute bottom-2 right-3` group, always anchored bottom-right

These never reflow with canvas animations. Commands like "git rebase main" (TextBadge) and stats like "Load Factor: 0.75" (CounterViz) stay at constant positions throughout the entire visualization.

---

## Bug 17 — Git example: different node types for branch vs commit
**Status: DEFERRED**  
**Reason:** Enhancement, not a bug. Requires either extending GraphViz node shapes (circle=commit, pill=branch, diamond=tag) or a dedicated `GitGraphViz` primitive.  
**Captured in:** `R2_ENHANCEMENTS.md` — "Different Node Types for Git"

---

## Bug 18 — Visualizations should have stable positions, smooth transitions
**Status: FIXED**  
**Fix:** Same as Bug 5. Absolute positioning means each visual stays at its defined coordinate throughout all steps. Primitives animate their internal state in-place (cells highlight, stack items push/pop) without any layout shift of the visual's container position.

---

## Bug 19 — Canvas elements should have hover effects / descriptions
**Status: DEFERRED**  
**Reason:** Feature idea. Infrastructure now exists (label rendering, HUD layer) but tooltip primitives require Phase 8's interactive layer work.  
**Captured in:** `R2_ENHANCEMENTS.md` — "Hover Tooltips on Canvas Elements"

---

## Bug 20 — Right click on canvas?
**Status: DEFERRED (R2)**  
**Reason:** Feature idea, post-R1.  
**Captured in:** `R2_ENHANCEMENTS.md` — "Right-Click Context Menu on Canvas"

---

## Bug 21 — StackViz very unreadable
**Status: FIXED**  
**Fix:** `StackViz.tsx` redesigned:
- Width: `w-32` (128px) → `w-[200px]` — fits strings like `"console.log('start')"`
- Height: `h-[300px]` → `h-[260px]`
- Each item: `truncate` class + `title={item}` attribute for hover tooltip on overflow
- FM colors fixed (Bug 2)
- Border weight: `border-x-4 border-b-4` → `border-x-2 border-b-2`

---

## Bug 22 — Code visualization side-by-side for js-event-loop
**Status: FIXED**  
**Fix:**
1. `js-event-loop.json` layout changed from `text-left-canvas-right` → `code-left-canvas-right`
2. Added `"code"` field with the full JS snippet (12 lines) and `"highlightByStep": [0,0,0,2,4,6,11,11,8,8,3,3]` mapping each step to its active line
3. `CodeLeftCanvasRight` layout was already built in Phase 4 — just needed the scene to opt into it

---

## Summary

| Status | Count | Bugs |
|--------|-------|------|
| Fixed | 14 | 2, 3, 4, 5, 8*, 9, 10†, 11, 12, 13, 15, 16, 18, 21, 22 |
| Deferred R2 | 5 | 6, 7, 14, 17, 19, 20 |

*Bug 8 fixed for step navigation; true interactive mode deferred to R2  
†Bug 10 improved but overflow-auto intentionally kept

All deferred items documented in `.planning/R2_ENHANCEMENTS.md`.
