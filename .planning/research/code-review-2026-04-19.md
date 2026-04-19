# Code & Architecture Review — 2026-04-19

**Overall: 7.5/10 — Solid foundation, clear patterns, specific gaps need fixing.**

Reviewed by: Claude Sonnet 4.6 (full codebase audit + best-practices research)

> False positives confirmed and removed: `.env` is not git-tracked, `ErrorBoundary` is already
> used in `SimulationLayout`, and `TreeViz`/`GraphViz` already use `useMemo`.

---

## HIGH

### 1. Dead code — `ValidationError` in `src/ai/errors.ts`

`ValidationError` (with `stage` + `retryable` fields) is defined, well-documented, and **never imported anywhere**. `applyDiff.ts` has its own `PatchValidationError`. The comment says it was planned for Phase 26 streaming UX — but was never wired up.

**Proposal:** Delete it, or actually wire it into the pipeline where stage-specific errors propagate.

---

### 2. `any` suppressions — 8 instances across AI pipeline

| File | Lines |
|---|---|
| `src/ai/client.ts` | 58, 87, 91, 125 |
| `src/ai/pipeline.ts` | 140 |
| `src/ai/traceToScene.ts` | 46, 50 |
| `src/ai/instrumentCode.ts` | 41 |

Root cause: Vercel AI SDK uses untyped `providerOptions` and `schema` params.

**Proposal:** Create typed provider option interfaces:
```ts
// src/ai/types/provider-options.ts
interface AnthropicProviderOptions {
  anthropic?: { thinking?: { type: 'enabled'; budget_tokens: number } }
}
interface GoogleProviderOptions {
  google?: { thinkingConfig?: { thinkingBudget: number } }
}
```

---

### 3. Unsafe `as any` cast in store — `src/stores/slices/scene-slice.ts:78`

```ts
;(state.activeScene as any)[field] = state.draftScene[field]
```

Bypasses TypeScript entirely; could write an incompatible type into `activeScene`.

**Proposal:** Replace with a type-narrowed assignment using `keyof Scene`.

---

### 4. Circular store type dependency

All 6 slice files import `type BoundStore` from `store.ts`, which imports all slices. Works
today due to TypeScript's type-only import resolution, but fragile.

Affected files: `auth-slice.ts`, `chat-slice.ts`, `detection-slice.ts`, `playback-slice.ts`,
`scene-slice.ts`, `settings-slice.ts`

**Proposal:** Move `BoundStore` type to `src/stores/types.ts` and import from there in both
`store.ts` and all slices.

---

### 5. Header building duplicated across 3 hooks — logic has drifted

| File | Pattern |
|---|---|
| `src/engine/hooks/useDSAPipeline.ts:24` | `buildClientHeaders()` helper function |
| `src/engine/hooks/useStreamScene.ts:188-199` | Manual if/else (Ollama/custom logic missing from useDSAPipeline) |
| `components/chat/useChatStream.ts:70-72` | Inline, no Ollama handling |

The three implementations have drifted — `useStreamScene` handles Ollama and custom providers
that the other two don't.

**Proposal:** Extract a shared `buildAIHeaders(settings)` utility to `lib/headers.ts` covering
all providers uniformly.

---

### 5a. BYOK header extraction duplicated across all 4 API routes

Every API route opens with the same 3-line block:

```ts
const byokKey      = req.headers.get('x-api-key')
const byokProvider = req.headers.get('x-provider') as Provider | null
const byokModel    = req.headers.get('x-model')
```

Confirmed in: `chat/route.ts:16-18`, `generate/route.ts:37-39`,
`instrument/route.ts:15-17`, `visualize-trace/route.ts:18-20`

`generate/route.ts` also extracts `x-base-url` and `x-user-id` — routes have silently diverged
on which headers they read.

**Proposal:** Extract `extractByokHeaders(req: NextRequest)` to `lib/headers.ts` (same file as
item 5), returning a typed object covering all possible BYOK headers.

---

### 5b. `ValidationResult` type defined twice

```ts
export interface ValidationResult { valid: boolean; errors: string[] }
```

Duplicated verbatim in both `src/ai/validators/steps.ts` and `src/ai/validators/popups.ts`.

**Proposal:** Move to `src/ai/validators/index.ts` and import it in both validators.

---

### 5c. `new Set(skeleton.visuals.map(v => v.id))` — repeated ID-set construction

Both validators independently build a `visualIds` Set from skeleton and use identical
`!visualIds.has(...)` guard logic. If a third validator is added this will be copied again.

**Proposal:** Extract `getVisualIdSet(skeleton: SceneSkeletonParsed): Set<string>` to
`src/ai/validators/index.ts`.

---

## MEDIUM

### 6. `VisualParamsSchema` is a no-op schema — `src/ai/schemas.ts:45`

```ts
const VisualParamsSchema = z.record(z.string(), z.any())
```

Accepts literally any object. No validation of which params each visual type requires.

**Proposal:** Discriminated union per visual type — at minimum validate required keys per visual
(e.g., `array` needs `items`, `graph` needs `nodes`/`edges`).

---

### 7. Stage 2 timeout may be too tight — `src/ai/pipeline.ts:214`

```ts
}, 45_000, 2)  // 45s — heaviest stage
```

45 seconds with only 2 retry attempts. On slow providers or complex topics this fires regularly
and the user sees a spinner with no feedback.

