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

### 2.4 — Zustand combined store (Slice Pattern)

All state lives in **one** `useBoundStore` combining five slices. This guarantees atomic cross-slice updates — for example, when chat applies a scene patch that must also pause playback, both state changes happen in one `set()` call, eliminating React race conditions from cross-store subscriptions.

Create `apps/web/src/stores/`:

**`slices/scene-slice.ts`:**
- [ ] `activeScene: Scene | null`
- [ ] `draftScene: DeepPartial<Scene> | null` — receives streaming partial chunks before validation (Draft Store pattern — see Phase 7 task 7.10)
- [ ] `isStreaming: boolean`
- [ ] `streamedFields: Set<string>`
- [ ] `isPatchGlowing: boolean`
- [ ] `setScene(scene)`, `updateScene(partial)`, `clearScene()`
- [ ] `setDraftScene(partial)`, `promoteDraftField(field: keyof Scene)` — promotes a validated field from draft → activeScene
- [ ] `setStreaming(val)`, `markFieldStreamed(field)`
- [ ] `triggerGlow()` — sets `isPatchGlowing: true`, auto-resets after 600ms via `setTimeout`

**`slices/playback-slice.ts`:**
- [ ] `currentStep: number` (0-indexed)
- [ ] `isPlaying: boolean`
- [ ] `speed: 0.5 | 1 | 1.5 | 2`
- [ ] `totalSteps: number`
- [ ] `play()`, `pause()`, `stepForward()`, `stepBack()`, `reset()`, `setSpeed(n)`
- [ ] `jumpToStep(n: number)` — sets `currentStep` directly; used by `PlaybackIntent` resolution in Phase 8

**`slices/settings-slice.ts`:**
- [ ] `provider: 'gemini'|'openai'|'anthropic'|'groq'` (default: `'gemini'`)
- [ ] `model: string` (provider-specific default)
- [ ] `apiKeys: Record<Provider, string | null>`
- [ ] `setApiKey(provider, key)`, `clearApiKey(provider)`, `clearAllKeys()`, `setProvider(p)`, `setModel(m)`
- [ ] **Keys never leave the client** — this slice is consumed client-side only, never read by server routes

**`slices/chat-slice.ts`:**
- [ ] `isOpen: boolean`, `isMinimized: boolean`
- [ ] `messages: ChatMessage[]` — `ChatMessage = { role: 'user'|'assistant', content: string, timestamp: number }`
- [ ] `isLoading: boolean`
- [ ] `openChat()`, `closeChat()`, `minimizeChat()`
- [ ] `addMessage(msg)`, `setLoading(val)`, `clearHistory()`
- [ ] `appendToLastMessage(chunk: string)` — appends streaming text chunks to the last assistant message

**`slices/detection-slice.ts`:**
- [ ] `inputText: string`
- [ ] `detectedMode: 'concept'|'dsa'|'lld'|'hld'|null`
- [ ] `showConfirmation: boolean`
- [ ] `setInput(text)`, `setMode(mode)`, `confirmDSA()`, `cancelDSA()`

**`store.ts` — the single bound store:**
- [ ] `type BoundStore = SceneSlice & PlaybackSlice & SettingsSlice & ChatSlice & DetectionSlice`
- [ ] Each slice creator typed as `StateCreator<BoundStore, [['zustand/immer', never]], [], SliceType>`
- [ ] Combined with `immer` middleware (clean immutable updates) + `persist` middleware:
  ```typescript
  export const useBoundStore = create<BoundStore>()(
    immer(
      persist(
        (...a) => ({
          ...createSceneSlice(...a),
          ...createPlaybackSlice(...a),
          ...createSettingsSlice(...a),
          ...createChatSlice(...a),
          ...createDetectionSlice(...a),
        }),
        {
          name: 'insyte-settings',
          partialize: (state) => ({
            provider: state.provider,
            model: state.model,
            apiKeys: state.apiKeys,
          }),
        }
      )
    )
  )
  ```
- [ ] Only the settings fields are persisted to localStorage; all other slices are session-only

**`stores/hooks.ts` — convenience selector hooks:**
- [ ] `useScene()` → `useBoundStore(s => s.activeScene)`
- [ ] `usePlayback()` → `useBoundStore(s => ({ currentStep, isPlaying, totalSteps, speed, play, pause, stepForward, stepBack, reset, setSpeed, jumpToStep }))`
- [ ] `useSettings()` → `useBoundStore(s => ({ provider, model, apiKeys, setApiKey, clearApiKey, clearAllKeys, setProvider, setModel }))`
- [ ] `useChat()` → `useBoundStore(s => ({ messages, isLoading, isOpen, isMinimized, ... }))`
- [ ] `useDetection()` → `useBoundStore(s => ({ detectedMode, inputText, showConfirmation, ... }))`

**`stores/player-store.ts` — isolated player store factory (used by Phase 6 LiveDemo):**
- [ ] `createPlayerStore()` — calls `createStore<PlayerState>()` (scene + playback slices only, no persist)
- [ ] `PlayerStoreApi = ReturnType<typeof createPlayerStore>`
- [ ] `ScenePlayerContext = React.createContext<PlayerStoreApi | null>(null)`
- [ ] `usePlayerStore<T>(selector: (s: PlayerState) => T): T` — reads from `ScenePlayerContext` when inside a `ScenePlayerProvider`, otherwise reads from `useBoundStore`
- [ ] This context-aware hook is used by `SceneRenderer` and `PlaybackControls` so they work in both global and isolated player contexts

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
- [ ] `useBoundStore` is the single source of truth — no separate `create()` calls for app state
- [ ] `usePlayback()` auto-advances step index when `isPlaying: true`
- [ ] `/s/test` loads the minimal scene and shows playback controls that function
- [ ] Settings slice persists API keys to localStorage and rehydrates on reload (verify with `localStorage.getItem('insyte-settings')`)
- [ ] `ScenePlayerContext` and `usePlayerStore` exported from `stores/player-store.ts`, importable by Phase 6
- [ ] TypeScript strict mode — zero `any` in store/slice files

---

## Key Notes
- `computeVisualStateAtStep` is the most critical function — it applies all actions from step 0..n to build the visual's current state. This must be pure (no side effects).
- The slice pattern means **one `useBoundStore`** — never call `create()` multiple times for the main app state. Separate `createStore()` is only for the `ScenePlayerProvider` isolated context.
- `immer` middleware is applied at the top level; individual slice creators do not need their own immer wrapping.
- Cross-slice actions (e.g., applying a chat patch that also pauses playback) are written in the slice that initiates the action and call `set()` once with changes spanning multiple slices.
- `usePlaybackTick` must use `setInterval` with `useEffect` cleanup — no memory leaks. It should use the `usePlayerStore` hook (not `useBoundStore` directly) so it works inside `ScenePlayerProvider` too.
- `detection-store` slice is used exclusively client-side; no SSR concerns.
- The persist key `'insyte-settings'` namespaces localStorage — only the settings fields are persisted (provider, model, apiKeys). Never persist scene, playback, chat, or detection state.
