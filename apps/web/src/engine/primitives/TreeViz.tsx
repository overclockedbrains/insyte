/**
 * TreeViz — Phase 19: Automatic layout
 *
 * x/y are no longer in scene JSON (removed in Phase 19).
 * Positions are now computed here from the tree structure using a simple
 * recursive algorithm: subtree-width centering (core of Reingold-Tilford).
 *
 * Uses a single SVG viewBox + <foreignObject> — edges and node bodies share
 * the same coordinate space so alignment is perfect at any container size.
 */

'use client'

import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { computeViewBox } from '../CanvasContext'

// ─── Constants ─────────────────────────────────────────────────────────────────
const NODE_UNIT_X = 88   // horizontal spread per tree unit
const NODE_UNIT_Y = 90   // vertical spacing per level
const NODE_W      = 48   // node circle diameter
const NODE_H      = 48
const HALF_W      = NODE_W / 2
const HALF_H      = NODE_H / 2

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TreeNode {
  id: string
  value: string
  children?: string[]
  highlight?: string
  // x/y are legacy — no longer read from JSON, computed below
  x?: number
  y?: number
}

interface TreeState {
  nodes: TreeNode[]
  rootId: string
}

// ─── Auto layout ───────────────────────────────────────────────────────────────

/** Returns the total leaf count of the subtree (minimum 1 per node). */
function subtreeWidth(id: string, nodeMap: Map<string, TreeNode>): number {
  const node = nodeMap.get(id)
  if (!node) return 1
  const children = node.children ?? []
  if (children.length === 0) return 1
  return children.reduce((sum, cId) => sum + subtreeWidth(cId, nodeMap), 0)
}

/**
 * Recursively assigns grid positions (integer x, integer y = depth).
 * Parent is centred over its children.
 * Returns a map of id → { x, y } in tree-grid units.
 */
function assignPositions(
  id: string,
  depth: number,
  xStart: number,
  nodeMap: Map<string, TreeNode>,
  out: Map<string, { x: number; y: number }>,
): void {
  const node = nodeMap.get(id)
  if (!node) return

  const children = node.children ?? []

  if (children.length === 0) {
    out.set(id, { x: xStart, y: depth })
    return
  }

  // Place children left-to-right, then centre parent over them
  let cursor = xStart
  for (const cId of children) {
    assignPositions(cId, depth + 1, cursor, nodeMap, out)
    cursor += subtreeWidth(cId, nodeMap)
  }

  const firstChild = out.get(children[0] ?? '')
  const lastChild  = out.get(children[children.length - 1] ?? '')
  if (!firstChild || !lastChild) return
  out.set(id, { x: (firstChild.x + lastChild.x) / 2, y: depth })
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function TreeViz({ state }: PrimitiveProps) {
  const { nodes = [], rootId } = state as TreeState

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center w-full min-h-[280px] text-sm text-on-surface-variant/50 italic">
        Empty tree
      </div>
    )
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // Determine root: prefer rootId, fall back to first node
  const effectiveRootId = rootId ?? nodes[0]?.id

  // Compute positions automatically
  const posMap = new Map<string, { x: number; y: number }>()
  if (effectiveRootId) {
    assignPositions(effectiveRootId, 0, 0, nodeMap, posMap)
  }

  // Scale grid units → SVG pixels
  const scaledNodes = nodes.map((n) => {
    const pos = posMap.get(n.id) ?? { x: 0, y: 0 }
    return {
      ...n,
      svgX: pos.x * NODE_UNIT_X,
      svgY: pos.y * NODE_UNIT_Y,
    }
  })

  const scaledMap = new Map(scaledNodes.map((n) => [n.id, n]))

  // Build straight-line connections (parent bottom-center → child top-center)
  const connections: { x1: number; y1: number; x2: number; y2: number; id: string }[] = []
  scaledNodes.forEach((node) => {
    const children = node.children ?? []
    children.forEach((childId) => {
      const child = scaledMap.get(childId)
      if (child) {
        connections.push({
          x1: node.svgX,
          y1: node.svgY + HALF_H,
          x2: child.svgX,
          y2: child.svgY - HALF_H,
          id: `${node.id}-${childId}`,
        })
      }
    })
  })

  const vbNodes = scaledNodes.map((n) => ({ x: n.svgX, y: n.svgY }))
  const viewBox = computeViewBox(vbNodes, NODE_W, NODE_H, 32)
  const [, , vw] = viewBox.split(' ').map(Number)

  return (
    <div className="flex items-center justify-center w-full min-h-[280px] overflow-visible">
      <svg
        viewBox={viewBox}
        width="100%"
        height="auto"
        style={{ overflow: 'visible', display: 'block', maxWidth: vw }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Tree visualization"
      >
        {/* ── Edges ── */}
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
          const raw = nodeMap.get(node.id)!
          const isRoot = node.id === effectiveRootId

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
                    backgroundColor: raw.highlight
                      ? raw.highlight
                      : 'var(--color-surface-container)',
                    borderColor: isRoot && !raw.highlight
                      ? 'var(--color-primary)'
                      : raw.highlight
                        ? raw.highlight
                        : 'var(--color-outline-variant)',
                    color: raw.highlight
                      ? 'var(--color-on-primary-fixed)'
                      : 'var(--color-on-surface)',
                    boxShadow: raw.highlight
                      ? raw.highlight.startsWith('var')
                        ? `0 0 16px color-mix(in srgb, ${raw.highlight} 38%, transparent)`
                        : `0 0 16px ${raw.highlight}60`
                      : isRoot
                        ? '0 0 10px color-mix(in srgb, var(--color-primary) 30%, transparent)'
                        : 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {raw.value}
                </motion.div>
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
