/**
 * RecursionTreeViz — Phase 20: computeLayout() from @insyte/scene-engine
 * Phase 27: resolveHighlight() for status-based colors. Stable node IDs.
 *
 * Positions are computed by the deterministic Reingold-Tilford algorithm
 * (d3-hierarchy) inside the layout engine.
 */

'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { computeLayout } from '@insyte/scene-engine'
import { useCanvas } from '../CanvasContext'
import { resolveHighlight } from '../styles/colors'

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

/** Map recursion status → semantic highlight token */
function statusToHighlight(status: RecursionNode['status']): string | undefined {
  switch (status) {
    case 'computing': return 'active'
    case 'complete':  return 'hit'
    case 'memoized':  return 'mru'
    case 'pending':
    default:          return undefined
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function RecursionTreeViz({ id, state, visual }: PrimitiveProps) {
  const { width: canvasW, height: canvasH } = useCanvas()
  const { nodes = [], rootId } = state as RecursionTreeState

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center w-full min-h-[300px] text-sm text-on-surface-variant/50 italic">
        Empty recursion tree
      </div>
    )
  }

  const resolvedVisual = visual ?? { id, type: 'recursion-tree' as const, initialState: {} }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const layout = useMemo(
    () => computeLayout(resolvedVisual, state as Record<string, unknown>, canvasW, canvasH),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedVisual.id, state, canvasW, canvasH],
  )

  const rawById = new Map(nodes.map(n => [n.id, n]))
  const [nodeW, nodeH] = [layout.nodes[0]?.width ?? 80, layout.nodes[0]?.height ?? 48]
  const effectiveRootId = rootId ?? nodes[0]?.id

  const [,, vw] = layout.viewBox.split(' ').map(Number)

  return (
    <div className="flex items-center justify-center w-full min-h-[300px] overflow-visible">
      <svg
        viewBox={layout.viewBox}
        width="100%"
        height="auto"
        style={{ overflow: 'visible', display: 'block', maxWidth: vw }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Recursion tree visualization"
      >
        {/* ── Edges ── */}
        {layout.edges.map((edge) => {
          const [wp0, wp1] = edge.waypoints
          if (!wp0 || !wp1) return null
          const sx = wp0.x, sy = wp0.y
          const ex = wp1.x, ey = wp1.y
          const midY = (sy + ey) / 2
          const isMemoized = rawById.get(edge.to)?.status === 'memoized'
          return (
            <motion.path
              key={edge.id}
              d={`M ${sx} ${sy} C ${sx} ${midY} ${ex} ${midY} ${ex} ${ey}`}
              stroke={isMemoized ? 'var(--color-outline-variant)' : 'var(--color-on-surface-variant)'}
              strokeWidth={2}
              strokeDasharray={isMemoized ? '4 4' : undefined}
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          )
        })}

        {/* ── Nodes ──
         * Phase 27: status → semantic highlight token → resolveHighlight colors.
         * Stable key = posNode.id.
         */}
        {layout.nodes.map((posNode) => {
          const raw = rawById.get(posNode.id)
          const isMemoized = raw?.status === 'memoized'
          const isRoot     = posNode.id === effectiveRootId

          const highlightToken = statusToHighlight(raw?.status ?? 'pending')
          const colors = resolveHighlight(highlightToken)
          const isHighlighted = !!highlightToken

          return (
            <foreignObject
              key={posNode.id}
              x={posNode.x - nodeW / 2}
              y={posNode.y - nodeH / 2}
              width={nodeW}
              height={nodeH + 16}
              style={{ overflow: 'visible' }}
            >
              <div style={{ width: nodeW, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {isRoot && (
                  <span style={{ position: 'absolute', top: -20, fontSize: 9, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', background: 'var(--color-surface-container)', borderRadius: 4, padding: '0 3px' }}>
                    root
                  </span>
                )}
                {isMemoized && (
                  <span style={{ position: 'absolute', top: -20, fontSize: 9, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: colors.text, background: 'var(--color-surface-container-highest)', borderRadius: 4, padding: '0 3px' }}>
                    Cached
                  </span>
                )}
                <motion.div
                  style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: '2px solid', padding: '2px 0', textDecoration: isMemoized ? 'line-through' : 'none' }}
                  animate={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                    boxShadow: isHighlighted ? `0 0 16px ${colors.border}60` : 'none',
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.2 }}>
                    {raw?.label ?? posNode.id}
                  </div>
                  {raw?.result && (
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
