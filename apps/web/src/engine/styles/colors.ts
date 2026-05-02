/**
 * Phase 27 — Semantic color system for all visualization primitives.
 *
 * ALL primitives import `resolveHighlight` from here.
 * No more per-component color strings or inline hex values for highlight states.
 *
 * Rule: a user who learns that "active = purple glow" in ArrayViz knows the
 * same is true in TreeViz, GraphViz, DPTableViz, etc.
 */

// Three-color intuitive system — users learn once, applies everywhere:
//   CYAN  (#3adffa) = informational / currently active / being processed
//   GREEN (#22c55e) = success / found / inserted / complete
//   RED   (#ff6e84) = danger / error / miss / removed / deleted
//
// All backgrounds are 0.10 opacity rgba overlays (same subtle tint as the
// original design). Borders are full-opacity accent. Text is white (#e2e8f0)
// when the value itself is the focus; accent color when the state is the message.

// ── State palette — mirrors --ref-secondary, --ref-success, --ref-error, --ref-amber ──
// Framer Motion animate targets cannot resolve CSS vars at runtime, so these
// module-private constants are the JS source of truth for all viz state colors.
// Update these four to retheme every highlight and grid-cell state in one edit.
const STATE_ACTIVE  = { hex: '#3adffa', rgb: '58, 223, 250'  } as const
const STATE_SUCCESS = { hex: '#22c55e', rgb: '34, 197, 94'   } as const
const STATE_DANGER  = { hex: '#ff6e84', rgb: '255, 110, 132' } as const
const STATE_AMBER   = { hex: '#f59e0b', rgb: '245, 158, 11'  } as const

