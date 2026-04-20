# Scene JSON Spec v2 — Design Document

> Status: **Design / Pre-implementation**
> Captures all decisions and requirements from the design discussion session (2026-04-21).
> This document is the input to the implementation plan. No code changes happen until this is signed off.

---

## 1. Why This Exists

The current Scene JSON has no authoritative specification. Zod `schema.ts` is the closest thing, but it only enforces shape — it doesn't define meaning, constraints, allowed values per type, or which fields an AI pipeline stage is responsible for. The result is:

- Two dialects: hand-crafted JSONs and AI-generated JSONs differ in field names (`cells` vs `items`), layout values, and presence of `code`/`complexity`/`controls`
- Prompt guides in `builders.ts` (`VISUAL_PARAMS_REFERENCE`) live separately from Zod schemas and drift
- No place documents which fields are AI-generated vs hand-crafted vs assembly-derived
- Dead fields: `duration`, `popup.anchor`, `popup.targetPoint` exist in JSONs but AI never produces them and their renderer usage is unaudited
- Mixed concerns in `visuals[]`: data-structure visuals, HUD overlays, and operation indicators all live in the same flat array with no semantic distinction

---

## 2. All Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Stay on Zod** — no TypeBox, no new schema libs | Codebase is deep Zod. TypeBox discriminated unions use non-standard `discriminator` keyword that LLM APIs ignore. Zod 4 has native JSON Schema export built-in. |
| D2 | **Runtime derivation** — no codegen script | <200 schemas, no build step needed. Changes reflect immediately. tRPC/Effect pattern. Codegen adds 1–2s build + drift risk. |
| D3 | **Discriminated union for canvas visuals** | 10–50× faster validation for 15 types, error messages show only matching branch, cleaner AI structured output |
| D4 | **JSON Schema export** (near-free) | Zod 4 `.toJsonSchema()` built-in. Drop as `public/scene-schema.json` for IDE autocomplete. Cost: ~10 lines. |
| D5 | **`items` for array visual type** | Canonical `items` is consistent with `stack`, `queue`. Updating hand-crafted JSONs is fine scope for a full spec migration. |
| D6 | **`spec.ts` split into two files** | `spec.ts` = pure data constant (no Zod, no functions). `spec.build.ts` = all derivation functions (Zod schemas, prompt guides, JSON Schema). |
| D7 | **Two-phase implementation** | Phase 1: create + test spec in isolation. Phase 2: integrate everywhere. No partial integrations. |
| D8 | **Zero dead things rule** | Everything in spec must be generated/used somewhere. Everything generated must be in spec. Explicit `source` tags document intent for handcrafted-only fields. |
| D9 | **Segregate `visuals[]` into distinct top-level sections** | Canvas visuals, activeText, hud, controls are fundamentally different things. Flat `visuals[]` prevents LLM from reasoning clearly about what to generate and what changes per step. |
| D10 | **Remove `duration` from steps** | AI never generates it. Assembly never writes it. Runtime computes duration from defaults + speed controls. |
| D11 | **Remove `popup.anchor` and `popup.targetPoint`** | AI never generates. Renderer usage unaudited — likely dead. |
| D12 | **Remove `tags`** | No rendering or generation value. Pure LLM token overhead. |
| D13 | **Fix dsa-trace layout derivation** | `dsa-trace` must derive to `code-left-canvas-right`, not `canvas-only`. Current assembly bug. |
| D14 | **Popups: keep but simplified** | Full popup rethink is a separate discussion. For now: strip dead fields, keep core. |

---

## 3. New Schema Architecture

### 3.1 Top-Level Structure

