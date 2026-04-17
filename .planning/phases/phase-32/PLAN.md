# Phase 32 — Dev Pipeline Playground

> **Revision 1 — April 18, 2026**

**Goal:** A dev-only tool for iterating on the AI pipeline without burning tokens on stages that already work. Two surfaces:
- `/dev/pipeline` — run any stage in isolation, lock its output, edit the JSON, replay downstream stages
- `/dev/scene` — paste any Scene JSON and see it rendered with full playback controls

**Prerequisite:** Phase 30 ✅ + Phase 31 ✅ — pipeline architecture and model routing stable.

**Estimated effort:** 1–2 days

**Prod code changes: ZERO** — all new files. No modifications to `pipeline.ts`, `schemas.ts`, `assembly.ts`, or any existing route.

---

## Problem Being Solved

During Stage 2 debugging (April 2026), every iteration required a full pipeline run: Stage 0 (~24s, gemini-2.5-pro) + Stage 1 (~7s) just to re-test Stage 2. With `PIPELINE_MAX_RETRIES=0` in dev, a single schema failure meant starting over. This phase eliminates that cost.

---

## What the Playground Looks Like

### `/dev/pipeline`

```
┌──────────────────────────────────────────────────────┐
│  Topic [__________________________]  Mode [hld ▾]    │
│  [▶ Run All]  [▶ Run from locked]                   │
└──────────────────────────────────────────────────────┘

┌─ Stage 0 · gemini-2.5-pro · 24.3s · ✅ ─────────────┐
│  [🔒 Locked]  [✏ Edit]  [▶ Re-run]                 │
│  { "reasoning": "### 1. Concept Definition..." }     │
│  [expand ▾]                                          │
└──────────────────────────────────────────────────────┘
              ↓
┌─ Stage 1 · gemini-2.5-flash · 6.6s · ✅ ─────────────┐
│  [🔒 Locked]  [✏ Edit]  [▶ Re-run]                  │
│  { "skeleton": { "title": "...", "visuals": [...] } } │
└───────────────────────────────────────────────────────┘
              ↓
┌─ Stage 2 · gemini-2.5-pro · ⏳ running... ──────────┐
│                                                      │
└──────────────────────────────────────────────────────┘
              ↓
┌─ Stage 3+4 · parallel · idle ────────────────────────┐
└──────────────────────────────────────────────────────┘
              ↓
┌─ Assembly · deterministic · idle ─────────────────────┐
│  [Open in Scene Studio →]                             │
└───────────────────────────────────────────────────────┘
```

**Stage card controls:**
- **Lock toggle** — when on, this stage's output is frozen and used as-is for downstream runs. Running stages above it won't overwrite it.
- **Edit** — opens the output JSON in an inline textarea. Save overwrites the locked value.
- **Re-run** — runs only this stage. Uses locked/edited outputs from all stages above it as inputs.

**"Run All"** — standard full pipeline run, no locks respected (fresh run).
**"Run from locked"** — finds the lowest unlocked stage, starts from there using all locked data above.

### `/dev/scene`

```
┌──────────────────────┬──────────────────────────────┐
│  Scene JSON          │  Live Preview                │
│                      │                              │
│  {                   │  ┌────────────────────────┐  │
│    "title": "...",   │  │   SceneRenderer        │  │
│    "visuals": [...], │  │   (exact prod renderer) │  │
│    "steps": [...],   │  └────────────────────────┘  │
│    ...               │  [◀]  Step 2 of 9  [▶]       │
│  }                   │  [▶▶ Play]                   │
│                      │                              │
│  [▶ Render]          │  ✅ Valid scene              │
│  ❌ Parse error:...  │                              │
└──────────────────────┴──────────────────────────────┘
```

- Textarea accepts any Scene JSON (from the pipeline, hand-crafted, or copied from a pre-built sim)
- "Render" parses + validates via `safeParseScene`, then renders using the exact same `SceneRenderer` the prod app uses
- Parse errors shown inline under the textarea
- Playback controls (step forward/back) fully functional

---

## Architecture

### Backend — one new API route

