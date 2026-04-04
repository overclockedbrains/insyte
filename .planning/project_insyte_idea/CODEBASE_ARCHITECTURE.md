# 🏗️ insyte — Codebase Architecture

> The actual folder structure, tech stack, data flow, and how every piece connects.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15 (App Router) | SSR for SEO, API routes, file-based routing |
| **Language** | TypeScript | Type safety for Scene JSON schema |
| **Styling** | Tailwind CSS v4 | Rapid dark theme, responsive, utility-first |
| **UI Components** | shadcn/ui | Polished buttons, dialogs, inputs — customizable |
| **Animation** | Framer Motion | Spring physics, layout animations, gesture support |
| **Canvas/SVG** | React + SVG + Framer Motion | Bezier connectors, animated data flow dots |
| **Sandbox (Python)** | Pyodide (CPython on WASM) | Real Python execution in the browser, zero server |
| **Sandbox (JS)** | Web Worker | Isolated JS execution, zero server |
| **AI SDK** | Vercel AI SDK | Streaming responses, multi-provider support |
| **State** | Zustand | Lightweight, minimal boilerplate, perfect for scene state |
| **Database** | Supabase | Auth, saved simulations, user prefs (optional for M1) |
| **Deployment** | Vercel | Zero-config Next.js deployment, edge functions |
| **Fonts** | Google Fonts (Inter + JetBrains Mono) | Inter for UI, JetBrains Mono for code |

---

## How Everything Connects — The Big Picture

