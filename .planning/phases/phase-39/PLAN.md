# Phase 39 — Smart Generation Flow + Pipeline Error UX

> Decisions reference: `DECISIONS.md`

> **Status** : COMPLETE

---

## Goal

Two parallel tracks:
- **Track A**: Replace vague error states on `/s/[slug]` with typed, actionable error cards. Remove blind auto-retry for provider rate-limit / overload responses.
- **Track B**: Replace the manual mode selector + immediate generation with a smart pre-gen screen — AI derives mode + generates scoped questions, user picks depth + familiarity presets, then confirms to start generation.

---

## Current State (What Exists)

| Area | Current behavior |
|------|-----------------|
| Error UI | `StreamingError.tsx` — generic message + retry button, only 429 detected (shows "Add BYOK key") |
| Auto-retry | `useStreamScene.ts` retries `retryable: true` errors automatically (`CLIENT_MAX_RETRIES`) |
| Mode selection | `detectMode()` keyword regex in `detection-slice.ts`, fires on keystroke, passed as URL param |
| Generation start | User lands on `/s/[slug]?topic=...` → streaming begins immediately |
| Pipeline events | `{ type: 'error', stage, message, retryable }` — no error type/code field |

---

## Track A — Pipeline Error UX

### A1 — Add `errorCode` to pipeline error events

**Files:** `apps/web/src/ai/pipeline.ts` · provider files in `src/ai/providers/`

Detect provider-level HTTP error codes and surface them as a typed field on the error event.

```ts
// Extend error event shape
type ErrorEvent = {
  type: 'error'
  stage: number
  message: string
  retryable: boolean
  errorCode: 'rate_limit' | 'overloaded' | 'unknown'  // NEW
}
```

- In `retryStage`: catch provider errors, inspect status code / error message string
  - 429 or message contains "quota" / "rate limit" → `errorCode: 'rate_limit'`
  - 503 or message contains "overloaded" / "high demand" / "unavailable" → `errorCode: 'overloaded'`
  - Everything else → `errorCode: 'unknown'`
- Pass `errorCode` through in `api/generate/route.ts` SSE emit

### A2 — Remove auto-retry for rate-limit / overload in client

**File:** `apps/web/src/engine/hooks/useStreamScene.ts`

Currently the client retries any `retryable: true` error automatically. Change this:

- If `errorCode === 'rate_limit'` or `errorCode === 'overloaded'` → **do not auto-retry**, immediately surface error to user
- Only auto-retry `errorCode === 'unknown'` errors (transient failures worth retrying)

### A3 — Improve `StreamingError` component

**File:** `apps/web/components/simulation/StreamingError.tsx`

Replace the single-message component with an error card that maps `errorCode` to a specific message + suggested action:

| errorCode | Message | Suggested action |
|-----------|---------|-----------------|
| `rate_limit` | "Rate limit reached for this provider" | "Switch provider in settings or try again later" |
| `overloaded` | "Provider is handling too many requests right now" | "Try again in a moment" |
| `unknown` | "Something went wrong during generation" | "Try again" |

Always show a manual **Retry** button regardless of error type.

---

## Track B — Smart Generation Flow

### B1 — New `/api/pre-gen` endpoint

**File:** `apps/web/app/api/pre-gen/route.ts` (new)

Lightweight endpoint that derives mode + generates scoped questions in a single AI call.

```ts
// POST /api/pre-gen
// Input
{ topic: string }

// Output
{
  mode: 'concept' | 'dsa' | 'lld' | 'hld'
  questions: string[]   // max 3, scoped to derived mode
}
```

- Use cheapest fast model (Gemini Flash / equivalent)
- Structured output via Zod schema — `mode` enum + `questions` array (max length 3)
- Prompt instructs AI: derive mode from topic, then generate up to 3 clarifying questions that would meaningfully improve the scene — mode-scoped (DSA questions differ from HLD questions)
- Target latency: < 3s

### B2 — Extend `/api/generate` to accept generation config

**File:** `apps/web/app/api/generate/route.ts`

Extend the request body:

```ts
// Existing
{ topic: string, slug?: string, mode?: SceneType }

// Extended
{
  topic: string
  slug?: string
  mode: SceneType                          // now required (derived by pre-gen)
  depth: 'quick' | 'standard' | 'deep'    // NEW
  familiarity: 'new' | 'basics' | 'familiar'  // NEW
  answers: string[]                        // NEW — user's question answers (max 3)
}
```

Forward `depth`, `familiarity`, `answers` into `generateScene()`.

### B3 — Update pipeline to use generation config

