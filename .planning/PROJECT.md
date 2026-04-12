# insyte — Project Roadmap

> **"See how it works."**
> AI-powered platform that turns any tech concept into a live, interactive simulation.
> Turborepo + pnpm monorepo · Next.js 16 · Dark-only · 24 pre-built simulations

---

## Project at a Glance

| Dimension | Value |
|-----------|-------|
| Domain | insyte.amanarya.com |
| Stack | Next.js 16, TypeScript, Tailwind v4, Framer Motion, Zustand, Vercel AI SDK |
| Monorepo | Turborepo + pnpm workspaces |
| Database | Supabase |
| AI Default | Gemini Flash (free tier) |
| BYOK | OpenAI · Anthropic · Gemini · Groq · Ollama (local) · Custom endpoint |
| Theme | Dark-only, always |
| Pre-built sims | 24 total (5 concept + 10 DSA + 5 LLD + 4 HLD) |

---

## Progress Tracker

R1 released on 8 April 2026 and R2 is in progress

### Release 1 (R1) - Core Platform

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 0** | ✅ | Monorepo Setup |
| **Phase 1** | ✅ | Design System + Global Layout |
| **Phase 2** | ✅ | Scene Engine Core |
| **Phase 3** | ✅ | Visual Primitives |
| **Phase 4** | ✅ | Simulation Page Layouts |
| **Phase 5** | ✅ | 5 Concept Simulations (Hand-Crafted) |
| **Phase 6** | ✅ | Explore + Landing Page |
| **Phase 7** | ✅ | AI Scene Generation (Streaming) |
| **Phase 8** | ✅ | AI Chat + Scene Patching |
| **Phase 9** | ✅ | Settings + BYOK |
| **Phase 10** | ✅ | LLD + HLD Simulations |
| **Phase 11** | ✅ | Supabase Integration + User Accounts |
| **Phase 12** | ✅ | DSA Pipeline |
| **Phase 13** | ✅ | Polish + Responsive |
| **Phase 14** | ✅ | Complete Deploy |

### Release 2 (R2) - Architecture Overhaul

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 15** | ✅ | R1 Fixes + UI Tweaks |
| **Phase 16** | ✅ | Core Correctness + Runtime Hardening |
| **Phase 17** | ✅ | Local & Custom LLM Support (Ollama + OpenAI-compatible endpoints) |
| **Phase 18** | ✅ | Coordinate System Unification (fix dual-coordinate edge/node misalignment) |
| **Phase 19** | ✅ | Scene JSON Schema Redesign (LayoutHint, SlotPosition, simplified Action) |
| **Phase 20** | ✅ | Layout Engine (SPACING constants, per-primitive sizing, dagre/d3-hierarchy/arithmetic algorithms) |
| **Phase 21** | ✅ | Step Engine (applyStepActionsUpTo, computeTopologyAtStep, evaluateCondition, step validation) |
| **Phase 22** | ✅ | Scene Graph Architecture (SceneGraph types, SceneGraphDiff, DOMRenderer extracted) |
| **Phase 23** | ✅ | Scene Runtime & Caching (unified cache layer: layout + scene graph + ELK; useSceneRuntime hook; playback bridge) |
| **Phase 24** | ✅ | ISCL Grammar & Parser (purpose-built DSL, deterministic parser, cross-ref validation) |
| **Phase 25** | 🔲 | Multi-Stage AI Pipeline (5-stage generator, per-stage retry, partial-success recovery, error events) |
| **Phase 26** | 🔲 | Progressive Streaming Generation UX (skeleton → primitives → annotations → complete) |
| **Phase 27** | 🔲 | Visual Quality & Animation System (HIGHLIGHT_COLORS, sub-step choreography, diff-driven animations) |
| **Phase 28** | 🔲 | ELK Integration & System Diagram Quality (orthogonal routing, Web Worker, progressive enhancement) |
| **Phase 29** | 🔲 | Zoom/Pan Viewport & Interactive Canvas (CSS transform, pinch-to-zoom, zoom-to-fit) |

---

## Phases

### Phase 0 — Monorepo Setup
**Goal:** Turborepo + pnpm monorepo fully wired, zero-config dev environment running.

**Deliverables:**
- Root Turborepo config (`turbo.json`, `pnpm-workspace.yaml`)
- `packages/scene-engine` — pure TS package: types, Zod schema, parser
- `packages/tsconfig` — shared TypeScript base configs
- `apps/web` — Next.js 16 app scaffolded
- Tailwind v4 with all DESIGN.md color tokens configured
- shadcn/ui initialized
- ESLint + Prettier configured across workspace
- `pnpm dev` starts both packages watching and app running

**Plan:** [→ phases/phase-00/PLAN.md](phases/phase-00/PLAN.md)

---

