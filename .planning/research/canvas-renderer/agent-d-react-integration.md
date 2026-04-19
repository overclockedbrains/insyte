# Sub-Agent D: React Canvas Integration Patterns
**Research Date: April 2026 | Prepared for Insyte Visual Explanation Platform**

---

## 1. Canonical React ↔ Canvas Integration Patterns

### Pattern A: Custom React Renderer (Declarative Wrapping)
- **Architecture**: Custom React reconciler that translates JSX into canvas library calls
- **Examples**: `@pixi/react` v8 (PixiJS), `react-konva`
- **How it works**: JSX components map 1:1 to canvas objects (e.g., `<Sprite>`, `<Shape>`, `<Stage>`); React's reconciliation engine handles component lifecycle; props changes trigger canvas API calls automatically
- **Pros**: Idiomatic React, composition-friendly, automatic re-render management
- **Cons**: Library lock-in, custom reconcilers add bundle overhead, steeper learning curve
- **Best for**: When you want declarative JSX syntax and don't need fine-grained imperative control

### Pattern B: Ref-Based Wrapper (Imperative Facade) ⭐ Recommended for Insyte
- **Architecture**: `useRef` + `forwardRef` to expose canvas library methods to parent components
- **Canonical Pattern**: `useImperativeHandle` + `useLayoutEffect` + `ref.current`
- **How it works**: Wrap the canvas library in a custom hook (e.g., `useCanvasManager()`); initialize in `useLayoutEffect` (synchronous, before paint); expose public methods via `useImperativeHandle()` for parent to call
- **Pros**: Fine-grained control, minimal bundle overhead, easier to debug
- **Cons**: More boilerplate, parent must manage animation state
- **Best for**: Step-driven educational visualizations where imperative control is an asset

### Pattern C: Hybrid (Konva-Style)
- **Architecture**: Declarative components + imperative node refs (both available)
- **Example**: `react-konva`
- **How it works**: `Stage → Layer → Shape` JSX hierarchy; `.getNode()` returns the Konva object reference for imperative calls; keep business state in React, canvas state (drag position) in refs
- **Pros**: Flexibility — can be declarative or imperative as needed
- **Cons**: Risk of state sync bugs if not disciplined
- **Best for**: Interactive editors, when you need both worlds

### React Konva Best Practices (2024–2025)

1. **Event handling**: Use pointer events (`onPointerDown`, `onPointerMove`) instead of mouse-specific handlers for unified touch/mouse/pen support
2. **State split**: React state owns selection IDs, layer order, data model; Konva node refs own transient state (drag position during drag, hover effects)
3. **Performance**: Don't register all elements as mouse event listeners by default; Konva listens to all, causing perf issues with 1000+ shapes
4. **Static groups**: Cache with `.cache()` to convert complex groups to bitmaps

### `useLayoutEffect` vs `useEffect` for Canvas Initialization

- **Use `useLayoutEffect`**: For canvas initialization, because it runs synchronously after DOM mutations but before paint. Prevents flash-of-invisible-canvas.
- **Use `useEffect`**: For cleanup that doesn't require synchronous execution, async data loading, non-visual side effects.

---

## 2. Step-Change → Canvas Update: Animation Orchestration Pattern

### Recommended Architecture: Timeline-Driven Staged Animation Queue

For step-driven visualizations (new `step` prop triggers state transition, not continuous animation):

**Components**:

1. **Step Diffing** (React prop change via `useEffect`)
   - Detect `step` prop change
   - Diff old state vs new state to identify changed elements/properties
   - Queue animation operations (don't execute immediately)

2. **Animation Timeline** (GSAP Timeline — canonical choice for canvas)
   - Compose animations in sequence with labeled positions
   - `timeline.to(nodeRef, { x: newX, duration: 0.3 }, 0)` — start at 0ms
   - `timeline.to(otherRef, { opacity: 1, duration: 0.2 }, 0.2)` — start at 200ms
   - `timeline.to(thirdRef, { y: newY, duration: 0.4 }, 0.4)` — start at 400ms

3. **Cleanup on step change**
   - Kill in-progress timeline before starting new one
   - `gsap.killTweensOf(targets)` or `ctx.revert()` via `gsap.context()`

### Why GSAP Timeline is the Canonical Choice

- Supports **timeline composition**: nested timelines, staggered delays
- **Automatic cleanup**: `useGSAP()` hook reverts all animations on unmount (critical in React 18 Strict Mode)
- **Context scoping**: `gsap.context()` + `useGSAP()` isolates animations within a component
- **Works on any JS object**: `gsap.to(canvasObj, { x: 100 })` animates canvas state directly — no DOM required
- **Keyframe sequences**: `keyframes: [{ x: 100 }, { y: 100 }, { opacity: 0 }]` auto-sequences

### `useGSAP()` Hook Pattern

```javascript
import { useGSAP } from '@gsap/react';

useGSAP(() => {
  const timeline = gsap.timeline();
  // This context reverts automatically on remount (Strict Mode safe)
  timeline
    .to(nodeRefs.current.nodeA, { x: 100, duration: speed }, 0)
    .to(nodeRefs.current.nodeB, { y: 50, duration: speed }, speed / 2);
}, {
  scope: containerRef,
  dependencies: [step, speed]
});
```

### React 19 Concurrent Mode Compatibility

- Updates wrapped in `useTransition()` are lower-priority and can be interrupted
- Canvas animations should use `startTransition()` for initial state changes, but the timeline itself runs at full priority
- Once GSAP takes over the animation loop, it will not be preempted by React's concurrent scheduler — assume uninterrupted 60fps

---

## 3. Performance: Canvas2D vs WebGL and Offscreen Canvas

### Canvas2D vs WebGL Crossover

| Object Count | Recommendation |
|---|---|
| < 100 | Canvas2D comfortable at 60fps |
| 100–500 | Profile your workload; Canvas2D likely still viable |
| 500–5,000 | WebGL recommended |
| > 5,000 | WebGL essential |

**For Insyte (100–200 node target)**: Canvas2D is sufficient. No need for WebGL.

### Frame Budget Breakdown for 60fps

Total budget: **16.67ms per frame**

| Step | Budget |
|---|---|
| JavaScript execution (event handling, animation calculations) | 3–4ms |
| Style calculations (CSS-in-JS, ARIA updates) | 2–3ms |
| Layout/Reflow (canvas resize, DOM measurement) | 2–3ms |
| Paint (canvas draw calls) | 4–6ms |
| GPU compositing (display list to screen) | 1–2ms |

At 100 objects with Canvas2D: Paint takes ~4–5ms, leaving 11–12ms headroom. Reserve 2–3ms for GC.

### OffscreenCanvas + Web Worker

**What**: Move canvas rendering to a background worker thread, sending back only the final `ImageBitmap` to the main thread.

**Benefits**: Frees main thread for user interactions; layout algorithms can run concurrently.

**Browser Support (2025)**: Chrome/Edge/Firefox — full support. Safari — 2D only (WebGL offscreen not supported).

**When to use**: Only if layout computation takes >30–50ms per frame. **Not recommended for Insyte** unless node count grows dramatically.

### Layout Computation in Web Workers

| Library | Bundle | Worker-Friendly | Best For |
|---------|--------|-----------------|----------|
| **dagre** | ~50KB | Yes (pure JS) | Directed acyclic graphs, hierarchical layouts |
| **elkjs** | ~500KB | Yes (JS port of Java ELK) | Complex graph layouts, many options |
| **d3-hierarchy** | ~20KB | Yes (pure JS) | Trees, stratified layouts, sunbursts |
| **d3-dag** | ~30KB | Yes (pure JS) | DAGs with sophisticated algorithms |

**For Insyte**: Use dagre or d3-hierarchy in the main thread. If tree layout blocks >30ms, offload to Web Worker with `postMessage({ nodes, edges })`.

---

## 4. Accessibility When Moving Off DOM

### Minimal Viable Pattern

Canvas is invisible to screen readers. You must provide a parallel accessible layer via ARIA.

**Implementation**:
```jsx
<div>
  {/* Main canvas */}
  <canvas
    role="img"
    aria-label="Interactive DSA visualization: Binary search tree with 5 nodes"
    aria-describedby="viz-description"
  />

  {/* Hidden accessible description */}
  <div id="viz-description" style={{ display: 'none' }}>
    <table>
      <thead><tr><th>Node ID</th><th>Value</th><th>Left Child</th><th>Right Child</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>10</td><td>2</td><td>3</td></tr>
        <!-- ... -->
      </tbody>
    </table>
  </div>

  {/* Live region for step announcements */}
  <div id="step-updates" aria-live="polite" aria-atomic="true">
    Currently at node 7. Comparing 7 < 10, moving left.
  </div>
</div>
```

**Key ARIA Patterns**:
1. `role="img"` — tells screen readers the canvas is a single image, not interactive controls
2. `aria-label` — brief 1-sentence summary
3. `aria-describedby` — reference to structured description in hidden DOM (use `<table>` or `<dl>` for node/edge data)
4. `aria-live="polite"` region — announces step changes as they happen

**What NOT to do**:
- Do NOT create a "shadow DOM" parallel to canvas (unmaintainable, breaks ARIA)
- Do NOT use `aria-hidden="true"` on the canvas
- Do NOT rely only on `alt` text (not a valid canvas accessibility solution)

### Keyboard Navigation (Enhanced)
Arrow keys to traverse graph nodes, Enter to select/expand, Escape to deselect. This is a bonus layer beyond the minimal ARIA story.

---

## 5. Testing Canvas-Based Renderers

### Unit Testing: Mock Canvas Context

Available libraries:
- **vitest-canvas-mock**: Purpose-built mock for Vitest, tracks `__getDrawCalls()` and `__getPath()`
- **jest-canvas-mock**: For Jest, same API

```javascript
// vitest.config.ts
import vitestCanvasMock from 'vitest-canvas-mock';
export default defineConfig({
  test: { setupFiles: [vitestCanvasMock] }
});

// scene-renderer.spec.ts
it('renders node at correct position', () => {
  const ctx = canvas.getContext('2d');
  render(<Renderer nodes={[{ id: 1, x: 100, y: 50 }]} />);

  const calls = ctx.__getDrawCalls();
  expect(calls).toContainEqual(expect.objectContaining({
    type: 'fillText', text: '1', x: 100, y: 50
  }));
});
```

### Integration Testing: requestAnimationFrame Mocking

```javascript
vi.useFakeTimers();
const { rerender } = render(<Renderer step={0} />);
rerender(<Renderer step={1} />);
vi.advanceTimersByTime(300); // Fast-forward GSAP timeline
expect(nodeRef.current.x).toBe(expectedX);
```

### Visual Regression Testing

**Recommended setup** (free, local):

```javascript
// playwright.config.ts
use: { screenshot: 'only-on-failure' }

// scene-renderer.spec.ts
it('renders tree visualization correctly', async ({ page }) => {
  await page.goto('/canvas-demo');
  await page.waitForTimeout(500); // Wait for animations to finish
  await expect(page.locator('canvas')).toHaveScreenshot({
    maxDiffPixels: 50,
    threshold: 0.2
  });
});
```

**Canvas-specific considerations**:
- Anti-aliasing differences between browsers: set `maxDiffPixels: 50` to allow minor variations
- Animation capture: pause GSAP animations or record at specific timeline positions

---

## 6. Recommended Architecture for Insyte

### Component Structure

```
<SceneRenderer (ref-based wrapper)>
  Canvas DOM element (one per scene)
  useCanvasManager() hook
    ├── Initialize Konva stage in useLayoutEffect
    ├── Expose { render(step, speed), cleanup } via useImperativeHandle
    └── Manage animation timeline in useGSAP({ dependencies: [step, speed] })

  Parent receives ref to SceneRenderer
  ├── On step change: ref.current.render(newStep, speed)
  └── Automatic cleanup via GSAP context revert on unmount
```

### Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Rendering | **Canvas2D via Konva.js** | 100–200 nodes at 60fps; declarative react-konva |
| Graph Layout | **dagre** or **d3-hierarchy** | ~30–50KB, pure JS, worker-compatible |
| Animation | **GSAP** + `useGSAP()` | Timeline composition, Strict Mode safe, canvas-agnostic |
| Testing | **Vitest** + `vitest-canvas-mock` | Fast, canvas mocking built-in |
| Visual Regression | **Playwright** `toHaveScreenshot()` | Free, local, no SaaS dependency |
| Accessibility | **ARIA labels** + fallback table + `aria-live` | Minimal overhead, screen reader friendly |

### Migration Path from DOMRenderer

1. Build `CanvasRenderer` alongside existing `DOMRenderer` (env-var flag already exists)
2. Implement one DSA viz (ArrayViz) in both; benchmark performance
3. If Canvas perf is 60fps stable, migrate remaining visualizations
4. Deprecate DOMRenderer — no immediate WebGL migration needed; profile first

---

## Sources

- [react-konva Documentation](https://konvajs.org/docs/react/index.html)
- [GSAP React Integration](https://gsap.com/resources/React/)
- [useGSAP Hook](https://gsap.com/docs/v3/Packages/react/)
- [PixiJS React v8 Blog](https://pixijs.com/blog/pixi-react-v8-live)
- [Canvas2D vs WebGL Performance Comparison (2025)](https://digitaladblog.com/2025/05/21/comparing-canvas-vs-javascript-chart-performance/)
- [OffscreenCanvas API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [Web.dev: OffscreenCanvas Article](https://web.dev/articles/offscreen-canvas)
- [Animation Performance Frame Budget (MDN)](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate)
- [vitest-canvas-mock (GitHub)](https://github.com/wobsoriano/vitest-canvas-mock)
- [Canvas Accessibility Patterns](https://pauljadam.com/demos/canvas.html)
- [Accessibility on Canvas with JavaScript](https://drabstract.medium.com/your-guide-to-accessibility-on-the-canvas-with-javascript-ff58074c30c8)
- [Dagre Graph Layout (GitHub)](https://github.com/dagrejs/dagre)
- [elkjs (npm)](https://www.npmjs.com/package/elkjs)
- [React 19 Release Blog](https://react.dev/blog/2024/12/05/react-19)
- [Playwright Visual Testing](https://www.chromatic.com/blog/how-to-visual-test-ui-using-playwright/)