```
BEFORE                          AFTER
──────────────────────────────  ──────────────────────────────────────────
id              (assembly)      id              (assembly)
title           (ai:s1)         title           (ai:s1)
type            (ai:s1)         type            (ai:s1)
layout          (assembly)      layout          (assembly — fixed derivation)
description     (ai:s1)         description     (ai:s1)
category        (ai:s1)         category        (ai:s1)
tags            ← REMOVED       code            (handcrafted only)
code            (handcrafted)   canvas[]        ← NEW SECTION (replaces visuals[])
visuals[]       → split         activeText      ← NEW FIELD  (replaces text-badge)
                                hud[]           ← NEW SECTION (replaces counter)
steps[]         → restructured  controls[]      (handcrafted only)
controls[]      (handcrafted)   steps[]         ← RESTRUCTURED
explanation[]   → into steps    popups[]        (ai:s3, simplified)
popups[]        (ai:s3)         challenges[]    (ai:s4)
challenges[]    (ai:s4)         complexity      (ai:s4)
complexity      (ai:s4)
```

**Source legend:**
- `(ai:s1)` = AI pipeline Stage 1 generates this
- `(ai:s2)` = AI pipeline Stage 2 generates this
- `(ai:s3)` = AI pipeline Stage 3 generates this
- `(ai:s4)` = AI pipeline Stage 4 generates this
- `(assembly)` = Stage 5 deterministic assembly derives this — AI never sets it
- `(handcrafted)` = never generated by AI, only in hand-written JSON files

---

### 3.2 The Four Scene Sections (replacing flat `visuals[]`)

#### Section A — `canvas[]`
Data-structure visuals rendered on the canvas. These have layout algorithms, initial states, and update per step.

```typescript
type CanvasVisual = {
  id: string              // lowercase-hyphen slug, unique within scene
  type: CanvasVisualType  // see allowed types below
  label?: string          // display name shown above the visual
  layoutHint: LayoutHint  // algorithm used to position this visual
  initialState: <type-specific>  // strongly typed per CanvasVisualType
}

type CanvasVisualType =
  | 'array'
  | 'hashmap'
  | 'linked-list'
  | 'tree'
  | 'recursion-tree'
  | 'graph'
  | 'stack'
  | 'queue'
  | 'dp-table'
  | 'system-diagram'
  | 'grid'
  // bezier-connector, straight-arrow, data-flow-dot → AUDIT REQUIRED before deciding
```

**Removed from canvas:**
- `text-badge` → moved to `activeText` (always exactly one, always a string)
- `counter` → moved to `hud[]` (label-value pairs)
- `slot` field removed from canvas visuals (slot was only needed by text-badge/counter)
- `showWhen` condition removed from canvas (AI never generated it, adds complexity)

#### Section B — `activeText`
A single string overlaid at the **top of the canvas area** (top-left of the canvas region). Represents the current operation, equation, or algorithm state for that step. Currently rendered as a `text-badge` visual with `slot: "top-center"` — becomes a first-class top-level field.

Always exactly one string — not an array. Renderer always positions it at the top of the canvas. No positioning fields needed in JSON.

```typescript
type ActiveText = {
  initialValue: string   // shown at step 0
}
```

In steps: `"activeText": "i=0, num=2, need=7 → miss, store 2:0"` (just a string)

**Rules:**
- Optional in the scene (omit if no per-step operation text is needed)
- If absent from a step, the previous value persists
- Must never be empty string — either set a real value or omit

> **UI reference:** The red-labeled "Active Text" in the DNS Resolution screenshot — the capsule/pill at the top of the canvas showing "Query sent to Recursive Resolver — resolver cache MISS".

#### Section C — `hud[]`
Simple label-value pairs overlaid at the **top-right corner of the canvas area**. 0–3 items max. For things like "LATENCY (MS): 5", "i: 3", "found: true". Always simple: a label string plus a value that is a string or number. Currently rendered as `counter` visuals with `slot: "bottom-left"` or `"top-right"` — becomes a first-class top-level section.

```typescript
type HudItem = {
  id: string            // lowercase-hyphen slug
  label: string         // display label, e.g. "i", "LATENCY (MS)", "Comparisons"
  initialValue: string | number
}
```

In steps: `"hud": { "counter-i": 3, "counter-found": true }` (partial update, key = hud item id)

**Rules:**
- Max 3 items. LLM is instructed to use 0–2 in practice.
- Values are always string or number. No objects, no arrays.
- If absent from a step, previous values persist.

