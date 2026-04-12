/**
 * RecursionTreeViz — Phase 19 bridge: auto-layout
 *
 * x/y removed from scene JSON in Phase 19. This component now computes node
 * positions using the same subtree-width centering algorithm as TreeViz.
 * Phase 20 will replace this with computeLayout() from @insyte/scene-engine.
 */

'use client'

import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { computeViewBox } from '../CanvasContext'

// ─── Constants ─────────────────────────────────────────────────────────────────
const NODE_UNIT_X = 96   // horizontal spread — wider than TreeViz to fit labels
const NODE_UNIT_Y = 90   // vertical spacing
const NODE_W      = 80
const NODE_H      = 48
const HALF_W      = NODE_W / 2
const HALF_H      = NODE_H / 2

// ─── Types ─────────────────────────────────────────────────────────────────────
interface RecursionNode {
  id: string
  label: string
  result?: string
  status: 'pending' | 'computing' | 'memoized' | 'complete'
  children?: string[]
}

interface RecursionTreeState {
  nodes: RecursionNode[]
  rootId: string
}

// ─── Auto layout (subtree-width centering) ─────────────────────────────────────
// TODO(Phase 20): replace with computeLayout() from @insyte/scene-engine

function subtreeWidth(id: string, nodeMap: Map<string, RecursionNode>): number {
  const node = nodeMap.get(id)
  if (!node) return 1
  const children = node.children ?? []
  if (children.length === 0) return 1
  return children.reduce((sum, cId) => sum + subtreeWidth(cId, nodeMap), 0)
}

function assignPositions(
  id: string,
  depth: number,
  xStart: number,
  nodeMap: Map<string, RecursionNode>,
  out: Map<string, { x: number; y: number }>,
): void {
  const node = nodeMap.get(id)
  if (!node) return
  const children = node.children ?? []
  if (children.length === 0) {
    out.set(id, { x: xStart, y: depth })
    return
  }
  let cursor = xStart
  for (const cId of children) {
    assignPositions(cId, depth + 1, cursor, nodeMap, out)
    cursor += subtreeWidth(cId, nodeMap)
  }
  const first = out.get(children[0] ?? '')
  const last  = out.get(children[children.length - 1] ?? '')
  if (!first || !last) return
  out.set(id, { x: (first.x + last.x) / 2, y: depth })
}

// ─── Edge path ─────────────────────────────────────────────────────────────────
function edgeBezier(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const sx = from.x
  const sy = from.y + HALF_H
  const ex = to.x
  const ey = to.y - HALF_H
  const midY = (sy + ey) / 2
  return `M ${sx} ${sy} C ${sx} ${midY} ${ex} ${midY} ${ex} ${ey}`
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function RecursionTreeViz({ state }: PrimitiveProps) {
  const { nodes = [], rootId } = state as RecursionTreeState

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center w-full min-h-[300px] text-sm text-on-surface-variant/50 italic">
        Empty recursion tree
      </div>
    )
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const effectiveRootId = rootId ?? nodes[0]?.id

  const posMap = new Map<string, { x: number; y: number }>()
  if (effectiveRootId) {
    assignPositions(effectiveRootId, 0, 0, nodeMap, posMap)
  }

  const scaledNodes = nodes.map((n) => {
    const pos = posMap.get(n.id) ?? { x: 0, y: 0 }
    return { ...n, svgX: pos.x * NODE_UNIT_X, svgY: pos.y * NODE_UNIT_Y }
  })

  const scaledMap = new Map(scaledNodes.map((n) => [n.id, n]))

  const connections: {
    from: { x: number; y: number }
    to: { x: number; y: number }
    id: string
    pruned: boolean
  }[] = []

  scaledNodes.forEach((node) => {
    const children = node.children ?? []
    children.forEach((childId) => {
      const child = scaledMap.get(childId)
      if (child) {
        connections.push({
          from: { x: node.svgX, y: node.svgY },
          to:   { x: child.svgX, y: child.svgY },
          id:   `${node.id}-${childId}`,
          pruned: child.status === 'memoized',
        })
      }
    })
  })

  const vbNodes = scaledNodes.map((n) => ({ x: n.svgX, y: n.svgY }))
  const viewBox = computeViewBox(vbNodes, NODE_W, NODE_H, 32)
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
            stroke={conn.pruned ? 'var(--color-outline-variant)' : 'var(--color-on-surface-variant)'}
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
          const raw = nodeMap.get(node.id)!
          const isComputing = raw.status === 'computing'
          const isMemoized  = raw.status === 'memoized'
          const isComplete  = raw.status === 'complete'
          const isRoot      = node.id === effectiveRootId

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
              height={NODE_H + 16}
              style={{ overflow: 'visible' }}
            >
              <div style={{ width: NODE_W, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {isRoot && (
                  <span style={{ position: 'absolute', top: -20, fontSize: 9, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', background: 'var(--color-surface-container)', borderRadius: 4, padding: '0 3px' }}>
                    root
                  </span>
                )}
                {isMemoized && (
                  <span style={{ position: 'absolute', top: -20, fontSize: 9, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-tertiary)', background: 'var(--color-surface-container-highest)', borderRadius: 4, padding: '0 3px' }}>
                    Cached
                  </span>
                )}
                <motion.div
                  style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: '2px solid', padding: '2px 0', textDecoration: isMemoized ? 'line-through' : 'none' }}
                  animate={{ backgroundColor: bgColor, borderColor, color: textColor, boxShadow: shadow }}
                  transition={{ duration: 0.2 }}
                >
                  <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.2 }}>
                    {raw.label}
                  </div>
                  {raw.result && (
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--color-secondary)', marginTop: 2 }}>
                      ={raw.result}
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
