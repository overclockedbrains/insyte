# How to Add a New Theme

> Requires Phase 38 + Phase 38 follow-up to be complete.
> Both are done as of April 29, 2026.

---

## The two-file rule

| What changes | Where |
|---|---|
| Every color value (brand, surface, state bg opacity) | `apps/web/app/globals.css` — one `[data-theme="x"]` block |
| Every JS alpha string (Framer Motion / canvas) | `apps/web/src/engine/styles/colors.ts` — 6 constants |

Nothing else needs to touch.

---

## Step 1 — `globals.css`: add a theme block

Add one block anywhere after the `:root` block. Override only the `--ref-*` vars
that differ from dark. Everything else (alpha aliases, gradients, surface vars,
utility classes) re-derives automatically.

```css
[data-theme="light"] {
  /* ── Brand palette ─────────────────────────────────────────── */
  --ref-primary:        #6d4fc2;
  --ref-primary-rgb:    109, 79, 194;
  --ref-secondary:      #007a8c;
  --ref-secondary-rgb:  0, 122, 140;
  --ref-background:     #ffffff;
  --ref-card:           #f4f4f8;
  --ref-card-mid:       #e8e8f0;
  --ref-surface-low:    #ededf4;
  --ref-outline:        #8a8a94;
  --ref-outline-dim:    #c4c4cc;
  --ref-on-surface:     #1a1a24;
  --ref-on-surface-dim: #5a5a68;
  --ref-error:          #c0003c;
  --ref-success:        #166534;
  --ref-amber:          #b45309;
  --ref-on-primary:     #ffffff;
  --ref-on-secondary:   #ffffff;

  /* ── Highlight bg opacity ──────────────────────────────────── */
  /* 10% (dark default) is invisible on white — bump to 22%.     */
  --color-highlight-active-bg:  color-mix(in srgb, var(--ref-secondary) 22%, transparent);
  --color-highlight-success-bg: color-mix(in srgb, var(--ref-success)   22%, transparent);
  --color-highlight-danger-bg:  color-mix(in srgb, var(--ref-error)     22%, transparent);
  --color-highlight-amber-bg:   color-mix(in srgb, var(--ref-amber)     22%, transparent);
}
```

**What auto-updates when you set those `--ref-*` vars:**
- All Shadcn vars (`--background`, `--primary`, `--secondary`, `--muted`, …)
- All `@theme` semantic tokens (`--color-primary`, `--color-background`, …)
- All alpha aliases (`--color-primary-alpha-10`, … via `color-mix()`)
- All brand gradients (`--gradient-brand`, `--gradient-brand-explore`, …)
- All glow tokens (`--glow-primary-10`, …)
- `body`, `::selection`, scrollbars, focus ring, `.bezier-active`, `.dot-grid`, …
- `--color-chat-bg`, `--color-search-dropdown-bg`, `--sidebar` (surface aliases)

**What does NOT auto-update (leave as-is or handle separately):**
- `--chart-3 / --chart-4 / --chart-5` — derived tertiary colors, hardcoded
- `--color-dev-banner-bg / --color-dev-panel-bg` — dev-only UI, not themed
- `HERO_COLORS` in `colors.ts` — landing page illustration, intentionally fixed

---

## Step 2 — `colors.ts`: update 6 constants

```ts
// Line ~10  — brand palette
const PRIMARY_RGB   = '109, 79, 194'   // matches --ref-primary-rgb
const SECONDARY_RGB = '0, 122, 140'    // matches --ref-secondary-rgb

// Line ~25  — semantic state palette
const STATE_ACTIVE  = { hex: '#007a8c', rgb: '0, 122, 140'   } as const
const STATE_SUCCESS = { hex: '#166534', rgb: '22, 101, 52'    } as const
const STATE_DANGER  = { hex: '#c0003c', rgb: '192, 0, 60'     } as const
const STATE_AMBER   = { hex: '#b45309', rgb: '180, 83, 9'     } as const
```

**What auto-recomposes from those 6 constants:**
- All `PRIMARY.*` alpha strings (`alpha07` … `alpha90`, `glow*`)
- All `SECONDARY.*` alpha strings
- Every `HIGHLIGHT_COLORS` bg, border, and text value
- Every `GRID_CELL_COLORS` bg, border, shadow, and text value

---

## Step 3 — activate the theme

Set `data-theme` on `<html>` (or any ancestor):

```ts
// toggle
document.documentElement.dataset.theme = 'light'
document.documentElement.removeAttribute('data-theme')  // back to dark

// persistent via localStorage
localStorage.setItem('theme', 'light')
document.documentElement.dataset.theme = localStorage.getItem('theme') ?? ''
```

In Next.js, set it server-side to avoid flash:

```tsx
// app/layout.tsx
<html data-theme={resolvedTheme}>
```

---

## Adding a second palette (e.g. "Ocean")

Same process. Override only the vars that differ:

```css
[data-theme="ocean"] {
  --ref-primary:       #0ea5e9;
  --ref-primary-rgb:   14, 165, 233;
  --ref-secondary:     #06b6d4;
  --ref-secondary-rgb: 6, 182, 212;
  /* background, surfaces, on-colors — keep dark defaults if staying dark */
}
```

`colors.ts` constants for the "ocean" palette in a theme-aware app:

```ts
const PRIMARY_RGB   = '14, 165, 233'
const SECONDARY_RGB = '6, 182, 212'
```

---

## Reference: full `--ref-*` palette vars

| Variable | Dark default | Purpose |
|---|---|---|
| `--ref-primary` | `#b79fff` | Brand primary (lavender) |
| `--ref-primary-rgb` | `183, 159, 255` | RGB triplet for rgba() in CSS |
| `--ref-secondary` | `#3adffa` | Brand secondary (cyan) |
| `--ref-secondary-rgb` | `58, 223, 250` | RGB triplet for rgba() in CSS |
| `--ref-background` | `#0e0e13` | Page background |
| `--ref-card` | `#19191f` | Card / popover surface |
| `--ref-card-mid` | `#25252d` | Muted / accent surface |
| `--ref-surface-low` | `#131319` | Sidebar / chat panel level |
| `--ref-outline` | `#76747b` | Visible border |
| `--ref-outline-dim` | `#48474d` | Subtle border |
| `--ref-on-surface` | `#f9f5fd` | Primary text |
| `--ref-on-surface-dim` | `#acaab1` | Secondary / muted text |
| `--ref-error` | `#ff6e84` | Error / danger state |
| `--ref-success` | `#22c55e` | Success state |
| `--ref-amber` | `#f59e0b` | Warning / pivot state |
| `--ref-on-primary` | `#361083` | Text on primary bg |
| `--ref-on-secondary` | `#004b56` | Text on secondary bg |
