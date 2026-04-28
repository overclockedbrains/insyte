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

export const HIGHLIGHT_COLORS = {
  /** Resting state */
  default:    { bg: '#19191f',                   border: '#48474d', text: '#e2e8f0' },

  // ── CYAN — informational / active ────────────────────────────────────────────
  /** Currently being examined / visited */
  active:     { bg: 'rgba(58, 223, 250, 0.10)',  border: '#3adffa', text: '#e2e8f0' },
  /** Current DP cell being computed */
  current:    { bg: 'rgba(58, 223, 250, 0.10)',  border: '#3adffa', text: '#3adffa' },
  /** Element being compared (e.g. pivot comparison) */
  compare:    { bg: 'rgba(58, 223, 250, 0.10)',  border: '#3adffa', text: '#3adffa' },
  /** Secondary / dependency reference */
  dependency: { bg: 'rgba(58, 223, 250, 0.10)',  border: '#3adffa', text: '#3adffa' },
  /** Least recently used — next to be evicted (informational warning) */
  lru:        { bg: 'rgba(58, 223, 250, 0.10)',  border: '#3adffa', text: '#3adffa' },

  // ── GREEN — success / found / inserted / complete ─────────────────────────────
  /** Being inserted / added to the structure */
  insert:     { bg: 'rgba(34, 197, 94, 0.10)',   border: '#22c55e', text: '#e2e8f0' },
  /** Cache / lookup hit — element found */
  hit:        { bg: 'rgba(34, 197, 94, 0.10)',   border: '#22c55e', text: '#22c55e' },
  /** Element found / search complete */
  found:      { bg: 'rgba(34, 197, 94, 0.10)',   border: '#22c55e', text: '#22c55e' },
  /** Most recently used — safe in cache */
  mru:        { bg: 'rgba(34, 197, 94, 0.10)',   border: '#22c55e', text: '#22c55e' },
  /** Completed / filled DP cell */
  filled:     { bg: 'rgba(34, 197, 94, 0.10)',   border: '#22c55e', text: '#22c55e' },

  // ── RED — danger / error / miss / removed ─────────────────────────────────────
  /** Being deleted / removed from the structure */
  remove:     { bg: 'rgba(255, 110, 132, 0.10)', border: '#ff6e84', text: '#e2e8f0' },
  /** Cache / lookup miss — element not found */
  miss:       { bg: 'rgba(255, 110, 132, 0.10)', border: '#ff6e84', text: '#ff6e84' },
  /** Error / invalid state */
  error:      { bg: 'rgba(255, 110, 132, 0.10)', border: '#ff6e84', text: '#ff6e84' },
  /** Deleted element */
  delete:     { bg: 'rgba(255, 110, 132, 0.10)', border: '#ff6e84', text: '#ff6e84' },
  /** Hash collision */
  collision:  { bg: 'rgba(255, 110, 132, 0.10)', border: '#ff6e84', text: '#ff6e84' },

  // ── AMBER — special / pivot (neutral marker, neither success nor failure) ─────
  /** Comparison pivot / special marker */
  pivot:      { bg: 'rgba(245, 158, 11, 0.10)',  border: '#f59e0b', text: '#f59e0b' },
} as const

export type HighlightColor = keyof typeof HIGHLIGHT_COLORS

/**
 * Resolve a highlight token string from step state to color tokens.
 * Unknown tokens fall back to 'default' silently.
 */
export function resolveHighlight(h: string | undefined): (typeof HIGHLIGHT_COLORS)[HighlightColor] {
  return HIGHLIGHT_COLORS[(h as HighlightColor) ?? 'default'] ?? HIGHLIGHT_COLORS.default
}

