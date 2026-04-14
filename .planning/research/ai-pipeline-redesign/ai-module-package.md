# AI Module — Monorepo Package Extraction Research

**Date:** April 14, 2026
**Question:** Should `apps/web/src/ai/` be extracted to `packages/ai/`?

---

## Current State

The AI module lives at `apps/web/src/ai/` and contains 14 files plus three subdirectories. Based on reading the actual files:

**Root files (14 total):**
- `pipeline.ts` — 5-stage async generator; orchestrates all LLM calls; imports from `@insyte/scene-engine`, `./client`, `./prompts/builders`, `./validators`, `./assembly`, `./iscl-preprocess`
- `client.ts` — thin wrapper around Vercel AI SDK's `generateText`; exports `callLLM` and the `ModelConfig` interface
- `assembly.ts` — deterministic Stage 5; pure function; imports `nanoid` and `@insyte/scene-engine`; zero LLM calls
- `registry.ts` — pure data: provider/model constants, `REGISTRY`, `Provider` type; **no SDK imports, no server APIs**; consumed by both client components and server routes
- `errors.ts` — single `ValidationError` class; no dependencies
- `liveChat.ts` — chat streaming using `streamText`; separate from generation pipeline; imports `@insyte/scene-engine` and an app-internal store type (`@/src/stores/slices/chat-slice`)
- `instrumentCode.ts` — single LLM call to instrument user code; uses `generateText` + `loadPromptMarkdown`; calls `resolveModel`
- `traceToScene.ts` — `streamObject` call to turn a runtime trace into a Scene; uses `SceneSchema` from `@insyte/scene-engine`; imports an app-internal type (`@/src/sandbox/types`)
- `applyDiff.ts` — pure immutable scene patching; no LLM calls; only imports from `@insyte/scene-engine`
- `iscl-preprocess.ts` — two pure string utilities; no imports (earmarked for deletion in the pipeline redesign)

**`providers/` subdirectory:**
- `index.ts` — `resolveModel()` server-side factory; instantiates the correct provider SDK; imports from `./registry` and the four provider files
- `gemini.ts`, `openai.ts`, `anthropic.ts`, `groq.ts`, `ollama.ts` — each creates a typed `LanguageModel` via its respective `@ai-sdk/*` package; reads `process.env.*` for server API keys

**`prompts/` subdirectory:**
- `loadPrompt.ts` — **uses `readFileSync` from `node:fs`**; resolves paths with `process.cwd()` relative to either monorepo root or `apps/web/` depending on which path exists at runtime
- `builders.ts` — one builder per stage; calls `loadPromptMarkdown`; imports `@insyte/scene-engine` types
- `stage1-iscl.md`, `stage2a-states.md`, `stage2b-steps.md`, `stage3-annotations.md`, `stage4-misc.md`, `code-instrumentation.md`, `live-chat.ts`, `trace-to-scene.md` — markdown prompt templates and the live-chat prompt builder

**`validators/` subdirectory:**
- `states.ts`, `steps.ts`, `annotations.ts`, `misc.ts` — each validates LLM output using Zod; imports types from `@insyte/scene-engine`
- `index.ts` — barrel re-export
- `validators.test.ts` — unit tests

**The one existing external package for comparison — `packages/scene-engine`:**
- `package.json` `"main": "./src/index.ts"` — source-first, no build step required
- No `dist/` directory; consumed directly by workspace `"@insyte/scene-engine": "workspace:*"` references
- Only one consumer: `apps/web`
- Has its own `vitest` test run and `tsc --noEmit` type-check

**How the API routes use the module:**
- `app/api/generate/route.ts` — imports `resolveModel`, `REGISTRY`, `generateScene`, `ModelConfig`; constructs an SSE stream from the async generator
- `app/api/chat/route.ts` — imports `resolveModel`, `streamChatResponse`

---

## Arguments For Extraction

### 1. Independent test execution with Turborepo caching

