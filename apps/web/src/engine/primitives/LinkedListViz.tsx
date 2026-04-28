import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { resolveHighlight, VIZ_SHADOWS } from '../styles/colors'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface LinkedListNode {
  id: string
  value: string
  highlight?: string
}

interface LinkedListState {
  items: LinkedListNode[]
  pointers?: { index: number; label: string; color?: string }[]
}

// ─── LinkedListViz ─────────────────────────────────────────────────────────────
//
// Edges are drawn between every adjacent pair of nodes (implicit sequential order).
// items[0] is always HEAD. No headId or node.next needed.
// pointers[] renders named cursors (prev, curr, next) above the list.

export function LinkedListViz({ state }: PrimitiveProps) {
  const { items = [], pointers = [] } = state as LinkedListState

  return (
    <div className="relative flex flex-col items-center justify-center p-4 w-full">
      <div className="relative flex flex-col items-center justify-center p-4 border border-outline-variant/20 rounded-2xl shadow-md bg-surface-container-low min-h-[120px] min-w-[200px] w-fit">
        <div className="flex items-center gap-8 relative mt-6 mb-6">
          <AnimatePresence mode="popLayout">
            {items.map((node, idx) => {
              const isHead = idx === 0
              const hasNext = idx < items.length - 1
              const colors = resolveHighlight(node.highlight)
              const isHighlighted = !!node.highlight && node.highlight !== 'default'
              const nodePointers = pointers.filter(p => p.index === idx)

              return (
                <motion.div
                  key={node.id}
                  layout
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex flex-col items-center relative"
                >
                  {/* Named pointers above the node */}
                  <div className="absolute -top-10 flex flex-col items-center justify-end h-10 pb-2">
                    {nodePointers.map(ptr => (
                      <motion.span
                        key={ptr.label}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] uppercase font-bold font-mono whitespace-nowrap"
                        style={{ color: ptr.color ?? 'var(--color-primary)' }}
                      >
                        {ptr.label}
                      </motion.span>
                    ))}
                  </div>

                  {/* Node Box */}
                  <motion.div
                    className="flex border-2 rounded-xl overflow-hidden z-10 bg-surface-container"
                    animate={{
                      borderColor: isHighlighted ? colors.border : 'var(--color-outline-variant)',
                      backgroundColor: isHighlighted ? colors.bg : 'var(--color-surface-container)',
                      boxShadow: isHighlighted ? `0 0 12px ${colors.border}50` : VIZ_SHADOWS.node,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <div
                      className="px-4 py-3 min-w-[48px] text-center font-mono font-bold border-r border-outline-variant/30"
                      style={{ color: isHighlighted ? colors.text : 'var(--color-on-surface)' }}
                    >
                      {node.value}
                    </div>
                    <div className="px-2 py-3 bg-surface-container-high flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-outline-variant/50" />
                    </div>
                  </motion.div>

                  {/* HEAD label below the node */}
                  {isHead && (
                    <motion.span
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-6 text-[10px] uppercase font-bold text-primary/70 font-mono tracking-wider"
                    >
                      HEAD
                    </motion.span>
                  )}

                  {/* Arrow Connection — drawn after every node except the last */}
                  {hasNext && (
                    <div className="absolute left-[100%] top-1/2 -mt-[1px] h-[2px] w-8 z-0">
                      <svg className="w-full h-full overflow-visible pointer-events-none">
                        <defs>
                          <marker
                            id={`arrowhead-${node.id}`}
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                          >
                            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-outline-variant)" />
                          </marker>
                        </defs>
                        <motion.line
                          x1="0%"
                          y1="50%"
                          x2="100%"
                          y2="50%"
                          stroke="var(--color-outline-variant)"
                          strokeWidth="2"
                          markerEnd={`url(#arrowhead-${node.id})`}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                        />
                      </svg>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
