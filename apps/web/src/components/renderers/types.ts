import type { SceneGraph } from '@insyte/scene-engine'

/**
 * SceneRenderer interface contract
 *
 * The SceneGraph is the boundary. Everything above it (ISCL, layout engine,
 * step engine, Zustand stores, playback controls, explanation panel) is
 * renderer-agnostic. Everything below is owned by the renderer implementation.
 *
 * To add a new renderer:
 *   1. Create a component that accepts SceneRendererProps
 *   2. Set NEXT_PUBLIC_RENDERER=<key> in .env.local
 *   3. Add the key → component mapping in CanvasCard.tsx
 *
 * The renderer team only needs:
 *   - SceneGraph types (this file + @insyte/scene-engine)
 *   - A dev environment that produces a SceneGraph
 *   - No knowledge of AI, ISCL, layout algorithms, or Zustand
 */

// ─── ResolvedPopup ────────────────────────────────────────────────────────────

/**
 * A popup that has already been filtered for visibility (step range + control-toggle).
 * Renderers receive only the popups that are active at the current step.
 */
export interface ResolvedPopup {
  id: string
  text: string
  style?: 'info' | 'success' | 'warning' | 'insight'
  /** Anchor in 0–100 % canvas-space. Renderer converts to px via containerWidth/Height. */
  anchor?: { x: number; y: number }
}

// ─── SceneRendererProps ───────────────────────────────────────────────────────

export interface SceneRendererProps {
  /**
   * Fully computed, visibility-filtered scene graph for the current step.
   * SceneGroup carries label, isHud, visualType — no raw Scene object needed.
   */
  sceneGraph: SceneGraph
  /** Popups active at the current step (pre-filtered). */
  resolvedPopups: ResolvedPopup[]
  /** Current step index */
  step: number
  /** Playback speed multiplier (1 = normal, 2 = 2×, 0.5 = half). Scales animation durations. */
  speed: number
  /** Optional interaction callbacks — renderers that support click events emit these. */
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
}
