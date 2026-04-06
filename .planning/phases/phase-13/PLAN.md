# Phase 13 — DSA Pipeline

**Goal:** Full DSA trace pipeline working end-to-end: paste code → Pyodide/Worker executes → AI generates Scene JSON. 10 pre-built DSA Scene JSONs authored. "Re-run with custom input" flow functional.

**Entry criteria:** Phase 12 complete. AI generation, scene-store, and simulation page all working.

---

## Tasks

### 13.1 — Sandbox types
Create `apps/web/src/sandbox/types.ts`:
```typescript
interface TraceStep {
  step: string;         // step name/type
  line: number;         // source line number
  vars: Record<string, unknown>;  // variable values at this step
  note?: string;        // human-readable note
  highlight?: {         // which visual elements to highlight
    array_index?: number;
    array_indices?: number[];
    lookup_key?: string;
    hash_insert?: Record<string, number>;
    tree_node?: string;
    [key: string]: unknown;
  };
}

interface TraceData {
  steps: TraceStep[];
  finalResult?: unknown;
  error?: string;
  truncated?: boolean;  // true when step limit was hit — renderer shows a warning
}
```

### 13.2 — PyodideRunner
Create `apps/web/src/sandbox/PyodideRunner.ts`:
- [ ] `class PyodideRunner`
- [ ] Static `instance: PyodideRunner | null` — singleton
- [ ] `static getInstance(): PyodideRunner`
- [ ] `isInitialized: boolean`
- [ ] `initializationProgress: number` (0–100)
- [ ] `onProgress: (progress: number, message: string) => void` callback
- [ ] `initialize(): Promise<void>` — lazy-loads Pyodide from `public/pyodide/`
  - Reports progress: "Loading Python runtime (1/4)...", "Downloading packages...", etc.
  - Sets `isInitialized = true` on complete
- [ ] `execute(code: string): Promise<TraceData>` — runs code in Pyodide, extracts `_trace` variable
  - Wraps execution in try/catch, captures Python exceptions
  - Returns `{ steps: _trace, finalResult, error }`
- [ ] `reset(): void` — clears Pyodide namespace for fresh execution

### 13.3 — Pyodide WASM files
- [ ] Download Pyodide distribution to `apps/web/public/pyodide/`
  - Files needed: `pyodide.js`, `pyodide.asm.js`, `pyodide.asm.wasm`, `pyodide_py.tar`, standard packages
  - Use Pyodide v0.27.x
- [ ] Update `apps/web/next.config.ts` to allow WASM:
  ```js
  async headers() {
    return [{ source: '/pyodide/(.*)', headers: [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' }
    ]}]
  }
  ```

### 13.4 — JavaScript Web Worker sandbox
Create `apps/web/src/sandbox/workers/js-sandbox.worker.ts`:
- [ ] Web Worker that receives `{ code: string }` message
- [ ] Wraps code execution in a `try/catch`
- [ ] Intercepts `_trace.push()` calls from instrumented code
- [ ] Posts back `{ steps: TraceStep[], finalResult, error }`
- [ ] Security: runs in isolated Worker scope (no DOM, no network)

Create `apps/web/src/sandbox/JSRunner.ts`:
- [ ] `class JSRunner`
- [ ] Lazy-creates Worker on first call
- [ ] `execute(code: string, timeout?: number): Promise<TraceData>`
- [ ] Kills Worker if execution exceeds timeout (default 5000ms)

### 13.5 — SandboxManager
Create `apps/web/src/sandbox/SandboxManager.ts`:
- [ ] `execute(code: string, language: 'python' | 'javascript'): Promise<TraceData>`
- [ ] Routes to `PyodideRunner` or `JSRunner` based on language
- [ ] For Python: calls `PyodideRunner.getInstance().execute(code)`
- [ ] For JavaScript: calls new `JSRunner().execute(code)`
- [ ] Exports singleton: `export const sandboxManager = new SandboxManager()`

### 13.6 — Pyodide loading progress UI
Create `apps/web/src/components/simulation/PyodideLoader.tsx`:
- [ ] Shows when `PyodideRunner.isInitialized === false` and DSA mode is detected
- [ ] Progress bar: `bg-primary/80 rounded-full` inside `bg-surface-container rounded-full`
- [ ] Message: "Initializing Python runtime... (~10MB)" then "Loading packages..." etc.
- [ ] Smooth Framer Motion width animation on progress bar
- [ ] Disappears (Framer Motion exit animation) when fully loaded

