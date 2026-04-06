# Debug Session: "No visuals defined in this scene"

> Written to allow continuation in a second chat.
> Last updated: 2026-04-06

---

## Problem Statement

After navigating to an AI-generated slug (`/s/<slug>`), the canvas always showed
**"No visuals defined in this scene."** even though the `/api/generate` route
successfully streamed a valid JSON scene from Gemini.

---

## Root Causes Found (all fixed)

### 1. Stale closure bug — `setScene(minimal)` fired on every partial

**Where:** `useStreamScene.ts` → `runStream` → `handlePartial`

`activeScene` was read from a `useBoundStore` selector inside a `useCallback`.
Because it was excluded from the dependency array, it was always `null` inside
the callback. So the guard `if (!activeScene)` was always true, and
`setScene({ visuals: [], steps: [], ... })` fired on EVERY streamed partial,
wiping already-promoted visuals back to an empty array.

**Fix:** replaced the selector-read guard with a local `let hasInitializedScene = false`
flag that flips once, and used `useBoundStore.getState().activeScene` (store
snapshot, not stale closure) as the secondary guard.

```ts
let hasInitializedScene = false

const handlePartial = (partial: DeepPartial<Scene>) => {
  setDraftScene(partial)
  if (!hasInitializedScene && partial.id && partial.title && partial.type && partial.layout) {
    hasInitializedScene = true
    if (!useBoundStore.getState().activeScene) {
      setScene({ id, title, type, layout, visuals: [], steps: [], controls: [], explanation: [], popups: [] })
    }
  }
  promoteFields(partial, promoteDraftField)
}
```

---

### 2. Gemini 2.5 Flash token truncation (`finishReason: 'length'`)

**Where:** `apps/web/src/ai/generateScene.ts`

Gemini 2.5 Flash is a **thinking model**. Its reasoning tokens count against
`maxOutputTokens`. With the default `8192`, only ~315 text tokens were left for
the actual JSON output — scene was always truncated mid-JSON.

Server logs confirmed: `reasoningTokens: 7860`, `textTokens: 315`, `finishReason: 'length'`

**Fix:** increased to `maxOutputTokens: 16384`.

```ts
return streamObject({
  model,
  schema: SceneSchema,
  prompt,
  maxOutputTokens: 16384,
  maxRetries: 0,
})
```

