# Design System Specification: The Synthetic Architect

## 1. Overview & Creative North Star

**Creative North Star: The Synthetic Architect**
This design system is a manifestation of "Architectural Luminescence." It moves beyond the standard "utility-first" developer tool aesthetic into a realm of high-end editorial precision. We are building a workspace for creators who treat code and logic as an art form.

To achieve this, we break the traditional "box-and-grid" template. The layout relies on **intentional asymmetry**—where heavy typographic headers are balanced by delicate, glowing accents—and **tonal depth** rather than structural lines. The interface should feel like a physical console of light floating in a deep-space void, utilizing overlapping layers and bezier-curve flow indicators to create a sense of infinite, connected space.

---

## 2. Colors

The palette is anchored in deep, obsidian depths with high-chroma "neon" accents that serve as functional beacons within the dark environment.

### Core Luminescence
- **Background (#0e0e13):** The foundation. An almost-black ink that provides the canvas for light.
- **Primary (#b79fff):** A glowing purple used for primary actions and "architectural" highlights.
- **Secondary (#3adffa):** A high-energy cyan reserved for status, active states, and data visualization.
- **Tertiary (#919bff):** A softer violet used for supportive elements and secondary emphasis.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. Structural definition must be achieved through:
1.  **Background Shifts:** Use `surface-container-low` against `surface` to define a sidebar.
2.  **Tonal Transitions:** Define card boundaries through the shift from `surface-container` to `surface-container-highest`.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested physical layers. 
- Use `surface-container-lowest` for recessed areas (like code editors or terminal wells).
- Use `surface-container-high` or `highest` for foreground elements that require the user’s immediate focus.

### Signature Textures: The Neon Gradient
For main CTAs and hero elements, do not use flat color. Use a linear gradient:
- **Primary Glow:** `primary` (#b79fff) to `primary-container` (#ab8ffe) at a 135-degree angle. This provides "visual soul" and a sense of internal light.

---

## 3. Typography

The typography strategy employs a "Manrope/Inter Dialectic"—using the architectural geometry of Manrope for brand-heavy headlines and the clinical precision of Inter for data-heavy body text.

- **Display & Headlines (Manrope):** These should be treated as graphic elements. Use `display-lg` (3.5rem) with tight letter-spacing for hero sections. The goal is an "Editorial Tech" look—bold, authoritative, and spacious.
- **Body & Labels (Inter):** For the "workhorse" text. Use `body-md` (0.875rem) for general content. The neutral, sans-serif nature of Inter ensures that complex developer data remains legible even against glowing backgrounds.
- **Visual Scale:** Maintain high contrast between levels. A `display-sm` headline next to a `body-sm` label creates the "pro-tool" density expected by power users.

---

## 4. Elevation & Depth

In this system, depth is a functional tool, not a decoration.

### The Layering Principle
Achieve lift by stacking surface tokens. A `surface-container-low` card sitting on a `surface` background creates a soft, natural elevation. 

### Ambient Shadows
Shadows are rarely used, but when floating elements (like Modals or Tooltips) require them:
- **Shadow Spec:** Blur: 40px–60px | Opacity: 4%–8% | Color: `surface-tint`.
- This mimics natural light dispersion rather than a dated, muddy drop-shadow.

### The "Ghost Border" Fallback
If a visual boundary is required for accessibility, use a **Ghost Border**:
- **Token:** `outline-variant` at **20% opacity**. 
- It must feel like a "whisper" of a line, barely visible, existing only to guide the eye.

### Glassmorphism (The Dark Glass Effect)
Floating panels must use the Glassmorphism rule:
- **Background:** `surface` at 60% opacity.
- **Effect:** `backdrop-filter: blur(20px)`.
- This allows the "ambient gradients" of the background to bleed through, integrating the UI into a single, cohesive environment.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), `ROUND_FOUR` (1rem) corners. No border. Text: `on-primary`.
- **Secondary:** Transparent fill with a "Ghost Border" (20% `outline`). On hover, increase border opacity to 100%.
- **Tertiary:** Text-only using `primary` color. Used for low-priority actions in dense layouts.

### Inputs & Text Areas
- **State:** Deep recessed look using `surface-container-lowest`. 
- **Active State:** A 1px "Neon Glow" on the bottom edge only, using the `secondary` (cyan) token.

### Cards & Lists
- **Rule:** Absolute prohibition of divider lines. 
- **Separation:** Use vertical white space (32px or 48px) or subtle background shifts between `surface-container` tiers. 
- **Interactive Cards:** On hover, transition the background from `surface-container-low` to `surface-container-high`.

### Decorative Bezier Connectors
In data-heavy views or node-based editors, use 1.5px bezier curves in `outline-variant`. These are not just decorative; they represent logic flow. They should be "dimmed" by default and "ignite" (turn to `secondary` cyan) when the connected nodes are active.

---

## 6. Do’s and Don’ts

### Do
- **Do** embrace negative space. High-end tools feel premium because they aren't crowded.
- **Do** use `primary-fixed-dim` for text that needs to feel "active" but not "loud."
- **Do** ensure all Glassmorphic elements have sufficient backdrop-blur to maintain text legibility.

### Don’t
- **Don't** use pure white (#ffffff). Use `on-surface` (#f9f5fd) to prevent eye strain in dark mode.
- **Don't** use standard "Material" shadows. If it looks like a standard web app, it has failed the "Architectural" test.
- **Don't** use sharp 0px corners. Every element must adhere to the `ROUND_FOUR` (1rem) corner radius to soften the technical edge.