export const HIGHLIGHT_COLORS = {
  /** Resting state */
  default:    { bg: '#19191f',                              border: '#48474d',        text: '#f9f5fd' },

  // ── CYAN — informational / active ────────────────────────────────────────────
  /** Currently being examined / visited */
  active:     { bg: `rgba(${STATE_ACTIVE.rgb}, 0.10)`,     border: STATE_ACTIVE.hex,  text: '#e2e8f0' },
  /** Current DP cell being computed */
  current:    { bg: `rgba(${STATE_ACTIVE.rgb}, 0.10)`,     border: STATE_ACTIVE.hex,  text: STATE_ACTIVE.hex },
  /** Element being compared (e.g. pivot comparison) */
  compare:    { bg: `rgba(${STATE_ACTIVE.rgb}, 0.10)`,     border: STATE_ACTIVE.hex,  text: STATE_ACTIVE.hex },
  /** Element actively being compared — chart/sort variant of compare */
  comparing:  { bg: `rgba(${STATE_ACTIVE.rgb}, 0.10)`,     border: STATE_ACTIVE.hex,  text: STATE_ACTIVE.hex },
  /** Secondary / dependency reference */
  dependency: { bg: `rgba(${STATE_ACTIVE.rgb}, 0.10)`,     border: STATE_ACTIVE.hex,  text: STATE_ACTIVE.hex },
  /** Reference cell being read from (e.g. diagonal in DP, source node in graph) */
  source:     { bg: `rgba(${STATE_ACTIVE.rgb}, 0.10)`,     border: STATE_ACTIVE.hex,  text: STATE_ACTIVE.hex },
  /** Node visited during traversal (tree / graph) */
  visited:    { bg: `rgba(${STATE_ACTIVE.rgb}, 0.10)`,     border: STATE_ACTIVE.hex,  text: STATE_ACTIVE.hex },
  /** Graph edge being relaxed (shortest-path algorithms) */
  relaxed:    { bg: `rgba(${STATE_ACTIVE.rgb}, 0.10)`,     border: STATE_ACTIVE.hex,  text: STATE_ACTIVE.hex },
  /** Least recently used — next to be evicted (informational warning) */
  lru:        { bg: `rgba(${STATE_ACTIVE.rgb}, 0.10)`,     border: STATE_ACTIVE.hex,  text: STATE_ACTIVE.hex },

  // ── GREEN — success / found / inserted / complete ─────────────────────────────
  /** Being inserted / added to the structure */
  insert:     { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: '#e2e8f0' },
  /** Element pushed onto stack */
  push:       { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: '#e2e8f0' },
  /** Element enqueued */
  enqueue:    { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: '#e2e8f0' },
  /** Cache / lookup hit — element found */
  hit:        { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: STATE_SUCCESS.hex },
  /** Element found / search complete */
  found:      { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: STATE_SUCCESS.hex },
  /** Recursion call returning a value */
  returned:   { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: STATE_SUCCESS.hex },
  /** Memoized / cached result reused */
  memoized:   { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: STATE_SUCCESS.hex },
  /** Element included in spanning tree (graph) */
  'in-tree':  { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: STATE_SUCCESS.hex },
  /** Minimum-weight edge selected (graph) */
  'min-edge': { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: STATE_SUCCESS.hex },
  /** Element sorted / in final position */
  sorted:     { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: STATE_SUCCESS.hex },
  /** Most recently used — safe in cache */
  mru:        { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: STATE_SUCCESS.hex },
  /** Completed / filled DP cell */
  filled:     { bg: `rgba(${STATE_SUCCESS.rgb}, 0.10)`,    border: STATE_SUCCESS.hex, text: STATE_SUCCESS.hex },

  // ── RED — danger / error / miss / removed ─────────────────────────────────────
  /** Being deleted / removed from the structure */
  remove:     { bg: `rgba(${STATE_DANGER.rgb}, 0.10)`,     border: STATE_DANGER.hex,  text: '#e2e8f0' },
  /** Element popped from stack */
  pop:        { bg: `rgba(${STATE_DANGER.rgb}, 0.10)`,     border: STATE_DANGER.hex,  text: '#e2e8f0' },
  /** Element dequeued */
  dequeue:    { bg: `rgba(${STATE_DANGER.rgb}, 0.10)`,     border: STATE_DANGER.hex,  text: '#e2e8f0' },
  /** Cache / lookup miss — element not found */
  miss:       { bg: `rgba(${STATE_DANGER.rgb}, 0.10)`,     border: STATE_DANGER.hex,  text: STATE_DANGER.hex },
  /** Error / invalid state */
  error:      { bg: `rgba(${STATE_DANGER.rgb}, 0.10)`,     border: STATE_DANGER.hex,  text: STATE_DANGER.hex },
  /** Deleted element */
  delete:     { bg: `rgba(${STATE_DANGER.rgb}, 0.10)`,     border: STATE_DANGER.hex,  text: STATE_DANGER.hex },
  /** Graph edge rejected from spanning tree */
  rejected:   { bg: `rgba(${STATE_DANGER.rgb}, 0.10)`,     border: STATE_DANGER.hex,  text: STATE_DANGER.hex },
  /** Hash collision */
  collision:  { bg: `rgba(${STATE_DANGER.rgb}, 0.10)`,     border: STATE_DANGER.hex,  text: STATE_DANGER.hex },

  // ── AMBER — special / pivot (neutral marker, neither success nor failure) ─────
  /** Comparison pivot / special marker */
  pivot:      { bg: `rgba(${STATE_AMBER.rgb}, 0.10)`,      border: STATE_AMBER.hex,   text: STATE_AMBER.hex },
} as const

export type HighlightColor = keyof typeof HIGHLIGHT_COLORS

// Categorise every token into its semantic state group so resolveHighlight
// can build colors from live CSS vars rather than module-level constants.
const ACTIVE_HIGHLIGHTS  = new Set(['active', 'current', 'compare', 'comparing', 'dependency', 'source', 'visited', 'relaxed', 'lru'])
const SUCCESS_HIGHLIGHTS = new Set(['insert', 'push', 'enqueue', 'hit', 'found', 'returned', 'memoized', 'in-tree', 'min-edge', 'sorted', 'mru', 'filled'])
const DANGER_HIGHLIGHTS  = new Set(['remove', 'pop', 'dequeue', 'miss', 'error', 'delete', 'rejected', 'collision'])
const AMBER_HIGHLIGHTS   = new Set(['pivot'])
// Mutation operations keep white text; state-indicator operations use accent text.
const TEXT_WHITE_KEYS    = new Set(['active', 'insert', 'push', 'enqueue', 'remove', 'pop', 'dequeue'])

