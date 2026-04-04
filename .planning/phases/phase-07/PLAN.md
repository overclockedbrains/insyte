# Phase 7 — AI Scene Generation (Streaming)

**Goal:** Typing a new concept generates a streaming Scene JSON with skeleton UX → node fade-in → panel fill. Generated scenes are cached in Supabase for future users.

**Entry criteria:** Phase 6 complete. Gallery and landing page working. Supabase project created (can be basic setup at this point).

---

## Tasks

### 7.1 — AI provider registry
Create `apps/web/src/ai/providers/`:

**`gemini.ts`:**
- [ ] Import `createGoogleGenerativeAI` from `@ai-sdk/google`
- [ ] `getGeminiProvider(apiKey?: string)` — uses provided key or `process.env.GEMINI_API_KEY` server-side
- [ ] Default model: `gemini-2.0-flash`

**`openai.ts`:**
- [ ] Import `createOpenAI` from `@ai-sdk/openai`
- [ ] `getOpenAIProvider(apiKey: string)` — BYOK only, no server fallback
- [ ] Default model: `gpt-4o-mini`

**`anthropic.ts`:**
- [ ] Import `createAnthropic` from `@ai-sdk/anthropic`
- [ ] `getAnthropicProvider(apiKey: string)` — BYOK only
- [ ] Default model: `claude-3-5-haiku-20241022`

**`groq.ts`:**
- [ ] Import `createGroq` from `@ai-sdk/groq` (or `openai` compatible)
- [ ] `getGroqProvider(apiKey: string)` — BYOK only
- [ ] Default model: `llama-3.1-70b-versatile`

**`index.ts`:**
- [ ] `getAIProvider(settings: SettingsState): { model: LanguageModel }` — returns the correct provider+model based on settings
- [ ] If no BYOK key set for selected provider → falls back to Gemini Flash (server key)

### 7.2 — Scene generation prompt
Create `apps/web/src/ai/prompts/scene-generation.md`:
- [ ] System: You are an expert in creating educational interactive visualizations...
- [ ] Instructions: Given a tech concept, generate a Scene JSON with the following schema: [full Zod schema in JSON format]
- [ ] Requirements:
  - Layout selection rules (when to use which layout)
  - Primitive selection guidelines (which visual to use for which concept)
  - Step design guidelines (meaningful steps, not just showing state changes)
  - Explanation writing guidelines (technical but clear, with callouts)
  - Control design guidelines (sliders/toggles that let user explore edge cases)
  - Popup annotation guidelines (explain WHY, not just WHAT)
  - Challenge design guidelines (3 challenges: easy/medium/hard)
- [ ] Output must be valid JSON matching the `SceneSchema` exactly
- [ ] Few-shot example: include the hash-tables.json as a gold standard reference

### 7.3 — generateScene function
Create `apps/web/src/ai/generateScene.ts`:
- [ ] `generateScene(topic: string, settings: SettingsState): AsyncGenerator<Partial<Scene>>`
- [ ] Builds the prompt from `scene-generation.md` template + topic
- [ ] Calls `streamObject({ model, schema: SceneSchema, prompt })` from Vercel AI SDK
- [ ] Yields partial scene objects as they stream in
- [ ] On completion: validates full scene with `safeParseScene()`
- [ ] If validation fails: throws `SceneGenerationError` with the Zod errors

### 7.4 — `/api/generate` route
Create `apps/web/src/app/api/generate/route.ts`:
- [ ] POST handler: `{ topic: string, model?: string }` body
- [ ] **Server-side only** — uses Gemini Flash server key by default
- [ ] Calls `generateScene(topic, serverSettings)` 
- [ ] Streams the `streamObject` response back to client via `toDataStreamResponse()`
- [ ] On completion: saves generated scene to Supabase `scenes` table (Phase 11 completes this; stub with no-op for now)
- [ ] Rate limiting: check IP-based counter from Supabase (Phase 11 completes; stub with no-op for now)
- [ ] **BYOK: this route is used only when no BYOK key is configured.** When a BYOK key exists in `settings-store`, generation runs browser-direct via task 7.10 and this route is bypassed entirely. Do NOT accept or forward any API key headers — that would expose keys to Vercel logs.
- [ ] Error handling: 429 on rate limit, 400 on invalid topic, 500 on AI failure