### 13.7 — AI instrumentation
Create `apps/web/src/ai/prompts/code-instrumentation.md`:
- [ ] System: You are an expert at adding trace instrumentation to code for visualization.
- [ ] Instructions: Given the user's solution code + problem statement, add `_trace.append({...})` calls at each meaningful step (key variable assignments, loop iterations, condition checks, return statements)
- [ ] TraceStep format: exactly match the `TraceStep` TypeScript interface
- [ ] Do NOT modify the logic — only add instrumentation
- [ ] Include a call to run the function with sample input at the end
- [ ] **Step limit guard (required):** Instruct the AI to add this guard at every trace append site:
  ```python
  if len(_trace) < 1000:
      _trace.append({...})
  elif len(_trace) == 1000:
      _trace.append({"step": "truncated", "line": 0, "vars": {}, "note": "Trace limit reached (1000 steps). Increase input size may cause OOM."})
  ```
- [ ] **Delta capture (required):** Each `vars` dict should only include variables that **changed** since the previous step. Instruct the AI: "Only include a variable in `vars` if its value differs from the previous step. For the first step, include all variables."
- [ ] Example: shows Two Sum before/after instrumentation (with step limit + delta vars)

Create `apps/web/src/ai/instrumentCode.ts`:
- [ ] `instrumentCode(code: string, language: 'python'|'javascript', problemStatement: string): Promise<string>`
- [ ] Calls AI with code-instrumentation prompt
- [ ] Returns the instrumented code string
- [ ] Does NOT stream (short response, just wait for it)

Create `apps/web/src/app/api/instrument/route.ts`:
- [ ] POST: `{ code: string, language: string, problemStatement?: string }`
- [ ] Returns: `{ instrumentedCode: string }`
- [ ] Error: 400 on empty code, 500 on AI failure

### 13.8 — AI trace-to-scene conversion
Create `apps/web/src/ai/prompts/trace-to-scene.md`:
- [ ] System: You are an expert at designing educational visualizations for algorithm execution.
- [ ] Instructions: Given the real trace data + original code, design a Scene JSON visualization
- [ ] Rules: pick primitives based on data structures observed in trace (arrays → ArrayViz, dicts → HashMapViz, etc.)
- [ ] Each TraceStep → one or more `Step` objects in scene JSON
- [ ] Write popup annotations explaining the WHY of each significant step
- [ ] Use `code-left-canvas-right` layout always for DSA traces
- [ ] Include 3 challenges relevant to the algorithm

Create `apps/web/src/ai/traceToScene.ts`:
- [ ] `traceToScene(trace: TraceData, originalCode: string, language: string, problemStatement: string): AsyncGenerator<Partial<Scene>>`
- [ ] Streams using `streamObject` with SceneSchema
- [ ] Same streaming pattern as `generateScene.ts`

Create `apps/web/src/app/api/visualize-trace/route.ts`:
- [ ] POST: `{ trace: TraceData, originalCode: string, language: string, problemStatement?: string }`
- [ ] Streams Scene JSON back to client
- [ ] BYOK header support

### 13.9 — DSA orchestration hook
Create `apps/web/src/engine/hooks/useDSAPipeline.ts`:
- [ ] `useDSAPipeline()` → `{ stage, progress, error, run, rerun }`
- [ ] Stages: `'idle' | 'instrumenting' | 'executing' | 'visualizing' | 'complete' | 'error'`
- [ ] `run(code, language, problemStatement, customInput?)`:
  1. Stage → `'instrumenting'`: POST `/api/instrument`
  2. Stage → `'executing'`: run instrumented code in sandbox
  3. Stage → `'visualizing'`: POST `/api/visualize-trace`, stream into scene-store
  4. Stage → `'complete'`
- [ ] `rerun(customInput)`: skips Stage 1 (use cached instrumented code), runs Stage 2+3 fresh

### 13.10 — DSA mode in simulation page
Update `apps/web/src/app/s/[slug]/page.tsx`:
- [ ] Detect if this is a DSA generation request (from URL param or redirect from detection flow)
- [ ] Show `<PyodideLoader />` during initialization
- [ ] Show DSA pipeline progress UI during all 3 stages:
  - Stage 1: "AI is reading your code..."
  - Stage 2: "Executing in sandbox..."
  - Stage 3: "Building visualization..."