### Phase 1 — Design System + Global Layout
**Goal:** Every DESIGN.md token, utility, and layout component implemented and verified.

**Deliverables:**
- All color tokens as CSS variables + Tailwind config extensions
- Font imports (Manrope, Inter, JetBrains Mono) in root layout
- `globals.css` with: glass-panel, glow-border, dot-grid, glow blobs, bezier styles
- `Navbar.tsx` — sticky, blurred, all nav items, mobile drawer
- `DotGridBackground.tsx` — subtle dot grid component
- `GlowEffect.tsx` — reusable ambient glow utility
- Root `layout.tsx` with dark theme, font variables, `<Navbar>`
- `Footer.tsx`
- `/` renders a placeholder "coming soon" with correct theme applied

**Plan:** [→ phases/phase-01/PLAN.md](phases/phase-01/PLAN.md)

---

### Phase 2 — Scene Engine Core
**Goal:** Scene JSON types finalized, all Zustand stores wired, SceneRenderer renders primitives from JSON.

**Deliverables:**
- `packages/scene-engine/src/types.ts` — all interfaces (Scene, Visual, Step, Action, Control, ExplanationSection, Popup, Challenge)
- `packages/scene-engine/src/schema.ts` — full Zod validation schema mirroring types
- `packages/scene-engine/src/parser.ts` — normalize raw JSON → engine state
- 5 Zustand stores in `apps/web/src/stores/`: scene, playback, settings, chat, detection
- `SceneRenderer.tsx` skeleton — reads `layout`, renders panel + canvas slots
- `useScene.ts`, `usePlayback.ts`, `useControls.ts`, `useAnnotations.ts` hooks
- `PlaybackControls.tsx` — play/pause/step-fwd/step-back/reset + speed slider

**Plan:** [→ phases/phase-02/PLAN.md](phases/phase-02/PLAN.md)

---

### Phase 3 — Visual Primitives
**Goal:** All 12 primitive components + connector system built and individually testable.

**Deliverables:**
- `PrimitiveRegistry` in `primitives/index.ts`
- 12 primitive components: ArrayViz, HashMapViz, LinkedListViz, TreeViz, GraphViz, StackViz, QueueViz, DPTableViz, RecursionTreeViz, SystemDiagramViz, TextBadgeViz, CounterViz
- 3 connector components: BezierConnector, StraightArrow, DataFlowDot
- `StepPopup.tsx` — attaches to visual element, shows at step range
- `ExplanationPanel.tsx` — scrollable left panel, synced with step index
- `CodePanel.tsx` — Shiki syntax highlighting, active line glow

**Plan:** [→ phases/phase-03/PLAN.md](phases/phase-03/PLAN.md)

---

### Phase 4 — Simulation Page Layouts
**Goal:** `/s/[slug]` route fully functional with all 3 layout variants and expand mode.

**Deliverables:**
- `/s/[slug]` route with static slug loading
- `TextLeftCanvasRight.tsx` layout component
- `CodeLeftCanvasRight.tsx` layout component
- `CanvasOnly.tsx` layout component
- Full-canvas expand/collapse (`⛶` button, Framer Motion slide)
- `ChallengesSection.tsx` — horizontal card row, collapsible
- Simulation page sticky nav (back arrow + title + category badge + share + expand)
- Mobile layout: stacked canvas top, explanation below, tab switcher for DSA

**Plan:** [→ phases/phase-04/PLAN.md](phases/phase-04/PLAN.md)

---

### Phase 5 — 5 Concept Simulations (Hand-Crafted)
**Goal:** 5 fully interactive concept Scene JSONs hand-authored and rendering correctly.

**Deliverables:**
- `apps/web/src/content/scenes/concepts/hash-tables.json`
- `apps/web/src/content/scenes/concepts/js-event-loop.json`
- `apps/web/src/content/scenes/concepts/load-balancer.json`
- `apps/web/src/content/scenes/concepts/dns-resolution.json`
- `apps/web/src/content/scenes/concepts/git-branching.json`
- Each JSON: 8+ steps, full controls, explanation sections, 3 challenges
- Scene loader in `/s/[slug]/page.tsx` that resolves slug → JSON file

**Plan:** [→ phases/phase-05/PLAN.md](phases/phase-05/PLAN.md)

---

### Phase 6 — Explore + Landing Page
**Goal:** `/explore` page and `/` landing page fully built with live hash table demo.

**Deliverables:**
- `/explore` page: Netflix-style rows (Featured, DSA, System Design, LLD, Networking)
- `TopicCard.tsx` — OG image thumbnail, title, category badge, hover glow
- `SearchBar.tsx` — autocomplete from `topic_index.ts` catalog
- `topic-index.ts` — catalog with all 24 pre-built slugs + metadata
- Landing page `/`: two-column hero, live hash table demo, popular chips, how-it-works, featured sims, feature highlights, footer
- `UnifiedInput.tsx` — textarea with real-time detection label, expand on focus
- Auto-detection mode label (concept / DSA / LLD / HLD)

