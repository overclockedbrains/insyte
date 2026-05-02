# Scene Spec v2 — Implementation Plan

> Companion to: `SCENE_SPEC_V2_DESIGN.md`

> Status: **COMPLETE**

> Two-phase execution. Phase 1 is fully isolated — zero integration. Phase 2 is full replacement.

---

## Pre-work (before Phase 1 starts)

### P0.1 — Update design doc with final decisions
- [x] HUD max-3 enforced in Zod schema (`.max(3)`)
- [x] `activeText` position: top overlay inside canvas area (top-left)
- [x] `bezier-connector`, `straight-arrow`, `data-flow-dot`: remove from VisualTypeSchema (zero JSON usage)
- [x] Popups: keep simplified, future enhancement
- [x] `layout` fix: `dsa-trace` → `code-left-canvas-right`, `concept` → `text-left-canvas-right`, `lld/hld` → `canvas-only`
- [x] OQ2, OQ4 resolved

---

## Phase 1 — Spec in isolation

**Goal:** Create the spec and its builder functions. Prove correctness with tests. Zero changes to any existing file outside `packages/scene-engine/src/spec*.ts`.

**Exit criteria:** All spec tests green. Every canvas visual type has a complete entry. Derived Zod schema, prompt guide, and JSON Schema all work. Nothing else changed.

---

### Task 1.1 — Audit connector types

**File:** check `packages/scene-engine/src/schema.ts`

Remove `'bezier-connector'`, `'straight-arrow'`, `'data-flow-dot'` from `VisualTypeSchema` enum.

Verify no scene JSON files reference them (confirmed: zero hits).
Keep React component files in `apps/web/src/engine/primitives/` — just unregister from schema.

**Acceptance:** `VisualTypeSchema` has 11 types, not 14. Existing scene JSON files still parse.

---

### Task 1.2 — Write `spec.ts`

**File (NEW):** `packages/scene-engine/src/spec.ts`

Pure TypeScript constant — no Zod imports, no functions. The authoritative definition.

#### 1.2.1 — Define spec entry types (internal TypeScript types for the spec object itself)

```typescript
type FieldSource = 'ai:s1' | 'ai:s2' | 'ai:s3' | 'ai:s4' | 'assembly' | 'handcrafted' | 'ai:s1+s2'

interface RootFieldEntry {
  source: FieldSource
  required: boolean
  description: string
  values?: string[]        // for enum fields
}

interface StateFieldEntry {
  type: 'string' | 'number' | 'boolean' | 'any' | 'enum' | 'array' | 'object'
  required: boolean
  description?: string
  values?: string[]        // for enum fields
  default?: unknown
  items?: Record<string, StateFieldEntry>  // for array item shapes
  fields?: Record<string, StateFieldEntry> // for object shapes
}

interface CanvasVisualSpecEntry {
  description: string
  defaultLayoutHint: string
  source: 'ai'
  state: Record<string, StateFieldEntry>
  generationRules: string[]
}
```

#### 1.2.2 — `ROOT_FIELD_SPEC`

All 15 root-level Scene fields with source, required, description:

```
id, title, type, layout, description, category, code,
canvas, activeText, hud, controls, steps, popups, challenges, complexity
```

#### 1.2.3 — `CANVAS_VISUAL_SPEC`

One entry per type. State contracts with exact field names, types, and allowed enum values:

| Type | Top-level state key | Item highlight values |
|------|--------------------|-----------------------|
| `array` | `items[]` | `default\|active\|hit\|insert\|error` |
| `hashmap` | `entries[]` | `default\|insert\|hit\|remove` |
| `stack` | `items[]` | `default\|active\|pop\|push` |
| `queue` | `items[]` | `default\|active\|enqueue\|dequeue` |
| `linked-list` | `nodes[]` | `default\|active\|insert\|delete` |
| `tree` | `root` (recursive) | `default\|active\|found\|visited` |
| `recursion-tree` | `root` (recursive, n-ary) | `default\|active\|returned` |
| `graph` | `nodes[]` + `edges[]` | nodes: `default\|active\|visited\|found` / edges: `default\|active` |
| `dp-table` | `cells[][]` (2D) | `default\|active\|filled\|source` |
| `system-diagram` | `components[]` + `connections[]` | components: `status` field not `highlight` (see below) |
| `grid` | `cells[][]` (2D) | `default\|active\|visited\|wall\|path` |

`system-diagram` uses `status: 'normal'|'active'|'overloaded'|'dead'` (not `highlight`) and `connections[].active: boolean`.

Each entry also includes `generationRules[]` — rules that become prompt instructions for Stage 2.