### 7.5 — Client-side streaming hook
Create `apps/web/src/engine/hooks/useStreamScene.ts`:
- [ ] `useStreamScene(topic: string): { isStreaming, streamedFields, error, retry }`
- [ ] Reads `settings-store` to check if a BYOK key is configured for the active provider
- [ ] **If BYOK key present**: calls `generateScene()` browser-direct (task 7.10) — no server route
- [ ] **If no BYOK key**: calls `/api/generate` via `fetch` with streaming response
- [ ] Parses each stream chunk with Vercel AI SDK `parseStreamPart()`
- [ ] Dispatches **to `draftScene`** first (not `activeScene`) via `setDraftScene(partial)` — see task 7.10 Draft Store
- [ ] On completion: `setStreaming(false)`
- [ ] On validation failure: sets error state + allows retry

### 7.6 — Streaming skeleton UI
Update `apps/web/src/app/s/[slug]/page.tsx` and `ScenePageClient.tsx`:

**Skeleton state (while streaming):**
- [ ] Title area: shimmer animation (`animate-pulse bg-surface-container-high rounded`)
- [ ] Canvas area: 3–4 ghost node outlines (rounded rects with `animate-pulse`)
- [ ] Controls area: 2 greyed-out placeholder sliders
- [ ] Left panel: 4 lines of shimmer text

**Progressive fill-in (as fields stream):**
- [ ] `title` arrives → shimmer → real title fades in
- [ ] `visuals` arrives → each visual: `initial={{ opacity:0 }} animate={{ opacity:1 }}` staggered
- [ ] `steps` arrives → playback bar appears with total step count
- [ ] `controls` arrive → sliders/toggles replace placeholders
- [ ] `explanation` arrives → left panel fills in with stagger
- [ ] `challenges` arrive → challenges section appears

**Error state:**
- [ ] Shows "Generation failed. Retrying..." with spinner
- [ ] After auto-retry fails: "Could not generate simulation for '[topic]'. [Try again →]" button

### 7.7 — Auto-detection logic
Create/update `apps/web/src/stores/detection-store.ts`:

- [ ] `detectMode(text: string): 'concept' | 'dsa' | 'lld' | 'hld'`
  - Contains code block (triple backticks or multiple lines with `def `/`function `/`class `) → `'dsa'`
  - Starts with "Design a" / "Design [system]" / contains system design keywords → `'hld'`
  - "LRU Cache" / "Rate Limiter" / "implement [data structure]" keywords → `'lld'`
  - Otherwise → `'concept'`
- [ ] Detection runs on every keystroke in `UnifiedInput` (debounced 150ms)
- [ ] Detection result shown below textarea

### 7.8 — DSA confirmation step
- [ ] When mode === 'dsa' and user submits: show confirmation `Dialog` from shadcn/ui
- [ ] Dialog: "We detected [language] code for '[problem]'. Visualize it?"
- [ ] Two buttons: "Visualize →" and "Treat as Concept"
- [ ] On confirm: navigate to `/s/[slug]` and begin DSA pipeline (Phase 9)
- [ ] On cancel: re-detect as concept, begin concept generation

### 7.9 — BYOK browser-direct generation
Create `apps/web/src/ai/generateSceneBrowserDirect.ts`:
- [ ] Called from `useStreamScene` when `settings-store` has a BYOK key for the active provider
- [ ] Instantiates the AI provider client-side using the key from `settings-store`:
  ```typescript
  const { provider, model, apiKeys } = useSettings()
  const client = getAIProvider({ provider, model, apiKey: apiKeys[provider]! })
  ```
