/**
 * CanvasContext — Phase 18: Coordinate System Unification
 *
 * A single source-of-truth for the canvas container's pixel dimensions.
 * All primitives (GraphViz, TreeViz, etc.) that need to convert between
 * percentage-based scene positions and absolute pixel positions consume
 * this context instead of computing their own coordinate systems.
 *
 * Usage:
 *   const { width, height, toPx } = useCanvas()
 */

import React, { JSX, useCallback } from 'react'
import { useCanvasDimensions } from '../hooks/useCanvasDimensions';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CanvasContextValue {
  /** Measured width of the canvas container in px (via ResizeObserver) */
  width: number
  /** Measured height of the canvas container in px (via ResizeObserver) */
  height: number
  /**
   * Convert a percentage-based position to absolute pixels.
   * x: 0–100 (percent of container width)
   * y: 0–100 (percent of container height)
   */
  toPx: (pos: { x: number; y: number }) => { x: number; y: number }
}

// ─── Default / Fallback ────────────────────────────────────────────────────────

// Fallback used when no CanvasCard ancestor is present (e.g. Storybook, unit tests).
// These scale factors mirror the legacy SCALE_X / SCALE_Y approach so unhosted
// primitives still look reasonable without causing a divide-by-zero.
const DEFAULT_WIDTH = 800
const DEFAULT_HEIGHT = 600

const defaultToPx = (p: { x: number; y: number }) => ({
  x: (p.x / 100) * DEFAULT_WIDTH,
  y: (p.y / 100) * DEFAULT_HEIGHT,
})

// ─── Context ───────────────────────────────────────────────────────────────────

export const CanvasContext = React.createContext<CanvasContextValue>({
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  toPx: defaultToPx,
})

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useCanvas = () => React.useContext(CanvasContext)

// ─── Provider ────────────────────────────────────────────────────────────────

export const CanvasContextProvider = ({
  children, className, as: Component = 'div'
}: {
  children: React.ReactNode, className?: string, as?: React.ElementType
}): JSX.Element => {
  const { ref, width, height } = useCanvasDimensions();

  const toPx = useCallback(
    (pos: { x: number; y: number }) => ({
      x: (pos.x / 100) * (width || 800),
      y: (pos.y / 100) * (height || 600),
    }),
    [width, height],
  )

  return (
    <CanvasContext.Provider value={{ width, height, toPx }}>
      <Component className={className} ref={ref}>
        {children}
      </Component>
    </CanvasContext.Provider>
  )
}

// ─── viewBox helper ───────────────────────────────────────────────────────────

/**
 * Compute an SVG viewBox string that tightly fits a set of nodes.
 * Each node is represented by its center coordinates (cx, cy) and
 * its rendered dimensions (w, h). Falls back to a sensible default
 * when the node list is empty.
 *
 * @param nodes  Array of {x, y} centers in viewBox-coordinate space
 * @param nodeW  Node rendered width  (px, same unit as x/y)
 * @param nodeH  Node rendered height (px, same unit as x/y)
 * @param padding Extra padding around the bounding box (px)
 */
export function computeViewBox(
  nodes: { x: number; y: number }[],
  nodeW: number,
  nodeH: number,
  padding = 40,
): string {
  if (nodes.length === 0) return `0 0 400 300`

  const minX = Math.min(...nodes.map((n) => n.x - nodeW / 2)) - padding
  const minY = Math.min(...nodes.map((n) => n.y - nodeH / 2)) - padding
  const maxX = Math.max(...nodes.map((n) => n.x + nodeW / 2)) + padding
  const maxY = Math.max(...nodes.map((n) => n.y + nodeH / 2)) + padding

  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
}