```
┌────────────────────────────── insyte ──────────────────────────────┐
│                                                                    │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐   │
│  │  PAGES      │    │  AI LAYER    │    │  SANDBOX           │   │
│  │             │    │              │    │                    │   │
│  │  Landing    │    │  Gemini /    │    │  Pyodide (Python)  │   │
│  │  Explore    │───→│  OpenAI /    │    │  Web Worker (JS)   │   │
│  │  DSA Paste  │    │  Anthropic   │    │                    │   │
│  │  Settings   │    │  (BYOK)      │    │  Runs user code    │   │
│  └──────┬──────┘    └──────┬───────┘    │  Returns trace     │   │
│         │                  │            └─────────┬──────────┘   │
│         │                  │                      │               │
│         │           ┌──────▼──────────────────────▼──┐           │
│         │           │                                 │           │
│         │           │         SCENE JSON              │           │
│         │           │    (the universal format)       │           │
│         │           │                                 │           │
│         │           └──────────────┬──────────────────┘           │
│         │                         │                               │
│         │                  ┌──────▼──────┐                       │
│         └─────────────────→│             │                       │
│                            │   ENGINE    │                       │
│                            │             │                       │
│                            │  Renderer   │                       │
│                            │  Primitives │                       │
│                            │  Controls   │                       │
│                            │  Popups     │                       │
│                            │  Connectors │                       │
│                            │             │                       │
│                            └──────┬──────┘                       │
│                                   │                               │
│                            ┌──────▼──────┐                       │
│                            │   CANVAS    │                       │
│                            │  (what the  │                       │
│                            │  user sees) │                       │
│                            └─────────────┘                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Everything flows through Scene JSON.** It's the single format that connects AI, sandbox, cached content, and the rendering engine. This is the most important architectural decision.

---

## Folder Structure

```
insyte/
│
├── public/
│   ├── favicon.ico
│   ├── og-image.png                      # Social share preview
│   └── pyodide/                          # Pyodide WASM files (self-hosted for speed)
│
├── src/
│   │
│   ├── app/                              # ═══ NEXT.JS APP ROUTER (Pages) ═══
│   │   ├── layout.tsx                    # Root layout: dark theme, fonts, navbar
│   │   ├── page.tsx                      # Landing page (/)
│   │   ├── globals.css                   # Global styles, CSS variables
│   │   │
│   │   ├── explore/                      # Concept Explorer mode
│   │   │   ├── page.tsx                  # /explore — topic search/browse grid
│   │   │   └── [slug]/
│   │   │       └── page.tsx              # /explore/hash-tables — simulation page
│   │   │
│   │   ├── dsa/                          # DSA Visualizer mode
│   │   │   ├── page.tsx                  # /dsa — paste code form
│   │   │   └── [id]/
│   │   │       └── page.tsx              # /dsa/abc123 — trace visualization
│   │   │
│   │   ├── settings/
│   │   │   └── page.tsx                  # /settings — API key mgmt, preferences
│   │   │
│   │   └── api/                          # ═══ API ROUTES (Server-Side) ═══
│   │       ├── generate/
│   │       │   └── route.ts              # POST: concept → scene JSON (AI)
│   │       ├── instrument/
│   │       │   └── route.ts              # POST: code → instrumented code (AI)
│   │       ├── visualize-trace/
│   │       │   └── route.ts              # POST: trace data → scene JSON (AI)
│   │       └── chat/
│   │           └── route.ts              # POST: follow-up question → response (AI, streaming)
│   │
│   ├── engine/                           # ═══ THE CORE — RENDERING ENGINE ═══
│   │   │
│   │   ├── SceneRenderer.tsx             # MAIN COMPONENT: Scene JSON → interactive canvas
│   │   ├── types.ts                      # Scene JSON TypeScript types/interfaces
│   │   │
│   │   ├── primitives/                   # Visual building blocks (one per data structure)
│   │   │   ├── index.ts                  # Primitive registry: type string → component
│   │   │   ├── ArrayViz.tsx              # Array: row of cells with pointer highlights
│   │   │   ├── HashMapViz.tsx            # Hash map: key-value table with insert/lookup anims
│   │   │   ├── LinkedListViz.tsx         # Linked list: nodes with animated arrow rewiring
│   │   │   ├── TreeViz.tsx               # Binary/N-ary tree with traversal highlighting
│   │   │   ├── GraphViz.tsx              # Graph: force-directed layout with BFS/DFS wave
│   │   │   ├── StackViz.tsx              # Stack: vertical push/pop
│   │   │   ├── QueueViz.tsx              # Queue: horizontal enqueue/dequeue
│   │   │   ├── DPTableViz.tsx            # DP: 2D grid filling cell by cell
│   │   │   ├── RecursionTreeViz.tsx      # Recursion: expanding call tree
│   │   │   ├── SystemDiagramViz.tsx      # HLD: architecture boxes + flow arrows
│   │   │   ├── TextBadgeViz.tsx          # Floating text labels (complement = 7)
│   │   │   └── CounterViz.tsx            # Animated number counter
│   │   │
│   │   ├── controls/                     # Interactive control components
│   │   │   ├── ControlBar.tsx            # Container: renders controls from scene JSON
│   │   │   ├── PlaybackControls.tsx      # Play / Pause / Step Fwd / Step Back / Speed
│   │   │   ├── SliderControl.tsx         # Draggable parameter slider
│   │   │   ├── ToggleControl.tsx         # A/B toggle (e.g., Chaining vs Open Addressing)
│   │   │   ├── InputControl.tsx          # Custom input (type your own array values)
│   │   │   └── ButtonControl.tsx         # Action buttons (Kill Server, Traffic Spike)
│   │   │
│   │   ├── annotations/                  # Text & popup system
│   │   │   ├── ExplanationPanel.tsx      # Left-side text panel, scrolls with steps
│   │   │   ├── StepPopup.tsx             # Popup that appears at specific steps
│   │   │   ├── HoverTooltip.tsx          # Tooltip on hover over any element
│   │   │   ├── AskAboutChat.tsx          # "Ask about this" — live AI mini-chat
│   │   │   └── CodePanel.tsx             # Code view with line highlighting
│   │   │
│   │   ├── connectors/                   # Lines & arrows between visual elements
│   │   │   ├── BezierConnector.tsx       # Glowing curved bezier (langflow-style)
│   │   │   ├── StraightArrow.tsx         # Straight arrow with animated tip
│   │   │   └── DataFlowDot.tsx           # Animated dot that travels along a path
│   │   │
│   │   └── hooks/                        # React hooks for engine state
│   │       ├── useScene.ts               # Load & manage the active scene
│   │       ├── usePlayback.ts            # Step index, play state, speed
│   │       ├── useControls.ts            # Control values (slider positions, toggles)
│   │       └── useAnnotations.ts         # Which popups are visible at current step
│   │
│   ├── sandbox/                          # ═══ CODE EXECUTION ═══
│   │   ├── SandboxManager.ts             # High-level API: execute(code, lang) → trace
│   │   ├── PyodideRunner.ts              # Python execution via Pyodide WASM
│   │   ├── JSRunner.ts                   # JavaScript execution via Web Worker
│   │   ├── types.ts                      # TraceStep, TraceData interfaces
│   │   └── workers/
│   │       └── js-sandbox.worker.ts      # Isolated Web Worker for JS execution
│   │
│   ├── ai/                               # ═══ AI INTEGRATION ═══
│   │   ├── client.ts                     # AI client: picks provider based on settings
│   │   ├── generateScene.ts              # "How does DNS work?" → Scene JSON
│   │   ├── instrumentCode.ts             # User's code → instrumented version
│   │   ├── traceToScene.ts              # Trace data → Scene JSON (visuals + text)
│   │   ├── applyDiff.ts                 # Live chat diff → patch existing scene
│   │   ├── liveChat.ts                   # "Why does this work?" → text response
│   │   │
│   │   ├── providers/                    # Multi-model AI providers
│   │   │   ├── index.ts                  # Provider registry
│   │   │   ├── gemini.ts                 # Google Gemini (default free tier)
│   │   │   ├── openai.ts                 # OpenAI (BYOK)
│   │   │   ├── anthropic.ts              # Anthropic (BYOK)
│   │   │   └── groq.ts                   # Groq (free tier alternative)
│   │   │
│   │   └── prompts/                      # Prompt templates (markdown)
│   │       ├── scene-generation.md       # "Given topic X, generate Scene JSON..."
│   │       ├── code-instrumentation.md   # "Given this code, add trace calls..."
│   │       ├── trace-to-scene.md         # "Given this trace, design visualization..."
│   │       └── live-chat.md              # "Given this scene context, answer..."
│   │
│   ├── content/                          # ═══ PRE-CACHED CONTENT ═══
│   │   ├── scenes/                       # Pre-generated Scene JSONs
│   │   │   ├── dsa/
│   │   │   │   ├── two-sum.json
│   │   │   │   ├── valid-parentheses.json
│   │   │   │   └── reverse-linked-list.json
│   │   │   ├── concepts/
│   │   │   │   ├── hash-table.json
│   │   │   │   ├── dns-resolution.json
│   │   │   │   └── load-balancer.json
│   │   │   ├── lld/
│   │   │   │   ├── lru-cache.json
│   │   │   │   └── rate-limiter.json
│   │   │   └── hld/
│   │   │       ├── url-shortener.json
│   │   │       └── design-twitter.json
│   │   │
│   │   └── topic-index.ts               # Searchable catalog with metadata
│   │
│   ├── components/                       # ═══ PAGE-LEVEL UI COMPONENTS ═══
│   │   ├── ui/                           # shadcn/ui primitives (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                       # Shared layout components
│   │   │   ├── Navbar.tsx                # Top nav: logo + links + settings
│   │   │   ├── Footer.tsx
│   │   │   ├── DotGridBackground.tsx     # The subtle dot grid canvas background
│   │   │   └── GlowEffect.tsx           # Reusable glow/bloom effects
│   │   │
│   │   ├── landing/                      # Landing page sections
│   │   │   ├── Hero.tsx                  # "See how it works" + live demo preview
│   │   │   ├── TopicCarousel.tsx         # Scrollable topic cards
│   │   │   ├── HowItWorks.tsx           # 3-step explanation
│   │   │   ├── FeatureCards.tsx          # Key features grid
│   │   │   └── LiveDemo.tsx             # Embedded mini-simulation on landing
│   │   │
│   │   ├── explore/                      # Explore page components
│   │   │   ├── SearchBar.tsx             # "Type any concept..." with autocomplete
│   │   │   ├── TopicGrid.tsx             # Grid of topic cards
│   │   │   ├── TopicCard.tsx             # Individual topic card with preview
│   │   │   └── SimulationPage.tsx        # Full simulation layout (panel + canvas)
│   │   │
│   │   └── dsa/                          # DSA page components
│   │       ├── CodePasteForm.tsx          # Textarea for problem + code + language picker
│   │       ├── CodeHighlighter.tsx        # Syntax-highlighted code with active line glow
│   │       └── TraceView.tsx             # Split view: code left, visualization right
│   │
│   ├── lib/                              # ═══ UTILITIES ═══
│   │   ├── supabase.ts                   # Supabase client (auth, DB)
│   │   ├── cache.ts                      # Check cached scenes, save new ones
│   │   ├── api-keys.ts                   # BYOK key management (localStorage)
│   │   ├── scene-validator.ts            # Validate Scene JSON against schema
│   │   └── utils.ts                      # General helpers
│   │
│   └── stores/                           # ═══ GLOBAL STATE (Zustand) ═══
│       ├── scene-store.ts                # Active scene, current step, visual state
│       ├── playback-store.ts             # Play/pause, speed, step index
│       ├── settings-store.ts             # API keys, preferred model, theme prefs
│       └── chat-store.ts                 # Live chat message history
│
├── scripts/                              # ═══ BUILD & DEV SCRIPTS ═══
│   ├── batch-generate.ts                 # Pre-generate 100 cached scenes via AI
│   └── validate-scenes.ts               # Validate all cached scene JSONs
│
├── next.config.ts                        # Next.js config (WASM headers for Pyodide)
├── tailwind.config.ts                    # Tailwind: dark theme, custom colors
├── tsconfig.json
├── package.json
└── README.md
```

---

## Data Flow: What Happens When a User Does Something

### Flow 1: User Opens a Cached Concept ("How does DNS work?")

```
User clicks "DNS Resolution" on /explore
        │
        ▼
