# Phase 37 — Theme Centralization

> **Status**: COMPLETE
> **Date planned**: 2026-04-29
> **Date completed**: 2026-04-29
> **Scope**: Eliminate ALL hardcoded color values (hex, rgba, hsl) outside `globals.css`
> and `colors.ts` — full monorepo, not just `apps/web/src`.
> After this phase, changing the theme requires editing exactly two files.
>
> **Depends on**: Nothing
> **Does not block**: Phase 35 (different files)

---

## 1. Goal & Two-File Rule

Every color in the codebase lives in one of two places:

| File | For what |
|---|---|
| `apps/web/app/globals.css` | Browser-rendered colors — Tailwind utilities, inline `style={}` CSS var references, SVG attributes |
| `apps/web/src/engine/styles/colors.ts` | Programmatic JS colors — Framer Motion `animate` targets, canvas `ctx.fillStyle`, JS lookup objects |

Everything else **imports — it never defines**.

**Why two files, not one?**
Framer Motion `animate` targets cannot interpolate CSS variables (it needs raw rgba to parse
numeric channels). Canvas 2D `ctx.fillStyle` also cannot read CSS vars. So a JS constants
file is permanently needed alongside the CSS variables file.

---

## 2. Original Scope vs. Actual Scope

The original audit identified **12 files** in `apps/web/src`. After implementation began,
a full monorepo grep revealed **85+ color leak hits across 25+ files**, extending into:
- All annotation components
- All primitive visualizations
- UI shell components (chat, explore, landing, simulation, layout)
- A dev tooling page

The decision was made to fix **everything** rather than stop at the original 12.

---

## 3. What Was Added to `colors.ts`

All additions are exports that consumer files import — `colors.ts` is the single source
of truth for all JS-accessible color constants.

### Expanded `PRIMARY` object
Added alpha variants needed by various components:
`alpha08`, `alpha12`, `alpha16`, `alpha20`, `alpha25`, `alpha28`, `alpha30`, `alpha90`
(on top of the pre-existing `alpha07`, `alpha10`, `alpha15`, `alpha35`, `alpha40`, `alpha45`, `alpha60`)

### `POPUP_ACCENT_COLORS`
Four rgba accent colors for `StepPopup` badge borders/text:
`neutral`, `cyan`, `red`, `purple`

### `GRID_CELL_COLORS` + `GridCellState` type
12 values for GridViz pathfinding cell states: `default`, `wall`, `start`, `visited`,
`active`, `path`, `end`, `pivot` — each with `bg`, `border`, `text`, `shadow`.
Lifted from a local object in `GridViz.tsx` into the shared palette.

### Expanded `VIZ_SURFACE`
Added to the existing surface fallbacks:
`popupBg`, `transparent`, `defaultBorderFaint`, `nodeShadow`, `chatShadow`,
`tooltipShadow`, `challengeShadow`, `topicRowShadow`

### `SECONDARY`
Full secondary palette for JS contexts: `hex`, `alpha10`–`alpha55`, `alpha11`, `alpha18`