> **UI reference:** The green-labeled "HUD" in the DNS Resolution screenshot — the "LATENCY (MS): 5" box at the top-right of the canvas area.

#### Section D — `controls[]`
Interactive UI controls pinned at the **bottom bar of the scene**. Static — does not change per step. Drives side-effects (goToStep, speed multiplier, toggle variants). Hand-crafted only — AI never generates these. Already well-defined, stays mostly unchanged.

> **UI reference:** The pink-labeled section in the DNS Resolution screenshot — the bottom bar with "Browser Cache", "Simulated Latency per Hop", "Query Again", "Clear Cache".

```typescript
type Control =
  | { type: 'button',       id, label, config: { variant?, goToStep? } }
  | { type: 'toggle',       id, label, config: { defaultValue: boolean } }
  | { type: 'slider',       id, label, config: { min?, max?, step?, defaultValue: number } }
  | { type: 'toggle-group', id, label, config: { options: string[], defaultValue: string } }
```

**Removed from controls:** `input` type (no evidence of use, adds AI confusion).

---

### 3.3 Restructured `steps[]`

#### Old format
```json
{
  "index": 1,
  "actions": [
    { "target": "op", "params": { "text": "i=0, num=2", "style": "highlight" } },
    { "target": "arr", "params": { "cells": [{ "value": 2, "highlight": "active" }] } }
  ],
  "duration": 1200
}
```

#### New format
```json
{
  "index": 1,
  "explanation": {
    "heading": "Lookup Before Insert",
    "body": "Check if complement exists in seen before inserting.",
    "callout": "Lookup-first avoids reusing the same element."
  },
  "activeText": "i=0, num=2, need=7 → miss, store 2:0",
  "hud": { "counter-i": 0 },
  "canvas": {
    "arr": {
      "items": [
        { "value": 2, "highlight": "active" },
        { "value": 7, "highlight": "default" }
      ]
    },
    "seen-map": {
      "entries": [{ "id": "e0", "key": "2", "value": "0", "highlight": "insert" }]
    }
  }
}
```

**Step field rules:**

| Field | Required | Notes |
|-------|----------|-------|
| `index` | Yes | 1-based. Step 0 is synthetic (assembly creates it from initialStates). |
| `explanation` | Yes | Always present on every step. Heading + body required. Callout optional. |
| `activeText` | No | String. Absent = previous value persists. |
| `hud` | No | Object keyed by hud item id. Absent = previous values persist. |
| `canvas` | No | Object keyed by canvas visual id. Absent = previous states persist. When present for a visual, must be a FULL STATE SNAPSHOT (not delta). |
| `duration` | **REMOVED** | Never AI-generated. Computed at runtime from defaults. |

**Step 0:** Implicit — always the initial state. Not present in `steps[]`. Assembly creates it from `canvas[].initialState`, `activeText.initialValue`, `hud[].initialValue`.

---

### 3.4 Simplified `popups[]`

Keep popups for now (full rethink is a separate discussion). Strip dead fields:

```typescript
type Popup = {
  id: string              // generated by assembly (nanoid), never in AI output
  attachTo: string        // must reference a canvas visual id
  text: string
  showAtStep: number
  hideAtStep: number      // now REQUIRED (was optional — if missing, popup never hides)
  style?: 'info' | 'warning' | 'success' | 'insight'
  // anchor: REMOVED (AI never generates, renderer usage unaudited)
  // targetPoint: REMOVED (AI never generates, renderer usage unaudited)
}
```

---

### 3.5 Canvas Visual State Contracts

All per-type state shapes canonicalized. `initialState` and step `canvas` update params have identical shape (full-state snapshot).

#### `array`
```typescript
{ items: Array<{ value: any, highlight?: 'default'|'active'|'hit'|'insert'|'error', id?: string }> }
```
- `items` (not `cells` — see Decision D5)
- ZERO-STATE: `initialState.items` must be `[]` unless algorithm starts with pre-filled data