function stateColor(hex: string, rgb: string, key: string): { bg: string; border: string; text: string } {
  const onState = readCSSVar('--ref-on-state') || '#e2e8f0'
  return { bg: `rgba(${rgb}, 0.10)`, border: hex, text: TEXT_WHITE_KEYS.has(key) ? onState : hex }
}

/**
 * Resolve a highlight token to theme-aware CSS color strings.
 * Reads live CSS vars so all themes apply instantly — no re-import needed.
 * Components must call useThemeSync() to trigger a re-render on theme change.
 */
export function resolveHighlight(h: string | undefined): { bg: string; border: string; text: string } {
  const key = (h as HighlightColor) ?? 'default'
  if (key === 'default') {
    return {
      bg:     readCSSVar('--ref-card')        || HIGHLIGHT_COLORS.default.bg,
      border: readCSSVar('--ref-outline-dim') || HIGHLIGHT_COLORS.default.border,
      text:   readCSSVar('--ref-on-surface')  || HIGHLIGHT_COLORS.default.text,
    }
  }
  const { active, success, danger, amber } = getThemeStateColors()
  if (ACTIVE_HIGHLIGHTS.has(key))  return stateColor(active.hex,  active.rgb,  key)
  if (SUCCESS_HIGHLIGHTS.has(key)) return stateColor(success.hex, success.rgb, key)
  if (DANGER_HIGHLIGHTS.has(key))  return stateColor(danger.hex,  danger.rgb,  key)
  if (AMBER_HIGHLIGHTS.has(key))   return stateColor(amber.hex,   amber.rgb,   key)
  return HIGHLIGHT_COLORS[key as HighlightColor] ?? HIGHLIGHT_COLORS.default
}

// ── Primary palette constants — for JS contexts that cannot read CSS vars ────────
// Used by: CodePanel, ExplanationPanel, CanvasCard, ArrayViz
// Framer Motion animate targets and canvas fillStyle cannot resolve var(--...)
// at runtime, so these mirror --ref-primary-rgb (#b79fff) as JS-accessible constants.

// Mirrors --ref-primary-rgb and --ref-secondary-rgb in globals.css.
// Update these two lines to retheme all JS alpha constants in one edit.
const PRIMARY_RGB   = '183, 159, 255'
const SECONDARY_RGB = '58, 223, 250'

export const PRIMARY = {
  hex:        '#b79fff',
  alpha07:    `rgba(${PRIMARY_RGB}, 0.07)`,
  alpha08:    `rgba(${PRIMARY_RGB}, 0.08)`,
  alpha10:    `rgba(${PRIMARY_RGB}, 0.10)`,
  alpha12:    `rgba(${PRIMARY_RGB}, 0.12)`,
  alpha15:    `rgba(${PRIMARY_RGB}, 0.15)`,
  alpha16:    `rgba(${PRIMARY_RGB}, 0.16)`,
  alpha20:    `rgba(${PRIMARY_RGB}, 0.20)`,
  alpha25:    `rgba(${PRIMARY_RGB}, 0.25)`,
  alpha28:    `rgba(${PRIMARY_RGB}, 0.28)`,
  alpha30:    `rgba(${PRIMARY_RGB}, 0.30)`,
  alpha35:    `rgba(${PRIMARY_RGB}, 0.35)`,
  alpha40:    `rgba(${PRIMARY_RGB}, 0.40)`,
  alpha45:    `rgba(${PRIMARY_RGB}, 0.45)`,
  alpha60:    `rgba(${PRIMARY_RGB}, 0.60)`,
  alpha90:    `rgba(${PRIMARY_RGB}, 0.90)`,
  glow0:      `0 0 0px rgba(${PRIMARY_RGB}, 0)`,
  glowSubtle: `0 0 20px rgba(${PRIMARY_RGB}, 0.10)`,
  glowBright: `0 0 40px rgba(${PRIMARY_RGB}, 0.4), 0 0 80px rgba(${PRIMARY_RGB}, 0.15)`,
  glowCard:   `0 0 60px rgba(${PRIMARY_RGB}, 0.35)`,
} as const