**Plan:** [→ phases/phase-06/PLAN.md](phases/phase-06/PLAN.md)

---

### Phase 7 — AI Scene Generation (Streaming)
**Goal:** Typing a new concept generates a streaming Scene JSON with skeleton → live fill-in UX.

**Deliverables:**
- Vercel AI SDK + `streamObject` setup
- `apps/web/src/ai/providers/` — gemini, openai, anthropic, groq + registry index
- `apps/web/src/ai/prompts/scene-generation.md` — full system prompt
- `apps/web/src/ai/generateScene.ts` — prompt builder + streaming call
- `/api/generate` route — streams Scene JSON chunks to client
- Streaming skeleton: shimmer title → node fade-in → panel fill → controls appear
- Zod validation on stream chunks + one auto-retry on failure
- Supabase write of completed scene (cache for future users)
- Auto-detection client logic (`detectMode()` in detection-store)
- Confirmation dialog for DSA detection ("We detected Python + Two Sum — visualize it?")
- Slug generation + navigate to `/s/[slug]` before stream begins

**Plan:** [→ phases/phase-07/PLAN.md](phases/phase-07/PLAN.md)

---

### Phase 8 — AI Chat + Scene Patching
**Goal:** Floating chat button → expandable card with live AI chat that can patch the active scene.

**Deliverables:**
- `ChatButton.tsx` — floating `💬` FAB, bottom-right, subtle pulse
- `ChatCard.tsx` — 320×420px glass morphism card, minimize/close, streaming response
- `apps/web/src/ai/prompts/live-chat.md` — chat system prompt with scene context
- `apps/web/src/ai/liveChat.ts` — stream chat response + optional scene diff
- `apps/web/src/ai/applyDiff.ts` — apply add/update/remove patches to scene store
- `/api/chat` streaming route — receives question + scene context, returns text + optional diff
- Canvas brief glow on patch applied (Framer Motion layout animation)
- Mobile bottom sheet variant (60% screen height)
- Chat history in `chat-store.ts` (session-scoped)

**Plan:** [→ phases/phase-08/PLAN.md](phases/phase-08/PLAN.md)

---

### Phase 9 — Settings + BYOK
**Goal:** `/settings` page fully functional — users can add API keys, select models, and control AI behaviour.

**Deliverables:**
- `/settings` page with glass-panel sections
- API key input per provider (OpenAI, Anthropic, Gemini, Groq) — password inputs, never logged
- Model selector per provider (e.g. GPT-4o, Claude Sonnet 4.5, Gemini Flash, Llama-3.1-70b)
- Keys stored in `settings-store.ts` backed by localStorage
- Provider switching wired into AI client (`apps/web/src/ai/client.ts`) — affects both generation + chat
- "Clear all keys" button with confirmation
- Status indicator: which provider is currently active + token budget indicator
- Navbar settings icon linking to `/settings`

**Plan:** [→ phases/phase-09/PLAN.md](phases/phase-09/PLAN.md)

---

### Phase 10 — LLD + HLD Simulations
**Goal:** All 9 remaining pre-built simulations (5 LLD + 4 HLD) authored and rendering.

**Deliverables:**
- 5 LLD Scene JSONs in `src/content/scenes/lld/`: lru-cache, rate-limiter, min-stack, trie, design-hashmap
- 4 HLD Scene JSONs in `src/content/scenes/hld/`: url-shortener, twitter-feed, consistent-hashing, chat-system
- `SystemDiagramViz.tsx` fully complete (component boxes, bezier flow arrows, data flow dots)
- Interactive HLD controls: "Kill Server" button action, "Traffic Spike" button action
- `CanvasOnly` layout wired with floating explanation cards for HLD scenes
- `showWhen` condition system in SceneRenderer (toggle-driven visibility)

**Plan:** [→ phases/phase-10/PLAN.md](phases/phase-10/PLAN.md)

---

### Phase 11 — Supabase Integration + User Accounts
**Goal:** Full Supabase backend live — scene caching, auth, user profiles, saved simulations, rate limiting, and OG images.

**Deliverables:**

_Backend & Data_
- `apps/web/src/lib/supabase.ts` — Supabase client (server + browser variants)
- Supabase project: `scenes`, `topic_index`, `users`, `saved_scenes` tables
- `topic_index` seeded with all 24 pre-built entries
- `apps/web/src/lib/cache.ts` — `getCachedScene(slug)`, `saveScene(scene)`, `incrementHit(slug)`
- `apps/web/src/lib/rateLimit.ts` — IP-based counter for anonymous (10/day), unlimited for signed-in users with BYOK
- Scene load flow: check Supabase → static file → AI generate (priority order)
- `hit_count` incremented on every simulation page load

