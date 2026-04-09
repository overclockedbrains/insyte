# Phase 16 - Core Correctness + Runtime Hardening

**Goal:** Resolve the post-launch correctness, sandbox, state-management, and maintainability issues captured in `.planning/things_to_fix`, with concrete implementation steps tied to the actual repo layout.

**Entry criteria:** Phase 15 closed. `.planning/things_to_fix` has been audited against the repo and translated into file-level work.

**Status:** Planned as of April 10, 2026.

---

## Scope Rules

- This phase is for correctness, runtime safety, data integrity, and low-risk cleanup that already has user-facing or engineering impact.
- No net-new product features, broad visual redesigns, or speculative R2 experimentation.
- When a fix needs SQL or generated types, implementation must update both code and the relevant repo setup artifacts in the same change.
- Every item from `.planning/things_to_fix` is accounted for in this document so the source note can be safely deleted after review.

---

## Repo-Verified Adjustments From The Audit

- The `useIsMobile` duplication now exists in 3 files, not 5: `apps/web/components/chat/ChatCard.tsx`, `apps/web/components/landing/UnifiedInput.tsx`, and `apps/web/src/engine/controls/PlaybackControls.tsx`.
- `parseTextStreamChunk()` in `apps/web/components/chat/useChatStream.ts` is confirmed to be a no-op while all related routes currently use `toTextStreamResponse()`. Phase 16 should remove the dead helper/comment instead of implementing a fake protocol parser.
- `setUser()` in `apps/web/src/stores/slices/auth-slice.ts` currently has no call sites. Removing it is low-risk and should happen before more auth code depends on it.
- `LayoutType` and `traceToScene()` currently have no internal repo usages. Removing them is safe inside this codebase; `LayoutType` should still be treated as a small public API cleanup for `scene-engine`.

---

## Objectives

### 16.1 - Sandbox isolation and execution resilience
- [ ] Move Python execution off the main UI thread.
- [ ] Add `apps/web/src/sandbox/workers/pyodide-sandbox.worker.ts` and move Pyodide initialization/execution into the worker.
- [ ] Refactor `apps/web/src/sandbox/PyodideRunner.ts` into a worker-backed controller instead of loading `window.loadPyodide` on the main thread.
- [ ] Mirror the `JSRunner` message contract so the manager owns progress events, final trace payloads, timeout handling, and fatal error recovery in one place.
- [ ] Enforce a hard kill timeout of about 8 seconds for Python runs; terminate and recreate the worker after timeout or fatal runtime corruption.
- [ ] Remove the Pyodide singleton entrypoint and make `apps/web/src/sandbox/SandboxManager.ts` the sole owner of one `JSRunner` instance and one `PyodideRunner` instance.
- [ ] Keep sandbox execution single-flight but user-friendly.
- [ ] Preserve the "one run at a time" rule in `apps/web/src/sandbox/JSRunner.ts`, but replace the raw busy rejection with a domain-specific message that `useDSAPipeline` can surface cleanly.
- [ ] Apply the same single-flight rule to the new Python worker runner; do not add a run queue.
- [ ] On `PyodideRunner.execute()` failure, clear cached initialization state so the next run boots a fresh worker/runtime instead of reusing a poisoned one.
- [ ] Verification:
- [ ] Manual: `while True: pass` or equivalent infinite-loop input must timeout without freezing the tab.
- [ ] Manual: trigger DSA run twice rapidly and confirm the second action shows a friendly "run already in progress" message.
- [ ] Manual: after a Python failure, rerun valid code and confirm execution succeeds without full page refresh.

### 16.2 - Chat, generation, and route correctness
- [ ] Restore chat memory across turns.
- [ ] Remove the erroneous `history.slice(0, -1)` in `apps/web/src/ai/liveChat.ts`.
- [ ] Keep `apps/web/components/chat/useChatStream.ts` as the source of truth for pre-stripped history.
- [ ] Send authenticated user IDs on scene generation.
- [ ] In `apps/web/src/engine/hooks/useStreamScene.ts`, read `useBoundStore.getState().user?.id` and include `x-user-id` whenever present.
- [ ] Keep `/api/generate` user-history logging unchanged once the client starts sending the header.
- [ ] Remove dead chat stream parsing code.
- [ ] Delete `parseTextStreamChunk()` and the stale protocol comments from `apps/web/components/chat/useChatStream.ts`.
- [ ] Stream raw decoded text directly because the current server routes already use `toTextStreamResponse()`.
- [ ] Unify language validation across DSA routes.
- [ ] Add a shared `isValidLanguage()` guard to `apps/web/src/sandbox/types.ts`.
- [ ] Use it in both `apps/web/app/api/instrument/route.ts` and `apps/web/app/api/visualize-trace/route.ts`.
- [ ] Keep `detectLanguage()` only if heuristic fallback is still needed in `instrument/route.ts`; do not duplicate the literal `'python' | 'javascript'` guard logic.
- [ ] Remove the unused `traceToScene()` async generator from `apps/web/src/ai/traceToScene.ts`.
- [ ] Verification:
- [ ] Manual: a 3-turn chat should remember the previous assistant reply.
- [ ] Manual: signed-in generation should create a row in `user_generated_scenes`.
- [ ] Manual: chat text must stream cleanly with no protocol prefixes or broken patch delimiters.
- [ ] Manual: instrument and visualize routes must reject invalid language values consistently.