- [ ] Calls `streamObject({ model: client, schema: SceneSchema, prompt })` directly in the browser
- [ ] No network request to `/api/generate` — the key **never touches our servers**
- [ ] On completion: calls `saveScene(scene, slug)` to cache in Supabase (the save can go to the server since it carries no key)
- [ ] This is the only correct BYOK path. The `/api/generate` server route must never receive API keys.

### 7.10 — Draft Store for streaming crash prevention
Update `apps/web/src/engine/hooks/useStreamScene.ts` and `scene-store` (scene slice from Phase 2):

**Problem:** `streamObject` yields partial objects as JSON arrives. If `SceneRenderer` tries to render a `Visual` with missing required fields (e.g., `type` is still undefined mid-stream), React crashes.

**Solution:** Route all streaming updates through `draftScene` and only promote complete, validated fields to `activeScene`:

- [ ] All stream chunk updates call `setDraftScene(partial)` on the scene slice — never `setScene` or `updateScene` directly during streaming
- [ ] After each chunk, validate each top-level field independently:
  - `title`: `typeof draft.title === 'string'` → promote immediately
  - `visuals[i]`: only promote a visual when it has at minimum `{ id, type, position, initialState }` — validated with a partial Zod check
  - `steps`: promote only complete `Step` objects (has `index` and `actions` array)
  - `controls`, `explanation`, `challenges`: promote each array item individually when complete
- [ ] Promotion via `promoteDraftField('title')`, `promoteDraftField('visuals')` etc. from the scene slice
- [ ] `SceneRenderer` always reads from `activeScene`, never `draftScene` — rendering is always against validated data
- [ ] On stream completion: run `safeParseScene(draftScene)` as a full validation; on failure trigger auto-retry

### 7.11 — Slug generation + navigation
Create `apps/web/src/lib/slug.ts`:
- [ ] `generateSlug(topic: string): string` — slugifies topic + appends 6-char nanoid for uniqueness
  - `"How does a hash table work?" → "how-does-a-hash-table-work-x7k2p1"`
  - Pre-built slugs (phase 5) are clean: `"hash-tables"` (no random suffix)
- [ ] Navigation flow: user submits → `generateSlug(topic)` → `router.push('/s/[slug]')` → streaming begins

---

## Exit Criteria
- [ ] Typing "How does a B-Tree work?" in landing textarea → navigates to `/s/how-does-a-b-tree-work-[id]` → streaming skeleton shows → visuals fade in progressively
- [ ] Generated scene is valid per Zod schema (no validation errors)
- [ ] Failed validation triggers one auto-retry
- [ ] BYOK: using an OpenAI/Anthropic/Gemini key from settings → `/api/generate` is NOT called (verify in Network tab — no request to that route)
- [ ] Streaming a large scene never crashes the renderer mid-stream (partial visuals with missing fields are not passed to `SceneRenderer`)
- [ ] Rate limit returns 429 after 15 requests from same IP (when Supabase is wired)
- [ ] `detectMode("def twoSum...")` returns `'dsa'`
- [ ] `detectMode("How does DNS work?")` returns `'concept'`
- [ ] Confirmation dialog appears for DSA detection

---

## Key Notes
- **BYOK keys must never reach the server.** The `/api/generate` route must never accept or forward API key headers. BYOK always runs browser-direct via `generateSceneBrowserDirect.ts`. This is the only correct path.
- `streamObject` from Vercel AI SDK handles the streaming JSON parsing — don't reinvent this
- All streaming updates go to `draftScene` first, not `activeScene` — the renderer only sees `activeScene` which only receives fully validated fields
- The Zod schema must exactly match what the AI is instructed to generate in the prompt. Any mismatch = guaranteed validation failures.
- Rate limiting in Phase 7 can be a simple in-memory counter as a stub; Phase 11 replaces it with Supabase-backed IP counters
- Slug format: pre-built = clean slug, AI-generated = topic-slug + nanoid. This distinction matters for cache lookup in Phase 11.
- For BYOK via browser-direct: instantiate the AI provider client-side using the key from `settings-store`, call `streamObject` directly. This bypasses the `/api/generate` route entirely.