#### `hashmap`
```typescript
{ entries: Array<{ id: string, key: string, value: string, highlight?: 'default'|'insert'|'hit'|'remove' }> }
```
- Empty initial state: `{ entries: [] }`

#### `stack`
```typescript
{ items: Array<{ id: string, value: any, highlight?: 'default'|'active'|'pop'|'push' }> }
```
- Items ordered bottom-to-top. Push = append. Pop = remove last.
- ZERO-STATE: `initialState.items` must be `[]`

#### `queue`
```typescript
{ items: Array<{ id: string, value: any, highlight?: 'default'|'active'|'enqueue'|'dequeue' }> }
```
- Items front-to-back. Enqueue = append. Dequeue = remove first.
- ZERO-STATE: `initialState.items` must be `[]`

#### `linked-list`
```typescript
{ nodes: Array<{ id: string, value: any, highlight?: 'default'|'active'|'insert'|'delete' }> }
```
- Edges between adjacent nodes are auto-generated by renderer
- ZERO-STATE: `initialState.nodes` must be `[]`

#### `tree`
```typescript
{
  root: TreeNode | null
}
type TreeNode = { id: string, value: any, highlight?: 'default'|'active'|'found'|'visited', left?: TreeNode|null, right?: TreeNode|null }
```
- Binary tree. `null` = no child.

#### `recursion-tree`
```typescript
{
  root: RecursionNode | null
}
type RecursionNode = { id: string, value: string, highlight?: 'default'|'active'|'returned', children: RecursionNode[] }
```
- N-ary. `children` always present (may be `[]`).

#### `graph`
```typescript
{
  nodes: Array<{ id: string, label: string, highlight?: 'default'|'active'|'visited'|'found' }>,
  edges: Array<{ id: string, from: string, to: string, label?: string, highlight?: 'default'|'active' }>
}
```
- Both arrays required. Edge id must be unique.

#### `dp-table`
```typescript
{ cells: Array<Array<{ id: string, value: any, highlight?: 'default'|'active'|'filled'|'source' }>> }
```
- 2D array (rows of columns). `cells` naming kept here (2D grid ≠ 1D array items).

#### `system-diagram`
```typescript
{
  components: Array<{
    id: string,
    label: string,
    icon: 'server'|'database'|'mobile'|'web'|'compute'|'cloud'|'shield'|'layers'|'zap',
    status: 'normal'|'active'|'overloaded'|'dead',
    sublabel?: string
  }>,
  connections: Array<{
    from: string,
    to: string,
    active: boolean,
    style?: 'solid'|'dashed',
    label?: string
  }>
}
```
- FULL-STATE SNAPSHOT: repeat every component and every connection in every step update (not delta)
- CHOREOGRAPHY RULE: when a call travels A→B→C, all three nodes + both edges must be active=true simultaneously in that step

#### `grid`
```typescript
{ cells: Array<Array<{ id: string, value: any, highlight?: 'default'|'active'|'visited'|'wall'|'path' }>> }
```
- For grid-based problems (islands, maze, etc.)

#### `bezier-connector`, `straight-arrow`, `data-flow-dot`
> **AUDIT REQUIRED** — verify these are used in any JSON or renderer before including in spec. If unused, remove from VisualTypeSchema entirely.

---

### 3.6 `code` Block (handcrafted only)

```typescript
type SceneCode = {
  language: 'python' | 'javascript'
  source: string
  highlightByStep: number[]   // line indices (0-based), one per step including step 0
}
```

`highlightByStep.length` must equal `steps.length + 1` (accounts for step 0).
Never generated by AI. Only present in DSA and some concept scenes.

---

### 3.7 `complexity` (ai:s4)

```typescript
type Complexity = { time?: string, space?: string }
```

Example: `{ "time": "O(n)", "space": "O(n)" }`

---

### 3.8 `layout` Derivation (assembly)

Fixed derivation from `type`:

| Scene type | Page layout |
|------------|-------------|
| `dsa-trace` | `code-left-canvas-right` ← **FIXED** (was `canvas-only`, a bug) |
| `concept` | `text-left-canvas-right` |
| `lld` | `canvas-only` |
| `hld` | `canvas-only` |