// CSS counterparts (globals.css --color-primary-alpha-*):
//   08, 10, 12, 15, 16, 25, 28, 30, 60
// TS-only (Framer Motion animate targets / canvas ctx — cannot resolve CSS vars):
//   alpha07, alpha20, alpha35, alpha40, alpha45, alpha90


// ── Popup accent colors — for StepPopup badge borders/text ───────────────────────
// Used by: StepPopup.tsx
export const POPUP_ACCENT_COLORS = {
  neutral: 'rgba(140, 140, 160, 0.55)',
  cyan:    'rgba(58, 223, 250, 0.55)',
  red:     'rgba(255, 110, 132, 0.55)',
  purple:  'rgba(183, 159, 255, 0.55)',
} as const

export type PopupAccentColor = keyof typeof POPUP_ACCENT_COLORS


// ── Grid cell colors — for GridViz pathfinding variant ───────────────────────────
// Used by: GridViz.tsx
// Values go into Framer Motion animate targets — CSS vars cannot be used here.
// Higher opacity than HIGHLIGHT_COLORS because many cells are simultaneously
// visible and must remain distinguishable at a glance.
export const GRID_CELL_COLORS = {
  default: { bg: '#19191f',                              border: '#48474d',        text: '#6b7280',           shadow: 'none' },
  wall:    { bg: '#0c0c14',                              border: '#1c1c26',        text: '#2a2a38',           shadow: 'none' },
  start:   { bg: `rgba(${STATE_SUCCESS.rgb}, 0.40)`,    border: STATE_SUCCESS.hex, text: '#e2e8f0',           shadow: `0 0 10px rgba(${STATE_SUCCESS.rgb}, 0.30)` },
  visited: { bg: `rgba(${STATE_ACTIVE.rgb}, 0.22)`,     border: STATE_ACTIVE.hex,  text: STATE_ACTIVE.hex,    shadow: `0 0 8px rgba(${STATE_ACTIVE.rgb}, 0.20)` },
  active:  { bg: `rgba(${STATE_ACTIVE.rgb}, 0.40)`,     border: STATE_ACTIVE.hex,  text: '#e2e8f0',           shadow: `0 0 12px rgba(${STATE_ACTIVE.rgb}, 0.40)` },
  path:    { bg: `rgba(${STATE_SUCCESS.rgb}, 0.55)`,    border: STATE_SUCCESS.hex, text: '#e2e8f0',           shadow: `0 0 12px rgba(${STATE_SUCCESS.rgb}, 0.45)` },
  end:     { bg: `rgba(${STATE_AMBER.rgb}, 0.35)`,      border: STATE_AMBER.hex,   text: STATE_AMBER.hex,     shadow: `0 0 10px rgba(${STATE_AMBER.rgb}, 0.30)` },
  pivot:   { bg: `rgba(${STATE_AMBER.rgb}, 0.35)`,      border: STATE_AMBER.hex,   text: STATE_AMBER.hex,     shadow: 'none' },
} as const

export type GridCellState = keyof typeof GRID_CELL_COLORS


// ── Visualization surface colors — fallback values for unlit viz components ──────
// Used by: TextBadgeViz.tsx, MapViz.tsx, WeightedGraphViz.tsx
export const VIZ_SURFACE = {
  container:          'rgba(25, 25, 31, 0.6)',
  border:             'rgba(72, 71, 77, 0.8)',
  zebraStripe:        'rgba(255, 255, 255, 0.02)',
  graphSource:        'rgba(103, 80, 164, 0.18)',
  graphSettled:       'rgba(255, 255, 255, 0.05)',
  graphActiveFill:    'rgba(58, 223, 250, 0.15)',
  popupBg:            'rgba(10, 10, 16, 0.6)',
  transparent:        'rgba(0, 0, 0, 0)',
  defaultBorderFaint: 'rgba(72, 71, 77, 0.19)',
} as const

