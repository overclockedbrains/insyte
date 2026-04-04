# Phase 13 — Polish + Responsive + Deploy

**Goal:** Production-ready. Mobile-first responsive pass, all loading/error states, Vercel deployed, OG meta tags live. Open source ready.

**Entry criteria:** Phases 0–12 complete. All features functional.

---

## Tasks

### 13.1 — Mobile responsive pass (320px minimum)

**Landing page (`/`):**
- [ ] Single column at `< md`: headline stack → input → popular chips → live demo below → how it works → features
- [ ] LiveDemo: compact size (full-width, ~200px height), autoplay still visible
- [ ] Headline font: reduce from `text-7xl` to `text-4xl` on mobile
- [ ] Unified input: full-width, no expand animation needed (already full-width)
- [ ] Popular chips: horizontal scroll (hide scrollbar), no wrapping

**Gallery page (`/explore`):**
- [ ] Search bar: full-width
- [ ] TopicRow: horizontal scroll works on touch, no scroll arrows (use native scroll)
- [ ] TopicCard: min-width `160px`, height proportional

**Simulation page (`/s/[slug]`):**
- [ ] Mobile layout: `[SimulationNav] [Canvas: 100% width, 55vh] [CompactPlaybackBar] [Explanation/Code] [Challenges]`
- [ ] Canvas: fixed 55vh on mobile, scrollable explanation below
- [ ] `CompactPlaybackBar`: `[◀ ▶/⏸ ▶ • speed]` all in one horizontal bar, `py-2` compact height
- [ ] `TextLeftCanvasRight` on mobile: canvas at top, ExplanationPanel scrolls below
- [ ] `CodeLeftCanvasRight` on mobile: tab switcher `["Code" | "Visual"]` — only one panel visible at a time
- [ ] `CanvasOnly` on mobile: canvas full-width, floating explanation card moves to bottom of page

**Chat on mobile:**
- [ ] `ChatButton`: `bottom-4 right-4` (slightly inset from edge)
- [ ] Chat opens as bottom sheet (Sheet component, 60% height)
- [ ] Input area stays above keyboard (use `env(safe-area-inset-bottom)` CSS)

### 13.2 — Tablet layout (768–1024px)
- [ ] Simulation page: same as desktop but left panel 40% instead of 35%
- [ ] Gallery: 2-column grid for TopicCards in each row (instead of horizontal scroll)
- [ ] Landing: two-column hero maintained, but spacing reduced

### 13.3 — Loading states

**Suspense boundaries:**
- [ ] `apps/web/src/app/s/[slug]/loading.tsx` — loading.tsx for `/s/[slug]` route
  - Skeleton: shimmer nav, shimmer canvas card, shimmer left panel
- [ ] `apps/web/src/app/explore/loading.tsx` — loading.tsx for `/explore`
  - Skeleton: search bar placeholder + 2 row skeletons with card shimmer

**Skeleton components:**
- [ ] `SkeletonCard.tsx`: shimmer placeholder matching TopicCard dimensions
- [ ] `SkeletonSimulation.tsx`: full simulation layout skeleton
- [ ] `SkeletonText.tsx`: multiple lines of shimmer text with variable widths
- [ ] All skeletons: `animate-pulse bg-surface-container-high rounded`

**Loading states in components:**
- [ ] `PlaybackControls`: disabled + grayed out when `totalSteps === 0`
- [ ] `ControlBar`: disabled state when scene streaming
- [ ] `ChallengesSection`: skeleton while scene streaming
- [ ] `ChatCard`: disabled send button while AI responding
- [ ] `UnifiedInput`: loading spinner while navigating after submit

### 13.4 — Error boundaries
Create `apps/web/src/components/ErrorBoundary.tsx`:
- [ ] React class component (required for error boundary)
- [ ] Catches render errors in SceneRenderer + all primitive components
- [ ] Fallback UI: glass-panel card with "Simulation failed to render" + retry button + error details (collapsible, dev-only)
- [ ] `apps/web/src/app/s/[slug]/error.tsx` — Next.js error page for route-level errors
- [ ] API route error handling:
  - `/api/generate`: catch AI errors, return 500 with `{ error: 'Generation failed', retryable: true }`
  - `/api/chat`: catch errors, return 500
  - `/api/instrument`: catch errors, return 500
  - `/api/visualize-trace`: catch errors, return 500

### 13.5 — Share button
Update `SimulationNav.tsx`:
- [ ] Share button: copies `window.location.href` to clipboard on click
- [ ] Success feedback: button text changes to "✓ Copied!" for 2 seconds (Framer Motion)
- [ ] On devices without clipboard API: shows URL in a modal for manual copy

