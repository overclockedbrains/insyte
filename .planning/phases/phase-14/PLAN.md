# Phase 14 — Complete Deploy

**Goal:** Production deploy on Vercel, all environment variables live, README complete, all 24 scenes validated. Open source ready.

**Entry criteria:** Phase 13 complete. All features functional end-to-end.

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
- [ ] `'unsafe-eval'` is unavoidable — Pyodide's WASM compiler requires it. Document in README.
- [ ] Test CSP in browser: open DevTools Console and verify zero CSP violation errors on all pages.

### 14.2 — Environment variables
Create `apps/web/.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_APP_URL=https://insyte.dev
```
- [ ] All required vars documented with descriptions
- [ ] `.env.local` confirmed in `.gitignore`
- [ ] Add all vars to Vercel dashboard for production

### 14.3 — Vercel deployment
- [ ] Connect GitHub repo to Vercel
- [ ] Root directory: `.` (monorepo root) with build command `turbo build --filter=web`
- [ ] Install command: `pnpm install --frozen-lockfile`
- [ ] Add all env vars from `.env.example` to Vercel dashboard
- [ ] Test preview deployment on a PR branch
- [ ] Production deployment on `main` branch push
- [ ] Custom domain `insyte.dev` wired to Vercel (DNS configured)
- [ ] Verify: `https://insyte.dev` loads correctly

### 14.4 — Scene JSON validation script
Create `apps/web/scripts/validate-scenes.ts`:
- [ ] Reads all JSON files from `src/content/scenes/**/*.json`
- [ ] Parses each with `safeParseScene()` from scene-engine
- [ ] Reports: `✓ hash-tables.json` or `✗ invalid.json: [Zod error details]`
- [ ] Exits with code 1 if any scene fails validation
- [ ] Add to `pnpm validate-scenes` script

### 14.5 — README
Create root `README.md`:
- [ ] Project description + tagline
- [ ] Screenshot/demo GIF
- [ ] Tech stack badges
- [ ] Quick start: `pnpm install && pnpm dev`
- [ ] Environment setup: copy `.env.example` instructions
- [ ] Architecture overview (link to `.planning/DECISIONS.md`)
- [ ] BYOK guide: how to add API keys
- [ ] Contributing section
- [ ] License (MIT)

### 14.6 — Analytics
- [ ] Enable Vercel Analytics in Vercel dashboard
- [ ] Add `<Analytics />` from `@vercel/analytics/react` to root layout
- [ ] Basic event tracking with `va.track()`:
  - `scene_generated` — when AI generation completes
  - `chat_sent` — when chat message sent
  - `byok_activated` — when user saves first API key

### 14.7 — Final smoke test checklist
- [ ] Landing → type concept → streaming generation → simulation page renders
- [ ] `/explore` gallery shows all 24 simulations with OG thumbnails
- [ ] `/s/hash-tables` loads pre-built simulation
- [ ] Chat → ask question → streaming response
- [ ] Chat → ask to modify scene → patch applied with glow
- [ ] `/settings` → add OpenAI key → generation uses that key
- [ ] Sign up → profile page shows → bookmark a sim → appears in saved
- [ ] DSA → paste Two Sum code → full pipeline runs → visualization renders
- [ ] "Re-run with custom input" → updates visualization
- [ ] Share button → URL copied → pasting in new tab loads same sim
- [ ] Mobile (375px): all pages usable, no overflow
- [ ] `pnpm validate-scenes` passes for all 24 scene JSON files
- [ ] No console errors on production build
- [ ] Lighthouse: Performance > 80, Accessibility > 90

---

## Exit Criteria
- [ ] `https://insyte.dev` loads correctly in production
- [ ] `pnpm build` completes with zero TypeScript errors
- [ ] `pnpm validate-scenes` passes all 24 scenes
- [ ] DevTools Console: zero CSP violation errors on `/`, `/explore`, `/s/hash-tables`
- [ ] OG image visible when sharing a simulation URL on Twitter/Slack
- [ ] README exists with setup instructions and BYOK guide
- [ ] All smoke test checklist items pass

---

## Key Notes
- **Vercel monorepo setup:** set "Root Directory" to `.` and "Build Command" to `turbo build --filter=web`. Vercel auto-detects Turborepo.
- Pyodide COOP/COEP headers must be scoped to `/pyodide/` path only — setting them globally breaks iframes and some third-party scripts.
- Run `pnpm validate-scenes` before every deployment as a sanity check.
- Review all code for hardcoded secrets or personal information before public GitHub push.
- Performance: Pyodide is lazy-loaded and only triggers on DSA detection — should not affect initial page load LCP.
