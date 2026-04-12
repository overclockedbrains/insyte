/**
 * GraphViz — Phase 20: computeLayout() from @insyte/scene-engine
 *
 * Positions are now computed by the deterministic layout engine (dagre for
 * TB/LR/BT, radial arithmetic for radial hint). The SVG viewBox is derived
 * from the layout bounding box so content is never clipped.
 */

'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { computeLayout } from '@insyte/scene-engine'
import { useCanvas } from '../CanvasContext'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface GraphNode {
  id: string
  label: string
  color?: string
}

interface GraphEdge {
  from: string
  to: string
  directed?: boolean
  highlighted?: boolean
  label?: string
}

// ─── Edge path from dagre waypoints ────────────────────────────────────────────
/**
 * Builds an SVG path string from dagre-computed waypoints.
 * For directed edges, the path ends short of the target center so the
 * arrowhead marker sits on the node boundary (not inside it).
 */
function waypointsToPath(waypoints: { x: number; y: number }[]): string {
  if (waypoints.length < 2) return ''
  const [first, ...rest] = waypoints
  const d = [`M ${first!.x} ${first!.y}`]
  for (const p of rest) {
    d.push(`L ${p.x} ${p.y}`)
  }
  return d.join(' ')
}

/**
 * Straight line between two node centers (fallback when dagre provides no waypoints).
 */
function straightEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  nodeW: number,
): string {
  const r = nodeW / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const sx = from.x + ux * r
  const sy = from.y + uy * r
  const ex = to.x - ux * (r + 12)
  const ey = to.y - uy * (r + 12)
  return `M ${sx} ${sy} L ${ex} ${ey}`
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function GraphViz({ id, state, visual }: PrimitiveProps) {
  const { width: canvasW, height: canvasH } = useCanvas()
  const { nodes = [], edges = [] } = state as { nodes: GraphNode[]; edges: GraphEdge[] }

  // Construct a synthetic Visual if not provided (e.g., in Storybook / unit tests)
  const resolvedVisual = visual ?? { id, type: 'graph' as const, initialState: {} }

  const layout = useMemo(
    () => computeLayout(resolvedVisual, state as Record<string, unknown>, canvasW, canvasH),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedVisual.id, resolvedVisual.layoutHint, state, canvasW, canvasH],
  )

  const nodeById = new Map(layout.nodes.map(n => [n.id, n]))
  const rawById  = new Map(nodes.map(n => [n.id, n]))

  const [nodeW, nodeH] = [layout.nodes[0]?.width ?? 56, layout.nodes[0]?.height ?? 56]

  // Stable, unique marker IDs scoped to this graph instance
  const markerKey  = nodes.map(n => n.id).sort().join('-').slice(0, 20)
  const markerId   = `graph-arrow-${markerKey}`
  const markerDimId = `${markerId}-dim`

  const [,, vw] = layout.viewBox.split(' ').map(Number)

  return (
    <div className="flex items-center justify-center w-full min-h-[240px] overflow-visible">
      <svg
        viewBox={layout.viewBox}
        width="100%"
        height="auto"
        style={{ overflow: 'visible', display: 'block', maxWidth: vw }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Graph visualization"
      >
        <defs>
          <marker id={markerId} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-secondary-fixed)" />
          </marker>
          <marker id={markerDimId} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-outline-variant)" />
          </marker>
        </defs>

        {/* ── Edges ── */}
        {edges.map((edge) => {
          const layoutEdge = layout.edges.find(e => e.from === edge.from && e.to === edge.to)
          const fromNode = nodeById.get(edge.from)
          const toNode   = nodeById.get(edge.to)
          if (!fromNode || !toNode) return null

          const pathD = layoutEdge?.waypoints.length
            ? waypointsToPath(layoutEdge.waypoints)
            : straightEdgePath(fromNode, toNode, nodeW)

          if (!pathD) return null

          const isHighlight = edge.highlighted
          const color = isHighlight
            ? 'var(--color-secondary)'
            : 'var(--color-outline-variant)'

          return (
            <motion.path
              key={`${edge.from}-${edge.to}`}
              d={pathD}
              stroke={color}
              strokeWidth={isHighlight ? 3 : 2}
              fill="none"
              markerEnd={
                edge.directed
                  ? isHighlight ? `url(#${markerId})` : `url(#${markerDimId})`
                  : undefined
              }
              style={{
                filter: isHighlight ? `drop-shadow(0 0 6px ${color}80)` : 'none',
              }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          )
        })}

        {/* ── Nodes ── */}
        {layout.nodes.map((posNode) => {
          const raw = rawById.get(posNode.id)
          return (
            <foreignObject
              key={posNode.id}
              x={posNode.x - nodeW / 2}
              y={posNode.y - nodeH / 2}
              width={nodeW}
              height={nodeH}
              style={{ overflow: 'visible' }}
            >
              <div style={{ width: '100%', height: '100%', display: 'flex' }}>
                <motion.div
                  className="w-full h-full flex items-center justify-center rounded-full border-2 font-bold font-mono"
                  style={{ fontSize: 9, lineHeight: 1.2, textAlign: 'center', whiteSpace: 'pre-wrap' }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    backgroundColor: raw?.color ?? 'var(--color-surface-container)',
                    borderColor: raw?.color ?? 'var(--color-outline-variant)',
                    color: raw?.color ? '#000000' : 'var(--color-on-surface)',
                    boxShadow: raw?.color ? `0 0 16px ${raw.color}60` : 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {raw?.label ?? posNode.id}
                </motion.div>
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