`layout` field is never set in AI output or hand-crafted JSON. Assembly always derives it.

---

## 4. Fields Removed (and Why)

| Field | Reason |
|-------|--------|
| `tags[]` | Zero rendering/generation value. Redundant with `category`. Pure LLM token overhead. |
| `steps[].duration` | AI never generates. Renderer uses runtime default. No reason to be in JSON. |
| `steps[].actions[]` | Replaced by structured `canvas`, `activeText`, `hud` per step. |
| `visuals[].slot` | Only used by `text-badge` and `counter` — both being removed from canvas. |
| `visuals[].showWhen` | AI never generated it. Adds complexity with no active use. |
| `popup.anchor` | AI never generates. Renderer usage unaudited — likely dead. |
| `popup.targetPoint` | AI never generates. Renderer usage unaudited — likely dead. |
| `popup.showWhen` | Same as visual.showWhen — AI never generates, remove. |
| `controls.input` type | No evidence of use anywhere. Removes an undefined slot from AI schema. |
| `explanation[]` (root) | Moved inside `steps[]`. Already done in AI pipeline Stage 2. No longer a root array. |

---

## 5. Spec File Architecture

Two files in `packages/scene-engine/src/`:

### `spec.ts` — pure data constant
No Zod imports. No functions. Just a TypeScript constant that IS the specification.

```typescript
// packages/scene-engine/src/spec.ts

export const ROOT_FIELD_SPEC = {
  id:          { source: 'assembly',     required: true,  description: '...' },
  title:       { source: 'ai:s1',        required: true,  description: '...' },
  type:        { source: 'ai:s1',        required: true,  values: ['concept','dsa-trace','lld','hld'] },
  layout:      { source: 'assembly',     required: true,  description: 'derived from type' },
  description: { source: 'ai:s1',        required: false, description: '...' },
  category:    { source: 'ai:s1',        required: false, description: '...' },
  code:        { source: 'handcrafted',  required: false, description: 'never AI-generated' },
  canvas:      { source: 'ai:s1+s2',    required: true,  description: 'canvas visual declarations (s1) + states (s2)' },
  activeText:  { source: 'ai:s1+s2',    required: false, description: 'presence declared s1, values generated s2' },
  hud:         { source: 'ai:s1+s2',    required: false, description: 'presence declared s1, values generated s2' },
  controls:    { source: 'handcrafted',  required: true,  description: 'never AI-generated, assembly sets []' },
  steps:       { source: 'ai:s2',        required: true,  description: '...' },
  popups:      { source: 'ai:s3',        required: true,  description: 'ids generated by assembly' },
  challenges:  { source: 'ai:s4',        required: false, description: '...' },
  complexity:  { source: 'ai:s4',        required: false, description: '...' },
} satisfies Record<string, RootFieldEntry>

export const CANVAS_VISUAL_SPEC = {
  array: {
    description: 'Linear indexed sequence of values',
    defaultLayoutHint: 'linear-H',
    source: 'ai',
    state: {
      items: {
        type: 'array', required: true,
        items: {
          value:     { type: 'any',    required: true },
          highlight: { type: 'enum',   required: false, values: ['default','active','hit','insert','error'], default: 'default' },
          id:        { type: 'string', required: false },
        }
      }
    },
    generationRules: [
      'ZERO-STATE: initialState.items must be [] unless the algorithm truly starts with pre-filled data.',
      'FULL-SNAPSHOT: every step update must include ALL items (not just changed ones).',
    ],
  },
  // ... all other canvas visual types
} satisfies Record<string, CanvasVisualSpecEntry>

// Type definitions for the spec entries...
```

### `spec.build.ts` — derivation functions
Imports `spec.ts`. Exports builder functions. Has Zod imports.

