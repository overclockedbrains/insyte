'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { computeLayout } from '@insyte/scene-engine'
import { useCanvas } from '../CanvasContext'
import { resolveHighlight } from '../styles/colors'
import { useThemeSync } from '../styles/useThemeSync'

interface TrieNode {
  id: string
  value: string
  children?: string[]
  highlight?: string
  isEnd?: boolean
}

interface TrieState {
  nodes: TrieNode[]
  rootId: string
}

export function TrieViz({ id, state, visual }: PrimitiveProps) {
  useThemeSync()
  const { width: canvasW, height: canvasH } = useCanvas()
  const { nodes = [], rootId } = state as TrieState

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center w-full min-h-[280px] text-sm text-on-surface-variant/50 italic">
        Empty trie
      </div>
    )
  }

  const resolvedVisual = visual ?? { id, type: 'tree' as const, variant: 'trie', layoutHint: 'dagre-TB' as const, initialState: { nodes: [], rootId: '' } }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const layout = useMemo(
    () => computeLayout(resolvedVisual, state as Record<string, unknown>, canvasW, canvasH),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedVisual.id, state, canvasW, canvasH],
  )

  const rawById = new Map(nodes.map(n => [n.id, n]))
  const [nodeW, nodeH] = [layout.nodes[0]?.width ?? 48, layout.nodes[0]?.height ?? 48]

  const [,, vw] = layout.viewBox.split(' ').map(Number)

  return (
    <div className="flex items-center justify-center w-full min-h-[280px] overflow-visible">
      <svg
        viewBox={layout.viewBox}
        width="100%"
        height="auto"
        style={{ overflow: 'visible', display: 'block', maxWidth: vw }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Trie visualization"
      >
        {/* ── Edges with character labels ── */}
        {layout.edges.map((edge) => {
          const [wp0, wp1] = edge.waypoints
          if (!wp0 || !wp1) return null
          const childNode = rawById.get(edge.to)
          const midX = (wp0.x + wp1.x) / 2
          const midY = (wp0.y + wp1.y) / 2
          return (
            <g key={edge.id}>
              <line
                x1={wp0.x} y1={wp0.y}
                x2={wp1.x} y2={wp1.y}
                stroke="var(--color-outline-variant)"
                strokeWidth={2}
              />
              {childNode?.value && (
                <g>
                  <rect
                    x={midX - 8} y={midY - 8}
                    width={16} height={16}
                    rx={3}
                    fill="var(--color-surface-container)"
                  />
                  <text
                    x={midX} y={midY + 5}
                    textAnchor="middle"
                    fontSize={11}
                    fontFamily="monospace"
                    fontWeight="700"
                    fill="var(--color-on-surface-variant)"
                  >
                    {childNode.value}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* ── Nodes ── */}
        {layout.nodes.map((posNode) => {
          const raw = rawById.get(posNode.id)
          const colors = resolveHighlight(raw?.highlight)
          const isHighlighted = !!raw?.highlight && raw.highlight !== 'default'
          const isEnd = raw?.isEnd === true
          const isRoot = posNode.id === (rootId ?? nodes[0]?.id)

          return (
            <foreignObject
              key={posNode.id}
              x={posNode.x - nodeW / 2}
              y={posNode.y - nodeH / 2}
              width={nodeW}
              height={nodeH}
              style={{ overflow: 'visible' }}
            >
              <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
                {/* Double-ring outer border for isEnd nodes */}
                {isEnd && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '50%',
                      border: '2px solid var(--color-primary)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
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
                  {/* Root node shows empty circle (no label), others show the character */}
                  {!isRoot && raw?.value}
                </motion.div>
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
