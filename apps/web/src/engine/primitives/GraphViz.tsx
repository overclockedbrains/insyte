import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface GraphState {
  nodes: {
    id: string
    label: string
    x: number // Pre-computed pre-scaled coords or generic grids
    y: number
    color?: string
  }[]
  edges: {
    from: string
    to: string
    directed?: boolean
    highlighted?: boolean
  }[]
}

export function GraphViz({ state }: PrimitiveProps) {
  const { nodes = [], edges = [] } = state as GraphState

  const getNode = (nodeId: string) => nodes.find((n) => n.id === nodeId)

  const SCALE_X = 70
  const SCALE_Y = 70

  const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.x)) : 1
  const maxY = nodes.length > 0 ? Math.max(...nodes.map(n => n.y)) : 1
  const containerWidth = maxX * SCALE_X + 96
  const containerHeight = maxY * SCALE_Y + 96

  return (
    <div className="flex items-center justify-center p-4 w-full overflow-visible">
      <div className="relative flex-shrink-0" style={{ width: containerWidth, height: containerHeight }}>
        <svg
          style={{ width: containerWidth, height: containerHeight }}
          className="absolute inset-0 pointer-events-none z-0 overflow-visible"
        >
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="24" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-secondary-fixed)" />
            </marker>
            <marker id="arrow-dim" markerWidth="10" markerHeight="7" refX="24" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-outline-variant)" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const source = getNode(edge.from)
            const target = getNode(edge.to)
            if (!source || !target) return null

            const fx = source.x * SCALE_X
            const fy = source.y * SCALE_Y
            const tx = target.x * SCALE_X
            const ty = target.y * SCALE_Y
            const isHighlight = edge.highlighted
            const color = isHighlight ? 'var(--color-secondary)' : 'var(--color-outline-variant)'

            return (
              <motion.line
                key={`${edge.from}-${edge.to}`}
                x1={fx}
                y1={fy}
                x2={tx}
                y2={ty}
                stroke={color}
                strokeWidth={isHighlight ? 3 : 2}
                markerEnd={edge.directed ? (isHighlight ? 'url(#arrow)' : 'url(#arrow-dim)') : ''}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                style={{
                  filter: isHighlight ? `drop-shadow(0 0 8px ${color}80)` : 'none',
                }}
              />
            )
          })}
        </svg>

        {nodes.map((node) => {
          return (
            <motion.div
              key={node.id}
              className="absolute w-14 h-14 flex items-center justify-center rounded-full border-2 font-bold font-mono z-10"
              style={{
                top: `${node.y * SCALE_Y - 28}px`,
                left: `${node.x * SCALE_X - 28}px`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                backgroundColor: node.color ? node.color : 'var(--color-surface-container)',
                borderColor: node.color ? node.color : 'var(--color-outline-variant)',
                color: node.color ? '#000000' : 'var(--color-on-surface)',
                boxShadow: node.color ? `0 0 16px ${node.color}60` : 'none',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <span style={{ whiteSpace: 'pre-wrap', fontSize: '9px', lineHeight: '1.2', textAlign: 'center' }}>
                {node.label}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
