# Phase 6 — Gallery + Landing Page

**Goal:** `/explore` gallery (Netflix-style rows) and `/` landing page (two-column hero with live hash table demo) fully built and navigable.

**Entry criteria:** Phase 5 complete. All 5 concept simulations rendering correctly.

---

## Tasks

### 6.1 — Topic index catalog
Create `apps/web/src/content/topic-index.ts`:
- [ ] Export `topicIndex: TopicEntry[]` array with all 24 pre-built simulations
- [ ] `TopicEntry` interface: `{ slug, title, description, category, tags: string[], type: SceneType, isFeatured: boolean, isPrebuilt: boolean }`
- [ ] Categories: `'Data Structures & Algorithms' | 'System Design' | 'Networking' | 'Low Level Design' | 'Concepts'`
- [ ] Mark 4 as `isFeatured: true` (hash-tables, js-event-loop, dns-resolution, twitter-feed)
- [ ] All 24 entries from PROJECT.md content index
- [ ] `getTopicsByCategory(category: string): TopicEntry[]` helper
- [ ] `getTopicBySlug(slug: string): TopicEntry | null` helper
- [ ] `searchTopics(query: string): TopicEntry[]` — case-insensitive search on title + tags

### 6.2 — TopicCard component
Create `apps/web/src/components/explore/TopicCard.tsx`:
- [ ] Shows: OG image placeholder (Phase 11 fills with real images) + title + category badge + type indicator
- [ ] OG image area: `bg-surface-container-high rounded-xl` placeholder with simulation type icon; 16:9 aspect ratio
- [ ] Hover: `hover:scale-[1.02]` + glow border intensifies (`transition-all duration-200`)
- [ ] Play indicator: `[▶]` button appears on hover in top-right of image
- [ ] Click: `router.push('/s/[slug]')`
- [ ] Size: fixed card width ~240px, stacks in horizontal row

### 6.3 — TopicRow component (horizontal scroll)
Create `apps/web/src/components/explore/TopicRow.tsx`:
- [ ] Props: `title: string`, `topics: TopicEntry[]`, `seeAllHref?: string`
- [ ] Header: row title + `"See all →"` link (right-aligned)
- [ ] Horizontal scrolling container: `overflow-x-auto flex gap-4 pb-4` (hide scrollbar on desktop, show on mobile)
- [ ] Scroll arrows `‹` `›` on desktop for keyboard/mouse navigation (Framer Motion opacity on hover)
- [ ] Stagger animation: `staggerChildren: 0.05` for initial card appearance

### 6.4 — SearchBar with autocomplete
Create `apps/web/src/components/explore/SearchBar.tsx`:
- [ ] `<input>` with placeholder `"Filter simulations..."`
- [ ] `bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3`
- [ ] Focus: `ring-1 ring-secondary/50 border-secondary/30` transition
- [ ] Typing triggers `searchTopics(query)` from topic-index
- [ ] Autocomplete dropdown: `glass-panel rounded-2xl shadow-2xl` below input
- [ ] Dropdown items: topic title + category badge + type badge
- [ ] Click item: navigates to `/s/[slug]`
- [ ] Keyboard: up/down arrows, Enter to navigate, Escape to close
- [ ] Empty state: "No simulations match '[query]'"

### 6.5 — Gallery page (`/explore`)
Create `apps/web/src/app/explore/page.tsx`:
- [ ] `<SearchBar />` at top
- [ ] Row 1: Featured (4 featured simulations)
- [ ] Row 2: Data Structures & Algorithms (10 DSA entries — show first 5, rest available via scroll)
- [ ] Row 3: System Design (HLD entries)
- [ ] Row 4: Low Level Design (LLD entries)
- [ ] Row 5: Networking + Concepts (concept entries)
- [ ] `GlowEffect` background
- [ ] Page title: "Explore Simulations" (H1 `font-headline`)
- [ ] `metadata`: title "Explore — insyte", description

### 6.6 — LiveDemo component (landing page hero simulation)
Create `apps/web/src/components/landing/LiveDemo.tsx`:
- [ ] Embeds the Hash Table simulation in auto-play mode
- [ ] Loads `hash-tables.json` scene
- [ ] `<SceneRenderer scene={hashTableScene} />` with controls disabled
- [ ] Auto-plays continuously (`isPlaying: true`, loops back to start)
- [ ] Overlay: "🎮 Try it yourself →" CTA button (links to `/s/hash-tables`)
- [ ] The canvas shows only the visualization area — no explanation panel in this embed
- [ ] Scale: roughly 60% of full simulation size, fits in hero right column