**`POST /api/dev/pipeline-stage`**

Accepts a JSON body `{ stage: 0|1|2|3|4|5, inputs: StageInputs }`. Runs that stage using the same AI functions the prod pipeline uses (`generateObject`, validators, `assembleScene`). Returns stage output as JSON. No retry — single attempt only (dev tool, want to see raw failures).

Returns `404` in production (`process.env.NODE_ENV !== 'development'`).

Stage 0 is the exception: streams SSE (same `streamText` call) so reasoning chunks appear progressively.

**ModelConfig** for dev routes: built from the same env vars (`GEMINI_API_KEY`) using the same `STAGE_MODELS` defaults. No BYOK support in the playground — uses the server's free-tier keys only. (BYOK testing belongs in the main app.)

### Frontend — three new files + one shared layout

**`usePlayground.ts`** — all state in one hook:
```typescript
type StageState = {
  status: 'idle' | 'running' | 'done' | 'error'
  output: unknown          // raw stage output JSON
  locked: boolean          // if true, output won't be overwritten by upstream runs
  editedJson: string       // textarea value (may differ from output)
  model: string            // which model was used
  ms: number               // time taken
  error?: string
}
```

Exposes: `runStage(n)`, `runAll()`, `runFromLocked()`, `toggleLock(n)`, `saveEdit(n, json)`.

**`StageCard.tsx`** — single stage card. Receives `StageState` + callbacks. Renders status badge, model/time info, JSON output (collapsible), and the three action buttons.

**`page.tsx` (pipeline)** — topic input, mode selector, the six stage cards, linked together via `usePlayground`.

**`SceneStudio.tsx`** — two-panel layout. Left: textarea + Render button + error. Right: conditionally renders `SceneRenderer` when a valid scene is parsed.

**`app/dev/layout.tsx`** — thin wrapper with a `DEV TOOL` banner (amber, high contrast) so it's obvious this is not the prod UI. Links between `/dev/pipeline` and `/dev/scene`.

---

## Work Items

### DEV-01 — `app/api/dev/pipeline-stage/route.ts`

The single backend entry point. Switch on `stage`:

```
case 0 → streamText (SSE) with buildStage0Prompt + stageConfig
case 1 → generateObject with SceneSkeletonSchema + buildStage1Prompt (needs: topic, reasoning)
case 2 → generateObject with buildStepsSchema(visualIds) + buildStage2Prompt (needs: topic, reasoning, skeleton)
case 3 → generateObject with buildPopupsSchema(visualIds) + buildStage3Prompt (needs: topic, skeleton)
case 4 → generateObject with MiscSchema + buildStage4Prompt (needs: topic)
case 5 → assembleScene(skeleton, steps, popups, misc) — no AI call
```

All imports from existing AI module. No retry. Single attempt. Errors returned as `{ error: string }` JSON.

Guard: `if (process.env.NODE_ENV !== 'development') return NextResponse.json({}, { status: 404 })`

### DEV-02 — `app/dev/pipeline/usePlayground.ts`

State hook managing 6 `StageState` slots. Key logic:
- `runStage(n)` collects inputs from locked stages above, POSTs to `/api/dev/pipeline-stage`, updates state
- Stage 0 fetches as SSE stream, appends chunks to `output.reasoning` progressively
- `runAll()` runs stages 0→5 sequentially, skipping nothing
- `runFromLocked()` finds the first non-locked stage and runs from there
- `toggleLock(n)` flips the lock; locking copies `output` → `editedJson`
- `saveEdit(n, json)` validates JSON parse, updates `editedJson`, auto-locks the stage

### DEV-03 — `app/dev/pipeline/StageCard.tsx`

Props: `{ stageNum, name, state, onRun, onToggleLock, onSaveEdit }`.

Renders:
- Header row: stage name, model badge, time badge, status icon
- Collapsed: first 3 lines of JSON output
- Expanded: full JSON in `<pre>` with copy button
- Edit mode: `<textarea>` with the JSON, Save + Cancel buttons
- Action row: Lock toggle, Edit button, Re-run button

Disabled states: Re-run disabled while any stage is running. Edit disabled while running.