**Proposal:** Increase to `60_000` (60s) and surface a "Generation is taking longer than
expected…" message in the UI after 30s.

---

### 8. `shiki` highlighter — `any` singleton with race condition — `src/engine/annotations/CodePanel.tsx:14`

```ts
let highlighterInstance: any = null
```

Module-scope singleton with no type and no race guard. If the component unmounts and remounts
before `initAndHighlight` resolves, the stale instance is reused incorrectly.

**Proposal:** Type it with `Highlighter` from shiki; add an `initializing` ref guard to prevent
concurrent init calls.

---

### 9. Zero tests for `src/ai/pipeline.ts`

The 6-stage generation pipeline is the most critical path in the product. `assembly.test.ts` and
`validators.test.ts` are good — but the orchestration layer (retries, timeouts, stage sequencing,
error propagation) has **no tests at all**.

**Proposal:** Add pipeline integration tests with mocked AI SDK `generateObject`/`generateText`
responses. Minimum coverage:
- Happy path (all 6 stages succeed)
- Stage 2 failure + retry
- Stage 3/4 non-fatal failure (scene still returned)
- Stage 2 timeout

---

### 10. No env var validation at startup

`resolveModel()` in `src/ai/providers/index.ts` silently fails if `GEMINI_API_KEY` is missing —
error surfaces only at request time, mid-generation.

**Proposal:** Add a `validateEnv()` call in `app/api/generate/route.ts` that throws on missing
required keys at cold-start.

---

## LOW

| # | Issue | File | Proposal |
|---|---|---|---|
| 11 | Thinking budget hardcoded at `16384` for all Anthropic models | `pipeline.ts:327` | Per-model budget map |
| 12 | `highlighterInstance` lazy-init races on concurrent renders | `CodePanel.tsx` | Add `initializingRef` guard (see item 8) |
| 13 | No per-stage metrics (token count, latency, retries) | `pipeline.ts` | Extend `aiLog` with structured fields |
| 14 | JSON error response shape repeated across all API routes | `app/api/*/route.ts` | Extract `jsonError(msg, status)` helper to `lib/responses.ts` |

---

## Security Review (2026-04-19)

Conducted via `security-review` skill with multi-stage false-positive filtering.
**Result: No confirmed vulnerabilities.** All three candidates were filtered out.

### Candidates Investigated

| Candidate | File(s) | Filtered Confidence | Verdict |
|---|---|---|---|
| Dev UI pages navigable in production without NODE_ENV guard | `app/dev/pipeline/page.tsx`, `app/dev/scene/page.tsx` | 2/10 | False positive — API route is correctly blocked; UI is non-functional in prod |
| `new Function()` in JS sandbox worker | `src/sandbox/workers/js-sandbox.worker.ts` | 1/10 | False positive — browser Web Worker only, no server-side execution |
| Raw LLM output logged in dev error paths | `app/api/dev/pipeline-stage/route.ts` | 7/10 | Below threshold — dev-only endpoint, not PII/credential exposure |

### Optional Hardening (not vulnerabilities)

- `app/dev/pipeline/page.tsx` and `app/dev/scene/page.tsx` could add
  `if (process.env.NODE_ENV !== 'development') redirect('/')` as defense-in-depth,
  even though the backing API is already properly gated.

### Confirmed Secure Patterns

- **BYOK keys** — passed as request headers, explicitly never logged server-side
- **Zod validation** — enforced at all API boundaries
- **Dev endpoint guard** — `process.env.NODE_ENV !== 'development'` → 404 in `api/dev/pipeline-stage`
- **No injection vectors** — no SQL, no shell exec, no server-side `eval()`
- **No auth bypass paths** — no privilege escalation identified

---

## What's Already Good

- **`ErrorBoundary`** — wraps `SimulationLayout` correctly
- **`useMemo`** — already used in `TreeViz`, `GraphViz`, `RecursionTreeViz`
- **`applyDiff` error classes** — `PatchValidationError`, `MissingVisualError` are correct and used
- **Zustand + Immer slice architecture** — clean and well-separated
- **Stage 3/4 non-fatal failure handling** — correctly implemented
- **Zod validation at API boundaries** — good pattern
- **Per-stage retry with error-guided prompts** — excellent design
- **Security posture** — clean; no exploitable vulnerabilities found in current branch

---

## Prioritized Action List

| Priority | Item | Effort |
|---|---|---|
| 1 | Delete `ValidationError` or wire it up | XS |
| 2 | Replace `any` suppressions with typed provider option interfaces | S |
| 3 | Fix `(state.activeScene as any)` cast in scene-slice | XS |
| 4 | Move `BoundStore` type to `stores/types.ts` | XS |
| 5 | Unify hook header building into `lib/headers.ts` | S |
| 5a | Extract `extractByokHeaders()` for all API routes | XS |
| 5b | Deduplicate `ValidationResult` type into `validators/index.ts` | XS |
| 5c | Extract `getVisualIdSet()` helper to `validators/index.ts` | XS |
| 6 | Increase Stage 2 timeout to 60s + UX message | XS |
| 7 | Add startup env var validation | XS |
| 8 | Fix `shiki` singleton typing and race condition | S |
| 9 | Tighten `VisualParamsSchema` per visual type | M |
| 10 | Add `pipeline.ts` integration tests | L |
| 14 | Extract `jsonError()` helper for API route error responses | XS |
