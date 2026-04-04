# Phase 2 — Scene Engine Core

**Goal:** Scene JSON types finalized in the shared package, all Zustand stores wired, `SceneRenderer` reads a JSON and renders the correct panel layout with playback controls.

**Entry criteria:** Phase 1 complete. Design system and layout components working.

---

## Tasks

### 2.1 — Finalize scene-engine types
In `packages/scene-engine/src/types.ts`, finalize all interfaces:

- [ ] `Scene` — root interface with all fields
- [ ] `Visual` — id, type (union), label, position `{x,y}`, `initialState: unknown`, `showWhen?: Condition`
- [ ] `Step` — index, `actions: Action[]`, `duration?: number`
- [ ] `Action` — target (visual id), action (string), params (Record)
- [ ] `Control` — id, type (`'slider'|'toggle'|'input'|'button'|'toggle-group'`), label, config (Record)
- [ ] `ExplanationSection` — heading, body (markdown string), `appearsAtStep: number`, `callout?: string`
- [ ] `Popup` — id, attachTo, text, showAtStep, `hideAtStep?`, `showWhen?`, `style?: 'info'|'success'|'warning'|'insight'`
- [ ] `Challenge` — id, title, description, type (`'predict'|'break-it'|'optimize'|'scenario'`)
- [ ] `Condition` — control (id string), equals (any)
- [ ] `SceneLayout` type alias
- [ ] `SceneType` type alias
- [ ] Export all as named exports + a `SceneJSON` namespace export

### 2.2 — Finalize Zod schema
In `packages/scene-engine/src/schema.ts`:

- [ ] `ConditionSchema` — z.object with control + equals
- [ ] `VisualSchema` — all fields, `type` as z.enum with all 12 primitive types
- [ ] `ActionSchema`
- [ ] `StepSchema` — index + actions array
- [ ] `ControlSchema` — id, type enum, label, config z.record
- [ ] `ExplanationSectionSchema`
- [ ] `PopupSchema` — with optional fields
- [ ] `ChallengeSchema`
- [ ] `SceneSchema` — root schema with all fields, `code` as optional nested object
- [ ] Export `parseScene(input: unknown): Scene` — calls `SceneSchema.parse(input)` (throws on invalid)
- [ ] Export `safeParseScene(input: unknown): { success: true; scene: Scene } | { success: false; error: ZodError }` — safe variant used in streaming

### 2.3 — Parser
In `packages/scene-engine/src/parser.ts`:

- [ ] `normalizeScene(raw: Scene): Scene` — fills in defaults, ensures arrays are never undefined
- [ ] `computeVisualStateAtStep(scene: Scene, visualId: string, stepIndex: number): VisualState` — applies all actions up to stepIndex to the visual's initialState
- [ ] Export `parseScene` (validates + normalizes in one call)

### 2.4 — Zustand stores
Create 5 stores in `apps/web/src/stores/`:

**`scene-store.ts`:**
- [ ] `activeScene: Scene | null`
- [ ] `isStreaming: boolean`
- [ ] `streamedFields: Set<string>` — tracks which top-level fields have arrived during streaming
- [ ] `setScene(scene: Scene)`, `updateScene(partial: Partial<Scene>)`, `clearScene()`
- [ ] `setStreaming(val: boolean)`, `markFieldStreamed(field: string)`

**`playback-store.ts`:**
- [ ] `currentStep: number` (0-indexed)
- [ ] `isPlaying: boolean`
- [ ] `speed: number` (0.5 | 1 | 1.5 | 2)
- [ ] `totalSteps: number` (derived from scene)
- [ ] `play()`, `pause()`, `stepForward()`, `stepBack()`, `reset()`, `setSpeed(n)`
- [ ] Auto-advance logic: `usePlaybackTick()` hook in `apps/web/src/engine/hooks/usePlayback.ts` — fires step forward on interval (speed-adjusted)

**`settings-store.ts`:**
- [ ] `provider: 'gemini'|'openai'|'anthropic'|'groq'` (default: `'gemini'`)
- [ ] `model: string` (provider-specific default)
- [ ] `apiKeys: Record<Provider, string | null>`
- [ ] `setApiKey(provider, key)`, `clearApiKey(provider)`, `setProvider(p)`, `setModel(m)`
- [ ] Backed by localStorage via Zustand persist middleware
- [ ] **Keys must never be sent to any server route** — this is enforced by only reading from store client-side

