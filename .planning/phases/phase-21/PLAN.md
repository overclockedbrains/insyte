# Phase 21 — Step Engine

**Goal:** Extract step execution into a clean, dedicated layer in `packages/scene-engine/src/step-engine/`. Provides the pure deterministic functions that compute visual state and topology at any step index. All downstream consumers (Scene Graph in Phase 22, Scene Runtime in Phase 23, animation system in Phase 27) build on this foundation.

**Source research:** `ARCHITECTURE_V3.md` Part 1 §1.2–1.3 (step & state model, topology changes), Phase 22 (scene graph compute.ts defines these as internal functions — extracted here)

**Estimated effort:** 3–4 days

**Prerequisite:** Phase 19 (types: Visual, Step, Action, Condition must be finalized)

---

## Why a Dedicated Layer

Currently `applyStepActionsUpTo` and `computeTopologyAtStep` exist as internal functions inside Phase 22's `compute.ts`. The problems with keeping them there:

1. **No implementation of `evaluateCondition`** — Phase 22's compute.ts calls `evaluateCondition(v.showWhen, steps, stepIndex)` but provides no body. The `showWhen` condition evaluator is entirely missing.
2. **Every consumer re-couples to scene graph internals** — the runtime layer (Phase 23), the AI pipeline validator, and any future debugger all need step state without needing a full SceneGraph.
3. **Validation belongs here, not at render time** — step sequence integrity errors (non-monotonic indices, invalid targets) should be caught once, at load time.

Extracting to `step-engine/` gives each function a clean typed interface and a single place to test.

---

## What Actually Changes

### 1. `packages/scene-engine/src/step-engine/apply.ts` — New file

```typescript
import type { Visual, Step } from '../types'

/**
 * Replay all step actions from 0 to stepIndex (inclusive).
 * Returns a map of visualId → complete visual state at this step.
 *
 * Full-state contract: each Action carries the COMPLETE visual state for that step,
 * not a delta. Applying the same action twice yields the same result (idempotent).
 * This enables perfect random-access to any step without replaying history.
 */
export function applyStepActionsUpTo(
  visuals: Visual[],
  steps: Step[],
  stepIndex: number
): Map<string, Record<string, unknown>> {
  const stateMap = new Map<string, Record<string, unknown>>()

  // Initialize with each visual's initialState
  for (const visual of visuals) {
    stateMap.set(visual.id, { ...(visual.initialState as Record<string, unknown>) })
  }

  // Replay all actions from step 0 through stepIndex
  const limit = Math.min(stepIndex, steps.length - 1)
  for (let i = 0; i <= limit; i++) {
    for (const action of steps[i].actions) {
      // Full state snapshot — replace entire state for this visual
      stateMap.set(action.target, { ...action.params })
    }
  }

  return stateMap
}

/**
 * Convenience wrapper: get the state for a single visual at a specific step.
 */
export function getVisualStateAtStep(
  visual: Visual,
  steps: Step[],
  stepIndex: number
): Record<string, unknown> {
  const stateMap = applyStepActionsUpTo([visual], steps, stepIndex)
  return stateMap.get(visual.id) ?? (visual.initialState as Record<string, unknown>)
}
```

---

### 2. `packages/scene-engine/src/step-engine/conditions.ts` — New file

Implements `evaluateCondition` — the `showWhen` evaluator. Previously called in Phase 22's compute.ts but never implemented.

```typescript
import type { Condition, Step } from '../types'

/**
 * Evaluate a showWhen condition at a given step index.
 * Returns true if the visual should be visible at this step.
 *
 * Note on `control-toggle`: toggle state is driven by user interaction (PlaybackStore),
 * not by step index — so the step engine returns `true` as the structural default.
 * The renderer applies the actual toggle value as a final visibility filter.
 * This keeps the step engine pure (no Zustand dependency).
 */
export function evaluateCondition(
  condition: Condition,
  _steps: Step[],
  stepIndex: number
): boolean {
  switch (condition.type) {
    case 'step-range':
      return stepIndex >= condition.from && stepIndex <= condition.to

    case 'after-step':
      return stepIndex >= condition.after

    case 'before-step':
      return stepIndex < condition.before

    case 'control-toggle':
      return true  // overridden by PlaybackStore control state at render time

    case 'always':
    default:
      return true
  }
}
```

---

### 3. `packages/scene-engine/src/step-engine/topology.ts` — New file

