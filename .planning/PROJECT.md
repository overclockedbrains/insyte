# insyte — Project Roadmap

> **"See how it works."**
> AI-powered platform that turns any tech concept into a live, interactive simulation.
> Turborepo + pnpm monorepo · Next.js 15 · Dark-only · 24 pre-built simulations

---

## Project at a Glance

| Dimension | Value |
|-----------|-------|
| Domain | insyte.dev |
| Stack | Next.js 15, TypeScript, Tailwind v4, Framer Motion, Zustand, Vercel AI SDK |
| Monorepo | Turborepo + pnpm workspaces |
| Database | Supabase (no auth in R1) |
| AI Default | Gemini Flash (free tier) |
| BYOK | OpenAI · Anthropic · Gemini · Groq |
| Theme | Dark-only, always |
| Pre-built sims | 24 total (5 concept + 10 DSA + 5 LLD + 4 HLD) |

---

## R1 Goal

Ship a fully functional, publicly accessible platform where:
1. Any user can type a tech concept and get an interactive simulation
2. Any user can paste DSA code and get a step-by-step execution trace
3. 24 hand-crafted simulations are available instantly (no AI cost)
4. Live AI chat lets users interrogate any simulation
5. BYOK unlocks unlimited AI with own keys
6. Everything works on mobile, tablet, and desktop

---

## Phases

### Phase 0 — Monorepo Setup
**Goal:** Turborepo + pnpm monorepo fully wired, zero-config dev environment running.

**Deliverables:**
- Root Turborepo config (`turbo.json`, `pnpm-workspace.yaml`)
- `packages/scene-engine` — pure TS package: types, Zod schema, parser
- `packages/tsconfig` — shared TypeScript base configs
- `apps/web` — Next.js 15 app scaffolded
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

### Phase 6 — Gallery + Landing Page
**Goal:** `/explore` gallery and `/` landing page fully built with live hash table demo.

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

### Phase 9 — DSA Pipeline
**Goal:** Full DSA trace pipeline working end-to-end: paste code → sandbox execute → Scene JSON.

**Deliverables:**
- `apps/web/src/sandbox/PyodideRunner.ts` — lazy-load Pyodide, execute with trace capture
- `apps/web/src/sandbox/JSRunner.ts` — Web Worker JS sandbox
- `apps/web/src/sandbox/workers/js-sandbox.worker.ts`
- `apps/web/src/sandbox/SandboxManager.ts` — `execute(code, lang) → TraceStep[]`
- `apps/web/src/sandbox/types.ts` — TraceStep, TraceData interfaces
- Pyodide progress indicator ("Initializing Python runtime... ~10MB")
- `apps/web/src/ai/prompts/code-instrumentation.md`
- `apps/web/src/ai/instrumentCode.ts`
- `/api/instrument` route
- `apps/web/src/ai/prompts/trace-to-scene.md`
- `apps/web/src/ai/traceToScene.ts`
- `/api/visualize-trace` route
- "Re-run with custom input" flow (sandbox re-execute + AI re-annotate)
- 10 pre-built DSA Scene JSONs in `src/content/scenes/dsa/`

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

### Phase 11 — Supabase Integration
**Goal:** Scene caching, topic index, OG images, rate limiting all live on Supabase.

**Deliverables:**
- `apps/web/src/lib/supabase.ts` — Supabase client
- Supabase project: `scenes` table + `topic_index` table seeded with 24 pre-built entries
- `apps/web/src/lib/cache.ts` — `getCachedScene(slug)`, `saveScene(scene)`, `incrementHit(slug)`
- `apps/web/src/lib/rateLimit.ts` — IP-based counter (10-15 interactions/user/day)
- OG image generation: `apps/web/src/app/api/og/route.tsx` using `@vercel/og` (Satori)
- OG images generated for all 24 pre-built simulations, stored in Supabase Storage
- Scene load flow: check Supabase → static file → AI generate (priority order)
- `hit_count` incremented on every simulation page load

**Plan:** [→ phases/phase-11/PLAN.md](phases/phase-11/PLAN.md)

---

### Phase 12 — Settings + BYOK
**Goal:** `/settings` page fully functional — users can add API keys and select models.

**Deliverables:**
- `/settings` page with glass-panel sections
- API key input per provider (OpenAI, Anthropic, Gemini, Groq) — password inputs, never logged
- Model selector per provider (e.g. GPT-4o, Claude 3.5 Sonnet, Gemini Pro, Llama-3.1-70b)
- Keys stored in `settings-store.ts` backed by localStorage
- Provider switching wired into AI client (`apps/web/src/ai/client.ts`)
- "Clear all keys" button
- Status indicator: which provider is currently active

**Plan:** [→ phases/phase-12/PLAN.md](phases/phase-12/PLAN.md)

---

### Phase 13 — Polish + Responsive + Deploy
**Goal:** Production-ready: mobile-first, all loading/error states, Vercel deployed, OG tags live.

**Deliverables:**
- Full mobile responsive pass (320px minimum): all pages, simulation layouts, chat card
- Tablet (768–1024px) layout adjustments
- `<Suspense>` boundaries + skeleton components for all async data paths
- Error boundaries on SceneRenderer + API routes
- Pyodide loading progress UX (progress bar, percentage)
- Share button (copy URL to clipboard, toast confirmation)
- `og:image`, `og:title`, `og:description` meta tags on all `/s/[slug]` pages
- `next.config.ts` — WASM headers for Pyodide, image domains for OG
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`
- Vercel deployment (production + preview branches)
- README with setup instructions, architecture overview, contribution guide
- `scripts/validate-scenes.ts` — validates all 24 scene JSON files against Zod schema

**Plan:** [→ phases/phase-13/PLAN.md](phases/phase-13/PLAN.md)

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
| 6 | `two-sum` | Two Sum | dsa | 9 |
| 7 | `valid-parentheses` | Valid Parentheses | dsa | 9 |
| 8 | `binary-search` | Binary Search | dsa | 9 |
| 9 | `reverse-linked-list` | Reverse Linked List | dsa | 9 |
| 10 | `climbing-stairs` | Climbing Stairs DP | dsa | 9 |
| 11 | `merge-sort` | Merge Sort | dsa | 9 |
| 12 | `level-order-bfs` | Binary Tree Level Order | dsa | 9 |
| 13 | `number-of-islands` | Number of Islands | dsa | 9 |
| 14 | `sliding-window-max` | Sliding Window Maximum | dsa | 9 |
| 15 | `fibonacci-recursive` | Fibonacci (memoization) | dsa | 9 |
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
