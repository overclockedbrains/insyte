# insyte — All Decisions Made (Pre-Implementation Planning)

> This document captures every decision made during the brainstorming and planning phase. Use this as the single source of truth when generating the concrete implementation plan. Do NOT use the Stitch HTML designs in `.planning/project_insyte_idea/designs/` for anything other than extracting design tokens (which are already in `DESIGN.md`).
>
> **Important for implementation:** Use the `ui-ux-pro-max` skill when making UI/UX decisions during implementation. Always reference `DESIGN.md` for the design system, not the Stitch HTML files.

---

## 1. Project Overview

- **Name:** insyte
- **Domain:** insyte.dev
- **Tagline:** "See how it works."
- **Core idea:** AI-powered platform that turns any tech concept into a live, interactive simulation you can play with. Not a video. Not text. A playground.
- **Open source:** Yes. This is a portfolio/showcase project.
- **Team:** Solo developer (may occasionally delegate small tasks to a friend).
- **Development approach:** Vibecoding with AI agent assistance — agents write code, human directs.

---

## 2. The Core Product

### Two Modes (but unified UX — no explicit mode switching)

**Mode 1: Concept Explorer**
- User types: "How does a hash table work?" or "How does DNS resolve?"
- Gets: AI-generated (or cached) interactive simulation with animated primitives, controls, explanation panel, challenges

**Mode 2: DSA Visualizer**
- User pastes: LeetCode problem + solution code
- Gets: Step-by-step animated execution trace with code highlighting + data structure visualization

**Both modes produce a Scene JSON → same rendering engine → same simulation page.**

### Auto-Detection (Key UX Decision)
- Single unified textarea input. No explicit mode tabs.
- AI auto-detects intent from input:
  - Short phrase / question → **Concept simulation**
  - Contains code block → **DSA Trace**
  - "Design a [system]" / "URL shortener / Twitter" → **HLD**
  - "LRU Cache / Rate Limiter / implement X" → **LLD simulation**
- User sees detected mode label below input and can override it
- When code is detected: show brief confirmation step — *"We detected Python + a Two Sum problem — visualize it?"* before proceeding
- No dedicated `/dsa` page in R1

---

## 3. Technical Architecture

