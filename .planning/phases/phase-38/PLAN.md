# Phase 38 — Color Architecture Hardening

> **Status**: PLANNED
> **Date planned**: 2026-04-29
> **Scope**: Structural improvements to `globals.css` and `colors.ts` to make the color
> system extensible for future themes. No color values change — only architecture changes.
> After this phase, adding a new theme requires editing exactly **one class** in `globals.css`
> and **two constants** in `colors.ts`.
>
> **Depends on**: Phase 37 ✅ (two-file rule already enforced — clean starting point)
> **Does not block**: Any current active work

---

## 1. Goal

Phase 37 enforced the two-file rule: no raw color values outside `globals.css` and
`colors.ts`. Phase 38 addresses the **internal structure** of those two files so they
are ready for multi-theme support.

Currently both files have a flat architecture: every value is defined directly on its
semantic token. To add a "Light" theme today, you would need to edit every `--color-*`
variable individually. Phase 38 introduces a reference palette layer so that a theme
override changes one block of primitive color definitions and all semantic tokens
automatically follow.

**Three outcomes:**
1. `globals.css` has a `--ref-*` palette layer that semantic tokens reference.
2. `colors.ts` composes all alpha variants from a single RGB constant per color.
3. Base styles and utility classes use CSS variables instead of hardcoded hex.

---

## 2. Naming Conventions

### CSS — `--ref-*` palette layer

Follows Material Design 3's three-tier model, which insyte's token naming already mirrors
(`--color-surface-container`, `--color-on-primary`, etc.):

| Tier | Prefix | Purpose |
|---|---|---|
| **Reference** | `--ref-*` | Raw palette values — the only place hex appears |
| **System** | `--color-*` | Semantic/contextual tokens — what components use |
| Component | *(future)* | Component-specific overrides |

The `--ref-` prefix is short, meaningful, and consistent with the existing `--color-`,
`--gradient-`, `--glow-`, `--pattern-` namespaces already in the file.

### TypeScript — `PRIMARY_RGB` / `SECONDARY_RGB`

Module-private constants named explicitly. Single-letter names (`_P`, `_S`) are too
opaque; spelled-out names are self-documenting and mirror the CSS `--ref-primary-rgb`
counterpart.

---

## 3. Issues Found (Post-Phase-37 Review)

### 3.1 Critical — Blocks multi-theme support

**A. No palette sub-layer in `globals.css`**

Every semantic token defines its own raw value. Adding a light theme means editing every
`--color-*` line by hand. No structure exists to "swap the palette."

**B. `rgba()` alpha strings are baked into static strings**

`globals.css` has 25 occurrences of `rgba(183, 159, 255, X)` and 8 of `rgba(58, 223, 250, X)`.
`colors.ts` `PRIMARY` has 15 alpha variants all written as `rgba(183, 159, 255, X)`.
If the brand color changes, every one of these strings must be found and updated manually.

---

### 3.2 Medium — Duplication and dead code

**C. `.dark {}` block is 100% identical to `:root {}`**

Lines 155–187 in `globals.css` are a verbatim copy of the `:root` block. The comment
on line 54 even says "dark-only; both :root and .dark are dark." This is 33 lines of
dead code. When a proper light theme is added later, this block will be replaced entirely
with a structured theme class — it serves no purpose now.

**D. Three utility classes ignore CSS variables that already exist**

The following classes in `globals.css` have hardcoded values, but the corresponding
CSS vars were added to `:root` in Phase 37 and are ready to use:

| Class | Hardcoded | Existing var |
|---|---|---|
| `.gradient-text` | `linear-gradient(135deg, #b79fff 0%, #3adffa 100%)` | `var(--gradient-brand)` |
| `.neon-gradient` | `linear-gradient(135deg, #b79fff 0%, #ab8ffe 100%)` | `var(--gradient-brand-explore)` |
| `.dot-grid` | full `radial-gradient(circle, rgba(183,159,255,0.15) ...)` | `var(--pattern-streaming-dots)` |

**E. Base styles use hardcoded hex instead of semantic tokens**