**`chat-store.ts`:**
- [ ] `messages: ChatMessage[]` where `ChatMessage = { role: 'user'|'assistant', content: string, timestamp: number }`
- [ ] `isLoading: boolean`
- [ ] `addMessage(msg)`, `setLoading(val)`, `clearHistory()`
- [ ] Session-scoped (not persisted to localStorage)

**`detection-store.ts`:**
- [ ] `inputText: string`
- [ ] `detectedMode: 'concept'|'dsa'|'lld'|'hld'|null`
- [ ] `showConfirmation: boolean` (true when DSA code detected)
- [ ] `setInput(text)`, `setMode(mode)`, `confirmDSA()`, `cancelDSA()`

### 2.5 — Engine hooks
Create `apps/web/src/engine/hooks/`:

- [ ] `useScene.ts` — `const scene = useSceneStore(s => s.activeScene)` + helper selectors
- [ ] `usePlayback.ts` — exports `{ currentStep, isPlaying, totalSteps, play, pause, stepForward, stepBack, reset, speed, setSpeed }` + `usePlaybackTick()` for auto-advance
- [ ] `useControls.ts` — manages live control values (slider positions, toggle state) in local component state, exposes `getControlValue(id)`, `setControlValue(id, val)`
- [ ] `useAnnotations.ts` — returns list of `Popup[]` visible at `currentStep` given control state (evaluates `showWhen` conditions)

### 2.6 — SceneRenderer skeleton
Create `apps/web/src/engine/SceneRenderer.tsx`:

- [ ] Props: `scene: Scene`
- [ ] Reads `scene.layout` to decide which layout component to render
- [ ] `text-left-canvas-right` → `<TextLeftCanvasRight />` (stub: two divs, left 35% / right 65%)
- [ ] `code-left-canvas-right` → `<CodeLeftCanvasRight />` (stub: two divs)
- [ ] `canvas-only` → `<CanvasOnly />` (stub: full width div)
- [ ] Canvas area contains: `<DotGridBackground />`, then `{scene.visuals.map(v => <div key={v.id}>{v.type}</div>)}` as placeholder text
- [ ] Below canvas: `<PlaybackControls />`

### 2.7 — PlaybackControls component
Create `apps/web/src/engine/controls/PlaybackControls.tsx`:

- [ ] Reads from `playback-store`
- [ ] Renders: `[⏮ Reset] [⏭ Step Back] [▶/⏸ Play/Pause] [⏭ Step Forward]`
- [ ] Speed selector: `[0.5×] [1×] [1.5×] [2×]` pill buttons
- [ ] Step indicator: `"Step 3 / 12"` centered
- [ ] `bg-surface-container border border-outline-variant/20 rounded-2xl px-4 py-2`
- [ ] Framer Motion: button press scale animation (`whileTap: { scale: 0.9 }`)
- [ ] Disabled state: all buttons disabled when `totalSteps === 0` (no scene loaded)

### 2.8 — Test with a minimal scene JSON
- [ ] Create `apps/web/src/content/scenes/test/minimal.json` — 3-step scene with 1 array visual
- [ ] Wire `/s/test` to load this JSON and render `<SceneRenderer />`
- [ ] Verify: playback controls work (step forward/back/play/pause), step counter increments

---

## Exit Criteria
- [ ] `parseScene(validJson)` returns a typed Scene object without TypeScript errors
- [ ] `safeParseScene(badJson)` returns `{ success: false, error }` without throwing
- [ ] All 5 Zustand stores importable and settable from any component
- [ ] `usePlayback()` auto-advances step index when `isPlaying: true`
- [ ] `/s/test` loads the minimal scene and shows playback controls that function
- [ ] `settings-store` persists API keys to localStorage and rehydrates on reload
- [ ] TypeScript strict mode — zero `any` in store files

---

## Key Notes
- `computeVisualStateAtStep` is the most critical function — it applies all actions from step 0..n to build the visual's current state. This must be pure (no side effects).
- Zustand stores should use the `immer` middleware for complex nested state updates
- `usePlaybackTick` must use `setInterval` with `useEffect` cleanup — no memory leaks
- `detection-store` is used exclusively client-side; no SSR concerns
- The `settings-store` persist key should be `'insyte-settings'` for localStorage namespacing
