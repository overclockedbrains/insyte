# Sub-Agent A: 2D Canvas Libraries Research
**Research Date: April 2026 | Prepared for Insyte Visual Explanation Platform**

## Executive Summary

This research evaluates six 2D rendering libraries (Konva.js, Pixi.js, Fabric.js, Two.js, Paper.js, and D3.js) for the Insyte project — an AI-powered interactive visual explanation platform requiring step-driven declarative educational animations. The primary evaluation criteria are React integration maturity, animation system capabilities, text/icon rendering quality, performance at 100–200 nodes, and fit for educational diagram visualization.

---

## 1. Konva.js

### Core Metrics
- **Current Version**: 10.0.2+ (as of March 2026, actively maintained)
- **Bundle Size**: 54.9 kB (minified + gzipped)
- **License**: MIT
- **npm Weekly Downloads**: 1,145,177 (most downloaded 2D canvas framework)
- **GitHub Stars**: 14,290
- **Last Commit**: Active maintenance (latest March 2026)

### Animation System
- **Built-in Tweening**: Yes, native `Konva.Tween` with easing functions and play/pause/reverse controls
- **External Library Support**: Official GreenSock plugin for GSAP integration; auto-manages `draw()` calls
- **Springs**: Integrates with `react-spring` for physics-based animations in React apps
- **Declarative Model**: Fully declarative when used with react-konva

### React Integration
- **Official Wrapper**: Yes, `react-konva` v19 (exclusively for React 19)
- **Maturity**: Excellent — mature, production-ready
- **React 19 Support**: Full concurrent rendering support (v19.0.6+ fixed strict mode double-event issues)
- **Framework Ecosystem**: Official bindings for React, Vue, Svelte, Angular (unique among canvas libs)

### Animated Edge Draw-On
- **SVG Path Animation**: Supports `Konva.Path` with SVG path data
- **Stroke Animation**: Limited native stroke-dashoffset animation (no direct Canvas2D equivalent)
- **Workaround**: Manual frame-by-frame drawing or GSAP for stroke progression effects

