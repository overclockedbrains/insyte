/**
 * TreeViz — Phase 20: computeLayout() from @insyte/scene-engine
 * Phase 27: resolveHighlight() replaces raw color strings for consistent semantics.
 *
 * Positions are computed by the deterministic Reingold-Tilford algorithm
 * (d3-hierarchy) inside the layout engine. The SVG viewBox is set from the
 * layout bounding box so the tree is never clipped regardless of depth.
 */

'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { computeLayout } from '@insyte/scene-engine'
import { useCanvas } from '../CanvasContext'
import { resolveHighlight } from '../styles/colors'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TreeNode {
  id: string
  value: string
  children?: string[]
  highlight?: string
}

interface TreeState {
  nodes: TreeNode[]
  rootId: string
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function TreeViz({ id, state, visual }: PrimitiveProps) {
  const { width: canvasW, height: canvasH } = useCanvas()
  const { nodes = [], rootId } = state as TreeState

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center w-full min-h-[280px] text-sm text-on-surface-variant/50 italic">
        Empty tree
      </div>
    )
  }

  const resolvedVisual = visual ?? { id, type: 'tree' as const, initialState: {} }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const layout = useMemo(
    () => computeLayout(resolvedVisual, state as Record<string, unknown>, canvasW, canvasH),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedVisual.id, state, canvasW, canvasH],
  )

  const rawById = new Map(nodes.map(n => [n.id, n]))
  const [nodeW, nodeH] = [layout.nodes[0]?.width ?? 48, layout.nodes[0]?.height ?? 48]
  const effectiveRootId = rootId ?? nodes[0]?.id

  const [,, vw] = layout.viewBox.split(' ').map(Number)

  return (
    <div className="flex items-center justify-center w-full min-h-[280px] overflow-visible">
      <svg
        viewBox={layout.viewBox}
        width="100%"
        height="auto"
        style={{ overflow: 'visible', display: 'block', maxWidth: vw }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Tree visualization"
      >
        {/* ── Edges from layout engine ── */}
        {layout.edges.map((edge) => {
          const [wp0, wp1] = edge.waypoints
          if (!wp0 || !wp1) return null
          return (
            <line
              key={edge.id}
              x1={wp0.x} y1={wp0.y}
              x2={wp1.x} y2={wp1.y}
              stroke="var(--color-outline-variant)"
              strokeWidth={2}
            />
          )
        })}

        {/* ── Nodes ──
         * Phase 27: stable key = posNode.id (content ID, not array index).
         * resolveHighlight maps semantic tokens to consistent colors.
         */}
        {layout.nodes.map((posNode) => {
          const raw = rawById.get(posNode.id)
          const isRoot = posNode.id === effectiveRootId
          const colors = resolveHighlight(raw?.highlight)
          const isHighlighted = !!raw?.highlight && raw.highlight !== 'default'

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
                  className="w-full h-full flex items-center justify-center rounded-full border-2 text-sm font-bold font-mono"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    backgroundColor: colors.bg,
                    borderColor: isRoot && !isHighlighted
                      ? 'var(--color-primary)'
                      : colors.border,
                    color: colors.text,
                    boxShadow: isHighlighted
                      ? `0 0 16px ${colors.border}60`
                      : isRoot
                        ? '0 0 10px color-mix(in srgb, var(--color-primary) 30%, transparent)'
                        : 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {raw?.value ?? posNode.id}
                </motion.div>
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