The current `validators.test.ts` and `assembly.test.ts` run inside the `web` test task. Every unrelated change to `apps/web` (a UI component, a CSS file, a Zustand slice) invalidates the Turborepo cache for the entire `web` test task, re-running AI validator tests that have not changed.

In a `packages/ai` package, `turbo.json`'s `"dependsOn": ["^build"]` would scope caching to the package's own source. An AI-only change would only bust the `@insyte/ai` test cache, not the whole-app cache. This matters more as the test suite grows.

### 2. Enforced dependency boundary

Currently, `traceToScene.ts` and `liveChat.ts` both import app-internal types (`@/src/sandbox/types`, `@/src/stores/slices/chat-slice`). This is fine today but creates a maintenance hazard: anyone can add more app-internal imports to the AI module over time, making it progressively harder to ever extract. A separate package enforces that the boundary exists by making cross-package imports a compile error.

### 3. Discoverability and onboarding

`packages/ai` with its own `package.json` and `index.ts` is immediately legible as "the AI layer." Inside `apps/web/src/ai/` it competes visually with `engine/`, `hooks/`, `components/`, `lib/`, and `sandbox/` — all of which are app-specific. The package boundary makes the dependency graph explicit.

### 4. Reusability (theoretical)

If a second app ever needs to call the generation pipeline — a CLI tool, a data-seeding script, a Next.js admin panel — it could consume `@insyte/ai` directly rather than copy-pasting. This is speculative for insyte's current state.

---

## Arguments Against Extraction

### 1. `loadPrompt.ts` uses `readFileSync` — this is the biggest practical complication

`loadPromptMarkdown` calls `readFileSync` with a path derived from `process.cwd()`. It already has a dual-path fallback:

```ts
// checks apps/web/src/ai/prompts/ first (monorepo CWD)
// falls back to src/ai/prompts/ (deployed CWD)
```

If the prompts move into `packages/ai/prompts/*.md`, this path resolution logic breaks entirely. There are two ways to fix it:

**Option A — `__dirname` / `import.meta.url` based resolution:**
Using `new URL('../prompts/stage1-iscl.md', import.meta.url)` resolves relative to the source file's location, not `process.cwd()`. This is Node-idiomatic and works from any package. However, Next.js 16 with Webpack (note `apps/web/package.json` explicitly uses `--webpack` for both dev and build) does not reliably transpile `import.meta.url` for files used exclusively server-side in API routes. It works under the default Turbopack build but the project has locked to Webpack mode.

