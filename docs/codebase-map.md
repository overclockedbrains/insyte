# Codebase Map

High-level map of the monorepo and where core responsibilities live.

## Monorepo Structure

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js app, App Router pages, API routes, rendering UI, Supabase integration |
| `packages/scene-engine` | Shared scene types, Zod schemas, parsing, normalization, state computation |
| `packages/tsconfig` | Shared TS config presets |
| `docs` | Architecture and implementation documentation |
| `.planning` | Product/design decisions and planning artifacts |

## App Route Map (`apps/web/app`)

| Route | Type | Purpose |
| --- | --- | --- |
| `/` | Page | Landing page with unified prompt input |
| `/explore` | Page | Browse curated prebuilt simulations |
| `/settings` | Page | Provider/model selection and local BYOK management |
| `/profile` | Page | Saved scenes + generation history |
| `/s/[slug]` | Page | Simulation player route for static, cached, or streamed scenes |
| `/auth/callback` | Route | OAuth callback and Supabase code exchange |

## API Route Map (`apps/web/app/api`)

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/generate` | `POST` | Concept/LLD/HLD scene generation stream |
| `/api/instrument` | `POST` | DSA code instrumentation |
| `/api/visualize-trace` | `POST` | Trace-to-scene generation stream |
| `/api/chat` | `POST` | Contextual tutor chat stream with optional scene patch |
| `/api/rate-limit-status` | `GET` | Free-tier remaining quota check |

## Runtime Subsystems (`apps/web/src`)

| Module | Path | Responsibility |
| --- | --- | --- |
| AI orchestration | `src/ai` | Model registry, provider resolution, prompts, generation pipelines |
| Simulation engine | `src/engine` | Layouts, renderer, primitives, controls, playback hooks |
| State | `src/stores` | Zustand slices for scene, playback, chat, settings, auth, detection |
| Sandbox | `src/sandbox` | Python (Pyodide) and JS worker execution for DSA traces |
| Content | `src/content` | Topic index and prebuilt scene JSON |
| Shared libs | `src/lib` | Slugs, analytics, config, scene loading |

## Key Build and Validation Commands

| Command | Scope | Purpose |
| --- | --- | --- |
| `pnpm dev` | root | Start Turborepo dev pipeline |
| `pnpm build` | root | Build all packages/apps |
| `pnpm type-check` | root | Type-check workspace |
| `pnpm validate-scenes` | root | Validate production scene JSON against `SceneSchema` |

