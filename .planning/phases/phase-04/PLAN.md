# Phase 4 — Simulation Page Layouts

**Goal:** `/s/[slug]` route fully functional with all 3 layout variants, expand mode, challenges section, and correct mobile layout.

**Entry criteria:** Phase 3 complete. All primitives and annotation components built.

---

## Tasks

### 4.1 — `/s/[slug]` page route
Create `apps/web/src/app/s/[slug]/page.tsx`:
- [ ] Server component that receives `params.slug`
- [ ] Calls `loadScene(slug): Scene | null` — checks static content files (Phase 5 fills these in; stub with `null` for now)
- [ ] If `scene === null`: render loading skeleton (Phase 7 handles AI generation case; stub with "Scene not found" for now)
- [ ] If `scene` found: `<ScenePageClient scene={scene} slug={slug} />`
- [ ] `generateMetadata({ params })`: returns title from scene + OG tags (Phase 11 wires OG images)

Create `apps/web/src/app/s/[slug]/ScenePageClient.tsx` (client component):
- [ ] Takes `scene: Scene` prop
- [ ] Calls `sceneStore.setScene(scene)` on mount via `useEffect`
- [ ] Renders `<SimulationLayout scene={scene} />`

### 4.2 — Simulation page sticky nav
Create `apps/web/src/components/simulation/SimulationNav.tsx`:
- [ ] Sticky top, blurred backdrop, same glow-border-bottom as Navbar
- [ ] Left: `← insyte` back link (routes to `/explore`)
- [ ] Center: simulation title + category badge (pill component from Phase 1)
- [ ] Right: Share button `[⛶ Share]` (copies URL to clipboard, shows toast) + Expand button `[⛶]`
- [ ] Expand button triggers full-canvas mode
- [ ] Mobile: back arrow + truncated title + share icon only

### 4.3 — Layout components
Create `apps/web/src/engine/layouts/`:

**`TextLeftCanvasRight.tsx`:**
- [ ] Desktop: `flex flex-row` — left panel 35%, right canvas 65%
- [ ] Left: `<ExplanationPanel />` — scrollable, `overflow-y-auto`
- [ ] Right: canvas area with `<DotGridBackground />` + primitives + `<PlaybackControls />` + `<ControlBar />`
- [ ] Framer Motion: left panel slides out when expand mode active (`animate={{ width: 0, opacity: 0 }}`)
- [ ] Mobile (`< md`): stacked — canvas `100%` on top, explanation below

**`CodeLeftCanvasRight.tsx`:**
- [ ] Desktop: same 35/65 split but left = `<CodePanel />`
- [ ] Mobile (`< md`): tabs `["Code" | "Visual"]` — tab switch shows/hides panels using Framer Motion
- [ ] Tab bar: shadcn `Tabs` component, styled to match design system

**`CanvasOnly.tsx`:**
- [ ] Full width canvas (no left panel)
- [ ] `<DotGridBackground />` + `<SystemDiagramViz />` (or other HLD primitives)
- [ ] Floating explanation cards: `<StepPopup />` components anchored to component positions
- [ ] Controls float inside canvas (bottom area of card)

### 4.4 — Canvas card container
Create `apps/web/src/engine/layouts/CanvasCard.tsx`:
- [ ] The dark card container that wraps the simulation canvas visuals
- [ ] `bg-surface-container rounded-3xl border border-outline-variant/20 overflow-hidden`
- [ ] Internal sections (top to bottom):
  1. Input area (conditional: for concept sims with user-controlled input)
  2. Playback controls bar (always present)
  3. Visualization area (main area with primitives)
  4. Controls bar (sliders, toggles, stat cards)
- [ ] Full-canvas expand: card expands to fill viewport, `position: fixed inset-0`

### 4.5 — ControlBar component
Create `apps/web/src/engine/controls/ControlBar.tsx`:
- [ ] Reads `scene.controls` array and renders each control:
  - `SliderControl.tsx`: labeled slider using shadcn `Slider`, shows current value
  - `ToggleControl.tsx`: A/B toggle, active = `bg-secondary text-on-secondary`, inactive = `bg-surface-container-lowest border`
  - `ToggleGroupControl.tsx`: multi-option row (e.g., Chaining vs Open Addressing)
  - `InputControl.tsx`: text input for custom array/value entry
  - `ButtonControl.tsx`: action button (Kill Server, Traffic Spike) — primary or destructive variant
- [ ] Layout: flex row, wraps on mobile, `gap-4`
- [ ] Stat cards: render `StatCard` for each control with `type: 'stat'` (load factor, collisions, etc.)

### 4.6 — Challenges section
Create `apps/web/src/components/simulation/ChallengesSection.tsx`:
- [ ] Collapsible section below the canvas (`▾ Challenges` header)
- [ ] Horizontal scroll row of challenge cards on desktop
- [ ] Each `ChallengeCard.tsx`:
  - `bg-surface-container-low rounded-2xl border border-outline-variant/20 p-4`
  - Title + description + type badge
  - `"Try it →"` button navigates or activates the challenge in the current simulation
- [ ] Mobile: stacked vertically, no horizontal scroll

### 4.7 — Full-canvas expand/collapse
- [ ] `isExpanded` state in `playback-store` (or local in `SimulationLayout`)
- [ ] Expand: left panel `animate={{ width: 0, opacity: 0, overflow: 'hidden' }}`, canvas `animate={{ flex: 1 }}`
- [ ] Expand icon `⛶` changes to collapse icon `⊠` (Lucide icons)
- [ ] Framer Motion `layout` prop on both panels for smooth resize
- [ ] Keyboard shortcut: `f` key toggles expand mode

### 4.8 — SimulationLayout orchestrator
Create `apps/web/src/engine/SimulationLayout.tsx`:
- [ ] Decides which layout component to render based on `scene.layout`
- [ ] Renders `<SimulationNav />` (sticky)
- [ ] Renders the correct layout + passes expand state
- [ ] Renders `<ChallengesSection />` below
- [ ] Renders `<ChatButton />` FAB (stub — built in Phase 8)

### 4.9 — Mobile layout verification
- [ ] At `< 768px`: canvas stacks vertically at top
- [ ] `PlaybackControls` shows as a compact bar below canvas
- [ ] Explanation / Code scrolls below
- [ ] Challenges collapse to vertical stack
- [ ] Nav: back arrow + truncated title + share icon

---

## Exit Criteria
- [ ] `/s/[slug]` renders without errors (with a test scene JSON from Phase 2)
- [ ] All 3 layout variants render their correct panel structure
- [ ] Expand/collapse animates smoothly (no layout jump)
- [ ] `PlaybackControls` functional within all layout variants
- [ ] `ControlBar` renders at least one slider and one toggle correctly
- [ ] `ChallengesSection` collapses/expands
- [ ] Mobile: canvas on top, explanation below, challenges stacked — at 375px viewport
- [ ] Sticky nav stays visible during scroll
- [ ] TypeScript — no `as any` in layout components

---

## Key Notes
- **Use `ui-ux-pro-max` skill** for any layout proportions or component spacing decisions not specified here
- Canvas aspect ratio should be maintained on resize — avoid layout shift
- `CanvasCard` fixed positioning for expand mode should work correctly with the sticky nav (adjust z-index)
- The `ControlBar` component will be heavily used in Phases 5, 9, and 10 — make it generic and data-driven from `scene.controls`
- `ChallengesSection` is collapsible but should be open by default on desktop, collapsed on mobile