| Selector | Property | Hardcoded | Should be |
|---|---|---|---|
| `body` | `background-color` | `#0e0e13` | `var(--color-background)` |
| `body` | `color` | `#f9f5fd` | `var(--color-on-surface)` |
| `::selection` | `background-color` | `#b79fff` | `var(--color-primary)` |
| `::selection` | `color` | `#361083` | `var(--color-on-primary)` |
| `::-webkit-scrollbar-track` | `background` | `#0e0e13` | `var(--color-background)` |
| `::-webkit-scrollbar-thumb` | `background` | `#48474d` | `var(--color-outline-variant)` |
| `::-webkit-scrollbar-thumb:hover` | `background` | `#76747b` | `var(--color-outline)` |
| `* { scrollbar-color }` | Firefox | `#48474d #0e0e13` | CSS vars |
| `.bezier-inactive` | `stroke` | `#48474d` | `var(--color-outline-variant)` |
| `.bezier-active` | `stroke` + `filter` | `#3adffa` | `var(--color-secondary)` |
| focus ring `box-shadow` | compound shadow | `rgba(183,159,255,...)` | `var(--color-primary)` + `var(--ring)` |

---

### 3.3 Low — Documentation and minor cleanup

**F. Alpha list split between CSS and TS is undocumented**

`PRIMARY` in `colors.ts` has `alpha07`, `alpha20`, `alpha35`, `alpha40`, `alpha45`, `alpha90`
that have no CSS counterpart. `SECONDARY` in TS has `alpha55` not in CSS. This is correct
(Framer Motion / canvas contexts cannot use CSS vars), but there is no comment explaining
why the lists differ, making it look like drift rather than intent.

**G. `VIZ_SURFACE` mixes structural colors and shadow strings**

`VIZ_SURFACE` in `colors.ts` contains both color values (`container`, `border`) and
multi-keyword shadow strings (`chatShadow`, `tooltipShadow`, `nodeShadow`). These are
logically different kinds of constants. As the object grows, separation will help.

---

## 4. Deliverables

### 4.1 `globals.css` — Reference palette layer

Add a `--ref-*` block at the top of `:root` as the only place raw hex values appear.
All semantic tokens and alpha aliases reference these instead of raw hex.

```css
/* ── Reference palette — the ONLY place raw color values are defined ─────── */
/* To create a new theme, override this block in a [data-theme="x"] class.   */
--ref-primary:        #b79fff;   /* lavender purple */
--ref-primary-rgb:    183, 159, 255;
--ref-secondary:      #3adffa;   /* bright cyan */
--ref-secondary-rgb:  58, 223, 250;
--ref-background:     #0e0e13;
--ref-card:           #19191f;
--ref-card-mid:       #25252d;
--ref-outline:        #76747b;
--ref-outline-dim:    #48474d;
--ref-on-surface:     #f9f5fd;
--ref-on-surface-dim: #acaab1;
--ref-error:          #ff6e84;
--ref-amber:          #f59e0b;
--ref-on-primary:     #361083;
--ref-on-secondary:   #004b56;
```

Semantic tokens then reference the palette:
```css
--color-background: var(--ref-background);
--color-primary:    var(--ref-primary);
--color-secondary:  var(--ref-secondary);
```

### 4.2 `globals.css` — `color-mix()` for alpha aliases

Replace all manually-constructed `rgba(183, 159, 255, X)` alpha alias strings with
`color-mix()`. Alpha variants then automatically follow the reference palette:

```css
/* Before */
--color-primary-alpha-10: rgba(183, 159, 255, 0.10);

/* After */
--color-primary-alpha-10: color-mix(in srgb, var(--ref-primary) 10%, transparent);
```

Apply to all `--color-primary-alpha-*`, `--color-secondary-alpha-*`, and
`--color-outline-variant-*` aliases. Gradient vars that contain hardcoded rgb values
also get the reference var treatment where feasible.

> **Browser support**: `color-mix()` is supported in Chrome 111+, Firefox 113+,
> Safari 16.2+ (all 2023). No polyfill needed for the target audience.