```typescript
// packages/scene-engine/src/spec.build.ts
import { CANVAS_VISUAL_SPEC } from './spec'
import { z } from 'zod'

/** Returns discriminated union Zod schema for canvas visuals — used by schema.ts */
export function buildCanvasVisualSchema(): z.ZodDiscriminatedUnion<...> { ... }

/** Returns prompt guide string for a given set of visual ids — replaces VISUAL_PARAMS_REFERENCE */
export function buildPromptGuide(canvasVisualIds: string[]): string { ... }

/** Returns full JSON Schema for the Scene — used for IDE autocomplete */
export function buildJsonSchema(): object { ... }
```

**What each derived output replaces:**

| Derived output | Replaces |
|----------------|----------|
| `buildCanvasVisualSchema()` | `DynamicObjectSchema` in `schema.ts` |
| `buildPromptGuide(ids)` | `VISUAL_PARAMS_REFERENCE` in `prompts/builders.ts` |
| `buildJsonSchema()` | Nothing (new) → `public/scene-schema.json` |
| TypeScript types via `z.infer<>` | Manual interface definitions in `types.ts` |

---

## 6. AI Pipeline Stage Mapping (New Schema)

### Stage 0 — Free Reasoning (unchanged)
No structured output. Model reasons about pedagogy, complexity, visual choices.

### Stage 1 — Scene Skeleton
**Generates:** title, type, description, category, canvas visual declarations (type + id only, NO initialState), whether activeText is present, hud item definitions (label + id, NO initial values), stepCount.

**Does NOT generate:** initialStates, layout (assembly derives), code, controls, complexity.

Schema: `SceneSkeletonSchema` — updated to include `activeText?: boolean` and `hud?: { id, label }[]`.

### Stage 2 — Steps + Content (the heavy stage)
**Generates:**
- `initialStates` for each canvas visual (full state per visual id)
- `activeText.initialValue` if activeText declared
- `hud[].initialValue` for each hud item
- For each step (1 to stepCount):
  - `explanation: { heading, body, callout? }`
  - `activeText?: string`
  - `hud?: { [hudItemId]: string | number }`
  - `canvas?: { [canvasVisualId]: <full state snapshot> }`

**Key simplification over current design:**
- No more `actions: [{ target, params }]` — replaced by typed per-section updates
- LLM no longer needs to know visual IDs for `activeText` (always one, just a string)
- HUD updates are simple `{ id: value }` object — trivial to generate correctly

Schema: `buildStepsSchema(canvasVisualIds, hudItemIds)` — dynamic factory using `z.enum` for canvas keys, `z.enum` for hud keys. Anti-hallucination layer unchanged.

### Stage 3 — Popups
**Generates:** popups (up to 6) attaching to canvas visual ids.
`attachTo` constrained to `z.enum(canvasVisualIds)` — same anti-hallucination approach.

### Stage 4 — Misc
**Generates:** challenges, complexity.

### Stage 5 — Assembly (deterministic)
- Derives `id` (nanoid), `layout` (from type), `controls: []`
- Merges skeleton + steps + popups + misc into complete Scene
- Runs `safeParseScene()` final validation
- Sets `popups[].id` (nanoid per popup)

---

## 7. Implementation Plan

### Phase 1 — Spec in isolation (no integration)

**Goal:** Create and thoroughly validate the spec. Nothing else changes.

1. Create `packages/scene-engine/src/spec.ts` with full constant definition
   - All `ROOT_FIELD_SPEC` entries
   - All `CANVAS_VISUAL_SPEC` entries (all visual types with state contracts, generation rules)
   - `HUD_SPEC`, `ACTIVE_TEXT_SPEC`, `POPUP_SPEC`, `CONTROLS_SPEC`, `STEP_SPEC`

2. Create `packages/scene-engine/src/spec.build.ts` with derivation functions
   - `buildCanvasVisualSchema()` → discriminated Zod union
   - `buildPromptGuide(canvasVisualIds)` → prompt string (replaces VISUAL_PARAMS_REFERENCE)
   - `buildJsonSchema()` → JSON Schema object
   - TypeScript types exported via `z.infer<>`