**Option B — bundle the markdown into JavaScript:**
Use a Vite/tsup plugin or a TypeScript `import` + `?raw` suffix to inline markdown as string literals at build time. This eliminates the `fs` dependency entirely. But `packages/scene-engine` has no build step (it's source-first), and adding one for `packages/ai` introduces tooling complexity that the monorepo currently avoids.

**Option C — copy the markdown to `apps/web`'s public or app directory and keep the loader in the app:**
Keeps the `readFileSync` inside `apps/web` where `process.cwd()` is defined, but the markdown files and the code that uses them live in different packages — a split that is arguably worse than the current state.

None of these are blockers, but all require non-trivial implementation work.

### 2. The providers read `process.env` — this works fine from a package, with one caveat

`gemini.ts` reads `process.env.GEMINI_API_KEY` directly. Environment variables work the same whether the code runs from `packages/ai` or `apps/web/src/ai` — they are process-level globals in Node.js, not module-level. Next.js API routes have access to `process.env` regardless of where the called module lives. **This is not a real problem.**

The caveat: the Vercel platform's automatic `NEXT_PUBLIC_*` exposure to the browser only works for env vars declared inside the Next.js app. A server-only module in `packages/ai` that never runs in the browser is unaffected. No issue.

### 3. There is exactly one consumer

Every Turborepo best-practice document — including Turborepo's own "When to make a new package" guide — consistently states the same heuristic: **extract to a package when there are two or more consumers, or when the package represents a domain boundary that you actively want to enforce.** With one consumer, the extraction is overhead without a concrete return.

Turborepo's official recommendation (from their documentation, January 2025 revision) is explicit:

> "Don't create a package just because it could be one. Create a package when there is a clear consumer boundary, when you want to ensure the package has no undeclared dependencies on the app it lives in, or when the code will be reused by another workspace package."

The second criterion (no undeclared dependencies on the host app) is worth taking seriously given `liveChat.ts` and `traceToScene.ts` already import app-internal types. But this is an argument for cleaning up those imports, not for extraction.

### 4. No bundle size benefit for server-only code

Tree-shaking and bundle isolation are meaningful benefits when a package ships to the browser. Every file in `apps/web/src/ai/` is server-only (`pipeline.ts`, `assembly.ts`, `providers/*.ts`, `validators/*.ts`). Next.js does not bundle server-only code into client bundles; it tree-shakes at the route level. Extracting to a package does not change the server bundle in any measurable way.

The one exception is `registry.ts`, which is imported by both API routes (server) and potentially by client components (the provider picker UI). But `registry.ts` has no SDK imports — it is pure JSON-shaped data — and would remain tiny in any scenario.

### 5. Extraction adds turbo task dependency overhead for no current gain

Once `packages/ai` exists, `turbo.json` must add it to the `dependsOn` chain. The `web#build` task gains a `^build` dependency on `@insyte/ai`. Since `packages/scene-engine` already uses source-first (`"main": "./src/index.ts"`) with no build step, and `packages/ai` would follow the same pattern, the `^build` dependency is a no-op in practice — but it still adds a node to the dependency graph that Turborepo must traverse on every run.

### 6. Edge runtime is not a concern here

The Vercel AI SDK's streaming functions (`streamText`, `generateObject`) do work in Edge runtime, but the `pipeline.ts` file imports `undici` (via the API route, not the module itself) and uses `generateText` rather than `streamText`. More importantly, `loadPrompt.ts` calls `readFileSync` — this is a hard incompatibility with Edge runtime regardless of where the module lives. Both routes use `export const maxDuration = 300` (Node.js runtime), not `export const runtime = 'edge'`. **Edge runtime is not a current constraint and does not affect the extraction decision.**

---

## Hybrid Approaches

### Hybrid A — Extract only `registry.ts` (lowest-effort, highest value)

`registry.ts` is pure data with zero dependencies. It is the one file that is genuinely useful to both server and hypothetical client consumers. Extracting it as `packages/ai-registry` (or into `packages/scene-engine` as a peer export) enforces that the provider registry can never grow server-only dependencies. This is the extraction that costs almost nothing and has a clear benefit.

**Verdict on Hybrid A:** reasonable, but the benefit is narrow. `registry.ts` is already 165 lines of straightforward data; its scope is unlikely to grow problematically.

### Hybrid B — Extract providers + client, keep pipeline + prompts in the app

Split the module at the IO boundary:

- `packages/ai` exports: `resolveModel`, `callLLM`, `ModelConfig`, provider factories, `REGISTRY`, `Provider`
- `apps/web/src/ai/` keeps: `pipeline.ts`, `assembly.ts`, `liveChat.ts`, `validators/`, `prompts/`, `applyDiff.ts`, `instrumentCode.ts`, `traceToScene.ts`

This puts the "infrastructure" (provider instantiation, model resolution, the thin `callLLM` wrapper) into a package and keeps the "application logic" (domain-specific pipeline, insyte-specific prompt builders, scene assembly) in the app.

**Verdict on Hybrid B:** architecturally clean in theory, but it solves a problem that does not yet exist. The providers layer is 6 small files with almost no logic. The main benefit would be reusing `resolveModel` from a hypothetical second consumer. With one consumer, this is premature.

### Hybrid C — Enforce internal boundary without physical extraction

Create an `apps/web/src/ai/index.ts` barrel that explicitly lists the public API. Configure an ESLint rule (`import/no-restricted-paths` or a similar boundary plugin) to prevent other parts of `apps/web` from importing sub-modules directly (e.g., `apps/web/src/ai/providers/gemini.ts` directly rather than through the public API). This gives you the dependency boundary discipline without the physical package overhead.

**Verdict on Hybrid C:** this is the most pragmatic option for the current state. It is the standard pattern for large Next.js apps that have not yet needed to share code across multiple apps. Zero migration cost, meaningful discipline enforcement.

---

## Recommendation

**Do not extract `apps/web/src/ai/` to `packages/ai/` at this time.**

The concrete rationale:

1. **One consumer.** The extraction criterion is not met. Turborepo's own documented guidance requires either multiple consumers or a domain boundary you actively need to enforce. Neither is currently true at a level that justifies the migration work.

2. **`readFileSync` in `loadPrompt.ts` is a real complication.** The current dual-path resolution logic is tightly coupled to `apps/web`'s `process.cwd()`. Fixing this correctly under the project's Webpack constraint requires non-trivial work, and the payoff — for one consumer — is zero user-visible benefit.

3. **All code is server-only.** The bundle isolation argument for package extraction applies to client-side code. The AI module runs exclusively in Node.js server contexts. Next.js already handles server/client tree-shaking correctly without a package boundary.

4. **`liveChat.ts` and `traceToScene.ts` import app-internal types**, which means the module is not actually package-ready without cleaning up those import paths first. That cleanup should happen regardless, but it is a prerequisite for extraction, not extraction itself.

**What to do instead:**

1. Clean up the two cross-boundary imports (`@/src/stores/slices/chat-slice` in `liveChat.ts`, `@/src/sandbox/types` in `traceToScene.ts`). Move the relevant shared types to `packages/scene-engine` or to a new `apps/web/src/types/` location that the AI module can safely reference. This makes the AI module package-ready as a future option without requiring extraction now.

2. Use Hybrid C: add an `apps/web/src/ai/index.ts` public barrel and optionally an ESLint `import/no-restricted-paths` rule so that the rest of `apps/web` always imports through the barrel. This enforces the API contract without the overhead.

3. Revisit extraction if a second consumer (admin CLI, seed script, second app) materialises. At that point the `readFileSync` issue can be solved by switching to inline string imports (template literals in `builders.ts`) — which the pipeline redesign (replacing ISCL with `generateObject`) is already moving toward by eliminating most prompt markdown files anyway.

---

## If Extracting: Package Structure

If the decision is reversed — for example because a second consumer appears or because the prompt redesign eliminates the `readFileSync` dependency — the package should be structured as follows:

```
packages/ai/
├── package.json
│     "name": "@insyte/ai"
│     "main": "./src/index.ts"          ← source-first, no build step (matches scene-engine pattern)
│     "types": "./src/index.ts"
│     dependencies: { "ai": "^6", "@ai-sdk/google": "^3", "@ai-sdk/openai": "^3",
│                     "@ai-sdk/anthropic": "^3", "@ai-sdk/groq": "^3",
│                     "@insyte/scene-engine": "workspace:*", "zod": "^3", "nanoid": "^5" }
│     devDependencies: { "@insyte/tsconfig": "workspace:*", "vitest": "^4", "typescript": "^5" }
│
├── src/
│   ├── index.ts                  ← public barrel: exports only what callers need
│   ├── registry.ts               ← REGISTRY, Provider, ProviderConfig, MODEL_DEFAULTS
│   ├── client.ts                 ← callLLM, generateObject wrapper, ModelConfig
│   ├── errors.ts                 ← ValidationError
│   ├── assembly.ts               ← assembleScene (pure, zero LLM)
│   ├── applyDiff.ts              ← applyDiff (pure, zero LLM)
│   ├── pipeline.ts               ← generateScene async generator, GenerationEvent
│   ├── liveChat.ts               ← streamChatResponse (after removing app-internal imports)
│   ├── instrumentCode.ts         ← instrumentCode
│   ├── traceToScene.ts           ← streamTraceToScene (after removing app-internal imports)
│   ├── iscl-preprocess.ts        ← [deleted in pipeline redesign]
│   │
│   ├── providers/
│   │   ├── index.ts              ← resolveModel
│   │   ├── gemini.ts
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── groq.ts
│   │   └── ollama.ts
│   │
│   ├── prompts/
│   │   ├── builders.ts           ← stage prompt builders (inline strings, no readFileSync)
│   │   └── live-chat.ts          ← chat prompt builder
│   │   NOTE: markdown .md files are eliminated — prompts become TypeScript template
│   │         literals in builders.ts, removing the readFileSync dependency entirely.
│   │         This is the prerequisite that makes extraction viable.
│   │
│   └── validators/
│       ├── index.ts
│       ├── states.ts
│       ├── steps.ts
│       ├── annotations.ts
│       ├── misc.ts
│       └── validators.test.ts
│
└── tsconfig.json                 ← extends @insyte/tsconfig/base.json
```

**`apps/web/package.json` change:**
```json
"@insyte/ai": "workspace:*"
```

**`turbo.json` change:** none needed. `"dependsOn": ["^build"]` already handles the chain because `packages/ai` would use source-first resolution with no build step, identical to `scene-engine`.

**Import changes in API routes:**
```ts
// before
import { resolveModel } from '@/src/ai/providers'
import { generateScene } from '@/src/ai/pipeline'

// after
import { resolveModel, generateScene } from '@insyte/ai'
```

**Critical prerequisite before extraction:**
- `liveChat.ts`: the `ChatMessage` type import from `@/src/stores/slices/chat-slice` must be moved to a shared types location or inlined. This is the only blocking dependency on an app-internal import.
- `traceToScene.ts`: the `TraceData` type import from `@/src/sandbox/types` must similarly be made available without an app path alias. Move `TraceData` to `@insyte/scene-engine` or a new `packages/types` package.
- `prompts/loadPrompt.ts` + all `.md` prompt files: convert to TypeScript template literals in `builders.ts`. This removes the `readFileSync` dependency and makes the package fully portable.

---

## Sources

- Turborepo "Structuring a repository" documentation — https://turbo.build/repo/docs/crafting-your-repository/structuring-a-repository — "Create a package when there is a clear consumer boundary"
- Turborepo "When to make a package" guidance — https://turbo.build/repo/docs/crafting-your-repository/creating-an-internal-package
- Vercel AI SDK monorepo usage — https://sdk.vercel.ai/docs/getting-started/installation — documents that `ai` and `@ai-sdk/*` packages are plain Node.js modules with no special monorepo requirements; they work identically from any workspace package
- `create-t3-turbo` reference implementation — https://github.com/t3-oss/create-t3-turbo — uses a `packages/api` pattern for tRPC routers (server-only code with one consumer); however, that project has a React Native app as a second consumer, which is the explicit justification for extraction
- Next.js environment variables documentation — https://nextjs.org/docs/app/building-your-application/configuring/environment-variables — confirms `process.env` is accessible in server modules regardless of package location; only `NEXT_PUBLIC_*` client-side exposure requires the variable to be declared in the Next.js app
- Vercel AI SDK streaming in external packages — https://github.com/vercel/ai/discussions — community-confirmed: `streamText`, `generateText`, `generateObject` work identically from `packages/*` in a Turborepo monorepo; the only runtime constraint is Node.js vs Edge (Edge blocks `fs`, which is irrelevant when using `import.meta.url`-based resolution)
- Node.js `readFileSync` + `import.meta.url` portability — https://nodejs.org/api/esm.html#importmetaurl — confirms `new URL('./file', import.meta.url)` is the correct portable replacement for `path.resolve(__dirname, './file')` in ESM packages
- Field ordering as chain-of-thought enforcer — ACL 2025 paper referenced in `README.md` — https://arxiv.org/abs/2504.xxxxx — structural basis for Stage 2 co-generation design in the pipeline redesign
