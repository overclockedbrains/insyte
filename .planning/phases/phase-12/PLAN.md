# Phase 12 — Polish + Responsive

**Goal:** Core product (concept + LLD/HLD + auth) is mobile-first, pixel-perfect, and production-quality. All loading/error states handled. DSA-specific polish is deferred to Phase 13.

**Entry criteria:** Phase 11 complete. All core features (generation, chat, auth, profiles) functional.

---

## Tasks

### 12.1 — Mobile responsive pass (320px minimum)

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

**Auth modal on mobile:**
- [ ] Full-screen sheet on `< sm`
- [ ] Input fields large enough for touch (min 44px tap target)

**Chat on mobile:**
- [ ] `ChatButton`: `bottom-4 right-4` (slightly inset from edge)
- [ ] Chat opens as bottom sheet (Sheet component, 60% height)
- [ ] Input area stays above keyboard (use `env(safe-area-inset-bottom)` CSS)

**Profile page on mobile:**
- [ ] Saved grid: 2 columns
- [ ] Generated history: full-width list

### 12.2 — Tablet layout (768–1024px)
- [ ] Simulation page: same as desktop but left panel 40% instead of 35%
- [ ] Gallery: 2-column grid for TopicCards in each row (instead of horizontal scroll)
- [ ] Landing: two-column hero maintained, but spacing reduced
- [ ] Profile: 3-column saved grid

### 12.3 — Loading states

**Suspense boundaries:**
- [ ] `apps/web/src/app/s/[slug]/loading.tsx` — skeleton: shimmer nav, shimmer canvas card, shimmer left panel
- [ ] `apps/web/src/app/explore/loading.tsx` — skeleton: search bar placeholder + 2 row skeletons with card shimmer
- [ ] `apps/web/src/app/profile/loading.tsx` — skeleton: avatar placeholder, grid skeletons

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

**Empty states:**
- [ ] `/profile` saved section empty state: "No saved simulations yet. Bookmark one to see it here."
- [ ] `/profile` history empty state: "No simulations generated yet. Try typing a concept on the home page."

### 12.4 — Error boundaries
Create `apps/web/src/components/ErrorBoundary.tsx`:
- [ ] React class component (required for error boundary)
- [ ] Catches render errors in SceneRenderer + all primitive components
- [ ] Fallback UI: glass-panel card with "Simulation failed to render" + retry button + error details (collapsible, dev-only)
- [ ] `apps/web/src/app/s/[slug]/error.tsx` — Next.js error page for route-level errors
- [ ] API route error handling:
  - `/api/generate`: catch AI errors, return 500 with `{ error: 'Generation failed', retryable: true }`
  - `/api/chat`: catch errors, return 500

### 12.5 — Share button
Update `SimulationNav.tsx`:
- [ ] Share button: copies `window.location.href` to clipboard on click
- [ ] Success feedback: button text changes to "✓ Copied!" for 2 seconds (Framer Motion)
- [ ] On devices without clipboard API: shows URL in a modal for manual copy

### 12.6 — OG meta tags on simulation pages
Update `apps/web/src/app/s/[slug]/page.tsx` `generateMetadata`:
- [ ] `title`: `"[Simulation Title] — insyte"`
- [ ] `description`: first sentence of first explanation section
- [ ] `openGraph.image`: `og_image_url` from Supabase record, fallback to `/og-image.png`
- [ ] `openGraph.url`: `https://insyte.dev/s/[slug]`
- [ ] `twitter.card`: `summary_large_image`

### 12.7 — Accessibility pass
- [ ] Keyboard navigation: all interactive elements reachable via Tab
- [ ] Focus rings: visible on all focusable elements (`focus-visible:ring-2 ring-primary`)
- [ ] Aria labels: on all icon-only buttons (share, expand, bookmark, chat toggle)
- [ ] Modal focus trap: auth modal and chat card trap focus correctly
- [ ] Screen reader test: VoiceOver/NVDA pass on landing + simulation page

### 12.8 — Performance pass
- [ ] Bundle analysis: `pnpm build && pnpm analyze` — identify any unexpectedly large chunks
- [ ] Lazy load heavy components: `ChatCard`, `ChallengesSection` with `dynamic(() => import(...))`
- [ ] Image optimization: all `<img>` tags replaced with `<Image>` from `next/image`
- [ ] Font optimization: verify `display: swap` on all font imports

---

## Exit Criteria
- [ ] Mobile (375px): all pages usable, no horizontal overflow, no overlapping elements
- [ ] Tablet (768px): all pages functional with appropriate layout adjustments
- [ ] All loading skeletons appear correctly before data arrives
- [ ] Error boundary shows fallback UI on render errors (test by temporarily throwing in a primitive)
- [ ] Share button copies URL on mobile Safari
- [ ] Empty states appear correctly on `/profile` for new users
- [ ] No console errors in production build
- [ ] Lighthouse score: Performance > 80, Accessibility > 90

---

## Key Notes
- DSA-specific responsive work (Pyodide loader, code/visual tab switcher) is handled in Phase 13
- The chat bottom sheet on mobile must account for iOS safe area insets — test on real device or Safari simulator
- `CodeLeftCanvasRight` tab switcher is the trickiest mobile layout — build it as a controlled component driven by local `activeTab` state, not media query display hacks
