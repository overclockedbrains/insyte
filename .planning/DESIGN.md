# insyte — Design System Reference

> This is the canonical design system for insyte. Do NOT reference or follow the Stitch HTML prototypes in `.planning/project_insyte_idea/designs/`. Those were directional mood boards only. This document is the single source of truth for visual decisions.

---

## Identity

- **Product name:** insyte
- **Tagline:** "See how it works."
- **Visual mood:** Premium dark-mode tool. Linear/Vercel-level polish. Feels like a high-end dev tool, not an educational toy.
- **Theme:** Dark-only. No light mode. Dark is the brand identity.

---

## Color Tokens

These are the exact token values extracted and finalized. Use these as CSS variables / Tailwind config extensions.

```
Background & Surfaces
─────────────────────────────────────────────
background              #0e0e13   (page background — near-black navy)
surface                 #0e0e13
surface-dim             #0e0e13
surface-container-lowest #000000
surface-container-low   #131319
surface-container        #19191f
surface-container-high   #1f1f26
surface-container-highest #25252d
surface-bright           #2c2b33
surface-variant          #25252d

Text
─────────────────────────────────────────────
on-surface              #f9f5fd   (primary text — off-white)
on-surface-variant      #acaab1   (secondary text — muted grey)
on-background           #f9f5fd
inverse-surface         #fcf8ff
inverse-on-surface      #55545b

Primary (Lavender Purple)
─────────────────────────────────────────────
primary                 #b79fff
primary-dim             #a88cfb
primary-fixed           #ab8ffe
primary-fixed-dim       #9d81f0
primary-container       #ab8ffe
on-primary              #361083
on-primary-container    #290070
on-primary-fixed        #000000
on-primary-fixed-variant #330b80
inverse-primary         #684cb6
surface-tint            #b79fff

Secondary (Bright Cyan)
─────────────────────────────────────────────
secondary               #3adffa
secondary-dim           #1ad0eb
secondary-fixed         #48e4ff
secondary-fixed-dim     #29d6f1
secondary-container     #006877
on-secondary            #004b56
on-secondary-container  #eafbff
on-secondary-fixed      #003a43
on-secondary-fixed-variant #005966

Tertiary (Periwinkle Blue)
─────────────────────────────────────────────
tertiary                #919bff
tertiary-dim            #8a95ff
tertiary-fixed          #a2aaff
tertiary-fixed-dim      #919bff
tertiary-container      #818cf8
on-tertiary             #000b83
on-tertiary-container   #00055a
on-tertiary-fixed       #00055d
on-tertiary-fixed-variant #1f2a95

Outline
─────────────────────────────────────────────
outline                 #76747b
outline-variant         #48474d

Error
─────────────────────────────────────────────
error                   #ff6e84
error-dim               #d73357
error-container         #a70138
on-error                #490013
on-error-container      #ffb2b9
```

---

## Typography

```
Headline font:  Manrope       (weights: 700, 800)    — for h1, h2, h3, logo
Body font:      Inter         (weights: 400, 500, 600) — for all prose, UI text
Code font:      JetBrains Mono (weights: 400, 500)   — for all code views
```

**Google Fonts import:**
```
Manrope:wght@700;800
Inter:wght@400;500;600
JetBrains Mono:wght@400;500
```

**Type scale (Tailwind):**
- Display: `text-7xl font-extrabold font-headline` (landing hero)
- H1: `text-5xl font-extrabold font-headline`
- H2: `text-4xl font-bold font-headline`
- H3: `text-2xl font-bold font-headline`
- Body: `text-base font-body leading-relaxed`
- Label: `text-sm font-medium font-label`
- Caption: `text-xs font-body`
- Code: `font-mono text-sm`

---

## Border Radius

```
DEFAULT  1rem    (16px)  — most cards, inputs, buttons
lg       2rem    (32px)  — large panels, hero elements
xl       3rem    (48px)  — very large cards
full     9999px          — pills, badges, circular buttons
```

---

## Reusable Component Styles

### Glass Panel
```css
background: rgba(25, 25, 31, 0.6);   /* or rgba(31, 31, 38, 0.6) for slightly lighter */
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
```
Tailwind utility: `.glass-panel`