#### 1.2.4 — `ACTIVE_TEXT_SPEC`

```typescript
export const ACTIVE_TEXT_SPEC = {
  description: 'Single operation string overlaid at top-left of canvas. Changes per step.',
  position: 'top-left canvas overlay',
  initialValueField: 'initialValue',
  stepUpdateField: 'activeText',   // in step object, just a plain string
  generationRules: [
    'PERSISTENCE: once set to a real value, never reset to placeholder text mid-flow.',
    'SEMANTIC: text should describe what the algorithm is doing right now, not what it did.',
    'Never emit empty string — omit the field if no update needed for this step.',
  ],
}
```

#### 1.2.5 — `HUD_SPEC`

```typescript
export const HUD_SPEC = {
  description: 'Label-value pairs overlaid at top-right of canvas.',
  position: 'top-right canvas overlay',
  maxItems: 3,
  valueTypes: ['string', 'number'],
  generationRules: [
    'Maximum 3 HUD items per scene. 0–2 is preferred.',
    'Use HUD for numeric counters (i, comparisons, depth) or short status strings.',
    'Do not duplicate information already in activeText or explanation.',
  ],
}
```

#### 1.2.6 — `STEP_SPEC`

Documents the step structure, field rules, and the "no dead things" constraints:

```typescript
export const STEP_SPEC = {
  fields: {
    index:       { required: true,  source: 'ai:s2', description: '1-based. Step 0 is always implicit (initial state).' },
    explanation: { required: true,  source: 'ai:s2', description: 'heading + body always present. callout optional.' },
    activeText:  { required: false, source: 'ai:s2', description: 'Omit if unchanged from previous step.' },
    hud:         { required: false, source: 'ai:s2', description: 'Partial update: only include hud items being changed.' },
    canvas:      { required: false, source: 'ai:s2', description: 'Per-visual-id full-state snapshots. Omit if visual unchanged.' },
    // duration: REMOVED — not AI-generated, computed at runtime
  },
  rules: [
    'Step 0 is synthetic (assembly creates it from initialState fields). Never include index:0 in steps[].',
    'canvas entries must be FULL STATE SNAPSHOTS — never delta/partial.',
    'canvas entries must only reference IDs declared in canvas[].',
    'hud entries must only reference IDs declared in hud[].',
  ],
}
```

#### 1.2.7 — `POPUP_SPEC`

Documents simplified popup structure (anchor/targetPoint removed):

```typescript
export const POPUP_SPEC = {
  fields: {
    id:         { source: 'assembly', description: 'nanoid — never set in AI output or hand-crafted files' },
    attachTo:   { source: 'ai:s3',   description: 'Must reference a canvas visual id' },
    text:       { source: 'ai:s3' },
    showAtStep: { source: 'ai:s3' },
    hideAtStep: { source: 'ai:s3',   description: 'Required — if omitted popup never hides' },
    style:      { source: 'ai:s3',   values: ['info', 'warning', 'success', 'insight'] },
    // anchor: REMOVED
    // targetPoint: REMOVED
  },
  maxPopups: 6,
}
```

---

### Task 1.3 — Write `spec.build.ts`

**File (NEW):** `packages/scene-engine/src/spec.build.ts`

Imports `spec.ts`. Has Zod imports. Exports derivation functions only.

#### 1.3.1 — `buildCanvasVisualSchema()`

Returns `z.discriminatedUnion('type', [...])` with one strongly-typed Zod object per canvas visual type.

Each branch defines:
- `type: z.literal('array')` (etc.)
- `id: z.string().regex(/^[a-z][a-z0-9-]*$/)`
- `label: z.string().optional()`
- `layoutHint: LayoutHintSchema`
- `initialState: <per-type Zod object>`

`initialState` schemas use the state contracts from `CANVAS_VISUAL_SPEC`. All highlight fields are `z.enum([...values])`, not `z.string()`.

#### 1.3.2 — `buildStepSchema(canvasIds: string[], hudIds: string[])`

Dynamic factory. Returns Zod schema for a single step:

```typescript
z.object({
  index: z.number().int().min(1),
  explanation: z.object({
    heading: z.string().max(80),
    body: z.string().max(500),
    callout: z.string().max(200).optional(),
  }),
  activeText: z.string().min(1).optional(),
  hud: z.record(z.enum(hudIds as [...]), z.union([z.string(), z.number()])).optional(),
  canvas: z.record(z.enum(canvasIds as [...]), CanvasStateUnionSchema).optional(),
})
```

`canvasIds` and `hudIds` constrained to `z.enum()` — anti-hallucination layer preserved.

