/**
 * GraphViz — Phase 19 bridge: circular auto-layout
 *
 * x/y removed from scene JSON in Phase 19. Positions are now computed here
 * using a simple circular arrangement (N nodes evenly spaced around a ring).
 * Phase 20 will replace this with computeLayout() / dagre from @insyte/scene-engine.
 */

'use client'

import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { computeViewBox } from '../CanvasContext'

// ─── Constants ─────────────────────────────────────────────────────────────────
const NODE_W = 56
const NODE_H = 56

// ─── Types ─────────────────────────────────────────────────────────────────────
interface GraphNode {
  id: string
  label: string
  color?: string
  // x/y no longer in scene JSON — positions computed below
}

interface GraphEdge {
  from: string
  to: string
  directed?: boolean
  highlighted?: boolean
}

interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ─── Edge path ─────────────────────────────────────────────────────────────────
/**
 * Straight line between two node centers.
 * Connects from the edge of the source circle to the edge of the target circle
 * so the arrowhead sits on the node boundary, not inside it.
 */
function edgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  r: number = NODE_W / 2,
): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const sx = from.x + ux * r
  const sy = from.y + uy * r
  const ex = to.x - ux * (r + 12) // 12px gap for arrowhead refX
  const ey = to.y - uy * (r + 12)
  return `M ${sx} ${sy} L ${ex} ${ey}`
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function GraphViz({ state }: PrimitiveProps) {
  const { nodes = [], edges = [] } = state as GraphState

  const getNode = (id: string) => nodes.find((n) => n.id === id)

  // TODO(Phase 20): replace with computeLayout() / dagre from @insyte/scene-engine
  // Bridge: circular layout — N nodes evenly spaced around a ring
  const n = nodes.length
  const radius = Math.max(100, n * 38)
  const cx = radius + NODE_W
  const cy = radius + NODE_H
  const scaledNodes = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2
    return {
      ...node,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  })

  const getScaled = (id: string) => scaledNodes.find((n) => n.id === id)

  const viewBox = computeViewBox(scaledNodes, NODE_W, NODE_H, 32)
  const [, , vw] = viewBox.split(' ').map(Number)

  // Stable, unique marker IDs scoped to this instance to avoid conflicts when
  // multiple GraphViz components are on screen simultaneously.
  // Use the sorted node-id list as a deterministic key.
  const markerKey = nodes.map((n) => n.id).sort().join('-').slice(0, 20)
  const markerId = `graph-arrow-${markerKey}`
  const markerIdDim = `${markerId}-dim`

  return (
    <div className="flex items-center justify-center w-full min-h-[240px] overflow-visible">
      <svg
        viewBox={viewBox}
        width="100%"
        height="auto"
        style={{ overflow: 'visible', display: 'block', maxWidth: vw }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Graph visualization"
      >
        <defs>
          {/* Highlighted edge arrowhead */}
          <marker id={markerId} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-secondary-fixed)" />
          </marker>
          {/* Dimmed edge arrowhead */}
          <marker id={markerIdDim} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-outline-variant)" />
          </marker>
        </defs>

        {/* ── Edges (rendered first so nodes appear above) ── */}
        {edges.map((edge) => {
          const src = getScaled(edge.from)
          const tgt = getScaled(edge.to)
          if (!src || !tgt) return null

          const isHighlight = edge.highlighted
          const color = isHighlight
            ? 'var(--color-secondary)'
            : 'var(--color-outline-variant)'

          return (
            <motion.path
              key={`${edge.from}-${edge.to}`}
              d={edgePath(src, tgt)}
              stroke={color}
              strokeWidth={isHighlight ? 3 : 2}
              fill="none"
              markerEnd={
                edge.directed
                  ? isHighlight
                    ? `url(#${markerId})`
                    : `url(#${markerIdDim})`
                  : undefined
              }
              style={{
                filter: isHighlight
                  ? `drop-shadow(0 0 6px ${color}80)`
                  : 'none',
              }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          )
        })}

        {/* ── Nodes via foreignObject — HTML inside SVG coordinate space ── */}
        {scaledNodes.map((node) => {
          const rawNode = getNode(node.id)!
          return (
            <foreignObject
              key={node.id}
              x={node.x - NODE_W / 2}
              y={node.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              style={{ overflow: 'visible' }}
            >
              {/* No xmlns needed — React ignores it on <div>; foreignObject already declares SVG namespace */}
              <div style={{ width: '100%', height: '100%', display: 'flex' }}>
                <motion.div
                  className="w-full h-full flex items-center justify-center rounded-full border-2 font-bold font-mono"
                  style={{ fontSize: 9, lineHeight: 1.2, textAlign: 'center', whiteSpace: 'pre-wrap' }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    backgroundColor: rawNode.color
                      ? rawNode.color
                      : 'var(--color-surface-container)',
                    borderColor: rawNode.color
                      ? rawNode.color
                      : 'var(--color-outline-variant)',
                    color: rawNode.color ? '#000000' : 'var(--color-on-surface)',
                    boxShadow: rawNode.color
                      ? `0 0 16px ${rawNode.color}60`
                      : 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {node.label}
                </motion.div>
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
