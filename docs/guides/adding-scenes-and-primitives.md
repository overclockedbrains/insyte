# Adding Scenes and Primitives

Practical implementation checklist for extending insyte visuals.

## Add a New Static Scene

1. Add scene JSON under `apps/web/src/content/scenes/<category>/<slug>.json`.
2. Register the slug in `apps/web/src/lib/scene-loader.ts` (`SCENE_MODULES`).
3. Add discoverability metadata in `apps/web/src/content/topic-index.ts` if it should appear in Explore.
4. Validate schema:
   - `pnpm validate-scenes`
5. If using Supabase seeding flows, run:
   - `pnpm --filter web seed`
   - `pnpm --filter web seed-scenes`

## Add a New Visual Primitive

If you add a new `visual.type`, update all required layers:

1. Scene-engine type union:
   - `packages/scene-engine/src/types.ts` (`VisualType`)
2. Zod schema enum:
   - `packages/scene-engine/src/schema.ts` (`VisualTypeSchema`)
3. Primitive component:
   - create `apps/web/src/engine/primitives/<NewViz>.tsx`
4. Registry mapping:
   - `apps/web/src/engine/primitives/index.ts` (`PrimitiveRegistry`)
5. Provide AI guidance if needed:
   - update prompt templates to emit valid `initialState` and action patterns
6. Validate by loading a scene using the new visual type.

## Add a New Control Type

1. Update `ControlType` in `packages/scene-engine/src/types.ts`.
2. Extend `ControlTypeSchema` + `ControlSchema` union in `packages/scene-engine/src/schema.ts`.
3. Add rendering support in engine controls:
   - `apps/web/src/engine/controls/*`
   - `ControlBar.tsx` switch/dispatch logic

## Add a New AI Provider or Model

1. Update provider registry:
   - `apps/web/src/ai/registry.ts`
2. Add provider adapter if new provider:
   - `apps/web/src/ai/providers/<provider>.ts`
3. Wire into resolver:
   - `apps/web/src/ai/providers/index.ts`
4. Ensure settings UI exposes provider/model:
   - `components/settings/*`

## Definition of Done Checklist

- Scene schema validation passes (`pnpm validate-scenes`).
- Type-check passes (`pnpm type-check`).
- New scene/primitive renders correctly in `/s/[slug]`.
- Explore listing updated if user-facing.
- Docs in `docs/` updated for any new public contract.

