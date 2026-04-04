import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface LinkedListState {
  nodes: {
    id: string
    value: string
    next: string | null
  }[]
  headId: string | null
}

export function LinkedListViz({ state }: PrimitiveProps) {
  const { nodes = [], headId } = state as LinkedListState

  // Simple horizontal layout: just order nodes based on standard array order provided by backend
  // The backend's parser will output nodes array in insertion/visual order.
  return (
    <div className="flex items-center gap-8 p-8 relative min-h-[120px]">
      <AnimatePresence mode="popLayout">
        {nodes.map((node) => {
          const isHead = node.id === headId
          const hasNext = !!node.next

          return (
            <motion.div
              key={node.id}
              layout
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex items-center relative"
            >
              <div className="flex flex-col items-center">
                {isHead && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-8 text-[10px] uppercase font-bold text-primary font-mono"
                  >
                    HEAD
                  </motion.span>
                )}
                {/* Node Box */}
                <div className="flex border-2 border-outline-variant rounded-xl overflow-hidden bg-surface-container shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <div className="px-4 py-3 min-w-[48px] text-center font-mono text-on-surface font-bold border-r border-outline-variant/30">
                    {node.value}
                  </div>
                  <div className="px-2 py-3 bg-surface-container-high flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-outline-variant/50" />
                  </div>
                </div>
              </div>

              {/* Arrow Connection */}
              {hasNext && (
                <div className="absolute left-[100%] top-1/2 -ml-1 h-[2px] w-8 z-0">
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
  )
}