- [ ] When complete: render `SceneRenderer` with `code-left-canvas-right` layout
- [ ] "Re-run with custom input" button in `ControlBar` → calls `useDSAPipeline().rerun()`

**Mobile DSA layout:**
- [ ] `CodeLeftCanvasRight` on mobile: tab switcher `["Code" | "Visual"]`
- [ ] Pyodide loader visible and readable at 375px

### 13.11 — Pyodide WASM Service Worker caching
Install and configure `serwist`:
- [ ] `pnpm add @serwist/next serwist --filter web`
- [ ] Create `apps/web/src/sw.ts` — service worker entry point with CacheFirst for `/pyodide/` (1 year TTL)
- [ ] Update `apps/web/next.config.ts` to wrap config with `withSerwist`
- [ ] Service worker activates only in production (`NODE_ENV === 'production'`)
- [ ] Verify: DevTools → Application → Cache Storage → `pyodide-cache` contains `.wasm` files after first DSA run

### 13.12 — 10 pre-built DSA Scene JSONs
Create `apps/web/src/content/scenes/dsa/`:
- [ ] `two-sum.json` — ArrayViz + HashMapViz, 5 steps
- [ ] `valid-parentheses.json` — ArrayViz + StackViz, 8 steps
- [ ] `binary-search.json` — ArrayViz with two-pointer highlight, 6 steps
- [ ] `reverse-linked-list.json` — LinkedListViz with pointer rewiring, 6 steps
- [ ] `climbing-stairs.json` — DPTableViz (1D), 8 steps
- [ ] `merge-sort.json` — ArrayViz with recursive split visualization, 10 steps
- [ ] `level-order-bfs.json` — TreeViz + QueueViz, 10 steps
- [ ] `number-of-islands.json` — GridViz (`type: 'grid'`), 8 steps showing BFS/DFS flood-fill
- [ ] `sliding-window-max.json` — ArrayViz + QueueViz (deque), 8 steps
- [ ] `fibonacci-recursive.json` — RecursionTreeViz with memoization toggle, 10 steps

Each JSON must:
- [ ] Use `code-left-canvas-right` layout
- [ ] Include the actual Python source code in `scene.code.source`
- [ ] Have `highlightByStep` mapping each step to a source line number
- [ ] Have 3 challenges
- [ ] Have explanation sections per step block

---

## Exit Criteria
- [ ] Pasting Python Two Sum code → Pyodide executes it → trace captured → Scene JSON generated → animation shows ArrayViz + HashMapViz
- [ ] Pyodide loading progress bar visible with accurate percentage
- [ ] DSA pipeline stages 1→2→3 show distinct progress messages
- [ ] "Re-run with custom input" → changes `nums` array → animation re-runs with new values
- [ ] All 10 pre-built DSA scenes load at their `/s/[slug]` routes
- [ ] `fibonacci-recursive` shows memoization pruning (memoized nodes appear different)
- [ ] Code panel active line synced to animation step
- [ ] `number-of-islands.json` renders a `GridViz` grid (not a force-directed graph)
- [ ] Pasting a pathological O(n²) algorithm with n=500 produces a `truncated: true` trace — renderer shows "Trace truncated at 1000 steps" warning
- [ ] Second Pyodide session (production build) loads from service worker cache — no `/pyodide/` network requests in DevTools

---

## Key Notes
- Pyodide files MUST be self-hosted in `public/pyodide/` — not loaded from CDN. COOP/COEP headers are required for SharedArrayBuffer.
- The instrumented code runs with `_trace = []` already defined in the Python globals — AI-generated instrumented code can just call `_trace.append(...)` directly
- JavaScript sandbox is a Web Worker — ensure `next.config.ts` is configured to bundle worker files correctly
- For pre-built DSA JSONs: these can be AI-generated with the `traceToScene` pipeline then manually verified — they don't need to be 100% hand-authored from scratch
- The 10 pre-built DSA JSONs bypass the pipeline entirely — they load as static files exactly like concept simulations
- `number-of-islands` uses `GridViz` (`type: 'grid'`), not `GraphViz`
- Service worker caching (`serwist`) is production-only — in dev, Pyodide still fetches from disk on every cold start; this is expected