[1] Next.js loads /explore/dns-resolution
        │
        ▼
[2] Check: Does content/scenes/concepts/dns-resolution.json exist?
        │
      YES (cached) ──────────────────────────────────────┐
        │                                                 │
        ▼                                                 │
[3] Load Scene JSON from static file                     │
        │                                                 │
        ▼                                                 │
[4] Pass to <SceneRenderer scene={sceneJSON} />          │
        │                                                 │
        ▼                                                 │
[5] SceneRenderer reads scene.visuals[] →                │
      Renders <ArrayViz />, <HashMapViz />, etc.          │
      Renders <ExplanationPanel /> (left side text)      │
      Renders <ControlBar /> (playback + sliders)        │
      Renders <StepPopup /> (annotations on canvas)      │
        │                                                 │
        ▼                                                 │
[6] User sees interactive simulation instantly            │
                                                          │
    Total AI cost: $0                                     │
    Total load time: ~200ms                               │
```

### Flow 2: User Types a New Concept (Cache Miss)

```
User types "How does consistent hashing work?" on /explore
        │
        ▼
[1] Check cache → MISS (no file for this topic)
        │
        ▼
[2] Call POST /api/generate
      Body: { topic: "consistent hashing", model: "gemini-flash" }
        │
        ▼
[3] API route calls ai/generateScene.ts
      → Loads prompt from ai/prompts/scene-generation.md
      → Calls Gemini Flash (or user's BYOK model)
      → AI returns Scene JSON
        │
        ▼
[4] Save to cache (for next user)
      → Write to content/scenes/ or Supabase storage
        │
        ▼
[5] Return Scene JSON to client
        │
        ▼
[6] Pass to <SceneRenderer /> → same rendering as Flow 1
        │
    Total AI cost: ~$0.003
    Total load time: ~3-5 seconds (AI generation)
    Subsequent users: $0 (cached)
```

### Flow 3: User Pastes DSA Code

```
User pastes Two Sum code + selects Python on /dsa
        │
        ▼
[1] Call POST /api/instrument
      Body: { code: "def twoSum(...)...", language: "python" }
        │
        ▼
[2] AI reads code → generates instrumented version
      (adds trace.capture() calls at key points)
        │
        ▼
[3] Return instrumented code to client
        │
        ▼
[4] Client loads Pyodide (WASM Python runtime)
      → Executes instrumented code in browser
      → Captures trace: array of { step, line, vars, highlights }
        │
        ▼
[5] Call POST /api/visualize-trace
      Body: { trace: [...], originalCode: "...", problem: "Two Sum" }
        │
        ▼
[6] AI takes real trace data → designs the Scene JSON
      → Picks primitives (ArrayViz + HashMapViz)
      → Writes step-synced explanations + popup annotations
      → Maps trace steps to visual actions
        │
        ▼
[7] Return Scene JSON to client
        │
        ▼
[8] <TraceView /> renders split layout:
      Left: <CodeHighlighter /> with active line glow
      Right: <SceneRenderer /> with interactive canvas
      Bottom: <PlaybackControls />
        │
    Total AI calls: 2 (instrument + visualize)
    Total cost: ~$0.005
    Code execution: browser-local via Pyodide ($0)
```

### Flow 4: User Chats With the Simulation (Live AI)

```
User right-clicks on Hash Map → "Ask about this"
  Types: "Why is hash map O(1) but not O(n)?"
        │
        ▼
[1] Call POST /api/chat (streaming)
      Body: {
        question: "Why is hash map O(1) but not O(n)?",
        context: { currentScene: {...}, currentStep: 3, element: "hash-map" }
      }
        │
        ▼
[2] AI uses scene context + question → generates response
      → Streamed back via Vercel AI SDK (tokens appear live)
        │
        ▼
[3] If AI response includes a scene DIFF:
      → applyDiff(currentScene, diff) → updated Scene JSON
      → SceneRenderer re-renders with changes
      "Let me show you a worst case where everything collides..."
      → Adds new animation steps showing O(n) degradation
        │
        ▼
[4] If AI response is text only:
      → Show in the chat popup bubble
        │
    Cost: ~$0.001 per message
```

---

## The Scene JSON — The Universal Format (Detailed)

Every visualization in insyte (DSA, LLD, HLD) is described by a single Scene JSON format. This is the most critical piece of the architecture.

```typescript
// src/engine/types.ts

interface Scene {
  id: string;
  title: string;
  type: "dsa-trace" | "concept" | "lld" | "hld";
  layout: "canvas-only" | "code-left-canvas-right" | "text-left-canvas-right";
  
  // ── The code (DSA mode only) ──
  code?: {
    language: "python" | "javascript";
    source: string;                      // Original source code
    highlightByStep: number[];           // Line number to highlight at each step
  };
  
  // ── Visual elements on the canvas ──
  visuals: Visual[];
  
  // ── Animation steps ──
  steps: Step[];
  
  // ── Interactive controls ──
  controls: Control[];
  
  // ── Explanation text (left panel) ──
  explanation: ExplanationSection[];
  
  // ── Popup annotations ──
  popups: Popup[];
  
  // ── Challenges (optional) ──
  challenges?: Challenge[];
}

// A visual element = one primitive on canvas
interface Visual {
  id: string;
  type: "array" | "hashmap" | "linked-list" | "tree" | "graph" 
      | "stack" | "queue" | "dp-table" | "system-diagram" 
      | "text-badge" | "counter";
  label: string;
  position: { x: number; y: number };
  initialState: any;                    // Type-specific initial data
  showWhen?: Condition;                 // Conditional visibility
}

// One animation step
interface Step {
  index: number;
  actions: Action[];                    // What changes on screen
  duration?: number;                    // ms for this step's animation
}

interface Action {
  target: string;                       // Visual ID
  action: string;                       // "highlight-cell", "insert-row", "move-node", etc.
  params: Record<string, any>;          // Action-specific parameters
}

// Interactive control
interface Control {
  id: string;
  type: "slider" | "toggle" | "input" | "button" | "toggle-group";
  label: string;
  config: Record<string, any>;          // min/max for slider, options for toggle, etc.
}

// Left-panel explanation section
interface ExplanationSection {
  heading: string;
  body: string;                         // Markdown
  appearsAtStep: number;               // When to scroll to this section
  callout?: string;                     // "▸ Try this: ..."
}

// Canvas popup annotation
interface Popup {
  id: string;
  attachTo: string;                     // Visual ID to attach to
  text: string;
  showAtStep: number;
  hideAtStep?: number;
  showWhen?: Condition;                 // Conditional on control values
  style?: "info" | "success" | "warning" | "insight";
}

// Conditional visibility based on control values
interface Condition {
  control: string;                      // Control ID
  equals: any;                          // Value to match
}
```

---

## The Engine — How SceneRenderer Works

```
<SceneRenderer scene={sceneJSON} />
        │
        ├── Reads scene.layout → decides split (code-left or text-left)
        │
        ├── Left Panel:
        │   ├── If layout = "code-left": <CodePanel code={scene.code} step={currentStep} />
        │   └── If layout = "text-left": <ExplanationPanel sections={scene.explanation} step={currentStep} />
        │
        ├── Canvas (right side):
        │   ├── <DotGridBackground />                    // Subtle dot grid
        │   │
        │   ├── For each visual in scene.visuals:
        │   │   └── <PrimitiveRegistry[visual.type]      // Render the right primitive
        │   │         id={visual.id}
        │   │         state={computeState(visual, currentStep)}
        │   │         onHover={showTooltip}
        │   │         onRightClick={showAskAbout} />
        │   │
        │   ├── For each connection between visuals:
        │   │   └── <BezierConnector from={vis1} to={vis2} />
        │   │
        │   └── For each popup at currentStep:
        │       └── <StepPopup text={popup.text} attachTo={popup.attachTo} />
        │
        └── Bottom:
            ├── <PlaybackControls step={currentStep} total={scene.steps.length} />
            └── <ControlBar controls={scene.controls} />
```

### Primitive Registry — How Visuals Map to Components

```typescript
// src/engine/primitives/index.ts

import { ArrayViz } from './ArrayViz';
import { HashMapViz } from './HashMapViz';
import { LinkedListViz } from './LinkedListViz';
import { TreeViz } from './TreeViz';
import { GraphViz } from './GraphViz';
import { StackViz } from './StackViz';
import { QueueViz } from './QueueViz';
import { DPTableViz } from './DPTableViz';
import { RecursionTreeViz } from './RecursionTreeViz';
import { SystemDiagramViz } from './SystemDiagramViz';
import { TextBadgeViz } from './TextBadgeViz';
import { CounterViz } from './CounterViz';

export const PrimitiveRegistry: Record<string, React.ComponentType<PrimitiveProps>> = {
  'array':           ArrayViz,
  'hashmap':         HashMapViz,
  'linked-list':     LinkedListViz,
  'tree':            TreeViz,
  'graph':           GraphViz,
  'stack':           StackViz,
  'queue':           QueueViz,
  'dp-table':        DPTableViz,
  'recursion-tree':  RecursionTreeViz,
  'system-diagram':  SystemDiagramViz,
  'text-badge':      TextBadgeViz,
  'counter':         CounterViz,
};
```

The engine NEVER knows what it's rendering. It just looks up `visual.type` in the registry and renders the matching component. This means adding a new data structure is just adding one new primitive file + registering it.

---

## Key Dependencies (package.json)

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^11.0.0",
    "zustand": "^5.0.0",
    "ai": "^4.0.0",
    "@ai-sdk/google": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "pyodide": "^0.27.0",
    "@supabase/supabase-js": "^2.0.0",
    "lucide-react": "^0.400.0",
    "shiki": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

---

## Build Order — What To Build First

```
Week 1: Foundation
  Day 1-2: Next.js project + Tailwind + dark theme + DotGridBackground + Navbar
  Day 3-4: Scene JSON types + SceneRenderer skeleton + PlaybackControls
  Day 5:   First primitive: ArrayViz (row of cells + pointer highlight)

Week 2: Engine Core
  Day 1:   Second primitive: HashMapViz (key-value table with insert animation)
  Day 2:   BezierConnector + StepPopup system
  Day 3:   ExplanationPanel (left-side text, synced with steps)
  Day 4:   Hand-craft 1 complete scene JSON: hash-table.json
  Day 5:   Test: Load hash-table.json → full interactive simulation working

Week 3: AI + DSA
  Day 1-2: AI integration (Vercel AI SDK + Gemini provider + scene generation prompt)
  Day 3:   Sandbox: Pyodide integration for Python execution in browser
  Day 4:   DSA pipeline: instrument → execute → visualize-trace
  Day 5:   CodeHighlighter + TraceView (split code + canvas layout)

Week 4: Polish + Launch
  Day 1:   Landing page (Hero + TopicCarousel + HowItWorks)
  Day 2:   Settings page (BYOK key input, model selector)
  Day 3:   3-5 more cached scenes (DNS, LRU Cache, Load Balancer, etc.)
  Day 4:   Live AI chat (AskAboutChat popup)
  Day 5:   Deploy to Vercel, test end-to-end
```

---

*Written: April 4, 2026*
*This is the blueprint. Everything flows through Scene JSON. The engine is primitive-based. The AI generates JSON, not code.*
