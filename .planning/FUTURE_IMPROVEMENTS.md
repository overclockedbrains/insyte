# Future Improvements & Risks Register

> **Status as of April 4, 2026:** All items in this register have been addressed in their respective phase plans. This file is now a **closed reference log** — do not add new items here. Future risks discovered during implementation should be added directly as tasks to the relevant phase plan, or captured as a new phase if they are cross-cutting.

---

## 1. Scene Engine Expansion: Visual Primitives

* **Generic 2D `grid` / `matrix`**:
  * **→ RESOLVED: Phase 3, Task 3.14 (`GridViz`).**
  * A true `GridViz` primitive with `wall/empty/visited/path/start/end` cell states is planned. `number-of-islands.json` (Phase 9) is updated to use `type: 'grid'` instead of the `GraphViz` workaround.

* **Complex `call-stack-frame`** with local variables:
  * **→ DEFERRED to R2.** Not needed for any of the 24 R1 simulations. `StackViz` covers the JS Event Loop simulation adequately.

* **`timeline` / `sequence-diagram`** with swimlanes:
  * **→ DEFERRED to R2.** DNS resolution and distributed system simulations use `SystemDiagramViz` with `DataFlowDot` paths in R1, which is sufficient. A dedicated `TimelineViz` primitive is a natural R2 addition for TCP handshake, HTTP/2 multiplexing, and similar temporal flows.

* **`string` / `text-stream`** visualizer with highlight ranges:
  * **→ DEFERRED to R2.** No R1 simulation requires it. Regex/tokenizer visualizations are an R2 use case.

* **`n-ary-tree`** (`children: string[]` schema for Trie):
  * **→ ALREADY RESOLVED in Phase 3, Task 3.5.** `TreeViz` state shape uses `children: string[]` (N-ary, not `leftId/rightId`). The `trie.json` simulation (Phase 10) uses `TreeViz` directly. This concern was based on an earlier draft of the schema.

---

## 2. AI Architecture & Streaming Mechanisms

* **UI crashing during partial JSON streaming**:
  * **→ RESOLVED: Phase 7, Task 7.10 (Draft Store).**
  * All stream chunks go to `draftScene` first. Only fields that pass individual Zod validation are promoted to `activeScene`. `SceneRenderer` only ever reads from `activeScene` — no partial visuals reach the renderer.

* **Lost caching opportunities (duplicate nanoid slugs for identical queries)**:
  * **→ RESOLVED: Phase 11, Task 11.10 (query_hashes table).**
  * A `query_hashes` table stores `SHA-256(normalizedQuery) → scene_slug`. Before generating, `/api/generate` checks for an existing hash match and redirects to the cached slug.

* **Hallucinated visual IDs in chat patches**:
  * **→ RESOLVED: Phase 8, Task 8.2 (applyDiff error types).**
  * `applyDiff` throws `MissingVisualError` or `MissingPopupError` when a patch targets an ID that does not exist in the scene. The `useChatStream` handler catches these errors and shows an inline message in the chat card — the simulation never crashes.

---

## 3. Application State & Playback

* **The "Sliced" Store Pattern (cross-store race conditions)**:
  * **→ RESOLVED: Phase 2, Task 2.4 (Zustand combined store).**
  * All state lives in one `useBoundStore` combining five slices with `immer` + `persist`. Cross-slice actions (e.g., a chat patch that also pauses playback) call `set()` once atomically.

* **Playback desync during timeline patching**:
  * **→ RESOLVED: Phase 8, Task 8.2 (PlaybackIntent).**
  * `applyDiff` returns `{ scene, intent: PlaybackIntent }`. The `useChatStream` handler resolves the intent against the playback slice in one `set()` call — no race condition possible with a single combined store.

---

## 4. DSA Pipeline & Execution Sandbox

* **Main thread OOM from Web Worker deep copies (O(n²) traces)**:
  * **→ RESOLVED: Phase 9, Task 9.7 (step limit + delta capture in instrumentation prompt).**
  * The `code-instrumentation.md` prompt requires a 1000-step guard and delta-only `vars` capture. `TraceData` gains a `truncated: boolean` field; the renderer shows a warning when truncation occurs.

* **Pyodide initialization WASM caching**:
  * **→ RESOLVED: Phase 9, Task 9.11 (serwist service worker).**
  * `@serwist/next` configures a `CacheFirst` strategy for `/pyodide/**`. Subsequent sessions load WASM from the service worker cache, not the network.

* **Global COOP/COEP header breakages**:
  * **→ ALREADY RESOLVED in Phase 9, Task 9.3 and Phase 12, Task 12.7.**
  * COOP/COEP headers are scoped exclusively to the `/pyodide/(.*)` path. All other routes use a separate CSP header block. External images (Supabase OG images) and fonts are not affected.

---

## 5. Security & BYOK

* **Server-side API key logging**:
  * **→ RESOLVED: Phase 7, Task 7.9 (browser-direct generation) + Task 7.4 update.**
  * The `/api/generate` route no longer accepts or forwards any API key headers. When a BYOK key is present in `settings-store`, `generateSceneBrowserDirect.ts` is called client-side — the key never touches the server.

* **XSS via `localStorage`**:
  * **→ RESOLVED: Phase 12, Task 12.7 (CSP headers).**
  * A `Content-Security-Policy` header is configured for all non-Pyodide routes, including `worker-src 'self' blob:` to lock down Web Worker origins. The `'unsafe-eval'` requirement is documented as a Pyodide limitation with risk context.

---

*Closed: April 4, 2026. All items addressed. Future implementation risks belong in phase plan files, not this register.*
