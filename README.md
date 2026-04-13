<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/insyte-wordmark-dark.svg">
    <img src="docs/assets/insyte-wordmark-light.svg" alt="insyte" width="300">
  </picture>
</p>

<p align="center">
  <strong>AI-powered interactive simulations for concepts, DSA traces, and system design.</strong><br/>
  Turn prompts into live visuals you can scrub, replay, tweak, and discuss.
</p>

<p align="center">
  <a href="#quick-start"><img alt="Get Started" src="https://img.shields.io/badge/Get%20Started-Quick%20Setup-6C47FF?style=for-the-badge"></a>
  <a href="docs/README.md"><img alt="Documentation" src="https://img.shields.io/badge/Documentation-Read%20the%20Docs-1D9BF0?style=for-the-badge"></a>
  <a href="docs/architecture/tech-architecture.md"><img alt="Architecture" src="https://img.shields.io/badge/Architecture-Diagrams-00A97F?style=for-the-badge"></a>
</p>

<p align="center">
  <a href="https://nextjs.org/"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-111111?style=flat-square&logo=nextdotjs"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white"></a>
  <a href="https://supabase.com/"><img alt="Supabase" src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white"></a>
  <a href="https://sdk.vercel.ai/"><img alt="Vercel AI SDK" src="https://img.shields.io/badge/Vercel%20AI%20SDK-Streaming-000000?style=flat-square&logo=vercel"></a>
  <a href="https://vercel.com/"><img alt="Deploy Vercel" src="https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel"></a>
</p>

## Why insyte

- **Prompt-first workflow** for concept explanations, DSA algorithm traces, and system design walkthroughs.
- **5-stage AI pipeline** — ISCL grammar → parallel state/step generation → annotations → deterministic assembly. Per-stage retry, partial-success recovery, no monolithic JSON hallucination.
- **ISCL (Insyte Scene Language)** — a purpose-built DSL the AI generates. No XY coordinates; the layout engine positions everything deterministically.
- **Scene-based runtime**: step engine, layout engine (dagre / d3-hierarchy / arithmetic / radial), scene-graph diff, LRU cache, and targeted Framer Motion animations — all in `packages/scene-engine`.
- **BYOK** for Gemini, OpenAI, Anthropic, Groq, Ollama (local), and any OpenAI-compatible endpoint.
- **Static + Supabase-cached + AI-streamed** scene paths through one unified player.

## Quick Navigation

