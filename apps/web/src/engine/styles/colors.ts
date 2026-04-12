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
