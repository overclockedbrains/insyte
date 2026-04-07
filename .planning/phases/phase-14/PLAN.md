# Phase 14 — Complete Deploy

**Goal:** Production deploy on Vercel, all environment variables live, README complete, all 24 scenes validated. Open source ready.

**Entry criteria:** Phase 13 complete. All features functional end-to-end.

**Status:** Completed on April 8, 2026.

---

## Tasks

### 14.1 — `next.config.ts` production config
Update `apps/web/next.config.ts`:
```typescript
const nextConfig = {
  async headers() {
    return [
      // Pyodide requires COOP/COEP for SharedArrayBuffer — scoped tightly to avoid
      // breaking external images, fonts, or third-party scripts on other routes
      {
        source: '/pyodide/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' }
        ]
      },
      // Content-Security-Policy for all other routes
      {
        source: '/((?!pyodide).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.groq.com",
              "worker-src 'self' blob:",
            ].join('; ')
          }
        ]
      }
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  },
  webpack(config) {
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] }
    return config
  }
}
```

**CSP notes:**
- [x] `'unsafe-eval'` is unavoidable — Pyodide's WASM compiler requires it. Documented in README.
- [x] Test CSP in browser: open DevTools Console and verify zero CSP violation errors on all pages.

### 14.2 — Environment variables
Create `apps/web/.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_APP_URL=https://insyte.amanarya.com
```
- [x] All required vars documented with descriptions
- [x] `.env.local` confirmed in `.gitignore`
- [x] Add all vars to Vercel dashboard for production

### 14.3 — Vercel deployment
- [x] Connect GitHub repo to Vercel
- [x] Root directory: `.` (monorepo root) with build command `turbo build --filter=web`
- [x] Install command: `pnpm install --frozen-lockfile`
- [x] Add all env vars from `.env.example` to Vercel dashboard
- [x] Test preview deployment on a PR branch
- [x] Production deployment on `main` branch push
- [x] Custom domain `insyte.amanarya.com` wired to Vercel (DNS configured)
- [x] Verify: `https://insyte.amanarya.com` loads correctly

### 14.4 — Scene JSON validation script
Create `apps/web/scripts/validate-scenes.ts`:
- [x] Reads all JSON files from `src/content/scenes/**/*.json`
- [x] Parses each with `safeParseScene()` from scene-engine
- [x] Reports: `✓ hash-tables.json` or `✗ invalid.json: [Zod error details]`
- [x] Exits with code 1 if any scene fails validation
- [x] Add to `pnpm validate-scenes` script

### 14.5 — README
Create root `README.md`:
- [x] Project description + tagline
- [x] Screenshot/demo GIF
- [x] Tech stack badges
- [x] Quick start: `pnpm install && pnpm dev`
- [x] Environment setup: copy `.env.example` instructions
- [x] Architecture overview (link to `.planning/DECISIONS.md`)
- [x] BYOK guide: how to add API keys
- [x] Contributing section
- [x] License section included in README (current repo license)

### 14.6 — Analytics
- [x] Enable Vercel Analytics in Vercel dashboard
- [x] Add `<Analytics />` from `@vercel/analytics/next` to root layout
- [x] Basic event tracking with `va.track()`:
  - `scene_generated` — when AI generation completes
  - `chat_sent` — when chat message sent
  - `byok_activated` — when user saves first API key

### 14.7 — Final smoke test checklist
- [x] Landing → type concept → streaming generation → simulation page renders
- [x] `/explore` gallery shows all 24 simulations with OG thumbnails
- [x] `/s/hash-tables` loads pre-built simulation
- [x] Chat → ask question → streaming response
- [x] Chat → ask to modify scene → patch applied with glow
- [x] `/settings` → add OpenAI key → generation uses that key
- [x] Sign up → profile page shows → bookmark a sim → appears in saved
- [x] DSA → paste Two Sum code → full pipeline runs → visualization renders
- [x] "Re-run with custom input" → updates visualization
- [x] Share button → URL copied → pasting in new tab loads same sim
- [x] Mobile (375px): all pages usable, no overflow
- [x] `pnpm validate-scenes` passes for all 24 scene JSON files
- [x] No console errors on production build
- [x] Lighthouse: Performance > 80, Accessibility > 90

---

## Exit Criteria
- [x] `https://insyte.amanarya.com` loads correctly in production
- [x] `pnpm build` completes with zero TypeScript errors
- [x] `pnpm validate-scenes` passes all 24 scenes
- [x] DevTools Console: zero CSP violation errors on `/`, `/explore`, `/s/hash-tables`
- [x] OG image visible when sharing a simulation URL on Twitter/Slack
- [x] README exists with setup instructions and BYOK guide
- [x] All smoke test checklist items pass

---

## Key Notes
- **Vercel monorepo setup:** set "Root Directory" to `.` and "Build Command" to `turbo build --filter=web`. Vercel auto-detects Turborepo.
- Pyodide COOP/COEP headers must be scoped to `/pyodide/` path only — setting them globally breaks iframes and some third-party scripts.
- Run `pnpm validate-scenes` before every deployment as a sanity check.
- Review all code for hardcoded secrets or personal information before public GitHub push.
- Performance: Pyodide is lazy-loaded and only triggers on DSA detection — should not affect initial page load LCP.
