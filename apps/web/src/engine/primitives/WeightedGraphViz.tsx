'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { computeLayout } from '@insyte/scene-engine'
import { useCanvas } from '../CanvasContext'
import { resolveHighlight, VIZ_SURFACE, HIGHLIGHT_COLORS } from '../styles/colors'

interface WeightedGraphNode {
  id: string
  label: string
  highlight?: string
  distance?: string
}

interface WeightedGraphEdge {
  id?: string
  from: string
  to: string
  weight?: number
  directed?: boolean
  highlight?: string
  label?: string
}

function waypointsToPath(waypoints: { x: number; y: number }[]): string {
  if (waypoints.length < 2) return ''
  const [first, ...rest] = waypoints
  return [`M ${first!.x} ${first!.y}`, ...rest.map(p => `L ${p.x} ${p.y}`)].join(' ')
}

function straightEdgePath(from: { x: number; y: number }, to: { x: number; y: number }, nodeW: number): string {
  const r = nodeW / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len
  return `M ${from.x + ux * r} ${from.y + uy * r} L ${to.x - ux * (r + 12)} ${to.y - uy * (r + 12)}`
}

function edgeColor(highlight: string | undefined): string {
  switch (highlight) {
    case 'active':
    case 'relaxed':
    case 'min-edge': return 'var(--color-secondary)'
    case 'in-tree':  return 'var(--color-primary)'
    case 'rejected': return `var(--color-error, ${HIGHLIGHT_COLORS.error.border})`
    default:         return 'var(--color-outline-variant)'
  }
}

function nodeColors(highlight: string | undefined) {
  switch (highlight) {
    case 'source':  return { bg: VIZ_SURFACE.graphSource,  border: 'var(--color-primary)',         text: HIGHLIGHT_COLORS.default.text }
    case 'settled': return { bg: VIZ_SURFACE.graphSettled, border: 'var(--color-outline-variant)', text: 'var(--color-outline-variant)' }
    default:        return resolveHighlight(highlight)
  }
}

export function WeightedGraphViz({ id, state, visual }: PrimitiveProps) {
  const { width: canvasW, height: canvasH } = useCanvas()
  const { nodes = [], edges = [] } = state as { nodes: WeightedGraphNode[]; edges: WeightedGraphEdge[] }

  const resolvedVisual = visual ?? { id, type: 'graph' as const, variant: 'weighted', layoutHint: 'dagre-TB' as const, initialState: { nodes: [], edges: [] } }

  const layout = useMemo(
    () => computeLayout(resolvedVisual, state as Record<string, unknown>, canvasW, canvasH),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedVisual.id, resolvedVisual.layoutHint, state, canvasW, canvasH],
  )

  const nodeById = new Map(layout.nodes.map(n => [n.id, n]))
  const rawById  = new Map(nodes.map(n => [n.id, n]))
  const [nodeW, nodeH] = [layout.nodes[0]?.width ?? 56, layout.nodes[0]?.height ?? 56]

  const markerKey   = nodes.map(n => n.id).sort().join('-').slice(0, 20)
  const markerId    = `wg-arrow-${markerKey}`
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
        aria-label="Weighted graph visualization"
      >
        <defs>
          <marker id={markerId} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-secondary-fixed)" />
          </marker>
          <marker id={markerDimId} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-outline-variant)" />
          </marker>
        </defs>

        {/* ── Edges with weight badges ── */}
        {edges.map((edge) => {
          const layoutEdge = layout.edges.find(e => e.from === edge.from && e.to === edge.to)
          const fromNode = nodeById.get(edge.from)
          const toNode   = nodeById.get(edge.to)
          if (!fromNode || !toNode) return null

          const pathD = layoutEdge?.waypoints.length
            ? waypointsToPath(layoutEdge.waypoints)
            : straightEdgePath(fromNode, toNode, nodeW)

          if (!pathD) return null

          const color = edgeColor(edge.highlight)
          const isActive = edge.highlight === 'active' || edge.highlight === 'relaxed' || edge.highlight === 'min-edge'
          const isRejected = edge.highlight === 'rejected'
          const isInTree = edge.highlight === 'in-tree'

          // Midpoint for weight badge
          const wp = layoutEdge?.waypoints
          const mid = wp && wp.length >= 2
            ? { x: (wp[0]!.x + wp[wp.length - 1]!.x) / 2, y: (wp[0]!.y + wp[wp.length - 1]!.y) / 2 }
            : { x: (fromNode.x + toNode.x) / 2, y: (fromNode.y + toNode.y) / 2 }

          return (
            <g key={`${edge.from}-${edge.to}`}>
              <motion.path
                d={pathD}
                stroke={color}
                strokeWidth={isActive || isInTree ? 3 : 2}
                strokeDasharray={isRejected ? '5 3' : undefined}
                fill="none"
                markerEnd={
                  edge.directed
                    ? isActive || isInTree ? `url(#${markerId})` : `url(#${markerDimId})`
                    : undefined
                }
                style={{ filter: isActive || isInTree ? `drop-shadow(0 0 6px ${color}80)` : 'none' }}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: isRejected ? 0.4 : 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
              {/* Weight badge */}
              {edge.weight != null && (
                <g>
                  <rect
                    x={mid.x - 14} y={mid.y - 10}
                    width={28} height={20}
                    rx={4}
                    fill={isActive ? `var(--color-secondary-container, ${VIZ_SURFACE.graphActiveFill})` : 'var(--color-surface-container)'}
                    stroke={color}
                    strokeWidth={1}
                  />
                  <text
                    x={mid.x} y={mid.y + 5}
                    textAnchor="middle"
                    fontSize={10}
                    fontFamily="monospace"
                    fontWeight="700"
                    fill={color}
                  >
                    {edge.weight}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* ── Nodes with distance badges ── */}
        {layout.nodes.map((posNode) => {
          const raw = rawById.get(posNode.id)
          const colors = nodeColors(raw?.highlight)
          const isHighlighted = !!raw?.highlight && raw.highlight !== 'default'

          return (
            <g key={posNode.id}>
              <foreignObject
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
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                      boxShadow: isHighlighted ? `0 0 16px ${colors.border}60` : 'none',
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    {raw?.label ?? posNode.id}
                  </motion.div>
                </div>
              </foreignObject>
              {/* Distance badge */}
              {raw?.distance != null && (
                <text
                  x={posNode.x}
                  y={posNode.y + nodeH / 2 + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="monospace"
                  fontWeight="600"
                  fill="var(--color-secondary)"
                >
                  dist:{raw.distance}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