// ── Visualization shadow strings — separated from surface colors ──────────────────
// Used by: ChatCard.tsx, LinkedListViz.tsx
// Shadow strings are logically distinct from color values and live here to keep
// VIZ_SURFACE focused on bg/border colors.
export const VIZ_SHADOWS = {
  node:      '0 0 15px rgba(0, 0, 0, 0.5)',
  chat:      '0 0 1px hsl(240deg 20% 3% / 0.6), 0 0 4px hsl(240deg 20% 3% / 0.45), 0 0 10px hsl(240deg 20% 3% / 0.35), 0 0 20px hsl(240deg 20% 3% / 0.2)',
  tooltip:   '0 0 8px hsl(240deg 20% 3% / 0.5)',
  challenge: '0 2px 12px rgba(0, 0, 0, 0.15)',
  topicRow:  '0 0 10px rgba(0, 0, 0, 0.25)',
} as const


// ── Secondary palette constants — for JS contexts that cannot read CSS vars ─────
// Used by: HeroLoop, HowItWorks, UnifiedInput
export const SECONDARY = {
  hex:     '#3adffa',
  alpha10: `rgba(${SECONDARY_RGB}, 0.10)`,
  alpha11: `rgba(${SECONDARY_RGB}, 0.11)`,
  alpha12: `rgba(${SECONDARY_RGB}, 0.12)`,
  alpha15: `rgba(${SECONDARY_RGB}, 0.15)`,
  alpha18: `rgba(${SECONDARY_RGB}, 0.18)`,
  alpha24: `rgba(${SECONDARY_RGB}, 0.24)`,
  alpha55: `rgba(${SECONDARY_RGB}, 0.55)`,
} as const

// CSS counterparts (globals.css --color-secondary-alpha-*):
//   10, 11, 12, 15, 18, 24
// TS-only (Framer Motion animate targets / canvas ctx — cannot resolve CSS vars):
//   alpha55


// ── macOS-style window control colors ────────────────────────────────────────────
// Used by: ChatCard.tsx traffic-light buttons
export const MAC_CONTROLS = {
  close:    '#ff5f57',
  minimize: '#febc2e',
  maximize: '#28c840',
} as const


// ── Hero section illustration colors ─────────────────────────────────────────────
// Used by: HeroLoop.tsx — landing page only, these colors are illustration-specific
// and do not belong to the app's main semantic palette.
export const HERO_COLORS = {
  // CodeScene: active/dim array cell states (Framer Motion animate targets)
  codeActive:     { border: 'rgba(105, 172, 196, 0.42)', bg: 'rgba(255, 255, 255, 0.03)', text: 'rgba(248, 246, 250, 0.98)' },
  codeDim:        { border: 'rgba(87, 90, 98, 0.20)',    bg: 'rgba(32, 33, 39, 0.72)',     text: 'rgba(197, 195, 201, 0.82)' },
  // CodeScene: highlighted line row (Framer Motion animate targets)
  codeLineActive: { bg: 'rgba(163, 172, 188, 0.08)', border: 'rgba(156, 169, 187, 0.18)' },
  codeLineOff:    { bg: 'rgba(0, 0, 0, 0)',           border: 'rgba(0, 0, 0, 0)' },
  // NetworkScene: card border/bg states (Framer Motion animate targets)
  networkActive:  { border: 'rgba(105, 172, 196, 0.42)', bg: 'rgba(34, 38, 44, 0.92)' },
  networkDim:     { border: 'rgba(85, 88, 96, 0.22)',    bg: 'rgba(29, 31, 36, 0.88)' },
  // Stage tab pills (inline style)
  stageActive:    { border: 'rgba(58, 223, 250, 0.55)',  bg: 'rgba(58, 223, 250, 0.12)', text: '#f9f5fd' },
  stageDim:       { border: 'rgba(118, 116, 123, 0.28)', bg: 'rgba(25, 25, 31, 0.45)',   text: 'rgba(172, 170, 177, 0.88)' },
  // NetworkScene SVG connector paths
  connectorStrong: 'rgba(112, 130, 154, 0.42)',
  connectorFaint:  'rgba(112, 130, 154, 0.28)',
  packetDot:       'rgba(88, 196, 217, 0.90)',
  junctionDot:     'rgba(150, 163, 182, 0.55)',
  // SystemScene SVG gradient stop colors
  gradientMainA:   'rgba(92, 177, 199, 0.18)',
  gradientMainB:   'rgba(92, 177, 199, 0.80)',
  gradientMainC:   'rgba(128, 150, 192, 0.22)',
  gradientSideA:   'rgba(128, 150, 192, 0.36)',
  gradientSideB:   'rgba(128, 150, 192, 0.08)',
  // Outer card drop-shadow
  outerShadow:     '0 18px 36px rgba(0, 0, 0, 0.18)',
} as const