_Auth_
- Supabase Auth with email + Google OAuth
- `apps/web/src/lib/auth.ts` — session helpers, `getUser()`, `requireAuth()`
- Sign-in / sign-up modal (glass morphism, reusable across entry points)
- Auth state in Zustand `auth-store.ts` — user, session, loading
- Navbar avatar dropdown: profile link, sign out, usage stats

_User Profile & Dashboard_
- `/profile` page — avatar, display name, joined date, total simulations generated
- Saved simulations grid: scenes the user explicitly bookmarked
- Generated history: last 20 AI-generated scenes linked to the user's account
- "Save" bookmark button on every `/s/[slug]` page (heart/bookmark icon, Framer Motion toggle)
- Delete from history / unsave flow

_OG Images_
- `apps/web/app/api/og/route.tsx` using `@vercel/og` (Satori)
- OG images for all 24 pre-built simulations stored in Supabase Storage
- `og:image`, `og:title`, `og:description` meta tags on all `/s/[slug]` pages

**Plan:** [→ phases/phase-11/PLAN.md](phases/phase-11/PLAN.md)

---

### Phase 12 — DSA Pipeline
**Goal:** Full DSA trace pipeline working end-to-end: paste code → sandbox execute → Scene JSON.

**Deliverables:**
- `apps/web/src/sandbox/PyodideRunner.ts` — lazy-load Pyodide, execute with trace capture
- `apps/web/src/sandbox/JSRunner.ts` — Web Worker JS sandbox
- `apps/web/src/sandbox/workers/js-sandbox.worker.ts`
- `apps/web/src/sandbox/SandboxManager.ts` — `execute(code, lang) → TraceStep[]`
- `apps/web/src/sandbox/types.ts` — TraceStep, TraceData interfaces
- Pyodide progress indicator ("Initializing Python runtime... ~10MB") — progress bar, percentage
- `apps/web/src/ai/prompts/code-instrumentation.md`
- `apps/web/src/ai/instrumentCode.ts`
- `/api/instrument` route
- `apps/web/src/ai/prompts/trace-to-scene.md`
- `apps/web/src/ai/traceToScene.ts`
- `/api/visualize-trace` route
- "Re-run with custom input" flow (sandbox re-execute + AI re-annotate)
- 10 pre-built DSA Scene JSONs in `src/content/scenes/dsa/`
- `next.config.ts` — WASM headers for Pyodide
- Mobile DSA layout: stacked canvas top, explanation below, tab switcher

**Plan:** [→ phases/phase-12/PLAN.md](phases/phase-12/PLAN.md)

---

### Phase 13 — Polish + Responsive
**Goal:** Core product (concept + LLD/HLD + DSA) is mobile-first, pixel-perfect, and production-quality.

**Deliverables:**
- Full mobile responsive pass (320px minimum): all pages, simulation layouts, chat card
- Tablet (768–1024px) layout adjustments
- `<Suspense>` boundaries + skeleton components for all async data paths
- Error boundaries on SceneRenderer + API routes
- Share button (copy URL to clipboard, toast confirmation)
- Empty states and loading states for profile / saved scenes pages
- Accessibility pass: keyboard nav, focus rings, aria labels on interactive elements
- Performance pass: image optimization, lazy loading, bundle analysis

**Plan:** [→ phases/phase-13/PLAN.md](phases/phase-13/PLAN.md)

---

### Phase 14 — Complete Deploy
**Goal:** Production deploy on Vercel, all environment variables live, README complete, scenes validated.

