# Scene JSON and Rendering Contract

How scene JSON is validated and transformed into UI visuals.

## Core Package

- Package: `packages/scene-engine`
- Public API: `src/index.ts`
- Main responsibilities:
  - shared TypeScript scene types
  - Zod schemas for validation
  - normalization and parse helpers
  - visual state computation per step

## Scene Root Contract

Top-level `Scene` fields include:

- metadata: `id`, `title`, `type`, `layout`
- canvas model: `visuals`, `steps`
- interaction model: `controls`, `popups`, `challenges`
- narrative model: `explanation`
- optional code block for DSA: `code`

See source:

- `packages/scene-engine/src/types.ts`
- `packages/scene-engine/src/schema.ts`

## Supported Enums

| Kind | Values |
| --- | --- |
| `SceneType` | `concept`, `dsa-trace`, `lld`, `hld` |
| `SceneLayout` | `canvas-only`, `code-left-canvas-right`, `text-left-canvas-right` |
| `VisualType` | `array`, `hashmap`, `linked-list`, `tree`, `graph`, `stack`, `queue`, `dp-table`, `recursion-tree`, `system-diagram`, `text-badge`, `counter`, `grid`, `bezier-connector`, `straight-arrow`, `data-flow-dot` |
| `ControlType` | `slider`, `toggle`, `input`, `button`, `toggle-group` |

## Parse and Normalize Pipeline

1. Raw JSON enters `parseScene` or `safeParseScene`.
2. `SceneSchema` validates structure and enums.
3. `normalizeScene`:
   - ensures arrays are always present
   - sorts and reindexes steps
   - aligns `code.highlightByStep` with step count
4. Normalized scene is consumed by app renderer.

## Runtime Rendering Pipeline

1. Scene stored in Zustand (`setScene`/`setDraftScene`).
2. `SimulationLayout` selects layout shell.
3. `SceneRenderer` iterates `scene.visuals`.
4. For each visual, `computeVisualStateAtStep(scene, visualId, currentStep)` replays actions from step `0..currentStep`.
5. `PrimitiveRegistry` maps `visual.type` to the UI component.
6. Primitive renders current visual state.

## Action Semantics

Built-in action handling in `computeVisualStateAtStep` supports:

- `set`
- `set-value`
- `push`
- `pop`
- `highlight`

Unknown actions fallback to shallow merge behavior.

## Streaming and Partial Promotion

During `/api/generate` and `/api/visualize-trace`:

- client receives partial objects
- valid partial fields are promoted into the draft/active scene
- final object is validated again before committing full scene state

Main hook: `apps/web/src/engine/hooks/useStreamScene.ts`