// ── Runtime theme color reader — for canvas / Framer components ──────────────
// Canvas 2D and Framer Motion animate targets cannot resolve CSS vars at runtime.
// Call getThemeStateColors() at draw/animate time to get live theme-aware colors.
// Canvas viz components that import HIGHLIGHT_COLORS or GRID_CELL_COLORS directly
// should migrate to call getThemeStateColors() on each render for full live theming.

function readCSSVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return ''
  return `${r}, ${g}, ${b}`
}

export function getThemeStateColors() {
  const aHex = readCSSVar('--ref-secondary') || STATE_ACTIVE.hex
  const sHex = readCSSVar('--ref-success')   || STATE_SUCCESS.hex
  const dHex = readCSSVar('--ref-error')     || STATE_DANGER.hex
  const mHex = readCSSVar('--ref-amber')     || STATE_AMBER.hex

  const active  = { hex: aHex, rgb: hexToRgb(aHex)  || STATE_ACTIVE.rgb  }
  const success = { hex: sHex, rgb: hexToRgb(sHex)  || STATE_SUCCESS.rgb }
  const danger  = { hex: dHex, rgb: hexToRgb(dHex)  || STATE_DANGER.rgb  }
  const amber   = { hex: mHex, rgb: hexToRgb(mHex)  || STATE_AMBER.rgb   }

  return { active, success, danger, amber }
}

export function getLivePrimary() {
  const hex = readCSSVar('--ref-primary')     || PRIMARY.hex
  const rgb = readCSSVar('--ref-primary-rgb') || PRIMARY_RGB
  return {
    hex,
    alpha07:    `rgba(${rgb}, 0.07)`,
    alpha08:    `rgba(${rgb}, 0.08)`,
    alpha10:    `rgba(${rgb}, 0.10)`,
    alpha12:    `rgba(${rgb}, 0.12)`,
    alpha15:    `rgba(${rgb}, 0.15)`,
    alpha16:    `rgba(${rgb}, 0.16)`,
    alpha20:    `rgba(${rgb}, 0.20)`,
    alpha25:    `rgba(${rgb}, 0.25)`,
    alpha28:    `rgba(${rgb}, 0.28)`,
    alpha30:    `rgba(${rgb}, 0.30)`,
    alpha35:    `rgba(${rgb}, 0.35)`,
    alpha40:    `rgba(${rgb}, 0.40)`,
    alpha45:    `rgba(${rgb}, 0.45)`,
    alpha60:    `rgba(${rgb}, 0.60)`,
    alpha90:    `rgba(${rgb}, 0.90)`,
    glow0:      `0 0 0px rgba(${rgb}, 0)`,
    glowSubtle: `0 0 20px rgba(${rgb}, 0.10)`,
    glowBright: `0 0 40px rgba(${rgb}, 0.4), 0 0 80px rgba(${rgb}, 0.15)`,
    glowCard:   `0 0 60px rgba(${rgb}, 0.35)`,
  }
}