3. Write tests proving:
   - Derived Zod schema validates all existing hand-crafted JSONs (after renaming `cells`→`items` in array visuals)
   - `buildPromptGuide()` output contains all the same rules currently in `VISUAL_PARAMS_REFERENCE`
   - JSON Schema validates and has correct descriptions
   - Every canvas visual type has a complete `generationRules` entry

4. Audit `bezier-connector`, `straight-arrow`, `data-flow-dot`:
   - Check if any JSON file uses them
   - Check if any renderer reads them
   - Decision: include in spec or remove from VisualTypeSchema

**Exit criteria for Phase 1:** Spec tests green. Spec is complete. Zero integration changes.

---

### Phase 2 — Full integration (zero drift)

**Goal:** Replace everything with spec-derived outputs. After this phase, it is impossible for a field to exist in a JSON that isn't in the spec, or be in the spec and not generated.

**2a — Schema & types**
- Replace `DynamicObjectSchema` in `schema.ts` with `buildCanvasVisualSchema()` from spec
- Replace manual interfaces in `types.ts` with `z.infer<>` from spec-derived schemas
- Update `SceneSchema` to use new top-level structure (canvas, activeText, hud instead of visuals)
- Update `parseScene()` / `safeParseScene()` — schema shape changes

**2b — AI pipeline schemas**
- Update `SceneSkeletonSchema` in `schemas.ts` for new skeleton shape
- Update `buildStepsSchema()` to use new step format (canvas/activeText/hud instead of actions)
- Update `buildPopupsSchema()` — minor (attachTo now from canvasVisualIds)
- No changes to `MiscSchema`

**2c — Prompt builders**
- Remove `VISUAL_PARAMS_REFERENCE` from `builders.ts`
- Replace with `buildPromptGuide(canvasVisualIds)` imported from `spec.build.ts`
- Update system prompts and stage prompts to reference new step structure
- Update `buildStage1Prompt` for new skeleton (canvas, activeText, hud)
- Update `buildStage2Prompt` for new step format

**2d — Assembly**
- Update `assembleScene()` to merge into new schema shape
- Fix `derivePageLayout()` for dsa-trace → `code-left-canvas-right`
- Remove `duration` from step assembly
- Remove `explanation[]` root array — it's now inside steps
- Add `activeText` and `hud` assembly logic

**2e — Hand-crafted JSON migration**
- Rename `cells` → `items` in all array visual JSONs (two-sum, binary-search, etc.)
- Restructure all `visuals[]` into `canvas[]` + `activeText` + `hud[]`
- Remove `duration` from all steps
- Remove `tags` from all JSONs
- Move `explanation[]` array content into step-embedded explanations
- Update `controls` button configs (remove any `input` type usage)
- Remove `popup.anchor` and `popup.targetPoint`
- Verify `highlightByStep.length === steps.length + 1` in all code blocks

**2f — Renderers**
- Update canvas renderer to read from `canvas[]` instead of `visuals[]`
- Add activeText renderer (replaces text-badge slot rendering)
- Add HUD renderer (replaces counter slot rendering)
- Audit and remove `slot` positioning logic for canvas visuals

**2g — JSON Schema export**
- Call `buildJsonSchema()` in a build script or Next.js build phase
- Write to `public/scene-schema.json`
- Add `"$schema": "/scene-schema.json"` to all JSON files

**2h — Docs update**
- Update `docs/scene-engine/scene-engine.md`
- Update `docs/explained/ai-module.md`
- Remove `docs/guides/iscl-quick-reference.md` (ISCL is already dead)

---

## 8. Open Questions / Parking Lot