**File:** `apps/web/src/ai/pipeline.ts`

Pass `depth`, `familiarity`, `answers` through as a `GenerationConfig` param.

**Step count target (injected into Stage 1 / Stage 2 prompts):**

| depth | target steps |
|-------|-------------|
| quick | 6–8 |
| standard | 10–12 |
| deep | 15–18 |

**Familiarity (injected into Stage 0 system prompt + Stage 2):**

| familiarity | instruction |
|-------------|------------|
| new | "Explain all concepts from first principles. Avoid jargon. Use simple analogies." |
| basics | "Assume basic familiarity. Define technical terms but don't over-explain fundamentals." |
| familiar | "Assume solid prior knowledge. Focus on depth, edge cases, and nuance." |

**Question answers:** Append to the topic string passed into Stage 0 as additional context block:
```
Topic: <topic>
Additional context from user:
- <answer 1>
- <answer 2>
```

### B4 — Scene page state machine

**File:** `apps/web/app/s/[slug]/ScenePageClient.tsx`

Add a `pre-gen` state at the front of the existing state machine:

```
pre-gen (loading) → pre-gen (ready) → streaming → complete
                                    ↘ error
```

On mount (when `topic` param present and no cached scene):
1. Enter `pre-gen loading` state → fire `POST /api/pre-gen`
2. On response → enter `pre-gen ready` state with `{ mode, questions }`
3. User fills Quick Settings + answers questions → hits confirm
4. Confirm → fire `useStreamScene` with full config → enter `streaming` state

Local state to add:
```ts
type PreGenState = {
  status: 'loading' | 'ready'
  mode: SceneType | null
  questions: string[]
  depth: 'quick' | 'standard' | 'deep'           // default: 'standard'
  familiarity: 'new' | 'basics' | 'familiar'      // default: 'basics'
  answers: string[]
}
```

### B5 — New `PreGenView` component

**File:** `apps/web/components/simulation/PreGenView.tsx` (new)

Renders the full pre-gen screen in two sections:

**Section 1 — Quick Settings (always visible, static)**
- `DepthSelector`: three pill buttons — Quick · Standard · Deep (default: Standard)
- `FamiliaritySelector`: three pill buttons — "New to this" · "Know the basics" · "Pretty familiar" (default: "Know the basics")

**Section 2 — A few questions (appears after pre-gen API resolves)**
- Shows skeleton while loading
- Renders up to 3 question items, each with a text input for the answer (answers are optional)
- If pre-gen API fails, this section is hidden gracefully (generation can still proceed with defaults)

**Footer**
- Left: `"Change mode?"` text button → opens a mode picker (concept / dsa / lld / hld chips)
- Right: `"Generate"` primary button → fires generation with current config

### B6 — Remove client-side `detectMode` from submission flow

**File:** `apps/web/src/stores/slices/detection-slice.ts` · `apps/web/components/landing/UnifiedInput.tsx`

- Remove mode detection on keystroke
- Remove mode from the URL params on submission (`/s/[slug]?topic=...` only, no `?mode=`)
- Remove DSA confirmation dialog — DSA will now be derived by `/api/pre-gen` and handled in `PreGenView`
- Keep `detectMode` function in place for now but stop calling it on submit (safe to delete later)

---

## Implementation Order

```
A1 → A2 → A3          (can ship as one small PR, independent of Track B)

B1 → B6 → B2 → B3 → B4 (sequential — each depends on the prior)
                B5 alongside B3
```

Track A can ship first as it is fully independent. Track B ships as a single PR once all B tasks are complete.

---

## Files Touched

| File | Change |
|------|--------|
| `src/ai/pipeline.ts` | Add `errorCode` to error events + accept `GenerationConfig` |
| `app/api/generate/route.ts` | Accept + forward `depth`, `familiarity`, `answers` |
| `app/api/pre-gen/route.ts` | **New** — mode + questions endpoint |
| `src/engine/hooks/useStreamScene.ts` | No auto-retry for `rate_limit` / `overloaded` + pass generation config |
| `app/s/[slug]/ScenePageClient.tsx` | Add `pre-gen` state, mount pre-gen API call |
| `components/simulation/StreamingError.tsx` | Error code → message mapping |
| `components/simulation/PreGenView.tsx` | **New** — pre-gen screen component |
| `src/stores/slices/detection-slice.ts` | Remove `detectMode` from submit path |
| `components/landing/UnifiedInput.tsx` | Remove mode detection on submit |

---

## Out of Scope

- A3 observability tooling (deferred — separate discussion)
- DSA pipeline changes
- Phase 26 progressive streaming
- Any other TODO items