### Monorepo Structure
```
insyte/
├── apps/
│   └── web/                    # Next.js 15 app (all visual + server code)
├── packages/
│   ├── scene-engine/           # Pure TypeScript: types + Zod schema + parser
│   │   ├── src/
│   │   │   ├── types.ts        # All Scene JSON TypeScript interfaces
│   │   │   ├── schema.ts       # Zod validation schemas (AI output guard)
│   │   │   ├── parser.ts       # Normalize scene JSON → engine state
│   │   │   └── index.ts
│   │   └── package.json        # @insyte/scene-engine (no React dep)
│   └── tsconfig/               # Shared TypeScript configuration
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Monorepo tooling:** Turborepo + pnpm workspaces. No Nx, no Rust, no Bazel.

The `scene-engine` package is pure TypeScript (no React). The React rendering (SceneRenderer, all primitives, Framer Motion) lives in `apps/web/src/engine/`. This separation enables future publishing of the engine as a standalone npm package.

### Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15 (App Router) | SSR for SEO, API routes, file-based routing |
| Language | TypeScript | Strict mode throughout |
| Styling | Tailwind CSS v4 | Utility-first, dark theme, custom color tokens |
| UI Components | shadcn/ui | Polished base components, customized |
| Animation | Framer Motion | Spring physics, layout animations, all interactive motion |
| State | Zustand | Global stores, see store architecture below |
| Canvas/SVG | React + SVG + Framer Motion | Bezier connectors, data flow dots |
| AI SDK | Vercel AI SDK | Streaming, streamObject, multi-provider |
| Python Sandbox | Pyodide (CPython on WASM) | Lazy-loaded only when DSA mode activated |
| JS Sandbox | Web Worker | Isolated JS execution |
| Code Highlighting | Shiki | VS Code quality, synced with animation steps |
| Database | Supabase | Scene caching, topic index (NO auth in R1) |
| Deployment | Vercel | Zero-config Next.js, edge functions for API |
| Monorepo | Turborepo + pnpm | Build orchestration |
| OG Images | @vercel/og (Satori) | Generated once per simulation, stored in Supabase |
| Fonts | Manrope + Inter + JetBrains Mono | Google Fonts |

### State Management (Zustand Stores)

All stores follow Zustand best practices with slices pattern:

```
stores/
├── scene-store.ts       # Active scene JSON, current step, visual state per primitive
├── playback-store.ts    # Play/pause state, speed multiplier, step index
├── settings-store.ts    # API keys (localStorage-backed), model preference
├── chat-store.ts        # AI chat message history for current session
└── detection-store.ts   # Auto-detection result for unified input
```

Global state rules:
- Server state (cached scenes from Supabase) → TanStack Query or Next.js `cache()`
- Animation/simulation state → Zustand
- API keys → Zustand (settings-store) backed by localStorage
- No prop drilling — use Zustand selectors throughout

### Route Structure

```
/                        → Landing page
/explore                 → Gallery page (Netflix-style rows)
/s/[slug]                → Universal simulation page (concept, DSA, LLD, HLD)
/settings                → BYOK, model selector, preferences
/api/generate            → POST: prompt → Scene JSON (streaming, AI)
/api/instrument          → POST: code → instrumented code (AI)
/api/visualize-trace     → POST: trace data → Scene JSON (AI)
/api/chat                → POST: question + scene context → streaming response
```

**URL conventions:**
- Pre-built: `/s/hash-tables`, `/s/dns-resolution`, `/s/two-sum`
- AI-generated: `/s/consistent-hashing-[shortid]`
- All simulations share one unified page component at `/s/[slug]`

### Database Schema (Supabase R1 — No Auth)

```sql
-- Cached simulations (pre-built and AI-generated)
CREATE TABLE scenes (
  id           TEXT PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL,  -- 'concept' | 'dsa' | 'lld' | 'hld'
  scene_json   JSONB NOT NULL,
  og_image_url TEXT,
  hit_count    INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Searchable topic catalog
CREATE TABLE topic_index (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL,  -- 'Networking' | 'DSA' | 'System Design' | etc.
  tags         TEXT[],
  type         TEXT NOT NULL,
  is_featured  BOOLEAN DEFAULT FALSE,
  is_prebuilt  BOOLEAN DEFAULT FALSE,
  og_image_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Architecture note:** Code is written with Supabase auth-ready structure. `users`, `saved_simulations`, and `comments` tables are not created in R1. When R2 adds auth, the Supabase client is already wired — just add the tables and connect the auth context.

---

## 4. Scene JSON — The Universal Format

Everything in insyte flows through Scene JSON. The AI generates it, the sandbox produces it, cached content stores it, and the rendering engine consumes it. This is the most critical architectural decision.

### Core Types (lives in `packages/scene-engine/src/types.ts`)

```typescript
interface Scene {
  id: string;
  title: string;
  type: 'concept' | 'dsa-trace' | 'lld' | 'hld';
  layout: 'canvas-only' | 'code-left-canvas-right' | 'text-left-canvas-right';
  
  code?: {                          // DSA mode only
    language: 'python' | 'javascript';
    source: string;
    highlightByStep: number[];      // Line number at each step
  };
  
  visuals: Visual[];                // Primitives on canvas
  steps: Step[];                    // Animation steps
  controls: Control[];              // Sliders, toggles, buttons
  explanation: ExplanationSection[]; // Left panel text
  popups: Popup[];                  // Canvas annotations
  challenges?: Challenge[];         // Bottom section
}
```

### Layout Types
- `text-left-canvas-right` → Concept simulations (DNS, Hash Table, etc.)
- `code-left-canvas-right` → DSA traces (Two Sum, Valid Parentheses, etc.)
- `canvas-only` → HLD system diagrams (full-width interactive architecture)

### Visual Primitive Types
`array` | `hashmap` | `linked-list` | `tree` | `graph` | `stack` | `queue` | `dp-table` | `recursion-tree` | `system-diagram` | `text-badge` | `counter`

---

## 5. UX & Page Design Decisions

### Design Principles
- **Do NOT follow Stitch HTML prototypes** — they are mood boards only
- **Reference `DESIGN.md`** for all design system decisions
- **Use `ui-ux-pro-max` skill** when making UI/UX decisions during implementation
- Dark-only theme. No light mode toggle ever.
- Canvas is the hero. Everything else supports it.
- Premium dev-tool aesthetic, not educational game aesthetic.

### Landing Page (`/`)

Layout: **Two-column** on desktop (left: headline + input, right: live auto-playing simulation)

```
┌─────────────────────────────────────────────────────────────────┐
│  [NAV: insyte logo | Explore | Gallery | ★ GitHub | Settings⚙] │
├─────────────────────────────────────────────────────────────────┤
│  [ambient glow blobs in background]                             │
│                                                                 │
│  LEFT COLUMN                    │  RIGHT COLUMN                │
│  ────────────────────           │  ────────────────────        │
│  Understand any tech            │  Live auto-playing Hash      │
│  concept.                       │  Table simulation            │
│  By playing with it.            │  (same canvas component      │
│                                 │   as /s/hash-tables,         │
│  [unified input textarea]       │   auto-plays, controls       │
│  ── auto-detection label ──     │   disabled, CTA below:       │
│                                 │   "Try it yourself →")       │
│  Popular: [chips row]           │                              │
├─────────────────────────────────────────────────────────────────┤
│  HOW IT WORKS (3 steps + bezier path connecting them)           │
│  Type → Watch it Come Alive → Master It                         │
├─────────────────────────────────────────────────────────────────┤
│  FEATURED SIMULATIONS (4-card grid preview)                     │
├─────────────────────────────────────────────────────────────────┤
│  FEATURE HIGHLIGHTS (3 cards: Interactive | AI-Powered | Share) │
├─────────────────────────────────────────────────────────────────┤
│  FOOTER                                                         │
└─────────────────────────────────────────────────────────────────┘
```

- The hero mini-simulation shows Hash Table auto-playing (the most visually impressive)
- Unified input is a textarea that expands on focus
- Popular topic chips are hardcoded initially (popular pre-built topics)
- Mobile: single column, mini-sim moves below the input

### Unified Input Behavior (on landing + explore page)

1. User types or pastes into the textarea
2. Real-time detection updates the mode indicator label below input
3. If code detected → label: "DSA Trace Mode" with confirmation prompt on submit
4. Submit → brief confirmation if DSA detected → navigate to `/s/[new-slug]`
5. On navigation, streaming generation begins immediately

### Simulation Page (`/s/[slug]`)

**Desktop layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│  [sticky nav: ← insyte | "Simulation Title" | Category | Share ⛶]│
├───────────────────────────┬──────────────────────────────────────┤
│  LEFT PANEL (35%)          │  SIMULATION CANVAS (65%)            │
│  ─────────────────         │  ──────────────────────             │
│  Scrollable explanation    │  Self-contained dark card           │
│  text, synced with steps.  │  (like reference image)             │
│                            │                                     │
│  Paragraphs auto-scroll    │  ┌──────────────────────────────┐  │
│  and highlight as steps    │  │ TOP: input (if applicable)   │  │
│  advance.                  │  │      + playback controls     │  │
│                            │  │      (play/pause/step/reset) │  │
│  "▸ Try: Insert 'bob'      │  │                              │  │
│   and watch the            │  │ MIDDLE: visualization        │  │
│   collision..."            │  │  (primitives, connectors,    │  │
│                            │  │   bezier arrows, data dots,  │  │
│  For DSA: left panel       │  │   step popups)               │  │
│  becomes CODE VIEW         │  │                              │  │
│  with Shiki line           │  │ BOTTOM: controls (sliders,   │  │
│  highlighting synced       │  │  toggles, stats cards)       │  │
│  to current step           │  └──────────────────────────────┘  │
│                            │                                     │
│  [⛶ expand icon]          │  Full-canvas expand button          │
│  → hides left panel        │  → left panel collapses, canvas     │
│  → canvas goes full-width  │    takes full page width            │
│                            │                                     │
├───────────────────────────┴──────────────────────────────────────┤
│  CHALLENGES (horizontal cards row, collapsible)                  │
│  [Challenge 1 →]   [Challenge 2 →]   [Challenge 3 →]            │
└──────────────────────────────────────────────────────────────────┘

                                      [💬]  ← AI Chat floating button
```

**Canvas internals (matching reference image pattern):**
- Playback controls at TOP of canvas (play ▶, pause ⏸, step ⏭, reset ↺)
- For concept simulations: input field also at top if applicable
- Data structure visualization in center/main area
- Interactive controls (sliders, toggles) at BOTTOM of canvas
- Stats cards (Load Factor, Collisions, etc.) at bottom of canvas
- Step popups float attached to relevant elements in the canvas

**Full-canvas mode (⛶):**
- Left explanation panel slides out / hides
- Canvas + simulation takes full width
- Expand icon changes to a collapse icon (⊠)
- Playback controls still visible at canvas top

**Mobile layout:**
```
[sticky top nav: ← | title | share]
[CANVAS: full width, ~55vh]
[Compact playback bar: ◀ ▶/⏸ ▶ • speed]
[Scrollable explanation / code view]
[Challenges (collapsible)]
[💬 AI Chat → bottom sheet, 60% screen height]
```

**For DSA layout (`code-left-canvas-right`):**
- Left panel = Shiki code view with glowing active line
- Right panel = visualization canvas
- Mobile: code view collapses into a tab (tabs: "Code" | "Visual")

**For HLD layout (`canvas-only`):**
- Full width canvas, no left panel
- Floating explanation cards attach to components
- Controls (toggles: Fanout-on-Write vs Read, Kill Server button) inside canvas

### AI Chat UI

**Floating action button → bottom-right expandable card:**

- Default: small glowing `[💬]` button, bottom-right, subtle pulse animation
- Click → card expands (320px wide × 420px tall), glass morphism, primary glow border
- Card has: minimize `[─]` and close `[×]` buttons
- Shows conversation history (scrollable), streaming AI response with typing cursor
- Input at bottom of card
- When AI patches scene → canvas glows briefly and updates live
- Minimize → card shrinks back to `[💬]` button, history preserved in session
- **Mobile:** tap `[💬]` → bottom sheet slides up (60% screen height)

### Gallery Page (`/explore`)

**Netflix-style horizontal category rows:**

```
[Search: "Filter simulations..."]
[Autocomplete dropdown from topic_index table]

─── Featured ─────────────────────────────── [See all →]
[Hash Tables ▶] [JS Event Loop ▶] [DNS ▶] [Load Balancer ▶] →

─── Data Structures & Algorithms ────────── [See all →]
[Two Sum ▶] [Valid Parentheses ▶] [Merge Sort ▶] [BFS ▶] →

─── System Design ────────────────────────── [See all →]
[URL Shortener ▶] [Twitter Feed ▶] [Chat System ▶] →

─── Low Level Design ────────────────────── [See all →]
[LRU Cache ▶] [Rate Limiter ▶] [Trie ▶] →

─── Networking ──────────────────────────── [See all →]
[DNS Resolution ▶] [TCP Handshake ▶] [HTTP/2 ▶] →
```

**Topic card:**
- Thumbnail: static OG image (generated once, stored in Supabase Storage)
- Title + category badge
- Hover: card scales slightly, thumbnail animates, glow intensifies
- Click: navigate to `/s/[slug]`

### Navigation

**Desktop top nav (all pages):**
```
[insyte logo ←]          [Explore] [Gallery] [★ GitHub]          [⚙ Settings]
```

**Mobile nav:**
- Hamburger menu → side drawer
- Drawer contains: Explore, Gallery, GitHub, Settings

---

## 6. Streaming / Loading Architecture

### When user types a new concept (cache miss):

1. **Immediate:** Navigate to `/s/[generated-slug]`
2. **Show skeleton:**
   - Title: "Generating simulation..." (shimmer animation)
   - Canvas: pulsing placeholder shapes (3-4 ghost node outlines)
   - Controls: greyed out placeholder sliders
   - Left panel: skeleton text lines (shimmer)
3. **Streaming begins** (`streamObject` from Vercel AI SDK + Zod schema):
   - `title` arrives → renders immediately, replaces shimmer
   - `visuals[]` streams → each node **fades in at its final position** (no sliding) with spring animation
   - `steps[]` arrives → playback bar appears with total step count
   - `controls[]` arrive → sliders/toggles render in canvas bottom area
   - `explanation[]` arrives → left panel fills in
   - `challenges[]` arrive → challenges section appears
4. **Complete:** Play button activates, user can interact
5. **On validation failure:** Show "Regenerating..." with automatic one retry, then error state with manual retry button
6. **Cache:** Generated scene saved to Supabase `scenes` table for future users ($0 for repeat visits)

### When user opens a cached simulation:
- Scene JSON loaded from static file (pre-built) or Supabase query
- `hit_count` incremented
- SceneRenderer renders immediately, no streaming needed (~200ms load)

---

## 7. DSA Visualization Pipeline

### Pyodide (Python) + Web Worker (JavaScript)
- **Pyodide is lazy-loaded** — only initialized when DSA mode is first activated
- Show progress indicator: "Initializing Python runtime... (~10MB)"
- Pyodide files self-hosted in `public/pyodide/` for speed (not CDN)
- Web Worker for JavaScript sandbox

### Pipeline:
```
User input detected as DSA → confirmation step →

Stage 1 (AI): code → instrumented code
  POST /api/instrument
  Body: { code, language, problemStatement }
  Response: instrumented code with _trace.append() calls

Stage 2 (Browser): execute instrumented code
  Pyodide/Web Worker runs code → captures real trace data
  Output: TraceStep[] with actual variable values at every step

Stage 3 (AI): trace + original code → Scene JSON
  POST /api/visualize-trace
  Body: { trace, originalCode, language, problemStatement }
  Response: Scene JSON with code-left-canvas-right layout

Stage 4 (Engine): Scene JSON → interactive visualization
  Same SceneRenderer as all other simulations
```

### Re-run with new input:
- User changes input values in the canvas controls
- Stage 2 re-runs in browser (Pyodide/Worker, $0 cost)
- Stage 3 re-calls AI for new popup annotations (small context, ~$0.001)
- Canvas re-animates with new values

---

## 8. AI Strategy

### Default (free tier)
- **Gemini Flash** via user's own credits (with IP-based rate limiting: ~10-15 AI interactions/user/day)
- Rate limit implemented via Supabase (simple counter per IP, no auth needed)

### BYOK (Settings page)
- User pastes their own API key in `/settings`
- Select provider: OpenAI | Anthropic | Gemini | Groq
- Select model: e.g., GPT-4o, Claude 3.5 Sonnet, Gemini Pro, Llama-3.1
- Keys stored in localStorage (never sent to our server)
- Unlimited interactions with own key

### Provider Registry Pattern
```typescript
// apps/web/src/ai/providers/index.ts
// Picks provider based on settings-store
// Falls back to Gemini Flash if no BYOK configured
```

### AI Endpoints & Their Functions
- `/api/generate` → concept/prompt → Scene JSON (streaming with streamObject)
- `/api/instrument` → user code → instrumented code with trace calls
- `/api/visualize-trace` → trace data → Scene JSON for DSA visualization
- `/api/chat` → question + scene context → streaming text + optional scene patch

### Live Chat Scene Patching (R1 scope)
When AI responds to a chat message, it can return:
- **Text only:** rendered in chat card
- **Scene patch:** add/update/remove specific steps or popups (NOT full scene replacement)
- Patch applied via `applyDiff(currentScene, diff)` → SceneRenderer re-renders
- Canvas glows briefly when patch applied (Framer Motion layout animation)

---

## 9. Content Library (24 Pre-Built Simulations)

### Concept Explorer (5 — in Scene JSON files)
| Slug | Title | Key Primitives |
|------|-------|----------------|
| `hash-tables` | How does a Hash Table work? | HashMapViz, TextBadge, Counter |
| `js-event-loop` | How does the JS Event Loop work? | QueueViz, StackViz, TextBadge |
| `load-balancer` | How does Load Balancing work? | SystemDiagramViz, DataFlowDot, Counter |
| `dns-resolution` | How does DNS Resolution work? | SystemDiagramViz, BezierConnector, TextBadge |
| `git-branching` | How does Git Branching work? | GraphViz, TextBadge |

### DSA Visualizer (10 — hand-crafted Scene JSONs + sandbox traces)
| Slug | Problem | Key Primitives |
|------|---------|----------------|
| `two-sum` | Two Sum | ArrayViz + HashMapViz |
| `valid-parentheses` | Valid Parentheses | ArrayViz + StackViz |
| `binary-search` | Binary Search | ArrayViz (two pointers) |
| `reverse-linked-list` | Reverse Linked List | LinkedListViz |
| `climbing-stairs` | Climbing Stairs DP | DPTableViz (1D) |
| `merge-sort` | Merge Sort | ArrayViz (recursive splits) |
| `level-order-bfs` | Binary Tree Level Order | TreeViz + QueueViz |
| `number-of-islands` | Number of Islands | GraphViz (grid/matrix) |
| `sliding-window-max` | Sliding Window Maximum | ArrayViz (window highlight) |
| `fibonacci-recursive` | Fibonacci (memoization) | RecursionTreeViz |

### LLD Simulations (5 — Scene JSONs, concept simulation style)
| Slug | Title |
|------|-------|
| `lru-cache` | LRU Cache (code trace) |
| `rate-limiter` | Rate Limiter (Token Bucket) |
| `min-stack` | MinStack |
| `trie` | Trie |
| `design-hashmap` | Design HashMap from Scratch |

### HLD Interactive Architectures (4 — canvas-only layout)
| Slug | Title |
|------|-------|
| `url-shortener` | URL Shortener |
| `twitter-feed` | Twitter Feed (Fanout) |
| `consistent-hashing` | Consistent Hashing |
| `chat-system` | Chat System (WebSocket) |

**Total: 24 pre-built simulations.**

---

## 10. Visual Primitive Components

All primitives live in `apps/web/src/engine/primitives/`. Registered in a `PrimitiveRegistry` object mapping `visual.type → React.ComponentType`.

| Component | File | What It Renders |
|-----------|------|-----------------|
| ArrayViz | ArrayViz.tsx | Row of cells, pointer arrows, window highlight |
| HashMapViz | HashMapViz.tsx | Key-value table, insert/lookup with hit/miss animations |
| LinkedListViz | LinkedListViz.tsx | Nodes with animated arrow rewiring |
| TreeViz | TreeViz.tsx | Binary/N-ary tree, traversal highlighting |
| GraphViz | GraphViz.tsx | Force-directed graph, BFS/DFS wave coloring |
| StackViz | StackViz.tsx | Vertical LIFO push/pop |
| QueueViz | QueueViz.tsx | Horizontal FIFO enqueue/dequeue |
| DPTableViz | DPTableViz.tsx | 2D grid filling cell by cell |
| RecursionTreeViz | RecursionTreeViz.tsx | Expanding call tree, memoization pruning |
| SystemDiagramViz | SystemDiagramViz.tsx | Architecture boxes + flow arrows (HLD/LLD) |
| TextBadgeViz | TextBadgeViz.tsx | Floating text labels |
| CounterViz | CounterViz.tsx | Animated number counter |
| BezierConnector | BezierConnector.tsx | Glowing bezier path between nodes |
| StraightArrow | StraightArrow.tsx | Straight arrow with animated tip |
| DataFlowDot | DataFlowDot.tsx | Animated particle traveling along a path |

---

## 11. Feature Scope

### R1 (Launch)
- ✅ 5 concept simulations (hand-crafted Scene JSONs)
- ✅ 10 DSA pre-built traces
- ✅ 5 LLD simulations
- ✅ 4 HLD interactive architectures
- ✅ AI scene generation with streaming skeleton
- ✅ Live AI chat with scene patching (add/update steps/popups)
- ✅ BYOK (OpenAI, Anthropic, Gemini, Groq) + Gemini Flash free default
- ✅ DSA pipeline: Pyodide + Web Worker + instrumentation
- ✅ Re-run DSA with custom input
- ✅ Challenges section (pre-written per simulation)
- ✅ Live complexity indicator (DSA trace mode)
- ✅ Shareable URLs (slug-based)
- ✅ OG image generation (Satori)
- ✅ Supabase scene caching + topic index
- ✅ Gallery (Netflix rows)
- ✅ Settings page (BYOK + model selector)
- ✅ Fully responsive: mobile, tablet, desktop
- ✅ Auto-detection input (concept vs DSA vs HLD vs LLD)
- ✅ Full-canvas expand mode (⛶)
- ✅ IP-based rate limiting (no auth required)

### R2 (Post-launch)
- ❌ Side-by-side comparison mode
- ❌ Depth slider (ELI5 ↔ Expert)
- ❌ Embed support (iframe)
- ❌ Fractal learning (click component → sub-simulation)
- ❌ GIF/video export
- ❌ Dedicated `/dsa` page with full control
- ❌ User accounts + saved simulations (Supabase auth)
- ❌ Code editor (instead of paste box)

### R3 (Growth)
- ❌ Knowledge map / gamification
- ❌ Community gallery (user-submitted simulations)
- ❌ Learning paths
- ❌ Leaderboards / challenges leaderboard

---

## 12. Implementation Phases (Ordered for Execution)

### Phase 0: Monorepo Setup
- Turborepo + pnpm init
- `packages/scene-engine` with types.ts, schema.ts (Zod), parser.ts
- `apps/web` Next.js 15 scaffolding
- Shared tsconfig, ESLint, Prettier
- Tailwind v4 config with all DESIGN.md color tokens
- shadcn/ui init

### Phase 1: Design System + Global Layout
- Color tokens configured in Tailwind
- Font imports (Manrope, Inter, JetBrains Mono)
- Global CSS (glass-panel, glow-border, ambient blobs, dot grid, bezier styles)
- Navbar component (sticky, blurred, all nav items)
- DotGridBackground component
- GlowEffect utility component
- Root layout.tsx with dark theme

### Phase 2: Scene Engine Core
- Scene JSON TypeScript types finalized (in packages/scene-engine)
- Zod validation schema for AI output guarding
- All 5 Zustand stores scaffolded (scene, playback, settings, chat, detection)
- SceneRenderer skeleton (reads layout type, renders panels)
- useScene, usePlayback, useControls, useAnnotations hooks
- PlaybackControls component (play/pause/step/reset + speed)

### Phase 3: Visual Primitives
- PrimitiveRegistry setup
- All 12 primitive components (listed in section 10)
- BezierConnector, StraightArrow, DataFlowDot
- StepPopup system (attaches to visual elements at current step)
- ExplanationPanel (left panel, syncs with steps)
- CodePanel (Shiki, active line glow)

### Phase 4: Simulation Page Layouts
- `/s/[slug]` route
- TextLeftCanvasRight layout component
- CodeLeftCanvasRight layout component
- CanvasOnly layout component
- Full-canvas expand/collapse (⛶ button)
- Challenges section (horizontal cards)
- Simulation page sticky nav (back + title + share + expand)

### Phase 5: 5 Concept Simulations (Hand-Crafted Scene JSONs)
- `hash-table.json` (with full interactive controls, stats, challenges)
- `js-event-loop.json`
- `load-balancer.json`
- `dns-resolution.json`
- `git-branching.json`
- Each loaded from `apps/web/src/content/scenes/concepts/`

### Phase 6: Gallery + Landing Page
- `/explore` gallery page (Netflix-style rows from topic_index)
- TopicCard component with OG image thumbnail
- Horizontal scroll rows per category
- Search bar with autocomplete
- Landing page (two-column hero + live hash table demo + how it works + features)
- Auto-detection textarea component

### Phase 7: AI Scene Generation (Streaming)
- Vercel AI SDK + streamObject setup
- Provider registry (Gemini, OpenAI, Anthropic, Groq)
- `generateScene.ts` with full prompt
- `/api/generate` route (streaming)
- Streaming skeleton → node fade-in → panel fill-in flow
- Scene validation + retry logic
- Supabase caching of generated scenes
- Auto-detection logic (client-side pattern matching)
- Confirmation step for DSA detection

### Phase 8: AI Chat + Scene Patching
- Floating `[💬]` button component
- Chat card component (320×420px, glass morphism, streaming)
- `/api/chat` streaming endpoint
- `applyDiff.ts` (add/update/remove steps/popups)
- Canvas glow on patch applied
- Mobile bottom sheet variant

### Phase 9: DSA Pipeline
- Pyodide lazy load with progress indicator
- JS Web Worker setup
- `SandboxManager.ts` high-level API
- `instrumentCode.ts` + `/api/instrument` endpoint
- `traceToScene.ts` + `/api/visualize-trace` endpoint
- Re-run with custom input flow
- 10 pre-built DSA Scene JSONs (hand-crafted or pre-generated)

### Phase 10: LLD + HLD Simulations
- 5 LLD simulation Scene JSONs
- 4 HLD Scene JSONs (canvas-only layout)
- SystemDiagramViz completion (component boxes, flow animations)
- "Kill Server" / "Traffic Spike" button actions

### Phase 11: Supabase Integration
- Supabase client setup
- `scenes` table CRUD
- `topic_index` seeding
- Scene cache hit/miss logic (check Supabase before calling AI)
- IP-based rate limiting for free tier
- OG image generation (Satori) + storage in Supabase Storage
- `hit_count` increment on scene load

### Phase 12: Settings + BYOK
- `/settings` page
- API key input per provider (OpenAI, Anthropic, Gemini, Groq)
- Keys stored in localStorage via settings-store
- Model selector per provider
- Provider switching in AI client

### Phase 13: Polish + Responsive + Deploy
- Full mobile responsive pass (all pages)
- Tablet layout adjustments
- Loading states throughout (suspense boundaries, skeletons)
- Error boundaries
- Pyodide loading progress UX
- Share button + URL copy
- OG meta tags on simulation pages
- Vercel deployment configuration
- Environment variables setup
- README + open source prep

---

## 13. Key Technical Constraints & Notes

1. **Pyodide is ~10MB** — must be lazy-loaded with a visible progress indicator. Never block initial page load with it.

2. **Scene JSON is AI-generated** — always validate with Zod schema before passing to the renderer. Failed validation triggers one automatic retry, then shows error UI.

3. **No light mode** — dark-only. Never add a theme toggle.

4. **API keys never hit our server** — BYOK keys are read client-side from localStorage and passed directly to the AI SDK on the client. If generating server-side (for caching), use our server keys (Gemini Flash free tier).

5. **Mobile first** — All components must work at 320px minimum width. Canvas stacks vertically (top) on mobile.

6. **Auth-ready architecture** — Supabase client is configured but no RLS policies or auth flows in R1. When R2 adds auth, it's just adding tables and connecting the existing client.

7. **Canvas is not HTML Canvas** — It's a React + SVG + Framer Motion composition. Full DOM, full accessibility, full React devtools support.

8. **Framer Motion for all animation** — No raw CSS keyframe animations on interactive elements. Framer Motion gives spring physics, layout animations, and gesture support.

9. **Open Graph images** — Generated with `@vercel/og` (Satori). Triggered once when a simulation is first created/cached. Stored in Supabase Storage. Used as `og:image` meta tag.

10. **The scene engine package has zero React dependency** — `@insyte/scene-engine` exports only TypeScript types and Zod schemas. This keeps it publishable as a standalone npm package later.

---

*All decisions captured April 4, 2026. This document is the input for concrete implementation planning.*
*Reference `DESIGN.md` for design system. Reference original docs in `.planning/project_insyte_idea/` for deeper context on features.*
*Do NOT follow Stitch HTML designs in `.planning/project_insyte_idea/designs/` for implementation.*
