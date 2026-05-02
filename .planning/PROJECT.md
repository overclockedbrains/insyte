# insyte — Project Roadmap

> **"See how it works."**
> AI-powered platform that turns any tech concept into a live, interactive simulation.
> Turborepo + pnpm monorepo · Next.js 16 · Dark-only · 26 pre-built simulations

---

## Project at a Glance

| Dimension | Value |
|-----------|-------|
| Domain | insyte.amanarya.com |
| Stack | Next.js 16, TypeScript, Tailwind v4, Framer Motion, Zustand, Vercel AI SDK |
| Monorepo | Turborepo + pnpm workspaces |
| Database | Supabase |
| AI Default | Gemini 2.5 Pro (Stage 0) · 2.0 Flash (Stage 1) · 2.0 Pro (Stage 2) · 2.0 Flash (Stage 3) · 2.0 Flash Lite (Stage 4) |
| BYOK | OpenAI · Anthropic · Gemini · Groq · Ollama (local) · Custom endpoint |
| Theme | Dark-only, always |
| Pre-built sims | 26 total (5 concept + 10 DSA + 5 LLD + 4 HLD + 2 concept) |

---

## Progress Tracker

R1 released April 8, 2026. R2 released April 14, 2026. R3 in progress (latest: Phase 38 complete April 29, 2026).

### R1 — Core Platform

| Phase | Status | Summary |
|-------|--------|---------|
| 0 | ✅ | Monorepo Setup |
| 1 | ✅ | Design System + Global Layout |
| 2 | ✅ | Scene Engine Core |
| 3 | ✅ | Visual Primitives |
| 4 | ✅ | Simulation Page Layouts |
| 5 | ✅ | 5 Concept Simulations (Hand-Crafted) |
| 6 | ✅ | Explore + Landing Page |
| 7 | ✅ | AI Scene Generation (Streaming) |
| 8 | ✅ | AI Chat + Scene Patching |
| 9 | ✅ | Settings + BYOK |
| 10 | ✅ | LLD + HLD Simulations |
| 11 | ✅ | Supabase Integration + User Accounts |
| 12 | ✅ | DSA Pipeline |
| 13 | ✅ | Polish + Responsive |
| 14 | ✅ | Complete Deploy — live April 8, 2026 |

### R2 — Architecture Overhaul

| Phase | Status | Summary |
|-------|--------|---------|
| 15 | ✅ | R1 Fixes + UI Tweaks |
| 16 | ✅ | Core Correctness + Runtime Hardening |
| 17 | ✅ | Local & Custom LLM Support (Ollama + OpenAI-compatible) |
| 18 | ✅ | Coordinate System Unification |
| 19 | ✅ | Scene JSON Schema Redesign (LayoutHint, SlotPosition) |
| 20 | ✅ | Layout Engine (SPACING constants, per-primitive sizing, algorithms) |
| 21 | ✅ | Step Engine (applyStepActionsUpTo, computeTopologyAtStep) |
| 22 | ✅ | Scene Graph Architecture (SceneGraph types, DOMRenderer) |
| 23 | ✅ | Scene Runtime & Caching (useSceneRuntime hook) |
| 24 | ✅ | ISCL Grammar & Parser (purpose-built DSL) |
| 25 | ✅ | Multi-Stage AI Pipeline (5-stage generator, per-stage retry) |
| 26 | ⏸️ | Progressive Streaming UX — skipped until gen quality stable |
| 27 | ✅ | Visual Quality & Animation System (HIGHLIGHT_COLORS, useAnimateStep) |
| 28 | 🌿 | ELK Integration — on `feature/phase-28-elk`, not merged; dagre preferred |

### R3 — AI Quality

| Phase | Status | Summary |
|-------|--------|---------|
| 29 | ⏸️ | Zoom/Pan Viewport — skipped indefinitely |
| 30 | ✅ | AI Pipeline Redesign — kill ISCL, Stage 0 reasoning, co-gen steps+explanations. Completed April 16, 2026. |
| 31 | ✅ | BYOK Model Routing — provider-aware tier routing |
| 32 | ✅ | Dev Pipeline Playground (`/dev/pipeline` + `/dev/scene`). Completed April 19, 2026. |
| 33 | ✅ | Community Gallery (`/community/gallery`). Completed April 19, 2026. |
| 34 | ✅ | Scene Spec v2 — `SCENE_SPEC` single source of truth, canvas/activeText/hud split. Completed ~April 23, 2026. |
| 35 | ✅ | Scene JSON Payload Optimization — topology-state split, all 26 JSONs migrated, 202 tests. Completed April 27, 2026. |
| 36 | ✅ | SEO Infrastructure — sitemap, robots, JSON-LD, OG images, GSC verified. Completed April 28, 2026. |
| 37 | ✅ | Theme Centralization — two-file color rule, 30 files fixed. Completed April 29, 2026. |
| 38 | ✅ | Color Architecture Hardening — `--ref-*` palette layer, `color-mix()` alpha aliases, `VIZ_SHADOWS` split. Completed April 29, 2026. |

> Phase details → `.planning/phases/phase-XX/PLAN.md`

---

## Key Constraints

1. **Dark-only** — never add a theme toggle or light mode classes
2. **DESIGN.md is canonical** — all color/type/spacing decisions
3. **Scene JSON is universal** — AI, DSA sandbox, and pre-built content all output the same format
4. **Framer Motion for all animation** — no raw CSS keyframes on interactive elements
5. **Mobile first** — 320px minimum width
6. **API keys never hit our server** — BYOK keys read client-side from localStorage only
7. **Pyodide is lazy-loaded** — never block initial page load (~10MB)
8. **Zod validates all AI output** — always validate Scene JSON before rendering
9. **Two-file color rule** — `globals.css` (CSS vars) + `colors.ts` (JS constants), nowhere else

---

*Created April 4, 2026.*