### 13.6 — OG meta tags on simulation pages
Update `apps/web/src/app/s/[slug]/page.tsx` `generateMetadata`:
- [ ] `title`: `"[Simulation Title] — insyte"`
- [ ] `description`: first sentence of first explanation section
- [ ] `openGraph.title`: simulation title
- [ ] `openGraph.description`: description
- [ ] `openGraph.image`: `og_image_url` from topic_index/scene Supabase record, fallback to `/og-image.png`
- [ ] `openGraph.url`: `https://insyte.dev/s/[slug]`
- [ ] `twitter.card`: `summary_large_image`

### 13.7 — `next.config.ts` production config
Update `apps/web/next.config.ts`:
```typescript
const nextConfig = {
  async headers() {
    return [{
      source: '/pyodide/(.*)',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' }
      ]
    }]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' }  // Supabase Storage OG images
    ]
  },
  // Webpack: bundle Web Workers
  webpack(config) {
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] }
    return config
  }
}
```

### 13.8 — Environment variables
Create `apps/web/.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_APP_URL=https://insyte.dev
```
- [ ] All required vars documented with descriptions
- [ ] `.env.local` added to `.gitignore` (verify it's already there from Next.js scaffold)
- [ ] Add Vercel environment variables in Vercel dashboard for production

### 13.9 — Vercel deployment
- [ ] Connect GitHub repo to Vercel
- [ ] Root directory: `apps/web` (not monorepo root)
  - OR configure Vercel to run `turbo build --filter=web` from root (preferred for Turborepo)
- [ ] Build command: `pnpm build` (from repo root with Turborepo)
- [ ] Install command: `pnpm install --frozen-lockfile`
- [ ] Add all env vars from `.env.example` to Vercel dashboard
- [ ] Test preview deployment on a PR branch
- [ ] Production deployment on `main` branch push
- [ ] Verify: `https://insyte.dev` loads (after DNS configuration)

### 13.10 — Scene JSON validation script
Create `apps/web/scripts/validate-scenes.ts`:
- [ ] Reads all JSON files from `src/content/scenes/**/*.json`
- [ ] Parses each with `safeParseScene()` from scene-engine
- [ ] Reports: `✓ hash-tables.json` or `✗ invalid.json: [Zod error details]`
- [ ] Exits with code 1 if any scene fails validation
- [ ] Add to `pnpm validate-scenes` script
- [ ] Add to CI (if GitHub Actions set up — optional for solo dev)

### 13.11 — README
Create `apps/web/README.md` (or root `README.md`):
- [ ] Project description + tagline
- [ ] Screenshot/demo GIF
- [ ] Tech stack badges
- [ ] Quick start: `pnpm install && pnpm dev`
- [ ] Environment setup: copy `.env.example` instructions
- [ ] Architecture overview (link to `.planning/DECISIONS.md`)
- [ ] Contributing section (for future open source contributors)
- [ ] License (MIT recommended for portfolio project)

### 13.12 — Final QA checklist
- [ ] All 24 simulations load correctly
- [ ] AI generation works (new concept generates streaming scene)
- [ ] DSA pipeline works (paste Two Sum code → gets visualization)
- [ ] Live chat works (ask a question → streaming response)
- [ ] Scene patching works (AI adds a step via chat)
- [ ] BYOK works (paste API key → subsequent generations use that key)
- [ ] Rate limiting works (16th request returns 429)
- [ ] Gallery shows all 24 simulations with OG images
- [ ] Search autocomplete returns correct results
- [ ] Share button copies URL
- [ ] Mobile: all pages functional at 375px viewport
- [ ] Tablet: all pages functional at 768px viewport
- [ ] No console errors in production build
- [ ] Lighthouse score: Performance > 80, Accessibility > 90

---

## Exit Criteria
- [ ] Production URL `https://insyte.dev` (or Vercel preview URL) loads correctly
- [ ] `pnpm build` completes with no errors or TypeScript errors
- [ ] `pnpm validate-scenes` passes for all 24 scene JSON files
- [ ] Mobile (375px): all pages usable, no horizontal overflow, no overlapping elements
- [ ] OG image visible when sharing a simulation URL on Twitter/Slack
- [ ] README exists with setup instructions

---

## Key Notes
- **Vercel monorepo setup:** use Vercel's Turborepo integration — set "Root Directory" to `.` and "Build Command" to `turbo build --filter=web`. Vercel auto-detects Turborepo.
- Pyodide requires COOP/COEP headers which break iframes and some third-party scripts. Scope these headers to the `/pyodide/` path only, not the whole app.
- The `validate-scenes` script should be run before every deployment to catch any accidental scene JSON corruption
- Performance: the biggest LCP risk is Pyodide. Since it's lazy-loaded and only triggers on DSA detection, it should not affect initial page load metrics.
- Open source: review all code for any hardcoded secrets or personal information before pushing to public GitHub repo