export function getGridCellColors() {
  const { active, success, amber } = getThemeStateColors()
  const cardHex = readCSSVar('--ref-card')        || '#19191f'
  const odHex   = readCSSVar('--ref-outline-dim') || '#48474d'
  const bgHex   = readCSSVar('--ref-background')  || '#0e0e13'
  const cardRgb = hexToRgb(cardHex) || '25, 25, 31'
  return {
    default: { bg: cardHex,                                      border: odHex,        text: '#6b7280',           shadow: 'none' },
    wall:    { bg: bgHex,                                        border: cardHex,      text: `rgba(${cardRgb}, 0.8)`, shadow: 'none' },
    start:   { bg: `rgba(${success.rgb}, 0.40)`,                 border: success.hex,  text: '#e2e8f0',           shadow: `0 0 10px rgba(${success.rgb}, 0.30)` },
    visited: { bg: `rgba(${active.rgb},  0.22)`,                 border: active.hex,   text: active.hex,          shadow: `0 0 8px rgba(${active.rgb}, 0.20)` },
    active:  { bg: `rgba(${active.rgb},  0.40)`,                 border: active.hex,   text: '#e2e8f0',           shadow: `0 0 12px rgba(${active.rgb}, 0.40)` },
    path:    { bg: `rgba(${success.rgb}, 0.55)`,                 border: success.hex,  text: '#e2e8f0',           shadow: `0 0 12px rgba(${success.rgb}, 0.45)` },
    end:     { bg: `rgba(${amber.rgb},   0.35)`,                 border: amber.hex,    text: amber.hex,           shadow: `0 0 10px rgba(${amber.rgb}, 0.30)` },
    pivot:   { bg: `rgba(${amber.rgb},   0.35)`,                 border: amber.hex,    text: amber.hex,           shadow: 'none' },
  }
}

export function getLiveVizSurface() {
  const cardHex  = readCSSVar('--ref-card')        || '#19191f'
  const secHex   = readCSSVar('--ref-secondary')   || '#3adffa'
  const priHex   = readCSSVar('--ref-primary')     || '#b79fff'
  const bgHex    = readCSSVar('--ref-background')  || '#0e0e13'
  const outHex   = readCSSVar('--ref-outline')     || '#76747b'
  const odHex    = readCSSVar('--ref-outline-dim') || '#48474d'
  const onSurHex = readCSSVar('--ref-on-surface') || '#f9f5fd'
  const cardRgb  = hexToRgb(cardHex)   || '25, 25, 31'
  const secRgb   = hexToRgb(secHex)    || '58, 223, 250'
  const priRgb   = hexToRgb(priHex)    || '183, 159, 255'
  const bgRgb    = hexToRgb(bgHex)     || '14, 14, 19'
  const outRgb   = hexToRgb(outHex)    || '118, 116, 123'
  const odRgb    = hexToRgb(odHex)     || '72, 71, 77'
  const onSurRgb = hexToRgb(onSurHex)  || '249, 245, 253'
  return {
    container:          `rgba(${cardRgb}, 0.6)`,
    border:             `rgba(${outRgb}, 0.8)`,
    zebraStripe:        `rgba(${onSurRgb}, 0.02)`,
    graphSource:        `rgba(${priRgb}, 0.18)`,
    graphSettled:       `rgba(${onSurRgb}, 0.05)`,
    graphActiveFill:    `rgba(${secRgb}, 0.15)`,
    popupBg:            `rgba(${bgRgb}, 0.6)`,
    transparent:        'rgba(0, 0, 0, 0)',
    defaultBorderFaint: `rgba(${odRgb}, 0.19)`,
  }
}

export function getLivePopupAccentColors() {
  const secHex = readCSSVar('--ref-secondary') || '#3adffa'
  const errHex = readCSSVar('--ref-error')     || '#ff6e84'
  const priHex = readCSSVar('--ref-primary')   || '#b79fff'
  const secRgb = hexToRgb(secHex) || '58, 223, 250'
  const errRgb = hexToRgb(errHex) || '255, 110, 132'
  const priRgb = hexToRgb(priHex) || '183, 159, 255'
  return {
    neutral: 'rgba(140, 140, 160, 0.55)',
    cyan:    `rgba(${secRgb}, 0.55)`,
    red:     `rgba(${errRgb}, 0.55)`,
    purple:  `rgba(${priRgb}, 0.55)`,
  }
}