**Deliverables:**
- Environment variables configured: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`
- Vercel deployment (production + preview branches)
- Custom domain `insyte.amanarya.com` wired to Vercel
- README with setup instructions, architecture overview, BYOK guide, contribution guide, and license section
- `scripts/validate-scenes.ts` — validates all 24 scene JSON files against Zod schema
- Smoke test checklist: landing → generate → simulate → chat → settings → profile → save
- Analytics: Vercel Analytics + basic event tracking (scene generated, chat sent, BYOK activated)

**Status:** Completed on April 8, 2026.

**Plan:** [→ phases/phase-14/PLAN.md](phases/phase-14/PLAN.md)

---

### Phase 15 — R1 Fixes + UI Tweaks
**Goal:** Fix rough edges discovered after launch, tighten the R1 UI, and track every polish item in one running phase document.

**Status:** Completed on April 10, 2026.

**Deliverables:**
- Navigation, page naming, and microcopy consistency pass across the product
- Rolling backlog of R1 bugs, broken UX, and visual inconsistencies
- Incremental fixes for landing, explore, simulation, settings, and profile surfaces
- Verification notes for each fix cluster so the phase doc stays current while work lands

**Plan:** [→ phases/phase-15/PLAN.md](phases/phase-15/PLAN.md)

---

### Phase 16 — Core Correctness + Runtime Hardening
**Goal:** Resolve the audited post-launch correctness issues in sandbox execution, AI data flow, state management, and Supabase integration before deeper R2 work continues.

**Status:** Planned as of April 10, 2026.

**Deliverables:**
- Worker-backed Python sandbox execution with hard timeout and clean runtime recovery
- Chat history, signed-in generation history, and DSA route validation fixed end-to-end
- Store lifecycle cleanup for patch glow and latest-trace state, plus shared playback actions
- Atomic Supabase hit counting, shared rate-limit window logic, and generated database types
- Provider-state cleanup, dead export removal, and lint cleanup from the audit

**Plan:** [→ phases/phase-16/PLAN.md](phases/phase-16/PLAN.md)

---

### Phase 17 — Local & Custom LLM Support
**Goal:** Add Ollama (local) and custom OpenAI-compatible endpoint support using one unified code path — no new SDK dependencies. Covers Ollama, LM Studio, vLLM, Together.ai, and any self-hosted inference server.

**Status:** Planned as of April 12, 2026.

**Deliverables:**
- `Provider` type extended to `'ollama' | 'custom'`
- `createModel()` factory centralizing all model instantiation via `createOpenAI({ baseURL })`
- `generateSceneCompat()` text-mode fallback with JSON extraction for models without structured output support
- `/api/providers/ollama-models` proxy route (server-side, avoids CORS)
- Settings UI: Local & Custom section with health check indicator + dynamic model picker
- Settings store additions: `ollamaBaseURL`, `customBaseURL`, `customApiKey`, `customModelId`

**Note:** Ollama generation runs browser-direct (not through Vercel) — users on the production site can use their locally-running Ollama instance. Requires `OLLAMA_ORIGINS=https://insyte.amanarya.com` set when starting Ollama. Cloud providers always run server-side for API key protection.

**Plan:** [→ phases/phase-17/PLAN.md](phases/phase-17/PLAN.md)

---

### Phase 18 — Coordinate System Unification
**Goal:** Fix the root cause of edge/node misalignment — eliminate the dual-coordinate system where DOM nodes use `left: ${x}%` and SVG edges use `x * SCALE_X px`. Establish a single pixel-coordinate system driven by `ResizeObserver`, and unify complex primitives (GraphViz, TreeViz, RecursionTreeViz, SystemDiagramViz) onto a shared SVG viewBox + `<foreignObject>` pattern.

**Estimated effort:** 6–8 days

**Deliverables:**
- `CanvasContext` with `toPx()` function (percent → absolute pixel via ResizeObserver)
- `computeViewBox(nodes, padding=40): string` helper
- GraphViz, TreeViz, RecursionTreeViz, SystemDiagramViz unified onto SVG viewBox + foreignObject
- StepPopup anchoring via `getBoundingClientRect()` (not percent positioning)
- Safari foreignObject compatibility verified

**Plan:** [→ phases/phase-18/PLAN.md](phases/phase-18/PLAN.md)

---

### Phase 19 — Scene JSON Schema Redesign
**Goal:** Replace ad-hoc position coordinates and raw discriminated union actions with a clean, layout-driven schema. AI no longer specifies XY positions — it specifies layout hints. Actions are simplified to `{ target, params }`.

**Estimated effort:** 4–5 days

**Deliverables:**
- `LayoutHint` union type (9 values: dagre-TB/LR/BT, tree-RT, linear-H/V, grid-2d, hashmap-buckets, radial)
- `SlotPosition` union type (11 named positions)
- Simplified `Action: { target: string; params: Record<string, unknown> }`
- Migration script `scripts/migrate-scene-json.ts` for all 24 existing scene JSON files
- Parser shim: silently drops `position` if present; Zod schema updated

**Plan:** [→ phases/phase-19/PLAN.md](phases/phase-19/PLAN.md)

---

### Phase 20 — Layout Engine
**Goal:** Build the deterministic layout engine that positions all visual primitives from layout hints — no more hardcoded coordinates. Includes SPACING/PRIMITIVE_SIZING constants; `computeLayout()` dispatcher; dagre, d3-hierarchy, arithmetic, and radial algorithms. Lives in `packages/scene-engine/src/layout/`.

**Estimated effort:** 6–8 days

**Deliverables:**
- `SPACING` constants (4/8/16/24/32/48px base-8 system)
- `PRIMITIVE_SIZING` per visual type (nodeWidth, nodeHeight, ranksep, nodesep, cellSize, etc.)
- `computeLayout(visual, state, containerW, containerH): LayoutResult` dispatcher
- Layout algorithms: `applyDagreLayout`, `applyD3HierarchyLayout`, `applyLinearLayout`, `applyStackLayout`, `applyGridLayout`, `applyHashmapLayout`, `applySlotLayout`, `applyRadialLayout`
- `utils.ts` with `computeLayoutResult`, `emptyLayoutResult`, `computeViewBox` (breaks circular dependency)