### 6.7 — UnifiedInput component
Create `apps/web/src/components/landing/UnifiedInput.tsx`:
- [ ] Multi-line `<textarea>` that expands on focus (Framer Motion `animate={{ height }}`)
- [ ] Placeholder: `"How does a hash table work? Or paste your LeetCode solution..."`
- [ ] `bg-surface-container-low border border-outline-variant/40 rounded-2xl px-5 py-4 font-body resize-none`
- [ ] Focus: glow border activates
- [ ] Real-time mode detection: calls `detectMode(text)` from detection-store on every change
- [ ] Detection label below input: `"✦ Concept Mode"` | `"⟨/⟩ DSA Trace Mode"` | `"⚙ LLD Mode"` | `"🏗 System Design Mode"` — fade in/out on mode change
- [ ] Submit button: `"Explore →"` (primary CTA) — `bg-neon-gradient rounded-2xl px-6 py-3`
- [ ] On submit: navigate to `/s/[generated-slug]` (AI generation flow, Phase 7)
- [ ] For now (Phase 6): submit navigates to `/explore` as fallback

### 6.8 — Popular chips row
Create `apps/web/src/components/landing/PopularChips.tsx`:
- [ ] Horizontal row of chip buttons: `"Hash Tables"`, `"DNS Resolution"`, `"Two Sum"`, `"LRU Cache"`, `"Twitter Feed"`
- [ ] Chip style: `rounded-full border border-outline-variant/30 px-4 py-1.5 text-sm text-on-surface-variant hover:border-primary/40 hover:text-on-surface`
- [ ] Click: fills the unified input with that topic + detects mode automatically
- [ ] Label above: `"Popular:"` in muted text

### 6.9 — HowItWorks component
Create `apps/web/src/components/landing/HowItWorks.tsx`:
- [ ] 3-step section: "1. Type · 2. Watch it Come Alive · 3. Master It"
- [ ] Desktop: 3 columns connected by a bezier path (SVG) flowing between them
- [ ] Each step: icon + step number + title + 1-line description
- [ ] Bezier path: animated `DataFlowDot` traveling from step 1 → 2 → 3 on loop
- [ ] `section-heading` style: `text-4xl font-headline font-bold text-center`

### 6.10 — FeatureCards component
Create `apps/web/src/components/landing/FeatureCards.tsx`:
- [ ] 3 cards: `"Interactive"` + `"AI-Powered"` + `"Shareable"`
- [ ] Each: `glass-panel glow-border rounded-3xl p-6` with icon + title + description
- [ ] Hover: glow intensifies, slight scale

### 6.11 — FeaturedSimulations component
Create `apps/web/src/components/landing/FeaturedSimulations.tsx`:
- [ ] 4-card preview grid (2×2)
- [ ] Uses `TopicCard` component
- [ ] Heading: "Start Exploring" or "Featured Simulations"
- [ ] "See all →" link to `/explore`

### 6.12 — Landing page (`/`)
Update `apps/web/src/app/page.tsx`:
- [ ] Full landing page layout per DECISIONS.md spec:
  ```
  <GlowEffect />
  <Hero> (two-column: left input + chips, right LiveDemo)
  <HowItWorks>
  <FeaturedSimulations>
  <FeatureCards>
  <Footer>
  ```
- [ ] Desktop: `grid grid-cols-2 gap-16 items-center` hero section
- [ ] Mobile: single column, LiveDemo moves below input
- [ ] Headline: "Understand any tech concept." + "By playing with it." (`text-7xl font-extrabold font-headline`)
- [ ] Sub-headline accent word "playing" in gradient text
- [ ] `metadata`: full SEO meta for landing page

---

## Exit Criteria
- [ ] `/explore` shows 5 rows with correct topics in each
- [ ] Search bar filters results as user types
- [ ] Autocomplete dropdown shows + keyboard navigation works
- [ ] Clicking any topic card navigates to `/s/[slug]`
- [ ] Landing page renders two-column hero on desktop, single column on mobile
- [ ] `LiveDemo` auto-plays the hash table simulation in the hero
- [ ] Mode detection label updates as user types in `UnifiedInput`
- [ ] Popular chips fill the input and update detection label
- [ ] `HowItWorks` bezier path + animated dot visible
- [ ] All 3 feature cards render with hover effects
- [ ] Page loads under 3 seconds (LCP) on desktop

---

## Key Notes
- **Use `ui-ux-pro-max` skill** for hero layout proportions, card sizing, row spacing decisions
- `LiveDemo` must NOT render Pyodide or fire AI calls — it's purely static scene playback
- `LiveDemo` should use a separate Zustand store instance or prop-based playback to avoid conflicting with the main scene store (since it's embedded in a page that doesn't have a simulation loaded)
- Consider using a `ScenePlayerProvider` context to scope the scene + playback state per player instance
- Popular chips are hardcoded — the 5 most visually impressive pre-built simulations
- The `<Navbar />` from layout.tsx shows on all pages; don't add another nav in page components