// ── Canvas panel colors — for CanvasRenderer stub (ctx.fillStyle / ctx.strokeStyle) ──
// Canvas 2D context cannot resolve CSS variables directly; call getLiveCanvasPanel()
// at draw time (inside useEffect) to get current theme values.
export function getLiveCanvasPanel() {
  const priRgb   = readCSSVar('--ref-primary-rgb') || PRIMARY_RGB
  const onSurHex = readCSSVar('--ref-on-surface')  || '#f9f5fd'
  const onSurRgb = hexToRgb(onSurHex)              || '249, 245, 253'
  return {
    bg:           `rgba(${onSurRgb}, 0.04)`,
    border:       `rgba(${priRgb}, 0.20)`,
    titleText:    `rgba(${priRgb}, 0.90)`,
    subtitleText: `rgba(${onSurRgb}, 0.35)`,
    divider:      `rgba(${onSurRgb}, 0.08)`,
    statLabel:    `rgba(${onSurRgb}, 0.55)`,
    statValue:    `rgba(${onSurRgb}, 0.30)`,
    footerText:   `rgba(${onSurRgb}, 0.20)`,
  }
}

// ── Hero illustration colors — for HeroLoop landing component ─────────────────
// Call getLiveHeroColors() inside a component that also calls useThemeSync(),
// so the component re-renders and reads fresh CSS vars on every theme change.
export function getLiveHeroColors() {
  const secHex   = readCSSVar('--ref-secondary')  || '#3adffa'
  const priHex   = readCSSVar('--ref-primary')    || '#b79fff'
  const onSurHex = readCSSVar('--ref-on-surface') || '#f9f5fd'
  const cardHex  = readCSSVar('--ref-card')       || '#17171f'
  const secRgb   = hexToRgb(secHex)   || '58, 223, 250'
  const priRgb   = hexToRgb(priHex)   || '183, 159, 255'
  const onSurRgb = hexToRgb(onSurHex) || '249, 245, 253'
  const cardRgb  = hexToRgb(cardHex)  || '23, 23, 31'
  return {
    codeActive:      { border: `rgba(${secRgb}, 0.40)`,   bg: `rgba(${secRgb}, 0.06)`,   text: onSurHex },
    codeDim:         { border: `rgba(${onSurRgb}, 0.14)`, bg: `rgba(${cardRgb}, 0.72)`,  text: `rgba(${onSurRgb}, 0.72)` },
    codeLineActive:  { bg: `rgba(${onSurRgb}, 0.06)`,     border: `rgba(${onSurRgb}, 0.14)` },
    codeLineOff:     { bg: 'rgba(0,0,0,0)',                border: 'rgba(0,0,0,0)' },
    networkActive:   { border: `rgba(${secRgb}, 0.42)`,   bg: `rgba(${cardRgb}, 0.92)` },
    networkDim:      { border: `rgba(${onSurRgb}, 0.16)`, bg: `rgba(${cardRgb}, 0.88)` },
    stageActive:     { border: `rgba(${secRgb}, 0.55)`,   bg: `rgba(${secRgb}, 0.12)`,   text: onSurHex },
    stageDim:        { border: `rgba(${onSurRgb}, 0.22)`, bg: `rgba(${cardRgb}, 0.45)`,  text: `rgba(${onSurRgb}, 0.78)` },
    connectorStrong: `rgba(${onSurRgb}, 0.28)`,
    connectorFaint:  `rgba(${onSurRgb}, 0.18)`,
    packetDot:       secHex,
    junctionDot:     `rgba(${onSurRgb}, 0.45)`,
    gradientMainA:   `rgba(${secRgb}, 0.18)`,
    gradientMainB:   `rgba(${secRgb}, 0.65)`,
    gradientMainC:   `rgba(${priRgb}, 0.22)`,
    gradientSideA:   `rgba(${priRgb}, 0.36)`,
    gradientSideB:   `rgba(${priRgb}, 0.08)`,
    outerShadow:     '0 18px 36px rgba(0, 0, 0, 0.15)',
  }
}

/** @deprecated Use getLiveCanvasPanel() for theme-aware colors */
export const CANVAS_PANEL = {
  bg:          'rgba(255, 255, 255, 0.04)',
  border:      PRIMARY.alpha20,
  titleText:   PRIMARY.alpha90,
  subtitleText:'rgba(255, 255, 255, 0.35)',
  divider:     'rgba(255, 255, 255, 0.08)',
  statLabel:   'rgba(255, 255, 255, 0.55)',
  statValue:   'rgba(255, 255, 255, 0.30)',
  footerText:  'rgba(255, 255, 255, 0.20)',
} as const