### Text Rendering
- **Custom Fonts**: Full support (Google Fonts, @font-face, system fonts)
- **Multiline**: Yes, via `\n` escape and `wrap` property ("word", "char", "none")
- **Emoji**: Known issues with multiline emoji (Chrome breaks mid-emoji, Safari doesn't wrap properly)
- **Line Height**: Customizable via `lineHeight` property
- **Advanced**: `charRenderFunc` callback for per-character customization

### Icon/Image Embedding
- **SVG Icons**: Yes, via `Konva.Image.fromURL('/image.svg')` or `Konva.Path` extraction
- **Raster Images**: Full support (PNG, JPG, etc.)

### Hit Testing / Interactivity
- **Event Types**: mouseover, mouseout, mouseenter, mouseleave, mousemove, mousedown, mouseup, wheel, click, dblclick
- **Custom Hit Regions**: `hitFunc` property for precise hit detection
- **Performance Optimization**: `drawHitFromCache()` for pixel-perfect non-transparent region detection
- **Stress Test**: Documented 10,000 shapes with tooltips

### Performance
- **Node Capacity at 60fps**: 100–200 nodes easily achievable; stress tested to 10k+ shapes
- **Rendering**: Canvas 2D (not WebGL)
- **Optimization Techniques**: Shape caching (convert complex shapes to bitmaps), layer-based rendering, animation frame management

### Community Health
- **Development Status**: Actively maintained with regular releases
- **Influence Level**: Marked as "Influential" project
- **Adoption**: 1.1M npm weekly downloads — highest among pure canvas libs

---

## 2. Pixi.js

### Core Metrics
- **Current Version**: 8.16.0 (actively maintained)
- **Bundle Size**: Not explicitly documented; known as "fastest, most lightweight 2D library"
- **License**: MIT
- **npm Weekly Downloads**: 536,486
- **GitHub Stars**: 46,954
- **Last Commit**: Very recent (actively maintained)

### Animation System
- **Built-in Tweening**: No native tweening system
- **External Library Support**: GSAP PixiPlugin (highly recommended); Tween.js integration patterns documented
- **Springs**: No native support; requires external libs
- **Rendering**: WebGL-primary (Canvas2D fallback available)

### React Integration
- **Official Wrapper**: Yes, `@pixi/react` v8 (redesigned for React 19)
- **Maturity**: Good, but younger than react-konva; major v8 rewrite in 2024
- **React 19 Support**: Exclusive — v8 requires React 19+
- **Architecture**: Extend API allows selective component imports to minimize bundle size

### Animated Edge Draw-On
- **SVG Path Animation**: Pixi.Graphics supports cubic Bézier curves and stroked paths
- **Performance Warning**: Don't continuously clear/rebuild graphics every frame (causes perf degradation)
- **Best Practice**: Use prebuilt GraphicsContext objects or frame-based swapping
- **Approach**: Manual path drawing with animation frames required (no native stroke-dashoffset equivalent)

### Text Rendering
- **Custom Fonts**: Standard Text (PIXI.Text) via browser text rendering
- **Bitmap Fonts**: PIXI.BitmapText for performance (faster, cheaper to change)
- **Multiline**: Yes, via `TextStyle` with `wordWrapWidth`
- **Emoji**: No known issues; relies on native browser text rendering

### Icon/Image Embedding
- **Sprites**: Full support via `PIXI.Sprite`
- **SVG Icons**: Can embed as sprites or render via Graphics (not direct SVG parsing)
- **Raster Images**: Native support with GPU acceleration
- **Texture Atlasing**: Optimized for batched sprite rendering

### Hit Testing / Interactivity
- **Interactive Mode**: Set `eventMode` to 'static' for standard interaction
- **Hit Areas**: Custom via `hitArea` property (Circle, Rectangle, RoundedRectangle, Polygon, Point)
- **Pixel-Perfect**: Override `containsPoint()` for alpha-channel checking

### Performance
- **WebGL Rendering**: 100–200 nodes trivial; benchmark shows 60fps for 8,000 boxes (vs Konva 23fps)
- **Large Graphs**: 1,200 nodes + 16,000 edges = 20fps (Canvas), 100fps+ (WebGL)
- **GPU Batching**: Multiple simple Graphics objects > one complex object
- **Caching**: `cacheAsBitmap = true` for static graphics

### Community Health
- **Development Status**: Actively maintained, major v8 rewrite in 2024
- **Adoption**: 1,021 projects using Pixi; 46k GitHub stars
- **Gaming Focus**: Widely used in game engines (Phaser, etc.)

---

## 3. Fabric.js

### Core Metrics
- **Current Version**: 7.2.0 (as of 2025)
- **License**: Apache 2.0
- **GitHub Stars**: ~28k+
- **Last Commit**: 2 months before search

### Animation System
- **Built-in Tweening**: Yes, native `animate()` method on all objects
- **Easing Functions**: Extensive (easeInSine, easeInCubic, easeOutElastic, easeInBounce, easeOutBounce, etc.)
- **External Library Support**: Works with anime.js and other tweening libs

### React Integration
- **Official Wrapper**: No official React binding
- **Maturity**: Community solutions available; requires manual ref-based integration
- **React 19**: No known blocking issues (Canvas 2D compatible)

### Animated Edge Draw-On
- **strokeDashArray Support**: Yes, but limited animation
- **strokeDashOffset**: Feature requested (2017 issue #3835) but no native implementation
- **Workaround**: Custom animation logic required for stroke progression

### Text Rendering
- **Custom Fonts**: Yes, via CSS Font Loader API (async-aware)
- **Multiline**: Yes, with `lineHeight` customization
- **Grapheme Splitting**: Overridable `graphemeSplit()` function for emoji/complex scripts

### Icon/Image Embedding
- **SVG Parsing**: SVG-to-Canvas parser built-in
- **Canvas-to-SVG**: Bidirectional support
- **Image Support**: `fabric.Image` class for raster images with filter support

### Hit Testing / Interactivity
- **Out-of-Box Support**: Scale, move, rotate, skew, group via interaction module
- **Selection**: Interactive object selection/transformation via mouse/touch
- **Usability Focus**: Designed for interactive design editors

### Performance
- **Benchmark (8,000 boxes)**: 9fps (vs Konva 23fps, Pixi 60fps)
- **Node Capacity**: Suitable for 100–200 nodes, but slower than Konva/Pixi
- **Design Focus**: Optimized for editing workflows, not real-time animation-heavy scenes

---

## 4. Two.js

### Core Metrics
- **Current Version**: 0.8.16+ (©2012–2025 per copyright)
- **License**: MIT
- **npm Weekly Downloads**: 6,725 (as of 2025 npm trends)
- **GitHub Stars**: 8,411

### Animation System
- **Built-in Tweening**: Basic `two.play()` at 60fps, `two.bind()` for event-driven animations
- **External Library Support**: Unclear (no explicit GSAP integration mentioned)

### React Integration
- **Official Wrapper**: None documented
- **Framework Support**: Vanilla JavaScript focus

### Rendering
- **Multi-Backend**: SVG, Canvas, WebGL (renderer agnostic)
- **Use Case**: 2D drawing API for modern browsers

### Community Health
- **Development Status**: Maintained but significantly lower adoption than Konva/Pixi
- **Niche**: Specialized for renderer-agnostic 2D drawing

---

## 5. Paper.js

### Core Metrics
- **Current Version**: 0.12.18+
- **License**: MIT
- **npm Weekly Downloads**: 47,222

### Animation System
- **Built-in Tweening**: Not explicitly documented
- **Specialized**: Vector graphics scripting framework (Scriptographer ported to JavaScript)

### React Integration
- **Official Wrapper**: None
- **Maturity**: None

### Use Case Focus
- **Swiss Army Knife of Vector Graphics**: Bezier curves, vector manipulation, scripting
- **Niche**: Creative vector editing, not animation-driven visualizations

---

## 6. D3.js (Complementary Tool)

### Core Metrics
- **Current Version**: 0.183.2+
- **npm Weekly Downloads**: ~1.8M+ (highest among all libraries)
- **GitHub Stars**: 104,935
- **License**: ISC

### Rendering Approaches
- **SVG-Native**: Default rendering via DOM SVG
- **Canvas Hybrid**: D3 + Canvas for performance (10k datapoints at 60fps vs 2–3k for SVG)
- **WebGL**: Via D3-compatible extensions

### Strengths
- **Data Binding**: Powerful declarative data-to-DOM/canvas mapping
- **Layout Algorithms**: Force-directed, hierarchical, treemap, etc.

### Limitations for Insyte Use Case
- Not a unified canvas library; data-visualization-centric, not graphics-engine-centric
- No built-in animation; relies on D3 transitions (DOM-based) + external canvas rendering libraries
- Steep learning curve for step-driven educational animations
- **Verdict**: Better as complement to Konva/Pixi for layout algorithms, not standalone replacement

---

## Specific Use-Case Fit Assessment

### SystemDiagramViz (Nodes with Icons + Directed Edges)

| Library | Fit | Notes |
|---------|-----|-------|
| **Konva.js** | Excellent | SVG icon embedding, hit testing per-node, layer-based rendering, declarative react-konva |
| **Pixi.js** | Excellent | Sprite-based icons, fast rendering, but needs custom edge drawing; WebGL perf |
| **Fabric.js** | Good | SVG parsing built-in, but slower for 100+ nodes; design-editor focus |
| **Two.js/Paper.js/D3.js** | Poor | Not optimized for interactive node/edge diagram patterns |

### ArrayViz (Row of Cells with Color-Fill Animations)

| Library | Fit | Notes |
|---------|-----|-------|
| **Konva.js** | Excellent | Per-cell group/rect animation, layer invalidation efficient, native tweening |
| **Pixi.js** | Excellent | Fast color transitions via GPU, high frame rate for many rectangles |
| **Fabric.js** | Good | Animate property works, but slower at scale |

### TreeViz (Hierarchical Layout with Node/Edge Additions)

| Library | Fit | Notes |
|---------|-----|-------|
| **Konva.js** | Excellent | Group nesting matches tree structure; animation on add/remove seamless |
| **Pixi.js** | Excellent | Sprite trees, fast; layout must be calculated externally |
| **D3.js** | Good | Tree layouts built-in, but rendering requires separate canvas layer |

### DPTableViz (Grid Fill Animations)

| Library | Fit | Notes |
|---------|-----|-------|
| **Konva.js** | Excellent | Rect groups + tweens; layer batching efficient |
| **Pixi.js** | Excellent | Sprite grids, fastest performance |
| **Fabric.js** | Good | Per-cell animation works, slower |

---

## Performance Benchmark Summary

| Benchmark | Pixi.js | Konva.js | Fabric.js |
|-----------|---------|----------|-----------|
| 8,000 boxes @ target FPS | ✅ 60fps | ✓ 23fps | ✗ 9fps |
| WebGL large graphs (1.2k nodes) | ✅ 100fps+ | N/A | N/A |
| Insyte target (100–200 nodes) | ✅ Excellent | ✅ Excellent | ✓ Acceptable |

---

## Animated Edge Draw-On Analysis

None of the canvas libraries directly implement SVG `stroke-dashoffset` animation in Canvas2D context. All require workarounds:

1. **Konva.js**: Manual frame-by-frame drawing or GSAP plugin
2. **Pixi.js**: Manual Graphics redraw (expensive) or prebuilt contexts
3. **Fabric.js**: Custom animation with `animate()` method (path-based, not stroke-based)
4. **D3.js (SVG mode)**: Works natively via `stroke-dasharray` animation — but requires DOM SVG

**Recommended approach for Insyte**: Hybrid pattern — use **SVG overlay** for animated edges (native `stroke-dashoffset` + CSS animation) while Konva/Pixi handles nodes.

---

## Top 3 Ranked Libraries

### 1. Konva.js — Best Overall for Insyte (Score: 9.2/10)

**Why it wins:**
- **Declarative React Integration**: `react-konva` is official, mature, React 19–ready, and the only canvas library with first-class support across React, Vue, Svelte, Angular
- **Animation System**: Native tweening + GSAP plugin = declarative, step-driven animations without external dependencies
- **Educational Fit**: Designed for educational apps with drawing capabilities; proven in data visualization tools
- **Layer Architecture**: Per-layer rendering/invalidation = efficient updates for step-driven scenes
- **Icon Support**: SVG embedding + raster images + interactive hit detection = perfect for SystemDiagramViz
- **Community**: 1.1M npm weekly downloads, actively maintained

**Tradeoffs:**
- Canvas 2D (not WebGL), so slower than Pixi at 1000+ nodes (not a blocker for Insyte's 100–200 target)
- Emoji multiline rendering quirks
- Stroke-dashoffset animation requires workarounds

### 2. Pixi.js — Best for Performance-Critical Scenarios (Score: 8.8/10)

**Why it's competitive:**
- WebGL-accelerated = 60fps at 8,000+ boxes; unmatched for high-density visualizations
- `@pixi/react` v8 is new, React 19–exclusive, with selective component imports
- 46k GitHub stars, widely used in game/interactive industries

**Tradeoffs:**
- No built-in tweening; requires GSAP or external animation lib (more setup)
- Lower-level API = more boilerplate than Konva for educational visualizations
- React integration younger (v8 major rewrite in 2024)
- Text rendering has two modes (standard vs bitmap); bitmap fonts require asset prep

**When to choose Pixi**: If rendering 300+ nodes per scene, or targeting mobile/low-power devices.

### 3. Fabric.js — Alternative for Editor-Heavy Use Cases (Score: 6.5/10)

**When to choose Fabric.js**: If importing complex SVG diagram definitions and interactive editing is a primary use case (less relevant for Insyte's read-only educational visualizations).

---

## Summary Recommendation

**For the Insyte project, choose Konva.js** as the primary rendering backend.

**Hybrid Enhancement**:
- Use **SVG overlays** for animated edge draw-on effects (native stroke-dasharray animation)
- Or implement custom `Konva.Path` animation via frame-based updates + GSAP

**Future Consideration**:
- If Insyte scales to 500+ nodes or mobile targets → migrate/supplement with Pixi.js for WebGL performance

---

## Sources

- [Konva.js npm package](https://www.npmjs.com/package/konva)
- [react-konva npm package](https://www.npmjs.com/package/react-konva)
- [Konva GitHub repository](https://github.com/konvajs/konva)
- [Konva vs Fabric vs Pixi comparison guide](https://konvajs.org/docs/guides/best-canvas-library.html)
- [Pixi.js npm package](https://www.npmjs.com/package/pixi.js)
- [Pixi React v8 announcement](https://pixijs.com/blog/pixi-react-v8-live)
- [Fabric.js official docs](https://fabricjs.com/)
- [D3.js GitHub](https://github.com/d3/d3)
- [Graph visualization efficiency research (2025)](https://vciba.springieropen.com/articles/10.1186/s42492-025-00193-y)
- [Canvas rendering performance benchmarks](https://github.com/slaylines/canvas-engines-comparison)
- [GSAP PixiPlugin documentation](https://gsap.com/docs/v3/Plugins/PixiPlugin/)