**Plan:** [→ phases/phase-20/PLAN.md](phases/phase-20/PLAN.md)

---

### Phase 21 — Step Engine
**Goal:** Extract step execution into a clean, dedicated layer. Provides the deterministic functions for computing visual state at any step index, evaluating topology, and handling `showWhen` conditions. All downstream consumers (Scene Graph, Scene Runtime, animations) build on this foundation.

**Estimated effort:** 3–4 days

**Deliverables:**
- `applyStepActionsUpTo(visuals, steps, stepIndex): StateMap` — replays actions 0…N, returns state per visual
- `computeTopologyAtStep(visuals, steps, stepIndex): Visual[]` — filters visuals by `showWhen` at this step
- `evaluateCondition(condition, steps, stepIndex): boolean` — full `showWhen` evaluator (currently missing implementation)
- `validateStepSequence(steps): ValidationResult` — monotonic indices, valid action targets
- Lives in `packages/scene-engine/src/step-engine/`; exported from `@insyte/scene-engine`

**Plan:** [→ phases/phase-21/PLAN.md](phases/phase-21/PLAN.md)

---

### Phase 22 — Scene Graph Architecture
**Goal:** Introduce a typed runtime scene graph (`SceneGraph`, `SceneNode`, `SceneEdge`, `SceneGroup`) computed from the Scene JSON at each step using the Step Engine and Layout Engine. Enables `diffSceneGraphs()` for targeted Framer Motion transitions — only changed nodes animate.

**Estimated effort:** 4–5 days

**Deliverables:**
- `SceneGraph`, `SceneNode`, `SceneEdge`, `SceneGroup`, `Viewport`, `SceneGraphDiff` types
- `computeSceneGraphAtStep(scene, stepIndex, containerW, containerH): SceneGraph` — calls Step Engine + Layout Engine
- `diffSceneGraphs(prev, next): SceneGraphDiff` (added/removed/moved/changed nodes + edges)
- `DOMRenderer.tsx` extracted from CanvasCard, rendering at group level (group.bbox positioning)
- `SceneRenderer` abstraction interface

**Plan:** [→ phases/phase-22/PLAN.md](phases/phase-22/PLAN.md)

---

### Phase 23 — Scene Runtime & Caching
**Goal:** Centralize all runtime caching into one coordination layer. Consolidates the layout topology cache (Phase 20), scene-graph LRU (Phase 22), and ELK async upgrade subscription (Phase 28) into a single `useSceneRuntime()` hook. Handles playback-store ↔ scene-graph bridge and pre-computation of adjacent steps.

**Estimated effort:** 3–4 days

**Deliverables:**
- `useSceneRuntime(scene, stepIndex, dims): SceneRuntimeState` — unified hook consumed by CanvasCard
- Topology-hash layout cache lifecycle (invalidation on scene change, pre-warm on mount)
- Scene-graph LRU cache (50-entry max) consolidated here from Phase 22's `useSceneGraph`
- Pre-computation of steps ±1 from current index for smooth scrubbing performance
- `subscribeELKReady` integration point (Phase 28 registers here)
- Playback-store subscription: cache cleared on scene reset, pre-computed on play start

**Plan:** [→ phases/phase-23/PLAN.md](phases/phase-23/PLAN.md)

---

### Phase 24 — ISCL Grammar & Parser
**Goal:** Implement ISCL (Insyte Scene Language) — a purpose-built text DSL for AI scene generation. Replaces direct Scene JSON output. The deterministic parser validates all cross-references; the grammar physically cannot express XY coordinates, eliminating the AI position hallucination problem.

**Estimated effort:** 5–6 days

**Deliverables:**
- Complete ISCL grammar (SCENE, TYPE, LAYOUT, VISUAL, STEP, SET, EXPLANATION, POPUP, CHALLENGES, CONTROL blocks)
- `parseISCL(script: string): ISCLParseResult` parser (~200 lines TypeScript) in `packages/scene-engine`
- All types: `ISCLParsed`, `ISCLVisualDecl`, `ISCLStep`, `ISCLSet`, `ISCLExplanationEntry`, `ISCLPopup`, `ISCLChallenge`, `ISCLControl`
- Cross-reference validation: duplicate IDs, non-monotonic steps, out-of-range explanation indices, unknown visual IDs in SET lines
- Unit tests covering all validation rules

**Plan:** [→ phases/phase-24/PLAN.md](phases/phase-24/PLAN.md)

---

