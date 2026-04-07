# insyte

See how it works.

![insyte preview](apps/web/public/og-image.png)

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-Streaming-000000?logo=vercel)](https://sdk.vercel.ai/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)](https://vercel.com/)

insyte is an AI-powered platform that turns tech concepts, DSA problems, and system design prompts into live interactive simulations. Instead of reading static explanations, you get a scene you can scrub, replay, tweak, and discuss.

## Quick Start

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

Open `http://localhost:3000`.

## Environment Setup

`apps/web/.env.example` documents every required production variable:

- `NEXT_PUBLIC_APP_URL`: public origin used for canonical URLs and OG metadata.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser-safe key for auth and client reads.
- `SUPABASE_SERVICE_ROLE_KEY`: server-side key for caching, seeding, and rate limits.
- `GEMINI_API_KEY`: fallback server key for non-BYOK AI generation.

`apps/web/.env.local` is already ignored by git at both the repo root and app level.

## Commands

```bash
pnpm dev
pnpm build
pnpm type-check
pnpm validate-scenes
```

## Architecture

The repo is a Turborepo monorepo with:

- `apps/web`: Next.js app, API routes, rendering engine, Supabase integration.
- `packages/scene-engine`: shared scene types, Zod schemas, parser, normalization helpers.
- `.planning/`: product decisions, design system, and phased implementation plans.

Primary references:

- [Architecture and product decisions](.planning/DECISIONS.md)
- [Design system](.planning/DESIGN.md)

## BYOK

insyte supports Bring Your Own Key from the Settings page for OpenAI, Anthropic, Gemini, and Groq.

- Keys are stored in browser `localStorage`, not committed to the repo.
- If no BYOK key is configured, the app falls back to the server-side Gemini key.
- Production deploys still need `GEMINI_API_KEY` for the free-tier fallback path.

## Deployment Notes

- Vercel monorepo root directory: `.`
- Build command: `turbo build --filter=web`
- Install command: `pnpm install --frozen-lockfile`
- Enable Vercel Analytics in the project dashboard after deployment.
- Run `pnpm validate-scenes` before every deploy.

Pyodide is served from `/pyodide/*` with route-scoped COOP/COEP headers. The production CSP keeps `'unsafe-eval'` because Pyodide's WASM toolchain requires it.

## Contributing

1. Create a branch.
2. Make the change with tests or validation where possible.
3. Run `pnpm type-check`, `pnpm build`, and `pnpm validate-scenes`.
4. Open a PR with the user-facing impact and verification notes.

## License

This repository is currently licensed under [GPL-3.0](LICENSE).