#### 1.3.3 — `buildSceneSchema()`

Returns the complete `SceneSchema` (replaces current `schema.ts` definition).

Uses `buildCanvasVisualSchema()` for canvas, `buildStepSchema()` in a wrapper, plus:
- `activeText: z.object({ initialValue: z.string() }).optional()`
- `hud: z.array(HudItemSchema).max(3).optional()`
- `controls: z.array(ControlSchema)`
- `popups: z.array(PopupSchema)`
- Plus all root fields per `ROOT_FIELD_SPEC`

#### 1.3.4 — `buildPromptGuide(canvasVisualIds: string[], hudItemIds: string[])`

Returns a prompt string for Stage 2.

For each visual id in `canvasVisualIds`, looks up the type from the declared visuals and emits:
```
{id} ({type}):
  params shape: {...}
  notes: {generationRules joined}
```

For HUD items, emits the HUD generation rules.
For activeText, emits the activeText persistence/semantic rules.

Replaces `VISUAL_PARAMS_REFERENCE` and `buildVisualParamsGuide()` in `builders.ts`.

#### 1.3.5 — `buildJsonSchema()`

Returns raw JSON Schema object for the full Scene. Uses `buildSceneSchema().toJsonSchema()` (Zod 4 built-in).

#### 1.3.6 — TypeScript type exports

```typescript
export type Scene = z.infer<ReturnType<typeof buildSceneSchema>>
export type CanvasVisual = z.infer<ReturnType<typeof buildCanvasVisualSchema>>
export type Step = z.infer<ReturnType<typeof buildStepSchema>>
export type ArrayVisual = Extract<CanvasVisual, { type: 'array' }>
// ... one per canvas visual type for consumer narrowing
```

---

### Task 1.4 — Write spec tests

**File (NEW):** `packages/scene-engine/src/spec.test.ts`

#### Schema validation tests
- Each canvas visual type: valid initialState passes, wrong field name fails, invalid highlight value fails
- Discriminated union error quality: wrong `type` gives "invalid literal" not 11 branch errors
- `hud` max-3 enforcement: 4 items rejected
- `activeText` empty string rejected
- Step with no `explanation` heading rejected
- Step with `index: 0` rejected (must be ≥ 1)
- `canvas` with unknown visual id rejected (via discriminated enum)
- `hud` with unknown hud id rejected (via discriminated enum)

#### Derivation tests
- `buildPromptGuide(['arr','seen-map'])` output contains array generation rules
- `buildPromptGuide` output contains FULL-SNAPSHOT and ZERO-STATE rules
- `buildJsonSchema()` produces an object with `$schema` and `properties.canvas`
- All 11 canvas visual types present in `buildCanvasVisualSchema()` discriminated union

#### Completeness tests
- Every type in `VisualTypeSchema` enum has an entry in `CANVAS_VISUAL_SPEC`
- Every field in `ROOT_FIELD_SPEC` appears in `buildSceneSchema()` output
- Every `generationRules` entry in `CANVAS_VISUAL_SPEC` appears in `buildPromptGuide()` output
- No entry in `CANVAS_VISUAL_SPEC` for removed types (`bezier-connector`, `straight-arrow`, `data-flow-dot`)

#### Hand-crafted JSON validation (smoke test)
- Run `buildSceneSchema().safeParse()` against all 26 existing JSON files *after* applying rename patch (`cells`→`items` in array visuals)
- All should pass — if any fail, log which fields are rejected

---

## Phase 2 — Full integration

**Dependency:** Phase 1 exit criteria must be met before Phase 2 starts.

**Goal:** Replace every existing definition with spec-derived output. After Phase 2, there is no file in the codebase that defines visual type shapes, highlight values, or generation rules independently of `spec.ts`.

---

### Task 2a — Update `schema.ts` and `types.ts`

**Files:** `packages/scene-engine/src/schema.ts`, `packages/scene-engine/src/types.ts`

- Import `buildCanvasVisualSchema`, `buildSceneSchema` from `spec.build.ts`
- Replace `DynamicObjectSchema` usage with `buildCanvasVisualSchema()`
- Replace manually-written `SceneSchema` with `buildSceneSchema()`
- Remove `VisualSchema` flat object definition
- Replace all manual interface definitions in `types.ts` with `z.infer<>` exports from `spec.build.ts`
- Remove the 3 deleted visual types from `VisualTypeSchema` enum
- Update `parseScene()` / `safeParseScene()` — schema shape changes, both still work as before
- Update `index.ts` exports

**Acceptance:** `packages/scene-engine` builds. All existing scene-engine tests pass (update any that rely on old Visual shape).