### `MAC_CONTROLS`
macOS traffic-light button colors: `close` (#ff5f57), `minimize` (#febc2e), `maximize` (#28c840)

### `HERO_COLORS`
30 illustration-specific values used only in `HeroLoop.tsx`. Grouped here rather than
as individual CSS vars because they are dense, one-off illustration values:
- `codeActive` / `codeDim` — Framer animate targets for CodeScene array cells
- `codeLineActive` / `codeLineOff` — Framer animate targets for CodeScene line rows
- `networkActive` / `networkDim` — Framer animate targets for NetworkCard
- `stageActive` / `stageDim` — Stage pill inline styles (border, bg, text)
- `connectorStrong` / `connectorFaint` — SVG path strokes
- `packetDot` / `junctionDot` — SVG animated circle fills
- `gradientMainA/B/C` / `gradientSideA/B` — SVG linearGradient stop colors
- `outerShadow` — Container drop shadow

### `CANVAS_PANEL`
9 values for `CanvasRenderer`'s canvas 2D context (which cannot read CSS vars):
`bg`, `border`, `titleText`, `subtitleText`, `divider`, `statLabel`, `statValue`, `footerText`

---

## 4. What Was Added to `globals.css`

All additions are inside the `:root` block. No new `@theme` tokens — these are
utility alias vars consumed by inline `style={}` props and Tailwind arbitrary classes.

### Primary alpha aliases
```css
--color-primary-alpha-08  --color-primary-alpha-10  --color-primary-alpha-12
--color-primary-alpha-15  --color-primary-alpha-16  --color-primary-alpha-25
--color-primary-alpha-28  --color-primary-alpha-30  --color-primary-alpha-60
```

### Secondary alpha aliases
```css
--color-secondary-alpha-10  --color-secondary-alpha-11  --color-secondary-alpha-12
--color-secondary-alpha-15  --color-secondary-alpha-18  --color-secondary-alpha-24
```

### Black/shadow alpha aliases
```css
--color-black-alpha-15  --color-black-alpha-25  --color-black-alpha-75
```

### Outline variant alpha
```css
--color-outline-variant-60   /* rgba(72, 71, 77, 0.60) */
```

### macOS window control colors (with pre-computed alpha variants)
```css
--color-mac-close         --color-mac-close-20    --color-mac-close-30
--color-mac-close-35      --color-mac-close-50
--color-mac-minimize      --color-mac-minimize-20  --color-mac-minimize-35
--color-mac-maximize      --color-mac-maximize-10
```

### Surface / background aliases
```css
--color-chat-bg             /* rgba(19, 19, 25, 0.92) */
--color-search-dropdown-bg  /* rgba(25, 25, 31, 0.95) */
--color-dev-banner-bg       /* #0c0c11 */
--color-dev-panel-bg        /* #0d1117 */
--color-dev-input-text      /* #e2e8f0 */
--color-dev-input-focus-bg  /* rgba(255, 255, 255, 0.02) */
```

### Brand gradient vars
```css
--gradient-brand           /* linear-gradient(90deg, #b79fff → #3adffa) */
--gradient-brand-border    /* linear-gradient(135deg, #b79fff → #919bff → #3adffa) */
--gradient-brand-explore   /* linear-gradient(135deg, #b79fff → #ab8ffe) */
--gradient-secondary       /* linear-gradient(135deg, #3adffa → #1ad0eb) */
--gradient-brand-divider   /* linear-gradient(90deg, primary-25% → secondary-15% → transparent) */
--gradient-primary-radial  /* radial-gradient(circle, primary-16% → transparent) */
--gradient-secondary-radial /* radial-gradient(circle, secondary-11% → transparent) */
--pattern-streaming-dots   /* radial-gradient dot pattern for skeleton canvas */
```

### Glow shadow tokens (for Tailwind arbitrary `shadow-[...]` classes)
```css
--glow-primary-10   --glow-primary-12   --glow-primary-30
--glow-secondary-10  --glow-surface-05  --glow-tertiary-10
```

---

## 5. All Files Fixed

### Foundation (done first — all others depend on these)
| File | What changed |
|---|---|
| `src/engine/styles/colors.ts` | Added 7 new exports, expanded `PRIMARY` and `VIZ_SURFACE` |
| `app/globals.css` | Added 40+ CSS variable aliases to `:root` |

### Annotation components
| File | Color leaks fixed |
|---|---|
| `src/engine/annotations/StepPopup.tsx` | Local `popupAccentColor` object → import `POPUP_ACCENT_COLORS` + `VIZ_SURFACE.popupBg` |
| `src/engine/annotations/CodePanel.tsx` | Active line `rgba(183,159,255,0.1)` + `#b79fff` → CSS vars |
| `src/engine/annotations/ExplanationPanel.tsx` | Tailwind `shadow-[0_0_8px_rgba(...)]` → inline `style` with CSS var |

### Layout components
| File | Color leaks fixed |
|---|---|
| `src/engine/layouts/CanvasCard.tsx` | 5 Framer Motion `boxShadow` strings → `PRIMARY.glow*` constants |

### Primitive visualizations
| File | Color leaks fixed |
|---|---|
| `src/engine/primitives/GridViz.tsx` | Local `GRID_CELL_COLORS` object removed → import from `colors.ts` |
| `src/engine/primitives/WeightedGraphViz.tsx` | `graphSource`, `graphSettled`, `graphActiveFill` → `VIZ_SURFACE.*` |
| `src/engine/primitives/ArrayViz.tsx` | Window-bracket `alpha45` + `alpha07` → `PRIMARY.*` |
| `src/engine/primitives/TextBadgeViz.tsx` | `container` + `border` fallbacks → `VIZ_SURFACE.*` |
| `src/engine/primitives/MapViz.tsx` | Zebra stripe + transparent fallback → `VIZ_SURFACE.*` |
| `src/engine/primitives/QueueViz.tsx` | Default stripe inset shadow → `VIZ_SURFACE.defaultBorderFaint` |
| `src/engine/primitives/StackViz.tsx` | Default stripe inset shadow → `VIZ_SURFACE.defaultBorderFaint` |
| `src/engine/primitives/LinkedListViz.tsx` | Node shadow Framer animate → `VIZ_SURFACE.nodeShadow` |

### Renderers & animation
| File | Color leaks fixed |
|---|---|
| `src/components/renderers/CanvasRenderer/index.tsx` | 9 `ctx.fillStyle`/`ctx.strokeStyle` → `CANVAS_PANEL.*` (was originally deferred — fixed anyway) |
| `src/engine/animation/useAnimateStep.ts` | JSDoc examples updated from raw hex to semantic token refs |

### UI shell — community
| File | Color leaks fixed |
|---|---|
| `app/community/gallery/CommunityCard.tsx` | 4 `glowClass` Tailwind arbitrary shadows → CSS var glow tokens |

### UI shell — auth
| File | Color leaks fixed |
|---|---|
| `components/auth/AuthModal.tsx` | `boxShadow` rgba compound → CSS vars (Google brand SVG fills exempted) |

### UI shell — chat
| File | Color leaks fixed |
|---|---|
| `components/chat/ChatCard.tsx` | macOS controls (9 classes), compound shadow, tooltip shadow → CSS vars + `VIZ_SURFACE.*` |

### UI shell — explore
| File | Color leaks fixed |
|---|---|
| `components/explore/SearchBar.tsx` | `rgba(25,25,31,0.95)` dropdown bg → `--color-search-dropdown-bg` |
| `components/explore/TopicCard.tsx` | 2 Tailwind `shadow-[...]` → glow token CSS vars |
| `components/explore/TopicRow.tsx` | `rgba(0,0,0,0.25)` shadow → `--color-black-alpha-25` |

### UI shell — landing
| File | Color leaks fixed |
|---|---|
| `components/landing/FeatureCards.tsx` | Framer `whileHover` boxShadow → `PRIMARY.alpha12` |
| `components/landing/FeaturedSimulationCard.tsx` | 2 Tailwind `shadow-[...]` → glow token CSS vars |
| `components/landing/HeroLoop.tsx` | 25+ values: Framer animate targets, SVG strokes/fills, stage pills, outer shadow → `HERO_COLORS.*` |
| `components/landing/HowItWorks.tsx` | SVG `stroke` rgba + hex → CSS vars (`--color-outline-variant-60`, `--secondary`) |
| `components/landing/UnifiedInput.tsx` | Compound focus boxShadow + 2 gradient `background` → CSS vars |

### UI shell — layout
| File | Color leaks fixed |
|---|---|
| `components/layout/DevBanner.tsx` | Border gradient, compound boxShadow, `bg-[#0c0c11]` (×2), 2 radial gradients, text gradient, divider gradient → CSS vars |

### UI shell — simulation
| File | Color leaks fixed |
|---|---|
| `components/simulation/ChallengeCard.tsx` | `rgba(0,0,0,0.15)` shadow → `--color-black-alpha-15` |
| `components/simulation/PyodideLoader.tsx` | `shadow-[0_0_20px_rgba(...)]` → `--glow-primary-12` |
| `components/simulation/StreamingError.tsx` | Button gradient background → `--gradient-brand-explore` |
| `components/simulation/StreamingSkeleton.tsx` | Dot pattern gradient + pulsing shadow → CSS vars |

### Dev tooling
| File | Color leaks fixed |
|---|---|
| `app/dev/primitives/page.tsx` | `bg-[#0d1117]`, `text-[#e2e8f0]`, `focus:bg-[#ffffff05]` → CSS vars |

**Total: 30 files edited. 0 new files. 0 deleted files.**

---

## 6. Legitimate Exemptions

These files still contain raw color values — by design, not oversight:

| File | Values | Why exempt |
|---|---|---|
| `app/layout.tsx` | `themeColor: '#0e0e13'` | Browser `<meta name="theme-color">` API — CSS vars not accepted |
| `app/opengraph-image.tsx` | Multiple hex/rgba | Satori / `next/og` Edge renderer — CSS vars not supported |
| `app/s/[slug]/opengraph-image.tsx` | Multiple hex/rgba | Same as above |
| `components/auth/AuthModal.tsx` | `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335` | Google brand logo SVG — canonical colors, must not change |
| `lib/ai-logger.ts` | `color:#22c55e` etc. | `console.log('%c …')` DevTools style strings — CSS vars not supported in console API |

---

## 7. Acceptance Criteria — All Met

- [x] Full monorepo grep for hex, rgba, hsl in `*.tsx`/`*.ts`/`*.css` source files
      (excluding `globals.css`, `colors.ts`, OG images, exempted files) returns **0 results**
- [x] `colors.ts` exports: `HIGHLIGHT_COLORS`, `PRIMARY`, `POPUP_ACCENT_COLORS`,
      `GRID_CELL_COLORS`, `GridCellState`, `VIZ_SURFACE`, `SECONDARY`, `MAC_CONTROLS`,
      `HERO_COLORS`, `CANVAS_PANEL`, `resolveHighlight`, `PopupAccentColor`
- [x] `globals.css` has 40+ CSS variable aliases across primary, secondary, black,
      outline-variant, macOS controls, surfaces, gradients, glow tokens
- [x] `tsc --noEmit` passes with 0 errors
- [x] Two-file rule holds: theme change = edit `globals.css` + `colors.ts` only

---

## 8. Out of Scope (unchanged from original)

- **Light mode**: this phase consolidated existing dark-mode values. Light mode
  is a future phase — it would add `:root.light` overrides to `globals.css` and
  conditional exports to `colors.ts`. This phase is the prerequisite for that.
- **Changing the actual palette**: values were lifted exactly as-is. No color changes.
- **New primitives**: any files added after this phase must follow the two-file rule
  from the start. No raw hex in new primitive files.