| Section | Link |
| --- | --- |
| Live product screens | [Product Preview](#product-preview) |
| Local setup | [Quick Start](#quick-start) |
| Environment variables | [Environment Setup](#environment-setup) |
| Scripts | [Commands](#commands) |
| Docs hub | [Documentation](#documentation) |
| Monorepo layout | [Architecture](#architecture) |
| Deployment | [Deployment Notes](#deployment-notes) |
| Contribution flow | [Contributing](#contributing) |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+

### Run locally

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

Open `http://localhost:3000`.

On Windows (PowerShell), you can copy env file with:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

## Environment Setup

`apps/web/.env.example` documents required production variables.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public origin for canonical URLs and OG metadata |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe key for auth/client reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key for caching, seeding, and rate-limits |
| `GEMINI_API_KEY` | Server fallback key for non-BYOK generation |

`apps/web/.env.local` is gitignored at both repo root and app level.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start full Turborepo dev pipeline (packages watch + web dev server) |
| `pnpm build` | Build all packages then the app |
| `pnpm type-check` | TypeScript check across the entire workspace |
| `pnpm test` | Run Vitest unit tests (ISCL parser, step engine, validators, assembly) |
| `pnpm validate-scenes` | Validate all 24 production scene JSON files against `SceneSchema` |
| `pnpm --filter web seed` | Seed topic index metadata to Supabase |
| `pnpm --filter web seed-scenes` | Seed scene records to Supabase |

## Product Preview

<p align="center">
  <sub>Live product snapshots from <a href="https://insyte.amanarya.com/">insyte.amanarya.com</a></sub>
</p>

<p align="center">
  <a href="docs/assets/screenshots/home.png">
    <img src="docs/assets/screenshots/home.png" alt="insyte homepage" width="92%">
  </a>
</p>

<p align="center">
  <sub><strong>Homepage</strong> | Prompt-first landing and live demo entry</sub>
</p>

<table align="center" width="92%" cellpadding="8" cellspacing="0">
  <tr>
    <td align="center" valign="top" width="33%">
      <a href="docs/assets/screenshots/simulation-chat-system.png">
        <img src="docs/assets/screenshots/simulation-chat-system.png" alt="insyte simulation player" width="100%">
      </a>
      <p><strong>Simulation Player</strong><br/><sub>Interactive playback and controls</sub></p>
    </td>
    <td align="center" valign="top" width="33%">
      <a href="docs/assets/screenshots/explore.png">
        <img src="docs/assets/screenshots/explore.png" alt="insyte explore catalog" width="100%">
      </a>
      <p><strong>Explore</strong><br/><sub>Curated simulation catalog</sub></p>
    </td>
    <td align="center" valign="top" width="33%">
      <a href="docs/assets/screenshots/settings.png">
        <img src="docs/assets/screenshots/settings.png" alt="insyte settings and BYOK" width="100%">
      </a>
      <p><strong>Settings</strong><br/><sub>Provider and BYOK controls</sub></p>
    </td>
  </tr>
</table>

## Architecture

### Monorepo

- `apps/web` — Next.js 16 app: App Router pages, API routes, AI module, simulation engine, Supabase integration.
- `packages/scene-engine` — shared lib: types, Zod schema, ISCL parser, step engine, layout engine, scene graph, LRU cache.
- `packages/tsconfig` — shared TypeScript base configs.
- `.planning/` — product roadmap (`PROJECT.md`), design system (`DESIGN.md`), per-phase PLANs.

## Documentation

Full docs index: **[docs/README.md](docs/README.md)**

## BYOK

insyte supports Bring Your Own Key for all providers from the Settings page:

| Provider | Type | Notes |
| --- | --- | --- |
| Gemini | Cloud | Server default (free tier). Requires `GEMINI_API_KEY` env var for fallback. |
| OpenAI | Cloud | BYOK only. Key stored client-side. |
| Anthropic | Cloud | BYOK only. Key stored client-side. |
| Groq | Cloud | BYOK only. Key stored client-side. |
| Ollama | Local | No key required. Set base URL to your Ollama instance. Requires `OLLAMA_ORIGINS=https://insyte.amanarya.com` when starting Ollama. |
| Custom | Any OpenAI-compatible | Provide base URL + optional key. Covers LM Studio, vLLM, Together.ai, etc. |

- Keys are stored in browser `localStorage` only — never sent to or logged by the insyte server.
- Keys are forwarded per request in request headers (`x-api-key`, `x-provider`, `x-model`, `x-base-url`).
- Cloud provider calls always run server-side for key protection. Ollama runs browser-direct (Vercel bypassed).

## Deployment Notes

- Vercel monorepo root directory: `.`
- Build command: `turbo build --filter=web`
- Install command: `pnpm install --frozen-lockfile`
- Enable Vercel Analytics in project settings after deployment.
- Run `pnpm validate-scenes` before deploy.

Pyodide is served from `/pyodide/*` with route-scoped COOP/COEP headers. Production CSP keeps `'unsafe-eval'` because Pyodide's WASM toolchain requires it.

## Contributing

1. Create a branch.
2. Implement your change with tests/validation where possible.
3. Run `pnpm type-check`, `pnpm build`, and `pnpm validate-scenes`.
4. Open a PR with impact summary and verification notes.

## License

Licensed under [GPL-3.0](LICENSE).
