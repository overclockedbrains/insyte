# Phase 1 — Design System + Global Layout

**Goal:** Every DESIGN.md token, utility, and layout component implemented. Landing at `/` shows correct dark theme with `Navbar` and `DotGridBackground`.

**Entry criteria:** Phase 0 complete. `pnpm dev` runs, Tailwind color tokens configured.

---

## Tasks

### 1.1 — Global CSS utilities
Create `apps/web/src/app/globals.css` with all reusable CSS utilities from DESIGN.md:

- [ ] CSS custom properties mirroring all color tokens (as `--color-*` variables for runtime use)
- [ ] `.glass-panel` utility:
  ```css
  background: rgba(25, 25, 31, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  ```
- [ ] `.glow-border` utility:
  ```css
  box-shadow: 0 0 20px rgba(183, 159, 255, 0.15);
  border: 1px solid rgba(183, 159, 255, 0.1);
  ```
- [ ] `.glow-border-active` — intensified version for active states
- [ ] `.gradient-text` utility (hero headline gradient, primary → secondary)
- [ ] `.neon-gradient` utility (button fill gradient)
- [ ] Bezier connector styles: `.bezier-inactive` and `.bezier-active`
- [ ] Dot grid background pattern: `.dot-grid`
- [ ] `selection:bg-primary selection:text-on-primary` global selection color
- [ ] Scrollbar styling: dark, minimal, matches surface colors
- [ ] Base `body` reset: `background-color: #0e0e13; color: #f9f5fd;`

### 1.2 — DotGridBackground component
Create `apps/web/src/components/layout/DotGridBackground.tsx`:
- [ ] Full-width/height absolutely positioned `<div>` with `pointer-events-none`
- [ ] CSS: `radial-gradient(circle, rgba(183,159,255,0.15) 1px, transparent 1px)` at `24px 24px`
- [ ] Accept `opacity` prop (default `1`) for contextual dimming
- [ ] Used as a background layer in canvas areas and full-page backgrounds

### 1.3 — GlowEffect component
Create `apps/web/src/components/layout/GlowEffect.tsx`:
- [ ] Renders 2 ambient blob divs (purple top-left, cyan bottom-right) as in DESIGN.md
- [ ] Props: `className` for positioning override, `intensity?: 'subtle' | 'normal' | 'strong'`
- [ ] Uses Tailwind: `absolute`, `blur-[120px]`, `rounded-full`, `pointer-events-none`
- [ ] Primary blob: `bg-primary/10`, secondary blob: `bg-secondary/10`

### 1.4 — Navbar component
Create `apps/web/src/components/layout/Navbar.tsx`:
- [ ] Sticky top, `backdrop-blur-md`, `bg-background/80`, bottom primary glow (`box-shadow: 0 10px 30px -15px rgba(183,159,255,0.3)`)
- [ ] Desktop layout: `[insyte logo ←]` left, `[Explore] [★ GitHub]` center-right, `[⚙ Settings]` far right
- [ ] Logo: "insyte" in `font-headline font-bold text-xl` with gradient text on the "i"
- [ ] Nav links: `text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium`
- [ ] GitHub link: `★ GitHub` opens `https://github.com/[repo]` in new tab
- [ ] Settings link: routes to `/settings`
- [ ] Explore link: routes to `/explore`
- [ ] Mobile (< `md`): hamburger `☰` button opens side drawer
- [ ] Side drawer: `Sheet` from shadcn/ui, slides from right, same nav items vertically

### 1.5 — Footer component
Create `apps/web/src/components/layout/Footer.tsx`:
- [ ] Simple 2-column: left = "insyte · See how it works." + copyright, right = GitHub + links
- [ ] `bg-surface-container-low border-t border-outline-variant/20 py-8`
- [ ] Links: GitHub, `@/explore`, tagline

### 1.6 — Root layout
Update `apps/web/src/app/layout.tsx`:
- [ ] Import Manrope, Inter, JetBrains Mono from `next/font/google`
- [ ] Apply font CSS variables to `<html>`: `--font-headline`, `--font-body`, `--font-mono`
- [ ] `<html lang="en" className="dark">` — dark class always set, no toggle
- [ ] `<body>` with `bg-background text-on-surface font-body antialiased`
- [ ] Render `<GlowEffect />` + `<DotGridBackground />` as page background layers
- [ ] Render `<Navbar />` above `{children}`
- [ ] Render `<Footer />` below `{children}`
- [ ] `metadata`: title "insyte — See how it works.", description, theme-color `#0e0e13`

### 1.7 — Landing placeholder page
Update `apps/web/src/app/page.tsx`:
- [ ] Minimal placeholder showing the layout is correct
- [ ] A centered section: headline "insyte", subtext "Interactive simulations for every tech concept.", a ghost button "Explore →"
- [ ] Confirm: dark background, correct fonts, Navbar at top, Footer at bottom, glow blobs visible

### 1.8 — Reusable UI primitives (used across phases)
Create `apps/web/src/components/ui/` (supplement shadcn base):
- [ ] `Pill.tsx` / `Badge.tsx` — pill badge as per DESIGN.md pattern (uppercase, tracking-widest, bg-primary/10, text-primary)
- [ ] `StatCard.tsx` — stat card matching DESIGN.md spec (surface-container-lowest, label + value pattern)
- [ ] `GlowButton.tsx` — primary action button with neon gradient fill + hover scale-[1.02] + active:scale-95

---

## Exit Criteria
- [ ] `localhost:3000` shows dark background (`#0e0e13`), Navbar with all items, footer
- [ ] Ambient glow blobs visible in background
- [ ] Dot grid visible on canvas areas
- [ ] Manrope used for headings, Inter for body text (verify in browser devtools)
- [ ] All Tailwind color tokens (`bg-primary`, `text-secondary`, `border-outline-variant`, etc.) apply correctly
- [ ] `.glass-panel` CSS class applies correct backdrop blur
- [ ] Mobile: hamburger appears, drawer opens/closes
- [ ] No light mode traces anywhere in the codebase

---

## Key Notes
- **Use `ui-ux-pro-max` skill** if making decisions not covered in DESIGN.md
- Fonts loaded via `next/font/google` (not `<link>` tags) for Next.js optimization
- `<html class="dark">` must be static — never toggled; no `useTheme`, no next-themes
- The dot grid and glow blobs should never interfere with interactive elements (`pointer-events-none`)
- GlowEffect can be imported in multiple pages — it's a layout layer, not page-specific