### Glow Border (Primary)
```css
box-shadow: 0 0 20px rgba(183, 159, 255, 0.15);
border: 1px solid rgba(183, 159, 255, 0.1);
```
Tailwind utility: `.glow-border`

### Primary Bottom Glow (navbar)
```css
box-shadow: 0 10px 30px -15px rgba(183, 159, 255, 0.3);
```

### Hero Gradient Text
```css
background: linear-gradient(135deg, #b79fff 0%, #3adffa 100%);
-webkit-background-clip: text;
background-clip: text;
-webkit-text-fill-color: transparent;
```
Use for accent words in headlines.

### Neon Gradient (button fill)
```css
background: linear-gradient(135deg, #b79fff 0%, #ab8ffe 100%);
```

### Bezier Connector (inactive)
```css
stroke: #48474d;
stroke-width: 2;
fill: none;
```

### Bezier Connector (active / data flowing)
```css
stroke: #3adffa;
stroke-width: 2;
fill: none;
filter: drop-shadow(0 0 8px #3adffa);
```

### Ambient Background Glow Blobs
```html
<!-- Purple blob (top-left) -->
<div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
<!-- Cyan blob (bottom-right) -->
<div class="absolute bottom-[20%] right-[-5%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />
```

### Dot Grid Background
Subtle dot grid on dark canvas areas:
```css
background-image: radial-gradient(circle, rgba(183,159,255,0.15) 1px, transparent 1px);
background-size: 24px 24px;
```

---

## Interaction Patterns

- **Hover on cards:** Subtle scale up (`hover:scale-[1.02]`) + glow border intensifies
- **Active/pressed:** `active:scale-95`
- **Focus rings:** `focus:ring-1 focus:ring-secondary/50`
- **Transitions:** `transition-all duration-200` (standard), `transition-transform duration-500` (card hover images)
- **Animated pulse:** `animate-pulse` for live indicators, loading states
- **Selection color:** `selection:bg-primary selection:text-on-primary`

---

## Key UI Component Patterns

### Pill / Badge
```html
<span class="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-primary/10 text-primary">
  Computer Science
</span>
```

### Status Indicator (live)
```html
<span class="flex h-2 w-2 rounded-full bg-secondary animate-pulse" />
```

### Icon Style (Material Symbols)
```css
font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
```

### Stat Card (inside simulation canvas)
```
bg-surface-container-lowest
p-4 rounded-2xl
border border-outline-variant/10
Label: text-[10px] text-on-surface-variant uppercase font-bold
Value: text-xl font-headline font-bold text-on-surface (or primary/secondary for emphasis)
```

### Toggle Button Group (e.g. Chaining vs Addressing)
- Active: `bg-secondary text-on-secondary`
- Inactive: `bg-surface-container-lowest text-on-surface-variant border border-outline-variant/20`

---

## Animation Principles

- Use **Framer Motion** for all component animations (not CSS keyframes for interactive elements)
- Spring physics for node appearances: `spring({ stiffness: 300, damping: 30 })`
- Layout animations: use Framer Motion `layout` prop for list reordering
- Entry animations: `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}`
- Stagger children: `staggerChildren: 0.05` for grids
- Data flow particles: animated SVG `stroke-dashoffset` or Framer Motion path animation
- Canvas node entry: fade in at final position (`opacity: 0 → 1`), no sliding

---

## Responsive Breakpoints

- Mobile: `< 768px` (md)
- Tablet: `768px – 1024px` (lg)
- Desktop: `> 1024px`

Mobile-first with Tailwind responsive prefixes. The product is web-first but must work well on all resolutions.

---

## Design Principles

1. **Canvas is king.** The simulation canvas is always the visual hero. Everything else (explanation, controls) supports it.
2. **Premium, not playful.** This is a tool for developers, not a game. Clean, professional, dark, precise.
3. **Glow with purpose.** Glowing effects highlight *active* or *important* elements. Don't glow everything.
4. **Motion has meaning.** Every animation communicates state change, not decoration.
5. **Glass morphism sparingly.** Use for floating panels, modals, the AI chat overlay. Not for everything.
6. **Information density is fine.** Developers can handle dense UIs. Don't over-simplify.

---

*Created: April 4, 2026 — This is the canonical design system. Stitch HTML prototypes in designs/ are mood boards only.*
