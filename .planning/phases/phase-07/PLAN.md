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
- [ ] BYOK case: client sends API key header → server uses provided key instead of its own
  - **Important:** BYOK keys are sent from client in request header `X-API-Key` ONLY for this endpoint, OR client calls AI SDK directly from browser. Prefer browser-direct for BYOK to avoid key logging.
- [ ] Error handling: 429 on rate limit, 400 on invalid topic, 500 on AI failure

### 7.5 — Client-side streaming hook
Create `apps/web/src/engine/hooks/useStreamScene.ts`:
- [ ] `useStreamScene(topic: string): { isStreaming, streamedFields, error, retry }`
- [ ] Calls `/api/generate` via `fetch` with streaming response
- [ ] Parses each stream chunk with Vercel AI SDK `parseStreamPart()`
- [ ] Dispatches to `scene-store`: `setStreaming(true)`, `updateScene(partial)`, `markFieldStreamed(field)`
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

### 7.9 — Slug generation + navigation
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
- [ ] BYOK: using a Gemini API key from settings → uses that key instead of server key
- [ ] Rate limit returns 429 after 15 requests from same IP (when Supabase is wired)
- [ ] `detectMode("def twoSum...")` returns `'dsa'`
- [ ] `detectMode("How does DNS work?")` returns `'concept'`
- [ ] Confirmation dialog appears for DSA detection

---

## Key Notes
- **BYOK keys must never be logged server-side.** For BYOK: either client calls AI SDK directly from browser, or key is passed as a header and NOT logged. Prefer browser-direct for BYOK.
- `streamObject` from Vercel AI SDK handles the streaming JSON parsing — don't reinvent this
- The Zod schema must exactly match what the AI is instructed to generate in the prompt. Any mismatch = guaranteed validation failures.
- Rate limiting in Phase 7 can be a simple in-memory counter as a stub; Phase 11 replaces it with Supabase-backed IP counters
- Slug format: pre-built = clean slug, AI-generated = topic-slug + nanoid. This distinction matters for cache lookup in Phase 11.
- For BYOK via browser-direct: instantiate the AI provider client-side using the key from `settings-store`, call `streamObject` directly. This bypasses the `/api/generate` route entirely.