### 4.3 `globals.css` — Delete `.dark {}` block

Remove lines 155–187. Since the app is permanently dark, `:root` already applies.
When a light theme is added in a future phase, it will be implemented as
`[data-theme="light"] { --ref-primary: ...; --ref-background: ...; }` — not a
`.dark`/`:root` toggle. The current block would be replaced wholesale anyway.

### 4.4 `globals.css` — Wire base styles and utility classes to CSS vars

- `body { background-color }` and `body { color }` → semantic vars
- `::selection` background and color → `var(--color-primary)` and `var(--color-on-primary)`
- Scrollbar track/thumb/hover → `var(--color-background)`, `var(--color-outline-variant)`, `var(--color-outline)`
- Firefox `scrollbar-color` → composed from the same vars
- `.gradient-text` → `var(--gradient-brand)` (already defined)
- `.neon-gradient` → `var(--gradient-brand-explore)` (already defined)
- `.dot-grid` → `var(--pattern-streaming-dots)` (already defined)
- `.bezier-inactive stroke` → `var(--color-outline-variant)`
- `.bezier-active stroke` + `filter` → `var(--color-secondary)`
- Focus ring `box-shadow` → use `var(--color-primary)` channels

### 4.5 `colors.ts` — RGB composition constants

Extract RGB components as module-private constants that mirror `--ref-primary-rgb` and
`--ref-secondary-rgb` in CSS. All alpha variants compose from these:

```ts
// Mirrors --ref-primary-rgb and --ref-secondary-rgb in globals.css.
// Update these two lines to retheme all JS alpha constants in one edit.
const PRIMARY_RGB   = '183, 159, 255'
const SECONDARY_RGB = '58, 223, 250'

export const PRIMARY = {
  hex:        '#b79fff',
  alpha07:    `rgba(${PRIMARY_RGB}, 0.07)`,
  alpha08:    `rgba(${PRIMARY_RGB}, 0.08)`,
  // ...all other alphas auto-update when PRIMARY_RGB changes
} as const

export const SECONDARY = {
  hex:        '#3adffa',
  alpha10:    `rgba(${SECONDARY_RGB}, 0.10)`,
  // ...
} as const
```

### 4.6 `colors.ts` — Document the CSS/TS alpha split

Add a comment block beneath each palette object explaining which alphas exist in CSS
(used by Tailwind/inline styles) vs. TS-only (canvas/Framer Motion cannot read CSS vars):

```ts
// CSS counterparts (globals.css --color-primary-alpha-*):
//   08, 10, 12, 15, 16, 25, 28, 30, 60
// TS-only (Framer Motion animate targets / canvas ctx — cannot resolve CSS vars):
//   alpha07, alpha20, alpha35, alpha40, alpha45, alpha90
```

### 4.7 `colors.ts` — Split `VIZ_SURFACE` into two exports

Extract shadow strings into a sibling `VIZ_SHADOWS` export to keep concerns separated:

```ts
export const VIZ_SURFACE = {
  container: ..., border: ..., zebraStripe: ...,
  graphSource: ..., graphSettled: ..., graphActiveFill: ...,
  popupBg: ..., transparent: ..., defaultBorderFaint: ...,
} as const

export const VIZ_SHADOWS = {
  node:      '0 0 15px rgba(0, 0, 0, 0.5)',
  chat:      '0 0 1px hsl(...) ...',
  tooltip:   '0 0 8px hsl(...)',
  challenge: '0 2px 12px rgba(0, 0, 0, 0.15)',
  topicRow:  '0 0 10px rgba(0, 0, 0, 0.25)',
} as const
```

All current consumers of `VIZ_SURFACE.chatShadow` etc. are updated to `VIZ_SHADOWS.chat`.

---

## 5. Future Theme Extension Pattern

After this phase, adding a "Light" theme works as follows:

**`globals.css`** — one new class block overriding the reference palette:
```css
[data-theme="light"] {
  --ref-primary:     #6d4fc2;
  --ref-secondary:   #007a8c;
  --ref-background:  #ffffff;
  --ref-card:        #f4f4f8;
  --ref-on-surface:  #1a1a24;
  /* ...other --ref-* vars */
}
```