---

### Task 2b — Update AI pipeline schemas

**File:** `apps/web/src/ai/schemas.ts`

- Update `SceneSkeletonSchema` for new skeleton shape:
  - `canvas: []` instead of `visuals: []`
  - Add `activeText?: boolean` (presence flag)
  - Add `hud?: { id: string, label: string }[]` (item declarations, no initial values)
  - Keep `stepCount`
- Update `buildStepsSchema(canvasIds, hudIds)` for new step format:
  - Replace `actions: [{target, params}]` with `canvas`, `activeText`, `hud` per step
  - Add `callout` to explanation schema
  - Keep `initialStates` for canvas visuals
  - Add `initialActiveText?: string`
  - Add `initialHud?: Record<hudId, string|number>`
- Update `buildPopupsSchema(canvasVisualIds)` — minor: `attachTo` restricted to canvasVisualIds (was visualIds)
- Update `MiscSchema` to include `complexity?: { time?, space? }` alongside challenges
- Update `StepsParsed` and other exported types

**Acceptance:** Pipeline schemas compile. `buildStepsSchema(['arr'], [])` produces expected shape.

---

### Task 2c — Update prompt builders

**File:** `apps/web/src/ai/prompts/builders.ts`

- Remove `VISUAL_PARAMS_REFERENCE` constant and `buildVisualParamsGuide()` function entirely
- Import `buildPromptGuide` from `spec.build.ts`
- Update `buildStage2Prompt()`: replace `{visualParamsGuide}` injection with `buildPromptGuide(canvasVisualIds, hudItemIds)`
- Update `buildStage1Prompt()` template: reference new skeleton shape (canvas, activeText, hud)
- Update `buildStage2Prompt()` template: reference new step shape (canvas, activeText, hud instead of actions)
- Update `buildStage3Prompt()`: step summaries now list canvas visual updates (not all visual updates)
- No changes needed to `buildStage4Prompt()`

**Prompt markdown files** (`apps/web/src/ai/prompts/*.md`):
- `stage1-skeleton.md`: update to describe canvas[], activeText, hud[]
- `stage2-steps.md`: update to describe new step format, remove actions[] references
- `stage3-popups.md`: update to note `attachTo` references canvas visual ids only
- `stage0-reasoning.md`: no change needed

**Acceptance:** All prompt builders compile. `buildStage2Prompt('topic', ...)` includes array generation rules from spec.

---

### Task 2d — Update assembly

**File:** `apps/web/src/ai/assembly.ts`

- Update `derivePageLayout()`:
  ```typescript
  // Fixed mapping:
  'dsa-trace' → 'code-left-canvas-right'  // was canvas-only — BUG FIX
  'concept'   → 'text-left-canvas-right'
  'lld'       → 'canvas-only'
  'hld'       → 'canvas-only'
  ```