| # | Question | Status |
|---|----------|--------|
| OQ1 | **Popups rethink** — are popups the right primitive? Could inline step annotations or canvas-attached tooltips serve better? | Deferred to separate discussion |
| OQ2 | **`activeText` position** — resolved: top overlay inside the canvas area (top-left of canvas region). Screenshot confirmed. | ✅ Resolved |
| OQ3 | **`bezier-connector`, `straight-arrow`, `data-flow-dot`** — used anywhere? | ✅ Resolved: zero JSON usage. Renderer components exist but remove from VisualTypeSchema. |
| OQ4 | **`concept` type + code** — assembly currently gives concepts `text-left-canvas-right`, but js-event-loop uses code. Should concept support `code-left-canvas-right` when a `code` block is present? | ✅ Resolved: js-event-loop works because it's hand-crafted (layout set directly in JSON). Assembly fix: `dsa-trace`→`code-left-canvas-right`, `concept`→`text-left-canvas-right`, `lld/hld`→`canvas-only`. Since AI never generates `code`, no AI scene ever needs code-left. |
| OQ5 | **`hud` max-3 enforcement** — enforce in Zod schema (`.max(3)`) or just a generation rule? | Lean: enforce in Zod |
| OQ6 | **Step 0 in hand-crafted files** — some hand-crafted files have explicit step 0 with actions. New schema makes step 0 always implicit. How to handle migration? | Lean: drop explicit step 0 from hand-crafted files during 2e migration |

---

## 9. Canonical JSON Example (New Format)

Two Sum — showing the new structure end-to-end:

```json
{
  "id": "two-sum",
  "title": "Two Sum",
  "type": "dsa-trace",
  "description": "Trace the O(n) hashmap solution for Two Sum.",
  "category": "Data Structures & Algorithms",

  "code": {
    "language": "python",
    "source": "def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        need = target - num\n        if need in seen:\n            return [seen[need], i]\n        seen[num] = i\n    return []\n",
    "highlightByStep": [0, 2, 4, 5, 10, 10]
  },

  "canvas": [
    {
      "id": "arr",
      "type": "array",
      "label": "nums",
      "layoutHint": "linear-H",
      "initialState": {
        "items": [
          { "value": 2 }, { "value": 7 }, { "value": 11 }, { "value": 15 }
        ]
      }
    },
    {
      "id": "seen-map",
      "type": "hashmap",
      "label": "seen",
      "layoutHint": "hashmap-buckets",
      "initialState": { "entries": [] }
    }
  ],

  "activeText": { "initialValue": "Start scan from left" },

  "hud": [],

  "controls": [],

  "steps": [
    {
      "index": 1,
      "explanation": {
        "heading": "Lookup Before Insert",
        "body": "For each number, check if its complement is already in `seen` before inserting.",
        "callout": "Lookup-first avoids reusing the same element."
      },
      "activeText": "i=0, num=2, need=7 → miss, store 2:0",
      "canvas": {
        "arr": {
          "items": [
            { "value": 2, "highlight": "active" },
            { "value": 7 }, { "value": 11 }, { "value": 15 }
          ]
        },
        "seen-map": {
          "entries": [{ "id": "e0", "key": "2", "value": "0", "highlight": "insert" }]
        }
      }
    },
    {
      "index": 2,
      "explanation": {
        "heading": "Hit Means Answer",
        "body": "At i=1, complement 2 is present in seen — return the pair immediately."
      },
      "activeText": "i=1, num=7, need=2 → HIT in seen",
      "canvas": {
        "arr": {
          "items": [
            { "value": 2, "highlight": "hit" },
            { "value": 7, "highlight": "active" },
            { "value": 11 }, { "value": 15 }
          ]
        },
        "seen-map": {
          "entries": [{ "id": "e0", "key": "2", "value": "0", "highlight": "hit" }]
        }
      }
    }
  ],

  "popups": [
    {
      "id": "p1",
      "attachTo": "seen-map",
      "text": "Store values we've seen",
      "showAtStep": 1,
      "hideAtStep": 2,
      "style": "info"
    }
  ],

  "challenges": [
    {
      "id": "c1",
      "title": "Duplicate Values",
      "description": "What changes when nums = [3, 3] and target = 6?",
      "type": "predict"
    }
  ],

  "complexity": { "time": "O(n)", "space": "O(n)" }
}
```

**Compared to old format:** No `duration`, no `actions[{target,params}]`, no `tags`, no `explanation[]` root array, no `slot` fields. `visuals[]` is gone — replaced by `canvas[]` + `activeText` + `hud[]`. Cleaner, strongly segregated, LLM-friendly.