### Phase 25 — Multi-Stage AI Pipeline
**Goal:** Replace the single monolithic AI call with a robust 5-stage async generator pipeline. Stages 2a+2b run in parallel. Per-stage retry (max 2×) with `ValidationError` carrying stage ID. Stage 2a/2b partial-success recovery — a failed parallel stage does not discard the sibling's output.

**Estimated effort:** 10–12 days

**Deliverables:**
- `GenerationEvent` discriminated union type (plan/content/annotations/misc/complete/error)
- `generateScene(topic, mode, modelConfig): AsyncGenerator<GenerationEvent>` orchestrator
- `retryStage<T>(stageN, fn, maxRetries=2): Promise<T>` — wraps each stage call with retry + backoff
- `ValidationError` class with `stage: number` field — surfaces as `{ type: 'error', stage, message }` GenerationEvent
- Stage 2a/2b recovery: if one fails after retries, emit partial scene with placeholder for the failed side; do not abort the other
- Stage prompt builders: `buildStage1Prompt`, `buildStage2aPrompt`, `buildStage2bPrompt`, `buildStage3Prompt`, `buildStage4Prompt`
- Per-stage validators: `validateStates()`, `validateSteps()`, `validateAnnotations()`
- `assembleScene()` — Stage 5 deterministic assembly (ISCL parsed → Scene JSON)
- `/api/generate/route.ts` rewritten as SSE stream

**Plan:** [→ phases/phase-25/PLAN.md](phases/phase-25/PLAN.md)

---

### Phase 26 — Progressive Streaming Generation UX
**Goal:** Expose the 5-stage pipeline as first-class UX. User sees a skeleton from Stage 1 (~1.5s), primitive nodes from Stage 2 (~5s), explanation panel from Stage 3 (~7s), and complete scene at ~8–10s. Stage-specific error messages from `ValidationError.stage` field.

**Estimated effort:** 4–5 days

**Deliverables:**
- `generation-store.ts`: `GenerationPhase` state machine (idle → plan → content → annotations → complete → error)
- `GenerationSkeleton.tsx`: shimmer placeholder cards × visualCount with stage progress dots
- `GenerationProgress.tsx`: stage-by-stage dot indicators (green completed, purple pulsing active)
- `GenerationError.tsx`: stage-specific error messages with retry button; error copy keyed by `stage` field
- `CanvasCard.tsx` updated to handle all generation phases
- Play button disabled (spinner) until `phase === 'complete'`

**Plan:** [→ phases/phase-26/PLAN.md](phases/phase-26/PLAN.md)

---

### Phase 27 — Visual Quality & Animation System
**Goal:** Professional visual quality across all primitives. Semantic color system replaces ad-hoc hex strings. Sub-step choreography (prepare → act → settle) replaces instant state changes. Scene-graph diff (from Phase 22) drives targeted animations — added/removed/moved/changed nodes each get distinct Framer Motion treatments.

**Estimated effort:** 5–6 days

**Prerequisite:** Phase 22 (scene graph diff) + Phase 25 (pipeline producing correct data)

**Deliverables:**
- `HIGHLIGHT_COLORS` with 12 semantic states (active, insert, remove, hit, miss, mru, lru, current, filled, pivot, error, default)
- `resolveHighlight(h)` helper for CSS variable → hex mapping
- Typography CSS classes (`.viz-label-primary`, `.viz-label-secondary`, `.viz-popup-text`, `.viz-stat-value`, `.viz-index-label`)
- `useAnimateStep(speed)` hook: prepare (100ms) → act (300ms) → settle (200ms) per step
- Diff-driven animations: added nodes scale in, removed scale out, changed nodes color-transition, added edges draw via `pathLength`
- `usePlaybackKeyboard()` hook: Space, ArrowLeft/Right, Home, 1/2/3/4 speed keys

**Plan:** [→ phases/phase-27/PLAN.md](phases/phase-27/PLAN.md)

---

### Phase 28 — ELK Integration & System Diagram Quality
**Goal:** Upgrade system-diagram and complex graph layouts from dagre to ELK (Eclipse Layout Kernel) for orthogonal (Manhattan) edge routing and Lucidchart-quality layouts. Progressive enhancement: dagre returned immediately (sync), ELK upgrades layout when worker resolves (async). 2MB WASM bundle lazy-loaded in Web Worker.

**Estimated effort:** 4–5 days

**Prerequisite:** Phase 20 (layout engine) + Phase 23 (Scene Runtime registers ELK upgrade subscription)

**Deliverables:**
- `elk-worker.ts` (Web Worker): ELK WASM instance, `self.onmessage` handler
- `elk-client.ts`: singleton worker + promise bridge
- `applyELKLayout(input, runELK): Promise<LayoutResult>` with full ELK graph construction
- `subscribeELKReady` pub/sub in layout index; Scene Runtime (Phase 23) subscribes
- `orthogonalEdgePath(waypoints)` for SVG path rendering in SystemDiagramViz
- HLD + LLD scene JSON files updated to `layoutHint: 'elk-layered'`