### DEV-04 — `app/dev/pipeline/page.tsx`

Topic `<input>` + mode `<select>` (concept/dsa/lld/hld/auto). Mounts `usePlayground`. Renders 6 `StageCard`s with arrows between them. Run All + Run from Locked buttons at top. "Open in Scene Studio →" link on the assembly card once it has output (passes JSON via `sessionStorage`).

### DEV-05 — `app/dev/scene/SceneStudio.tsx` + `page.tsx`

`SceneStudio.tsx`:
- Left panel: `<textarea>` pre-populated from `sessionStorage` if coming from pipeline
- Parse + validate on "Render" click: `JSON.parse` → `safeParseScene` → set `parsedScene`
- Error display: shows Zod parse errors line by line
- Right panel: conditionally renders `<SceneRenderer scene={parsedScene} />` with a Zustand store wrapper (same initialisation pattern the existing `/s/[slug]` page uses)
- Playback controls below the renderer (step +/-, play button)

`page.tsx`: thin shell, imports `SceneStudio`, sets page title.

### DEV-06 — `app/dev/layout.tsx`

```tsx
<div>
  <div className="bg-amber-500 text-black text-xs font-bold px-4 py-1 flex gap-4">
    DEV TOOL — not production UI
    <a href="/dev/pipeline">Pipeline</a>
    <a href="/dev/scene">Scene Studio</a>
  </div>
  {children}
</div>
```

---

## File Map

| File | Lines (est.) | Description |
|------|-------------|-------------|
| `app/api/dev/pipeline-stage/route.ts` | ~130 | Per-stage AI runner, dev-only |
| `app/dev/layout.tsx` | ~20 | Dev banner + nav |
| `app/dev/pipeline/usePlayground.ts` | ~120 | All playground state |
| `app/dev/pipeline/StageCard.tsx` | ~120 | Stage card component |
| `app/dev/pipeline/page.tsx` | ~80 | Pipeline playground shell |
| `app/dev/scene/SceneStudio.tsx` | ~120 | JSON editor + renderer |
| `app/dev/scene/page.tsx` | ~20 | Scene studio shell |
| **Total** | **~610** | |

---

## What Does NOT Change

- `src/ai/pipeline.ts` — untouched
- `src/ai/schemas.ts` — untouched
- `src/ai/assembly.ts` — untouched
- `src/ai/prompts/*` — untouched
- `src/ai/validators/*` — untouched
- `app/api/generate/route.ts` — untouched
- Any existing component or store

The dev routes import from the existing AI module but do not modify it.

---

## Testing Checklist

- [ ] `/dev/pipeline` loads with all 6 stage cards in idle state
- [ ] "Run All" runs all stages in sequence, each card updates progressively
- [ ] Stage 0 shows reasoning text streaming in progressively
- [ ] Locking Stage 0+1 then clicking "Re-run" on Stage 2 skips stages 0 and 1
- [ ] Editing Stage 1 JSON (changing stepCount) then re-running Stage 2 uses the edited skeleton
- [ ] Invalid JSON in edit textarea shows parse error, does not allow saving
- [ ] Stage 2 failure shows error message in the card, stages 3-5 stay idle
- [ ] "Open in Scene Studio →" appears on assembly card after successful run
- [ ] `/dev/scene` pre-populates textarea from sessionStorage when arriving from pipeline
- [ ] Pasting valid Scene JSON and clicking Render shows the scene with playback controls
- [ ] Pasting invalid JSON shows the parse error message
- [ ] Both routes return 404 in production (NODE_ENV check)
- [ ] Dev banner visible on both routes, nav links work

---

## Execution Order

1. **DEV-01** — backend route first; can be tested with `curl` before any UI exists
2. **DEV-02** — `usePlayground` hook; depends on DEV-01's endpoint shape
3. **DEV-03** — `StageCard`; depends on DEV-02's state shape
4. **DEV-04** — pipeline page; assembles DEV-02 + DEV-03
5. **DEV-05** — scene studio; independent of DEV-02/03/04
6. **DEV-06** — layout; add last, wraps everything
