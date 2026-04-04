import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface TreeState {
  nodes: {
    id: string
    value: string
    children: string[]
    highlight?: string
    x: number // Pre-computed layout coords
    y: number
  }[]
  rootId: string
}

export function TreeViz({ state }: PrimitiveProps) {
  const { nodes = [], rootId } = state as TreeState

  // Helper to find node by id
  const getNode = (nodeId: string) => nodes.find((n) => n.id === nodeId)

  // Compute all parent-child connections
  const connections: { from: { x: number; y: number }; to: { x: number; y: number }; id: string }[] = []
  nodes.forEach((node) => {
    node.children.forEach((childId) => {
      const child = getNode(childId)
      if (child) {
        connections.push({
          from: { x: node.x, y: node.y },
          to: { x: child.x, y: child.y },
          id: `${node.id}-${child.id}`,
        })
      }
    })
  })

  // Normalize grid coordinates to pixel positions (assume base spacing)
  // Scene generator should provide nice relative coordinates like x: 0, 1, -1, y: 0, 1, 2
  // We'll scale them by a factor. Let's assume generic scaling (e.g. 60px per unit)
  const SCALE_X = 60
  const SCALE_Y = 80

  return (
    <div className="relative flex items-center justify-center p-8 w-full min-h-[300px]">
      {/* Container holding coordinates relatively centered */}
      <div className="relative">
        {/* Draw Edges */}
        <svg className="absolute inset-0 pointer-events-none overflow-visible z-0">
          {connections.map((conn) => {
            const fx = conn.from.x * SCALE_X
            const fy = conn.from.y * SCALE_Y
            const tx = conn.to.x * SCALE_X
            const ty = conn.to.y * SCALE_Y
            return (
              <line
                key={conn.id}
                x1={fx}
                y1={fy}
                x2={tx}
                y2={ty}
                stroke="var(--color-outline-variant)"
                strokeWidth="2"
              />
            )
          })}
        </svg>

        {/* Draw Nodes */}
        {nodes.map((node) => {
          const isRoot = node.id === rootId
          return (
            <motion.div
              key={node.id}
              className="absolute w-12 h-12 flex items-center justify-center rounded-full border-2 text-sm font-bold font-mono z-10"
              style={{
                top: `${node.y * SCALE_Y - 24}px`, // -24 to center (48px / 2)
                left: `${node.x * SCALE_X - 24}px`,
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: 1,
                scale: 1,
                backgroundColor: node.highlight ? node.highlight : 'var(--color-surface-container)',
                borderColor: isRoot && !node.highlight ? 'var(--color-primary)' : node.highlight ? node.highlight : 'var(--color-outline-variant)',
                color: node.highlight ? 'var(--color-on-primary-fixed)' : 'var(--color-on-surface)',
                boxShadow: node.highlight
                  ? (node.highlight.startsWith('var')
                    ? `0 0 16px color-mix(in srgb, ${node.highlight} 38%, transparent)`
                    : `0 0 16px ${node.highlight}60`)
                  : isRoot ? '0 0 10px color-mix(in srgb, var(--color-primary) 30%, transparent)' : 'none',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {node.value}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
