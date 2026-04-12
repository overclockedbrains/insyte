/**
 * RecursionTreeViz — Phase 18: Coordinate System Unification
 *
 * Rewritten from (DOM absolute + SVG overlay) dual-coordinate approach to a
 * single SVG viewBox + <foreignObject> pattern. SCALE_X / SCALE_Y constants
 * removed. Edges and node bodies live in the same coordinate space.
 *
 * Memoization highlights (pruned paths) are expressed as CSS classes inside
 * the foreignObject — no coordinate math required.
 */

'use client'

import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { computeViewBox } from '../CanvasContext'

// ─── Constants ─────────────────────────────────────────────────────────────────
const NODE_UNIT = 90   // px per scene-coord unit (was SCALE_X=70, SCALE_Y=80 — unified)
const NODE_W    = 80   // foreignObject width  (old fixed 80px)
const NODE_H    = 48   // foreignObject height (old py-1 box, approx 2 lines × 24px)
const HALF_W    = NODE_W / 2
const HALF_H    = NODE_H / 2

// ─── Types ─────────────────────────────────────────────────────────────────────
interface RecursionNode {
  id: string
  label: string
  result?: string
  status: 'pending' | 'computing' | 'memoized' | 'complete'
  children: string[]
  x?: number
  y?: number
}

interface RecursionTreeState {
  nodes: RecursionNode[]
  rootId: string
}

// ─── Edge path ─────────────────────────────────────────────────────────────────
function edgeBezier(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const sx = from.x
  const sy = from.y + HALF_H        // bottom-center of parent
  const ex = to.x
  const ey = to.y - HALF_H          // top-center of child
  const midY = (sy + ey) / 2
  return `M ${sx} ${sy} C ${sx} ${midY} ${ex} ${midY} ${ex} ${ey}`
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function RecursionTreeViz({ state }: PrimitiveProps) {
  const { nodes = [], rootId } = state as RecursionTreeState

  const getNode = (id: string) => nodes.find((n) => n.id === id)

  // Filter to nodes that have positions supplied by the scene JSON
  const positionedNodes = nodes.filter(
    (n) => n.x !== undefined && n.y !== undefined,
  )

  // Scale coords to SVG space
  const scaledNodes = positionedNodes.map((n) => ({
    ...n,
    svgX: n.x! * NODE_UNIT,
    svgY: n.y! * NODE_UNIT,
  }))

  const getScaled = (id: string) => scaledNodes.find((n) => n.id === id)

  // Build connections
  const connections: {
    from: { x: number; y: number }
    to: { x: number; y: number }
    id: string
    pruned: boolean
  }[] = []

  scaledNodes.forEach((node) => {
    const rawNode = getNode(node.id)!
    rawNode.children.forEach((childId) => {
      const child = getScaled(childId)
      if (child) {
        connections.push({
          from: { x: node.svgX, y: node.svgY },
          to: { x: child.svgX, y: child.svgY },
          id: `${node.id}-${childId}`,
          pruned: child.status === 'memoized',
        })
      }
    })
  })

  const viewBoxNodes = scaledNodes.map((n) => ({ x: n.svgX, y: n.svgY }))
  const viewBox = computeViewBox(viewBoxNodes, NODE_W, NODE_H, 32)
  const [, , vw] = viewBox.split(' ').map(Number)

  return (
    <div className="flex items-center justify-center w-full min-h-[300px] overflow-visible">
      <svg
        viewBox={viewBox}
        width="100%"
        height="auto"
        style={{ overflow: 'visible', display: 'block', maxWidth: vw }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Recursion tree visualization"
      >
        {/* ── Edges ── */}
        {connections.map((conn) => (
          <motion.path
            key={conn.id}
            d={edgeBezier(conn.from, conn.to)}
            stroke={
              conn.pruned
                ? 'var(--color-outline-variant)'
                : 'var(--color-on-surface-variant)'
            }
            strokeWidth={2}
            strokeDasharray={conn.pruned ? '4 4' : undefined}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        ))}

        {/* ── Nodes via foreignObject ── */}
        {scaledNodes.map((node) => {
          const rawNode = getNode(node.id)!
          const isComputing = rawNode.status === 'computing'
          const isMemoized  = rawNode.status === 'memoized'
          const isComplete  = rawNode.status === 'complete'
          const isRoot      = node.id === rootId

          let bgColor     = 'var(--color-surface-container)'
          let borderColor = 'var(--color-outline-variant)'
          let textColor   = 'var(--color-on-surface)'
          let shadow      = 'none'

          if (isComputing) {
            bgColor     = 'rgba(183, 159, 255, 0.2)'
            borderColor = 'var(--color-primary)'
            shadow      = '0 0 16px rgba(183, 159, 255, 0.4)'
          } else if (isComplete) {
            bgColor     = 'rgba(58, 223, 250, 0.15)'
            borderColor = 'var(--color-secondary)'
          } else if (isMemoized) {
            bgColor   = 'var(--color-surface-container-highest)'
            textColor = 'var(--color-on-surface-variant)'
          }

          return (
            <foreignObject
              key={node.id}
              x={node.svgX - HALF_W}
              y={node.svgY - HALF_H}
              width={NODE_W}
              height={NODE_H + 16}   // +16 for the -top-5 badge overflow
              style={{ overflow: 'visible' }}
            >
              <div
                style={{
                  width: NODE_W,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {/* Root badge */}
                {isRoot && (
                  <span style={{
                    position: 'absolute',
                    top: -20,
                    fontSize: 9,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--color-primary)',
                    background: 'var(--color-surface-container)',
                    borderRadius: 4,
                    padding: '0 3px',
                  }}>
                    root
                  </span>
                )}
                {/* Memoized badge */}
                {isMemoized && (
                  <span style={{
                    position: 'absolute',
                    top: -20,
                    fontSize: 9,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--color-tertiary)',
                    background: 'var(--color-surface-container-highest)',
                    borderRadius: 4,
                    padding: '0 3px',
                  }}>
                    Cached
                  </span>
                )}

                <motion.div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    border: '2px solid',
                    padding: '2px 0',
                    textDecoration: isMemoized ? 'line-through' : 'none',
                  }}
                  animate={{ backgroundColor: bgColor, borderColor, color: textColor, boxShadow: shadow }}
                  transition={{ duration: 0.2 }}
                >
                  <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.2 }}>
                    {rawNode.label}
                  </div>
                  {rawNode.result && (
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--color-secondary)', marginTop: 2 }}>
                      ={rawNode.result}
                    </div>
                  )}
                </motion.div>
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