**Plan:** [→ phases/phase-28/PLAN.md](phases/phase-28/PLAN.md)

---

### Phase 29 — Zoom/Pan Viewport & Interactive Canvas
**Goal:** Add zoom and pan to the canvas zone, enabling navigation of large graphs, system diagrams, and recursion trees that exceed the visible area. CSS transform viewport approach — zero React re-renders during pan/zoom. Includes zoom-to-fit on scene load and mobile pinch-to-zoom.

**Estimated effort:** 4–5 days

**Prerequisite:** Phase 22 (scene graph provides bounding box for zoom-to-fit)

**Deliverables:**
- `viewport-store.ts`: `setTranslate()`, `setScale(newScale, originX, originY)` (zoom toward cursor), `zoomToFit(bbox, containerW, containerH)`, `reset()`
- `ViewportContainer.tsx`: CSS transform applied imperatively via `innerRef.current.style.transform`; `willChange: 'transform'` for GPU compositing layer
- Pointer events for drag pan; wheel event (`passive: false`) for zoom; touch events for pinch-to-zoom
- `ViewportControls.tsx`: zoom-in/zoom-out/fit HUD buttons + scale percentage display
- `useAutoFit()` hook: auto zoom-to-fit when content exceeds 90% of container dimensions
- Keyboard controls: `+/=` zoom in, `-` zoom out, `0` zoom-to-fit

**Plan:** [→ phases/phase-29/PLAN.md](phases/phase-29/PLAN.md)

---

## Key Constraints (Carry Into Every Phase)

1. **Dark-only** — never add a theme toggle, never add light mode classes
2. **No Stitch HTML** — `.planning/project_insyte_idea/designs/` are mood boards, ignore them
3. **DESIGN.md is canonical** — all color/type/spacing decisions from `DESIGN.md`
4. **Use `ui-ux-pro-max` skill** for any UI/UX decisions during implementation
5. **Scene JSON is universal** — AI, DSA sandbox, and pre-built content all output the same format
6. **Framer Motion for all animation** — no raw CSS keyframes on interactive elements
7. **Mobile first** — 320px minimum width, all components stack correctly
8. **API keys never hit our server** — BYOK keys read client-side from localStorage only
9. **Pyodide is lazy-loaded** — never block initial page load (~10MB)
10. **Zod validates all AI output** — always validate Scene JSON before rendering

---

## Content Index (24 Pre-Built Simulations)

| # | Slug | Title | Type | Phase |
|---|------|-------|------|-------|
| 1 | `hash-tables` | How does a Hash Table work? | concept | 5 |
| 2 | `js-event-loop` | How does the JS Event Loop work? | concept | 5 |
| 3 | `load-balancer` | How does Load Balancing work? | concept | 5 |
| 4 | `dns-resolution` | How does DNS Resolution work? | concept | 5 |
| 5 | `git-branching` | How does Git Branching work? | concept | 5 |
| 6 | `two-sum` | Two Sum | dsa | 12 |
| 7 | `valid-parentheses` | Valid Parentheses | dsa | 12 |
| 8 | `binary-search` | Binary Search | dsa | 12 |
| 9 | `reverse-linked-list` | Reverse Linked List | dsa | 12 |
| 10 | `climbing-stairs` | Climbing Stairs DP | dsa | 12 |
| 11 | `merge-sort` | Merge Sort | dsa | 12 |
| 12 | `level-order-bfs` | Binary Tree Level Order | dsa | 12 |
| 13 | `number-of-islands` | Number of Islands | dsa | 12 |
| 14 | `sliding-window-max` | Sliding Window Maximum | dsa | 12 |
| 15 | `fibonacci-recursive` | Fibonacci (memoization) | dsa | 12 |
| 16 | `lru-cache` | LRU Cache | lld | 10 |
| 17 | `rate-limiter` | Rate Limiter (Token Bucket) | lld | 10 |
| 18 | `min-stack` | MinStack | lld | 10 |
| 19 | `trie` | Trie | lld | 10 |
| 20 | `design-hashmap` | Design HashMap from Scratch | lld | 10 |
| 21 | `url-shortener` | URL Shortener | hld | 10 |
| 22 | `twitter-feed` | Twitter Feed (Fanout) | hld | 10 |
| 23 | `consistent-hashing` | Consistent Hashing | hld | 10 |
| 24 | `chat-system` | Chat System (WebSocket) | hld | 10 |

---

*Created: April 4, 2026. All decisions captured in `.planning/DECISIONS.md`. Design system in `.planning/DESIGN.md`.*