// ── Primary palette constants — for JS contexts that cannot read CSS vars ────────
// Used by: CodePanel, ExplanationPanel, CanvasCard, ArrayViz
// Framer Motion animate targets and canvas fillStyle cannot resolve var(--...)
// at runtime, so these mirror --primary (#b79fff) as JS-accessible constants.
export const PRIMARY = {
  hex:        '#b79fff',
  alpha07:    'rgba(183, 159, 255, 0.07)',
  alpha08:    'rgba(183, 159, 255, 0.08)',
  alpha10:    'rgba(183, 159, 255, 0.10)',
  alpha12:    'rgba(183, 159, 255, 0.12)',
  alpha15:    'rgba(183, 159, 255, 0.15)',
  alpha16:    'rgba(183, 159, 255, 0.16)',
  alpha20:    'rgba(183, 159, 255, 0.20)',
  alpha25:    'rgba(183, 159, 255, 0.25)',
  alpha28:    'rgba(183, 159, 255, 0.28)',
  alpha30:    'rgba(183, 159, 255, 0.30)',
  alpha35:    'rgba(183, 159, 255, 0.35)',
  alpha40:    'rgba(183, 159, 255, 0.40)',
  alpha45:    'rgba(183, 159, 255, 0.45)',
  alpha60:    'rgba(183, 159, 255, 0.60)',
  alpha90:    'rgba(183, 159, 255, 0.90)',
  glow0:      '0 0 0px rgba(183, 159, 255, 0)',
  glowSubtle: '0 0 20px rgba(183, 159, 255, 0.10)',
  glowBright: '0 0 40px rgba(183, 159, 255, 0.4), 0 0 80px rgba(183, 159, 255, 0.15)',
  glowCard:   '0 0 60px rgba(183, 159, 255, 0.35)',
} as const


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
// Higher opacity than generic highlight overlays because multiple cells are visible
// simultaneously and must remain distinguishable.
export const GRID_CELL_COLORS = {
  default: { bg: '#19191f',                    border: '#48474d',  text: '#6b7280', shadow: 'none' },
  wall:    { bg: '#0c0c14',                    border: '#1c1c26',  text: '#2a2a38', shadow: 'none' },
  start:   { bg: 'rgba(34, 197, 94, 0.40)',    border: '#22c55e',  text: '#e2e8f0', shadow: '0 0 10px rgba(34,197,94,0.30)' },
  visited: { bg: 'rgba(58, 223, 250, 0.22)',   border: '#3adffa',  text: '#3adffa', shadow: '0 0 8px rgba(58,223,250,0.20)' },
  active:  { bg: 'rgba(58, 223, 250, 0.40)',   border: '#3adffa',  text: '#e2e8f0', shadow: '0 0 12px rgba(58,223,250,0.40)' },
  path:    { bg: 'rgba(34, 197, 94, 0.55)',    border: '#22c55e',  text: '#e2e8f0', shadow: '0 0 12px rgba(34,197,94,0.45)' },
  end:     { bg: 'rgba(245, 158, 11, 0.35)',   border: '#f59e0b',  text: '#f59e0b', shadow: '0 0 10px rgba(245,158,11,0.30)' },
  pivot:   { bg: 'rgba(245, 158, 11, 0.35)',   border: '#f59e0b',  text: '#f59e0b', shadow: 'none' },
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
  nodeShadow:         '0 0 15px rgba(0, 0, 0, 0.5)',
  chatShadow:         '0 0 1px hsl(240deg 20% 3% / 0.6), 0 0 4px hsl(240deg 20% 3% / 0.45), 0 0 10px hsl(240deg 20% 3% / 0.35), 0 0 20px hsl(240deg 20% 3% / 0.2)',
  tooltipShadow:      '0 0 8px hsl(240deg 20% 3% / 0.5)',
  challengeShadow:    '0 2px 12px rgba(0, 0, 0, 0.15)',
  topicRowShadow:     '0 0 10px rgba(0, 0, 0, 0.25)',
} as const


// ── Secondary palette constants — for JS contexts that cannot read CSS vars ─────
// Used by: HeroLoop, HowItWorks, UnifiedInput
export const SECONDARY = {
  hex:     '#3adffa',
  alpha10: 'rgba(58, 223, 250, 0.10)',
  alpha11: 'rgba(58, 223, 250, 0.11)',
  alpha12: 'rgba(58, 223, 250, 0.12)',
  alpha15: 'rgba(58, 223, 250, 0.15)',
  alpha18: 'rgba(58, 223, 250, 0.18)',
  alpha24: 'rgba(58, 223, 250, 0.24)',
  alpha55: 'rgba(58, 223, 250, 0.55)',
} as const


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


// ── Canvas panel colors — for CanvasRenderer stub (ctx.fillStyle / ctx.strokeStyle) ──
// Used by: CanvasRenderer/index.tsx
// Canvas 2D context cannot read CSS variables, so these must be JS constants.
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
