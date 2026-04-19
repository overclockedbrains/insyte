You are researching the best rendering strategy to replace a DOM-based React animation renderer in a product called Insyte — an AI-powered interactive visual explanation platform that teaches technical concepts (system design, DSA, networking) through animated step-by-step visualizations.

## Current Architecture

The existing renderer (DOMRenderer) is React + Framer Motion. It receives a `SceneGraph` object and renders visual primitives (nodes, edges, diagrams, arrays, trees, graphs, DP tables) as animated HTML/CSS elements positioned absolutely in a container. Known problems:
- Positioning bugs: elements don't always land correctly in absolute canvas space
- Color transition glitches during step changes
- Entrance/exit animations conflict with layout animations (Framer Motion `layoutId` issues)
- No depth/layering expressiveness — everything is flat DOM
- Hard to do anything visually extraordinary

The renderer interface contract is clean — it receives `SceneGraph`, `step`, `speed`, `resolvedPopups` and owns everything visual below that boundary. Swapping renderers is an env-var flag.

## Visual Primitives That Must Be Supported

- **SystemDiagramViz** — nodes with icons + labels, directed edges with labels, active/normal/highlight states, animated draw-on for edges
- **ArrayViz** — horizontal cell arrays with highlight/compare/sorted states
- **TreeViz** — hierarchical tree with animated node additions and edge connections
- **GraphViz** — arbitrary graph with node/edge states
- **DPTableViz** — grid of cells with fill animations
- HUD overlays (non-canvas positioned UI)
- Popup annotations anchored in canvas-space

## Research Tasks (run as parallel sub-agents if beneficial)

Spawn parallel sub-agents to investigate these independently, then synthesize:

**Sub-agent A — 2D Canvas Libraries**
- Research: Konva.js, Pixi.js, Fabric.js, Two.js, Paper.js — capabilities, animation support, React integration, bundle size, community health (2024–2026 state)
- Research: how each handles animated edges (draw-on SVG path equivalent), text rendering, icon embedding
- Research: what animation systems they expose (tweening, spring physics) and whether Framer Motion concepts map across
- Identify which is best suited for step-driven declarative animations (not game loops)

**Sub-agent B — 3D / Hybrid Approaches**
- Research: Three.js, React Three Fiber (R3F), Babylon.js — feasibility for 2.5D diagram rendering (flat diagrams with depth, camera, bloom, particle effects)
- Research: how products like Framer, Jitter, Rive, or Spline use 3D for what appears to be "enhanced 2D" UI content
- Research: shader-based effects relevant to tech education visualizations — glow on active nodes, particle trails on edges, depth fog, glassmorphism panels
- Assess: what level of 3D involvement is realistic for diagrams that must remain readable and educational (not just flashy)

**Sub-agent C — Competitive & Trend Research**
- Research: how leading visual explanation tools render animations — Khan Academy CS, Visualgo, Algorithm Visualizer, CS50 Duck Debugger, Brilliant interactive lessons
- Research: emerging WebGPU-based approaches and whether they are production-ready in 2026
- Research: what makes technical visualizations "stand out" visually — look at award-winning data viz (Observable, Pudding.cool, NYT graphics) and identify transferable techniques
- Research: motion design patterns for step-driven educational animations (easing curves, stagger timing, emphasis techniques)

**Sub-agent D — React Integration Patterns**
- Research: patterns for integrating imperative canvas libraries into a declarative React component tree
- Research: how to handle the React reconciler boundary cleanly — receiving new props (step change) and driving canvas updates imperatively
- Research: performance considerations — frame budget, offscreen canvas, web workers for layout computation
- Research: how to preserve accessibility (ARIA, screen reader) when content moves off the DOM

## Synthesis Requirements

After sub-agents complete, synthesize into a ranked recommendation:
1. **Primary recommendation**: which library/approach for the core renderer, and why it beats the alternatives for this specific use case
2. **3D enhancement layer**: what's a realistic, high-impact 3D or shader enhancement that wouldn't compromise readability — concrete description, not vague "add glow"
3. **Migration path**: given the clean `SceneRendererProps` interface, what are the phases to move from DOMRenderer to the new approach
4. **Risk matrix**: top 5 risks (browser support, bundle size, learning curve, text rendering quality, accessibility) with severity and mitigation
5. **Proof-of-concept scope**: what's the smallest implementation that would validate the approach — which primitive to build first and what visual capability to demo

Do NOT write implementation code. Produce a structured research report with concrete library names, version numbers (as of 2026), and links where relevant.
Write all the results from each agent and you rfinal full research report under .planning/research/canvas-renderer/...
