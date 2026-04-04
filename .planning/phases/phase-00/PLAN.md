# Phase 0 — Monorepo Setup

**Goal:** Turborepo + pnpm monorepo fully wired, zero-config dev environment running.

**Entry criteria:** Empty git repo at `c:/Aman/Coding-Bamzii/insyte`.

---

## Tasks

### 0.1 — Root workspace init
- [ ] `pnpm init` at repo root
- [ ] Create `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```
- [ ] Install Turborepo: `pnpm add -D turbo -w`
- [ ] Create `turbo.json`:
  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
      "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
      "dev": { "cache": false, "persistent": true },
      "lint": {},
      "type-check": { "dependsOn": ["^build"] }
    }
  }
  ```
- [ ] Root `package.json` scripts: `dev`, `build`, `lint`, `type-check`

### 0.2 — Shared tsconfig package
- [ ] Create `packages/tsconfig/` with `package.json` (`name: "@insyte/tsconfig"`)
- [ ] `packages/tsconfig/base.json` — strict TS base config:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022", "lib": ["ES2022"], "module": "ESNext",
      "moduleResolution": "bundler", "strict": true,
      "noUncheckedIndexedAccess": true, "skipLibCheck": true,
      "resolveJsonModule": true, "esModuleInterop": true
    }
  }
  ```
- [ ] `packages/tsconfig/nextjs.json` — extends base, adds Next.js settings

### 0.3 — scene-engine package
- [ ] Create `packages/scene-engine/` with:
  - `package.json`: `name: "@insyte/scene-engine"`, `main: "./src/index.ts"`, no React dep
  - `tsconfig.json` extending `@insyte/tsconfig/base.json`
- [ ] Install zod: `pnpm add zod --filter @insyte/scene-engine`
- [ ] Create `packages/scene-engine/src/types.ts` — full Scene JSON TypeScript interfaces:
  - `Scene`, `Visual`, `Step`, `Action`, `Control`, `ExplanationSection`, `Popup`, `Challenge`, `Condition`
  - Visual types union: `'array' | 'hashmap' | 'linked-list' | 'tree' | 'graph' | 'stack' | 'queue' | 'dp-table' | 'recursion-tree' | 'system-diagram' | 'text-badge' | 'counter'`
  - Layout union: `'canvas-only' | 'code-left-canvas-right' | 'text-left-canvas-right'`
  - Scene type union: `'concept' | 'dsa-trace' | 'lld' | 'hld'`
- [ ] Create `packages/scene-engine/src/schema.ts` — Zod schemas mirroring types.ts exactly
- [ ] Create `packages/scene-engine/src/parser.ts` — `parseScene(raw: unknown): Scene` using Zod parse + normalization
- [ ] Create `packages/scene-engine/src/index.ts` — re-export all public types and functions

### 0.4 — apps/web Next.js 15 scaffold
- [ ] `pnpm create next-app@latest apps/web --typescript --app --tailwind --eslint --no-src-dir --import-alias "@/*"`
  - *Note: Next.js 15, App Router, TypeScript, Tailwind*
- [ ] Update `apps/web/tsconfig.json` to extend `@insyte/tsconfig/nextjs.json`
- [ ] Add `@insyte/scene-engine` as workspace dep: `pnpm add @insyte/scene-engine --filter web`

### 0.5 — Tailwind v4 + design tokens
- [ ] Ensure Tailwind v4 is installed (comes with Next.js 15 scaffold; verify version)
- [ ] Configure `apps/web/tailwind.config.ts`:
  - Extend `colors` with all tokens from `DESIGN.md` (background, surface-*, on-surface, primary, secondary, tertiary, outline, error families)
  - Extend `fontFamily`: `headline: ['Manrope', 'sans-serif']`, `body: ['Inter', 'sans-serif']`, `mono: ['JetBrains Mono', 'monospace']`
  - Extend `borderRadius`: `DEFAULT: '1rem'`, `lg: '2rem'`, `xl: '3rem'`
- [ ] Add Google Fonts import to `apps/web/src/app/layout.tsx` (Manrope 700/800, Inter 400/500/600, JetBrains Mono 400/500)

### 0.6 — shadcn/ui init
- [ ] Run `pnpm dlx shadcn@latest init` in `apps/web/` — dark theme, slate base, `@/components/ui` path
- [ ] Install initial shadcn components used across project: `button`, `input`, `slider`, `tabs`, `dialog`, `badge`, `tooltip`, `sheet`

### 0.7 — ESLint + Prettier
- [ ] Root `.eslintrc.js` extending Next.js + TypeScript rules
- [ ] Root `.prettierrc`: `{ "singleQuote": true, "semi": false, "tabWidth": 2 }`
- [ ] Add lint/format scripts to root package.json
- [ ] Verify `pnpm lint` passes with no errors on scaffold code

### 0.8 — Smoke test
- [ ] `pnpm dev` starts successfully — Next.js dev server on `localhost:3000`
- [ ] `import { parseScene } from '@insyte/scene-engine'` works in a test file in apps/web
- [ ] TypeScript strict mode catches errors in scene-engine types

---

## Exit Criteria
- [ ] `pnpm dev` runs without errors
- [ ] `pnpm build` completes without errors
- [ ] `pnpm type-check` passes
- [ ] `@insyte/scene-engine` imports work from `apps/web`
- [ ] All 24+ DESIGN.md color tokens available as Tailwind classes (e.g. `bg-primary`, `text-on-surface`)
- [ ] `localhost:3000` shows Next.js default page with dark background

---

## Key Notes
- **Do NOT use `create-turbo`** — it scaffolds an opinionated starter; we want clean control
- `packages/scene-engine` must have **zero React dependency** — pure TypeScript + Zod only
- Tailwind v4 config syntax differs from v3 — verify the correct `@theme` block or `extend` syntax for v4
- Pyodide WASM files go in `apps/web/public/pyodide/` — not needed yet, just plan the directory