Every semantic token (`--color-primary`), alpha alias (`--color-primary-alpha-10`),
gradient, and utility class follows automatically because they all reference `var(--ref-*)`.

**`colors.ts`** — two constant changes:
```ts
const PRIMARY_RGB   = '109, 79, 194'   // light-theme primary
const SECONDARY_RGB = '0, 122, 140'    // light-theme secondary
```

All `PRIMARY.*` and `SECONDARY.*` alpha strings compose from these. `HIGHLIGHT_COLORS`
surface backgrounds (`#19191f`) would need a separate mechanism — those are referenced in
JS context and currently hardcoded. A future phase can introduce `SURFACE_TOKENS` to
address this.

---

## 6. File Change Summary

| File | Type of change |
|---|---|
| `apps/web/app/globals.css` | Add `--ref-*` palette layer; convert alpha aliases to `color-mix()`; delete `.dark` block; wire body/selection/scrollbar/utilities to CSS vars |
| `apps/web/src/engine/styles/colors.ts` | Add `PRIMARY_RGB`/`SECONDARY_RGB` constants; compose all alpha variants; add sync comments; split `VIZ_SURFACE` → `VIZ_SURFACE` + `VIZ_SHADOWS` |
| All consumers of `VIZ_SURFACE.*Shadow` | Update import to `VIZ_SHADOWS.*` |

**Consumer files to update for `VIZ_SHADOWS` rename:**

| File | Field(s) used |
|---|---|
| `components/chat/ChatCard.tsx` | `VIZ_SURFACE.chatShadow`, `VIZ_SURFACE.tooltipShadow` |
| `src/engine/primitives/LinkedListViz.tsx` | `VIZ_SURFACE.nodeShadow` |
| `src/engine/primitives/WeightedGraphViz.tsx` | `VIZ_SURFACE.nodeShadow` |
| `components/explore/TopicRow.tsx` | `VIZ_SURFACE.topicRowShadow` |
| `components/simulation/ChallengeCard.tsx` | `VIZ_SURFACE.challengeShadow` |

---

## 7. What Does NOT Change

- **No color values change.** Every hex/rgba value remains identical — only how they are
  defined and composed changes.
- **The two-file rule stays.** Phase 37's constraint is preserved and strengthened.
- **No light mode is added.** This phase only creates the architecture to support it.
- **No `HIGHLIGHT_COLORS` changes.** The semantic state system (active/insert/remove/etc.)
  is unchanged.
- **No new design tokens.** Only existing values get restructured.
- **Framer Motion / canvas constraints unchanged.** The TS-only alpha variants remain in
  `colors.ts` because CSS vars still cannot be used in `animate` targets or `ctx.fillStyle`.

---

## 8. Acceptance Criteria

- [ ] `globals.css` `:root` has a `--ref-*` block as the **only place** raw hex appears
- [ ] All `--color-primary-alpha-*` and `--color-secondary-alpha-*` aliases use `color-mix()`
- [ ] `.dark {}` block deleted
- [ ] `body`, `::selection`, scrollbar selectors use CSS vars — no raw hex
- [ ] `.gradient-text`, `.neon-gradient`, `.dot-grid` reference their existing CSS var counterparts
- [ ] `.bezier-active` and `.bezier-inactive` use semantic color vars
- [ ] `colors.ts` `PRIMARY` and `SECONDARY` compose all alpha strings from `PRIMARY_RGB`/`SECONDARY_RGB`
- [ ] `VIZ_SURFACE` contains only surface/bg colors; `VIZ_SHADOWS` holds shadow strings
- [ ] All consumer files updated from `VIZ_SURFACE.*Shadow` → `VIZ_SHADOWS.*`
- [ ] Alpha split documented in comments on both `PRIMARY` and `SECONDARY`
- [ ] `tsc --noEmit` passes with 0 errors
- [ ] Visual regression check: all simulation primitives, landing page, explore, chat card
      render identically to pre-phase screenshots