### 16.3 - Store lifecycle and shared UI behavior
- [ ] Move patch-glow timer ownership into the UI layer.
- [ ] Replace the timeout inside `apps/web/src/stores/slices/scene-slice.ts` with a pure state setter or trigger that only flips the glow flag on.
- [ ] Add cleanup-driven timeout management in `apps/web/src/engine/layouts/CanvasCard.tsx` so unmount and expand transitions cannot leave stale timers behind.
- [ ] Fix stale `latestTrace` exposure in `apps/web/src/engine/hooks/useDSAPipeline.ts`.
- [ ] Replace the memoized `latestTrace: latestTraceRef.current` snapshot with reactive state or a stable ref-based API that actually changes when new trace data arrives.
- [ ] Deduplicate playback actions across stores.
- [ ] Extract a shared factory such as `apps/web/src/stores/shared/playbackActions.ts`.
- [ ] Reuse it from `apps/web/src/stores/slices/playback-slice.ts` and `apps/web/src/stores/player-store.ts`.
- [ ] Remove the circular `export type { BoundStore }` re-export from `apps/web/src/stores/slices/playback-slice.ts`.
- [ ] Unify viewport breakpoint hooks.
- [ ] Create `apps/web/components/hooks/useMediaQuery.ts` plus a semantic `useIsMobile()` helper using the canonical mobile boundary of `max-width: 767px` to match Tailwind's `md` breakpoint.
- [ ] Replace the remaining local `matchMedia` implementations in `ChatCard.tsx`, `UnifiedInput.tsx`, and `PlaybackControls.tsx`.
- [ ] Replace inline SVG playback icons in `apps/web/src/engine/controls/PlaybackControls.tsx` with `lucide-react` equivalents.
- [ ] Remove `setUser` from `apps/web/src/stores/slices/auth-slice.ts` and make `setSession()` the only public auth-state mutation entrypoint.
- [ ] Verification:
- [ ] Manual: patch glow still appears once per successful chat patch and never lingers after unmount or expand transitions.
- [ ] Manual: `latestTrace` consumers see fresh data after reruns.
- [ ] Manual: playback behavior stays identical in both the global simulation store and the isolated landing/demo player store.
- [ ] Manual: the 767px/768px boundary no longer causes layout flicker between components.

### 16.4 - Supabase integrity, background writes, and typing
- [ ] Make hit counting atomic.
- [ ] Replace the read-modify-write logic in `apps/web/lib/supabase.ts` with a server-side RPC call such as `increment_hit_count(slug_arg text)`.
- [ ] Update the repo's Supabase SQL/setup artifacts to define that function when implementation lands.
- [ ] Deduplicate rate-limit window calculation.
- [ ] Extract `getCurrentWindowStart()` in `apps/web/lib/supabase.ts` and reuse it in both `getRateLimitStatus()` and `checkAndIncrementRateLimit()`.
- [ ] Remove empty fire-and-forget `.then(() => {})` chains.
- [ ] For `saveQueryHash()` and `recordUserGeneration()`, replace the dead `.then(() => {})` usage with either bare `void` or a small best-effort logging wrapper that surfaces Supabase errors without blocking the request path.
- [ ] Do the same cleanup around any remaining follow-up writes after the hit-count RPC migration.
- [ ] Stop hand-maintaining Supabase schema types.
- [ ] Generate `apps/web/lib/database.types.ts` and import it into `apps/web/lib/supabase.ts`.
- [ ] Add `supabase:types` to `apps/web/package.json` using the linked-project CLI workflow so schema refresh is intentional and repeatable.
- [ ] Verification:
- [ ] Manual or SQL test: concurrent page loads increment `hit_count` without lost updates.
- [ ] Manual: rate-limit status and rate-limit increment use the same reset boundary.
- [ ] Manual: background writes do not leave unhandled promise noise and still log failures when they occur.
- [ ] Manual: generated types cover `user_generated_scenes`, `saved_scenes`, `query_hashes`, and other tables already used in code.