- Update `assembleScene()` to produce new schema shape:
  - Merge `canvas[]` from skeleton declarations + `initialStates` from Stage 2
  - Include `activeText` if present in skeleton
  - Include `hud[]` with initial values from Stage 2
  - Embed explanation inside each step (already done in current pipeline, keep)
  - Remove `explanation[]` root array assembly (it's now step-embedded)
  - Pass `category` and `description` from skeleton to assembled scene
  - `controls: []` stays hardcoded (handcrafted only)
  - Remove `duration` from steps (never set)
- Update `AssemblyResult` type if needed

**Acceptance:** `assembleScene()` produces a Scene that passes `safeParseScene()`. DSA scenes get `code-left-canvas-right`.

---

### Task 2e — Migrate all hand-crafted JSON files (26 files)

**Files:** All 26 JSONs under `apps/web/src/content/scenes/`

Run through each file and apply:

1. **`cells` → `items`** in `array` visual `initialState` and all step `params`
2. **Restructure `visuals[]`** into:
   - `canvas[]` ← all visuals that are NOT `text-badge` or `counter`
   - `activeText: { initialValue: "..." }` ← from `text-badge` visual initial state
   - `hud: []` ← from `counter` visuals with initial values
3. **Remove `duration`** from all steps
4. **Remove `tags`** from root
5. **Remove `slot`** from all canvas visual entries
6. **Remove `popup.anchor`** and `popup.targetPoint`** where present
7. **Move `explanation[]`** from root array into step-embedded format:
   - `explanation[n]` where `appearsAtStep: k` → `steps[k].explanation = { heading, body, callout? }`
   - Steps that had no explanation entry get no `explanation` field (optional)
8. **Remove explicit `index: 0` steps** — step 0 is now always implicit. Initial state comes from `initialState` fields.
9. **Verify `highlightByStep`** lengths: must equal `steps.length + 1` (step 0 + all steps)
10. **Restructure step `actions[]`** into new format:
    - `text-badge` actions → `activeText: "..."` on the step
    - `counter` actions → `hud: { id: value }` on the step  
    - All other actions → `canvas: { visualId: fullStateSnapshot }` on the step

**Order of migration:** DSA first (simpler structure), then concept, then LLD, then HLD.

**Acceptance:** All 26 JSON files parse against `buildSceneSchema()` with zero errors.

---

### Task 2f — Update renderers

**Files:** `apps/web/src/engine/` (canvas renderer, HUD renderer, activeText renderer)

- Update canvas renderer to read from `canvas[]` instead of `visuals[]`
- Remove slot-based positioning logic for `text-badge` and `counter` (slots gone)
- Add `activeText` renderer: reads `activeText` from scene, updates per step, positioned top-left of canvas
- Add `HUD` renderer: reads `hud[]`, renders label:value pairs top-right of canvas, updates per step
- Remove `text-badge` and `counter` from primitive registry if they are now fully replaced (confirm no remaining usages after 2e)
- Update `step-engine/apply.ts` to handle new step shape (canvas/activeText/hud instead of actions)
- Update `scene-graph/compute.ts` for new Visual type (discriminated union — update type guards)

**Acceptance:** DNS Resolution, Two Sum, Twitter Feed scenes render correctly in dev. Canvas, activeText, and HUD all update correctly per step.

---

### Task 2g — JSON Schema export

**Files:** `packages/scene-engine/src/spec.build.ts` (already has `buildJsonSchema()`), `apps/web/`

- Add build script (or Next.js build hook) that calls `buildJsonSchema()` and writes `public/scene-schema.json`
- Add `"$schema": "/scene-schema.json"` to all 26 JSON files
- VS Code will now autocomplete all Scene JSON fields

**Acceptance:** Opening any scene JSON in VS Code shows field autocomplete.

---

### Task 2h — Docs cleanup

**Files:** `docs/`

- Update `docs/scene-engine/scene-engine.md` — full schema reference updated to v2 structure
- Update `docs/explained/ai-module.md` — stage descriptions updated for new step format
- Delete `docs/guides/iscl-quick-reference.md` — ISCL is fully dead
- Update `docs/guides/adding-scenes-and-primitives.md` — hand-crafted JSON guide updated

---

## Dependency graph

```
P0 (pre-work)
  └── 1.1 (audit connectors)
        └── 1.2 (write spec.ts)
              └── 1.3 (write spec.build.ts)
                    └── 1.4 (write spec tests)
                          ├── PHASE 1 EXIT ──────────────────────────────────┐
                          │                                                   │
                          ├── 2a (schema.ts + types.ts)                      │
                          │     └── 2b (ai pipeline schemas)                 │
                          │           └── 2c (prompt builders)               │
                          │                 └── 2d (assembly)                │
                          │                       └── 2e (json migration)    │
                          │                             └── 2f (renderers)   │
                          │                                   ├── 2g (json schema export)
                          │                                   └── 2h (docs)  │
                          └───────────────────────────────────────────────────┘
```

Tasks 2a → 2d must run in order (each depends on previous). Task 2e can start after 2a (schema must be final before migrating JSONs). Tasks 2f, 2g, 2h can run in parallel after 2e.

---

## File change summary

| Phase | Files created | Files modified | Files deleted |
|-------|--------------|----------------|---------------|
| 1.1 | — | `packages/scene-engine/src/schema.ts` (remove 3 types) | — |
| 1.2 | `packages/scene-engine/src/spec.ts` | — | — |
| 1.3 | `packages/scene-engine/src/spec.build.ts` | — | — |
| 1.4 | `packages/scene-engine/src/spec.test.ts` | — | — |
| 2a | — | `schema.ts`, `types.ts`, `index.ts` | — |
| 2b | — | `ai/schemas.ts` | — |
| 2c | — | `ai/prompts/builders.ts`, `ai/prompts/*.md` | — |
| 2d | — | `ai/assembly.ts` | — |
| 2e | — | 26 scene JSON files | — |
| 2f | — | `engine/` renderer files, `step-engine/apply.ts`, `scene-graph/compute.ts` | Possibly `text-badge` + `counter` primitives |
| 2g | — | 26 scene JSON files (`$schema` field) | — |
| 2h | — | `docs/scene-engine/*.md`, `docs/explained/*.md`, `docs/guides/*.md` | `docs/guides/iscl-quick-reference.md` |
