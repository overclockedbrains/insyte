/**
 * TreeViz — Phase 18: Coordinate System Unification
 *
 * Uses a single SVG viewBox + <foreignObject> — edges and node bodies share
 * the same coordinate space so alignment is perfect at any container size.
 *
 * Sizing: SVG uses width:100% + height:auto (respects viewBox aspect ratio).
 * The outer div carries min-h so the element never collapses to nothing.
 *
 * Edges: the old straight-line look is preserved (matches the original design
 * screenshot). Straight lines look cleaner than beziers for binary trees.
 */

'use client'

import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { computeViewBox } from '../CanvasContext'

// ─── Constants ─────────────────────────────────────────────────────────────────
// NODE_UNIT: px per scene-coordinate unit in SVG space.
// Scene JSON uses grid coords (e.g. x: -3…2, y: 0…2).
// Larger unit → bigger tree; 90 gives roughly the same visual size
// as the old SCALE_X=60/SCALE_Y=80 pair (which were different, causing stretch).
const NODE_UNIT_X = 88   // slightly wider spread than vertical
const NODE_UNIT_Y = 90   // vertical spacing
const NODE_W      = 48   // node circle diameter (matches old w-12 h-12)
const NODE_H      = 48
const HALF_W      = NODE_W / 2
const HALF_H      = NODE_H / 2

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TreeNode {
  id: string
  value: string
  children: string[]
  highlight?: string
  x: number
  y: number
}

interface TreeState {
  nodes: TreeNode[]
  rootId: string
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function TreeViz({ state }: PrimitiveProps) {
  const { nodes = [], rootId } = state as TreeState

  const getNode = (id: string) => nodes.find((n) => n.id === id)

  // Scale scene grid coords → SVG pixel coords.
  const scaledNodes = nodes.map((n) => ({
    ...n,
    svgX: n.x * NODE_UNIT_X,
    svgY: n.y * NODE_UNIT_Y,
  }))

  const getScaled = (id: string) => scaledNodes.find((n) => n.id === id)

  // Build straight-line connections (center → center matches the original look)
  const connections: {
    x1: number; y1: number
    x2: number; y2: number
    id: string
  }[] = []

  scaledNodes.forEach((node) => {
    const rawNode = getNode(node.id)!
    rawNode.children.forEach((childId) => {
      const child = getScaled(childId)
      if (child) {
        connections.push({
          x1: node.svgX,
          y1: node.svgY + HALF_H,   // bottom-center of parent
          x2: child.svgX,
          y2: child.svgY - HALF_H,  // top-center  of child
          id: `${node.id}-${childId}`,
        })
      }
    })
  })

  const vbNodes = scaledNodes.map((n) => ({ x: n.svgX, y: n.svgY }))
  const viewBox = computeViewBox(vbNodes, NODE_W, NODE_H, 32)
  const [, , vw] = viewBox.split(' ').map(Number)

  return (
    /*
     * Outer div: min-h ensures layout has room even before SVG paints.
     * SVG uses width:100% + height:auto → grows to fill the container width
     * and scales height proportionally from the viewBox aspect ratio.
     * maxWidth prevents small trees from stretching huge on wide screens.
     */
    <div className="flex items-center justify-center w-full min-h-[280px] overflow-visible">
      <svg
        viewBox={viewBox}
        width="100%"
        height="auto"
        style={{ overflow: 'visible', display: 'block', maxWidth: vw }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Tree visualization"
      >
        {/* ── Edges (straight lines, matching original visual style) ── */}
        {connections.map((conn) => (
          <line
            key={conn.id}
            x1={conn.x1}
            y1={conn.y1}
            x2={conn.x2}
            y2={conn.y2}
            stroke="var(--color-outline-variant)"
            strokeWidth={2}
          />
        ))}

        {/* ── Nodes via foreignObject ── */}
        {scaledNodes.map((node) => {
          const rawNode = getNode(node.id)!
          const isRoot = node.id === rootId

          return (
            <foreignObject
              key={node.id}
              x={node.svgX - HALF_W}
              y={node.svgY - HALF_H}
              width={NODE_W}
              height={NODE_H}
              style={{ overflow: 'visible' }}
            >
              <div style={{ width: '100%', height: '100%', display: 'flex' }}>
                <motion.div
                  className="w-full h-full flex items-center justify-center rounded-full border-2 text-sm font-bold font-mono"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    backgroundColor: rawNode.highlight
                      ? rawNode.highlight
                      : 'var(--color-surface-container)',
                    borderColor: isRoot && !rawNode.highlight
                      ? 'var(--color-primary)'
                      : rawNode.highlight
                        ? rawNode.highlight
                        : 'var(--color-outline-variant)',
                    color: rawNode.highlight
                      ? 'var(--color-on-primary-fixed)'
                      : 'var(--color-on-surface)',
                    boxShadow: rawNode.highlight
                      ? rawNode.highlight.startsWith('var')
                        ? `0 0 16px color-mix(in srgb, ${rawNode.highlight} 38%, transparent)`
                        : `0 0 16px ${rawNode.highlight}60`
                      : isRoot
                        ? '0 0 10px color-mix(in srgb, var(--color-primary) 30%, transparent)'
                        : 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {rawNode.value}
                </motion.div>
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
