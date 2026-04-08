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

- Prompt-first workflow for concept explanations, DSA traces, and design walkthroughs.
- Scene-based runtime: visuals, controls, steps, popups, and narrative evolve together.
- Streaming generation with partial scene promotion, so users see progress immediately.
- BYOK support for OpenAI, Anthropic, Gemini, and Groq.
- Static + cached + generated scene paths in one player experience.

## Quick Navigation

| Section | Link |
| --- | --- |
| Local setup | [Quick Start](#quick-start) |
| Environment variables | [Environment Setup](#environment-setup) |
| Scripts | [Commands](#commands) |
| Docs hub | [Documentation](#documentation) |
| Architecture diagrams | [Architecture](#architecture) |
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
| `pnpm dev` | Start full Turborepo dev pipeline |
| `pnpm build` | Build all packages/apps |
| `pnpm type-check` | Run TypeScript checks across workspace |
| `pnpm validate-scenes` | Validate production scene JSON against schema |
| `pnpm --filter web seed` | Seed topic index data to Supabase |
| `pnpm --filter web seed-scenes` | Seed scene records to Supabase |

## Architecture

### Monorepo

- `apps/web`: Next.js app, routes, APIs, simulation UI/runtime, Supabase integration.
- `packages/scene-engine`: scene types, Zod schemas, parser, normalization, state compute.
- `.planning`: product and design planning artifacts.

### Diagram references

- [Prompt to visualization core flow](docs/architecture/prompt-to-visualization.md)
- [Technical architecture overview](docs/architecture/tech-architecture.md)

## Documentation

- [Docs index](docs/README.md)
- [Codebase map](docs/codebase-map.md)
- [Component map](docs/components/component-map.md)
- [API reference](docs/backend/api-reference.md)
- [Supabase data model](docs/backend/data-model.md)
- [Scene JSON and rendering contract](docs/scene-engine/scene-json-and-rendering.md)
- [Adding scenes and primitives](docs/guides/adding-scenes-and-primitives.md)

## BYOK

insyte supports Bring Your Own Key from Settings for OpenAI, Anthropic, Gemini, and Groq.

- Keys are stored in browser `localStorage`.
- Keys are forwarded per request only; they are not persisted by this repo.
- If no BYOK key is present, generation falls back to server-side Gemini.
- Production still requires `GEMINI_API_KEY` for fallback path.

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