### 16.5 - Settings, provider typing, and small API cleanup
- [ ] Derive provider-key state from the provider registry.
- [ ] Build the initial `apiKeys` record and `clearAllKeys()` reset state from `REGISTRY` in `apps/web/src/stores/slices/settings-slice.ts`.
- [ ] Remove the `Provider` re-export from the settings slice.
- [ ] Update current imports in `apps/web/app/settings/page.tsx` and `apps/web/components/layout/Navbar.tsx` to source `Provider` from `apps/web/src/ai/registry.ts`.
- [ ] Verification:
- [ ] Adding a new provider should require updating `registry.ts`, not multiple store call sites.
- [ ] Settings page and navbar should continue to type-check after the import cleanup.

### 16.6 - Repo cleanup and public surface trim
- [ ] Remove unused variables causing lint noise.
- [ ] Delete `typeIcon` from `apps/web/components/explore/TopicCard.tsx`.
- [ ] Delete unused `NodePill` and `Connector` helpers from `apps/web/components/landing/HeroLoop.tsx`.
- [ ] Remove deprecated `LayoutType` from the `scene-engine` public API.
- [ ] Delete the alias from `packages/scene-engine/src/types.ts`.
- [ ] Remove the re-export from `packages/scene-engine/src/index.ts`.
- [ ] Treat this as a package-surface cleanup and call it out in notes if external consumers appear later.
- [ ] Verification:
- [ ] `eslint` runs clean for the affected files.
- [ ] `rg "\bLayoutType\b" .` returns no repo usages after cleanup.

---

## Delivery Order

1. Sandbox isolation and execution resilience
2. Chat and generation correctness
3. Store lifecycle and playback deduplication
4. Supabase integrity and type generation
5. Settings, lint cleanup, and public API trim

---

## Exit Criteria

- [ ] Python DSA execution no longer runs on the main thread.
- [ ] Chat memory, signed-in generation history, and DSA route validation are all correct end-to-end.
- [ ] No stale store timers or stale trace references remain in the verified paths.
- [ ] Playback logic is shared instead of duplicated.
- [ ] Supabase hit counting is atomic and schema types are generated instead of hand-maintained.
- [ ] No item from `.planning/things_to_fix` remains unmapped or undocumented.

---

## Coverage Check Against `.planning/things_to_fix`

| Audit item | Planned in | Repo note |
|---|---|---|
| 1. Pyodide runs on main UI thread | 16.1 | Worker-backed Python sandbox |
| 2. AI chat loses memory every turn | 16.2 | Remove bad history slicing in `liveChat.ts` |
| 3. User history is never recorded | 16.2 | Add `x-user-id` in `useStreamScene.ts` |
| 4. `incrementHitCount` race condition | 16.4 | Replace with atomic RPC |
| 5. `triggerGlow` leaks timer | 16.3 | Move timer lifecycle into `CanvasCard.tsx` |
| 6. `latestTrace` stale in `useDSAPipeline` | 16.3 | Make latest trace reactive |
| 7. `parseTextStreamChunk` no-op | 16.2 | Remove helper and stale protocol comment |
| 8. Duplicated playback logic | 16.3 | Shared playback action factory |
| 9. `useIsMobile` copy-paste | 16.3 | Repo now has 3 remaining copies |
| 10. `PlaybackControls` inline SVGs | 16.3 | Replace with `lucide-react` icons |
| 11. Rate-limit window calc duplicated | 16.4 | Shared helper in `supabase.ts` |
| 12. Dead `.then(() => {})` fire-and-forget | 16.4 | Remove empty chains and keep best-effort writes explicit |
| 13. `setUser` can desync auth state | 16.3 | Remove `setUser`, keep `setSession` only |
| 14. Circular `BoundStore` re-export | 16.3 | Delete re-export from `playback-slice.ts` |
| 15. Manual `Database` interface will drift | 16.4 | Generate `database.types.ts` and add script |
| 16. `traceToScene` dead export | 16.2 | Remove unused async generator |
| 17. `JSRunner` busy rejection is unfriendly | 16.1 | Keep single-flight, show proper message |
| 18. `PyodideRunner` never resets after fatal error | 16.1 | Fresh worker/runtime after failure |
| 19. Language validation duplicated across routes | 16.2 | Shared guard in `sandbox/types.ts` |
| 20. `apiKeys` hardcodes provider names | 16.5 | Derive from `REGISTRY` |
| 21. `Provider` re-exported via settings slice | 16.5 | Remove indirection and update imports |
| 22. `SandboxManager` runner ownership asymmetric | 16.1 | Manager owns both runners directly |
| 23. Unused variables in `TopicCard` and `HeroLoop` | 16.6 | Lint cleanup |
| 24. Deprecated `LayoutType` still exported | 16.6 | Remove alias and re-export |

---

## Deletion Check

- Nothing from `.planning/things_to_fix` is deferred outside this phase.
- The only work not absorbed here is the separate, broad UI audit backlog already called out as a future post-Phase-15 UX phase, and those items were never part of `.planning/things_to_fix`.
- After review, `.planning/things_to_fix` should be safe to delete because this phase document is now the concrete implementation source of truth.