```typescript
import type { Visual, Step } from '../types'
import { evaluateCondition } from './conditions'

/**
 * Compute which visuals are active (exist on canvas) at a given step.
 * Handles showWhen conditions for static visibility toggling.
 * Future: dynamic add-node / remove-node actions (e.g. recursion tree expansion).
 */
export function computeTopologyAtStep(
  visuals: Visual[],
  steps: Step[],
  stepIndex: number
): Visual[] {
  return visuals.filter(visual => {
    if (!visual.showWhen) return true
    return evaluateCondition(visual.showWhen, steps, stepIndex)
  })
}

/**
 * Hash topology at a given step for layout memoization.
 * Same hash → same computed positions → layout cache hit.
 * Only hashes structural identity (IDs, types, hints) — NOT visual state (colors, highlights).
 */
export function hashTopologyAtStep(
  visuals: Visual[],
  steps: Step[],
  stepIndex: number
): string {
  const active = computeTopologyAtStep(visuals, steps, stepIndex)
  return active
    .map(v => `${v.id}:${v.type}:${v.layoutHint ?? ''}:${v.slot ?? ''}`)
    .join('|')
}
```

---

### 4. `packages/scene-engine/src/step-engine/validation.ts` — New file

```typescript
import type { Visual, Step } from '../types'

export interface StepValidationResult {
  ok: boolean
  errors: string[]
}

/**
 * Validate step sequence integrity at load time — before any rendering occurs.
 * Catches structural errors that would otherwise surface as silent runtime bugs.
 */
export function validateStepSequence(
  visuals: Visual[],
  steps: Step[]
): StepValidationResult {
  const errors: string[] = []
  const visualIds = new Set(visuals.map(v => v.id))

  // Indices must be 0, 1, 2, ... with no gaps or duplicates
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].index !== i) {
      errors.push(
        `Step indices non-monotonic at position ${i}: expected ${i}, got ${steps[i].index}`
      )
    }
  }

  // Every action target must reference a declared visual ID
  for (const step of steps) {
    for (const action of step.actions) {
      if (!visualIds.has(action.target)) {
        errors.push(
          `Step ${step.index}: action targets unknown visual "${action.target}" (declared: ${[...visualIds].join(', ')})`
        )
      }
    }
  }

  return { ok: errors.length === 0, errors }
}
```

---

### 5. `packages/scene-engine/src/step-engine/index.ts` — New file

```typescript
export { applyStepActionsUpTo, getVisualStateAtStep } from './apply'
export { computeTopologyAtStep, hashTopologyAtStep } from './topology'
export { evaluateCondition } from './conditions'
export { validateStepSequence } from './validation'
export type { StepValidationResult } from './validation'
```

---

### 6. `packages/scene-engine/src/types.ts` — Edit: concrete Condition union

The `Condition` type is currently underspecified. Make it a concrete union so `evaluateCondition` can exhaustively switch on it:

```typescript
export type Condition =
  | { type: 'step-range';     from: number;   to: number }
  | { type: 'after-step';     after: number }
  | { type: 'before-step';    before: number }
  | { type: 'control-toggle'; controlId: string }
  | { type: 'always' }
```

Update `packages/scene-engine/src/schema.ts` with the corresponding Zod union:

```typescript
export const ConditionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('step-range'),     from: z.number(), to: z.number() }),
  z.object({ type: z.literal('after-step'),     after: z.number() }),
  z.object({ type: z.literal('before-step'),    before: z.number() }),
  z.object({ type: z.literal('control-toggle'), controlId: z.string() }),
  z.object({ type: z.literal('always') }),
])
```

---

### 7. `packages/scene-engine/src/index.ts` — Edit: export step engine

```typescript
// Step Engine
export {
  applyStepActionsUpTo,
  getVisualStateAtStep,
  computeTopologyAtStep,
  hashTopologyAtStep,
  evaluateCondition,
  validateStepSequence,
} from './step-engine'
export type { StepValidationResult } from './step-engine'
```

---

### 8. Phase 22 update: import from step engine

Phase 22's `computeSceneGraphAtStep` currently defines `applyStepActionsUpTo` and `computeTopologyAtStep` as inline functions. After this phase, compute.ts imports them:

```typescript
// packages/scene-engine/src/scene-graph/compute.ts (Phase 22 update)
import { applyStepActionsUpTo, computeTopologyAtStep } from '../step-engine'
// Remove inline definitions of these functions
```

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `packages/scene-engine/src/step-engine/apply.ts` | New | `applyStepActionsUpTo`, `getVisualStateAtStep` |
| `packages/scene-engine/src/step-engine/topology.ts` | New | `computeTopologyAtStep`, `hashTopologyAtStep` |
| `packages/scene-engine/src/step-engine/conditions.ts` | New | `evaluateCondition` — previously called but never implemented |
| `packages/scene-engine/src/step-engine/validation.ts` | New | `validateStepSequence` |
| `packages/scene-engine/src/step-engine/index.ts` | New | Barrel export |
| `packages/scene-engine/src/types.ts` | Edit | Concrete `Condition` discriminated union |
| `packages/scene-engine/src/schema.ts` | Edit | Zod `ConditionSchema` |
| `packages/scene-engine/src/index.ts` | Edit | Export step engine functions |
| `packages/scene-engine/src/scene-graph/compute.ts` | Edit (Phase 22) | Import `applyStepActionsUpTo` + `computeTopologyAtStep` from step engine; remove inline defs |
