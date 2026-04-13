# Adding Scenes & Primitives

Practical step-by-step checklists for extending insyte visuals.
Updated April 2026 (R2 / Phase 27).

---

## Add a New Static Scene

1. Create scene JSON at `apps/web/src/content/scenes/<category>/<slug>.json`.
   - Category must be one of: `concepts/`, `dsa/`, `lld/`, `hld/`
2. Register the slug in `apps/web/src/lib/scene-loader.ts` (`SCENE_MODULES`).
3. Add discoverability metadata in `apps/web/src/content/topic-index.ts` (required if the scene should appear in `/explore`).
4. Validate schema:
   ```
   pnpm validate-scenes
   ```
5. If seeding to Supabase:
   ```
   pnpm --filter web seed
   pnpm --filter web seed-scenes
   ```
6. Check that the AI can generate valid ISCL for the scene type — update Stage 1 prompt in `src/ai/prompts/stage1-iscl.md` if needed.

---

## Add a New Visual Primitive

Update all required layers in order:

### 1 — `packages/scene-engine`

- `src/types.ts`: add new value to `VisualType` union
- `src/schema.ts`: add value to `VisualTypeSchema` enum
- If the primitive needs new layout behavior, add a new `LayoutHint` value and implement the algorithm in `src/layout/algorithms/`
- Update `PRIMITIVE_SIZING` in `src/layout/constants.ts`

### 2 — `apps/web/src/engine/primitives`

- Create `<NewViz>.tsx` implementing the primitive component
- Register it in `primitives/index.ts` (`PrimitiveRegistry`)

### 3 — AI Guidance

- Update `src/ai/prompts/stage2a-states.md` to show valid `initialState` shape
- Update `src/ai/validators/states.ts` if the state shape needs explicit validation

### 4 — Validate

- `pnpm validate-scenes` — schema passes
- `pnpm type-check` — no TS errors
- Load a scene using the new visual type in `/s/[slug]`

---

## Add a New Control Type

1. `packages/scene-engine/src/types.ts` — add to `ControlType` union
2. `packages/scene-engine/src/schema.ts` — add to `ControlTypeSchema` + `ControlSchema` union
3. `apps/web/src/engine/controls/` — add rendering component
4. `apps/web/src/engine/controls/ControlBar.tsx` — add dispatch case

---

## Add a New AI Provider or Model

### New model for an existing provider

1. Add the model to `models[]` in `src/ai/registry.ts` for the relevant provider.
2. If the model needs specific `providerOptions` (e.g. thinking budget), update `providerOptions` in `REGISTRY`.
3. Verify the model appears in the settings UI model selector.

### New provider entirely

1. Add provider ID to the `Provider` union in `src/ai/registry.ts`.
2. Add a full `ProviderConfig` entry in `REGISTRY`.
3. Create `src/ai/providers/<provider>.ts` that exports a `createModel(modelId, apiKey, baseURL?) → LanguageModel` factory.
4. Wire into `src/ai/providers/index.ts` (`resolveModel` switch).
5. Add settings UI if the provider needs key/base-URL input:
   - `components/settings/ProviderSelector.tsx`
   - `components/settings/ApiKeyInput.tsx`
6. If the provider doesn't support structured output, ensure `generateSceneCompat()` text-mode fallback handles it.

---

## Definition of Done Checklist

- [ ] Schema validation passes (`pnpm validate-scenes`)
- [ ] TypeScript check passes (`pnpm type-check`)
- [ ] Unit tests pass (`pnpm test`)
- [ ] New scene / primitive renders correctly in `/s/[slug]`
- [ ] Explore listing updated if user-facing
- [ ] AI can generate valid ISCL for the new primitive type (manual test with a topic)
- [ ] `docs/` updated for any new public contract (types, API, ISCL grammar)