Note: `providerOptions.google.thinkingConfig.thinkingBudget: 0` was tested to
disable thinking entirely but was commented out — re-enable if latency is a
concern (Gemini's thinking phase causes ~22s silence before first JSON byte).

---

### 3. Null optional fields from Gemini failing Zod validation

**Where:** `packages/scene-engine/src/schema.ts`

Zod's `.optional()` accepts `undefined` but **rejects `null`**. Gemini frequently
emits `"challenges": null`, `"code": null`, `"tags": null` etc. for optional fields.
This caused `safeParseScene` to return `{ success: false }` even for otherwise
valid scenes, so they were never cached.

**Fix:** added a `nullish` helper that coerces `null → undefined`:

```ts
const nullish = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().or(z.null().transform((): undefined => undefined))

export const SceneSchema = z.object({
  // ...
  description: nullish(z.string()),
  category: nullish(z.string()),
  tags: nullish(z.array(z.string())),
  code: nullish(SceneCodeSchema),
  challenges: nullish(z.array(ChallengeSchema)),
  complexity: nullish(z.object({ time: z.string().optional(), space: z.string().optional() })),
  // required arrays remain z.array(...) — not nullish
})
```

---

### 4. Slug mismatch — Supabase cache never hit

**Where:** `apps/web/app/api/generate/route.ts` + `apps/web/src/lib/slug.ts`

`generateSlug(topic)` always appends a **new random `nanoid(6)` suffix**.
The URL slug was generated once at navigation time; `route.ts` called
`generateSlug(topic)` again after streaming — producing a different slug.
So `saveScene` stored the scene under a key that never matched the URL.

**Fix:** the URL slug is now included in the POST body and used directly:

```ts
// route.ts — body parsing
let slug: string | undefined
// ...
slug = body?.slug?.trim() || undefined

// route.ts — cache write
const saveSlug = slug ?? generateSlug(topic)
await saveScene(saveSlug, parsed.scene)
aiLog.cache('saved', saveSlug)
```

```ts
// useStreamScene.ts — startStreaming
const startStreaming = useCallback(
  (topic: string, slug?: string) => {
    lastTopicRef.current = topic
    lastSlugRef.current = slug
    retryCountRef.current = 0
    void runStream(topic, slug)
  }, [runStream],
)

// streamViaServerRoute — fetch body
body: JSON.stringify({ topic, slug }),
```

```tsx
// StreamingView.tsx
export function StreamingView({ topic, slug }: StreamingViewProps) {
  useEffect(() => {
    startStreaming(topic, slug)
    return () => abort()
  }, [topic, slug])
}
```

---

### 5. Error card never shown — `clearScene()` missing on terminal failure

**Where:** `useStreamScene.ts` → `handleValidationError` + server route error handler

When both retries failed, `activeScene` still held the minimal scaffold
`{ visuals: [], ... }`. `StreamingView` saw a non-null `activeScene` and
rendered `SimulationLayout` → "No visuals defined" instead of the error card.

**Fix:** call `clearScene()` in both terminal failure branches before `setError`:

```ts
// validation terminal failure
} else {
  retryCountRef.current = 0
  setStreaming(false)
  clearScene()
  setError(msg)
}

// server route terminal failure
} else {
  retryCountRef.current = 0
  setStreaming(false)
  clearScene()
  setError(err.message)
}
```

---

### 6. StrictMode double-invoke — stale stream completing after abort

**Where:** `StreamingView.tsx` → `useEffect`

React StrictMode double-mounts: mount → cleanup → mount.
The first (cancelled) stream's `onComplete` was still calling `setScene`
after the abort signal fired, racing with the second real stream.

**Fix:** `abort()` is returned from `useStreamScene` and called in the cleanup:

```tsx
useEffect(() => {
  startStreaming(topic, slug)
  return () => abort()
}, [topic, slug])
```

And inside `streamViaServerRoute`, abort is checked before `onComplete` fires:

```ts
if (signal?.aborted) return

const { value: final } = await parsePartialJson(accumulated)
if (final && typeof final === 'object') {
  onComplete(final as unknown as Scene)
}
```

---

### 7. ESLint: `runStream` accessed before declaration (circular self-ref)

**Where:** `useStreamScene.ts`

`handleValidationError` inside `runStream` tried to call `runStream` itself
(TDZ — the `const` wasn't declared yet at call site evaluation).

**Fix:** `runStreamRef` pattern — a ref updated via `useEffect` that retries
always call through:

```ts
const runStreamRef = useRef<(topic: string, slug?: string) => void>(() => {})

// inside runStream:
setTimeout(() => runStreamRef.current(t, slug), 500)

// after useCallback:
useEffect(() => { runStreamRef.current = runStream }, [runStream])
```

---

## Why There Are Always 3 Requests Per Page Load

This is a known pattern, not a bug (mostly):

| Request | Cause | Outcome |
|---------|-------|---------|
| #1 | StrictMode double-mount fires `startStreaming`, then cleanup `abort()` fires immediately | Aborted cleanly |
| #2 | Second mount fires `startStreaming` again. Gemini's thinking phase (~22s) emits NO bytes to the client. The AI SDK or HTTP layer interprets the silence as a completed empty stream. `onComplete` receives `{}` → validation fails → retry fires | Triggers request #3 |
| #3 | Retry of #2 — this one succeeds (Gemini thinking is done, JSON flows) | Actual success |

The 22s silent thinking phase is the core driver of the spurious retry. Options:
- Set `thinkingBudget: 0` in `providerOptions` to disable thinking (faster, less accurate)
- Accept 3 requests as the cost of using a thinking model

---

## Files Changed

| File | What Changed |
|------|-------------|
| `apps/web/src/engine/hooks/useStreamScene.ts` | Stale closure fix, runStreamRef, slug threading, clearScene on failure, abort check |
| `packages/scene-engine/src/schema.ts` | `nullish` helper, applied to optional Gemini fields |
| `apps/web/components/simulation/StreamingView.tsx` | Destructure `slug`, pass to `startStreaming`, abort cleanup |
| `apps/web/app/api/generate/route.ts` | Parse `slug` from body, use it in `saveScene`, aiLog calls |
| `apps/web/lib/ai-logger.ts` | NEW — debug logger toggled by `DEBUG_AI=true` in `.env.local` |
| `apps/web/src/ai/generateScene.ts` | `maxOutputTokens: 16384` |

---

## Current State After All Fixes

All 6 bugs above are fixed. The flow should now work as:

1. User visits `/s/<slug>` → `ScenePageClient` renders `StreamingView` with `topic` + `slug`
2. `StreamingView` calls `startStreaming(topic, slug)` on mount
3. `useStreamScene` POSTs `{ topic, slug }` to `/api/generate`
4. Server streams JSON; partials promote fields progressively into `activeScene`
5. On complete: `validateGeneratedScene` runs, `setScene(validatedScene)` sets full scene
6. Scene is saved to Supabase under the correct URL slug
7. On error (both retries failed): `clearScene()` → error card renders

---

## Remaining Nice-to-Haves (not bugs)

- **Disable Gemini thinking** to eliminate the ~22s silent phase and the spurious 3rd request:
  ```ts
  providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } }
  ```
  Uncomment in `generateScene.ts`. Trade-off: faster but less reasoning quality.

- **Cache lookup before streaming**: check Supabase for the slug before hitting Gemini.
  Already wired in `page.tsx` via `getCachedScene(slug)` — verify this path works
  now that saves use the correct slug.

- **`DEBUG_AI=true`** in `.env.local` enables server-side AI route logging:
  `[AI:request]`, `[AI:complete]` (with token counts), `[AI:cache]`, `[AI:error]`
