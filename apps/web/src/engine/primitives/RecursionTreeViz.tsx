import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface RecursionTreeState {
  nodes: {
    id: string
    label: string
    result?: string
    status: 'pending' | 'computing' | 'memoized' | 'complete'
    children: string[]
    x?: number // Pre-computed
    y?: number
  }[]
  rootId: string
}

export function RecursionTreeViz({ state }: PrimitiveProps) {
  const { nodes = [], rootId } = state as RecursionTreeState
  const getNode = (nodeId: string) => nodes.find((n) => n.id === nodeId)

  const connections: { from: { x: number; y: number }; to: { x: number; y: number }; id: string; pruned: boolean }[] = []
  nodes.forEach((node) => {
    node.children.forEach((childId) => {
      const child = getNode(childId)
      if (child && node.x !== undefined && node.y !== undefined && child.x !== undefined && child.y !== undefined) {
        connections.push({
          from: { x: node.x, y: node.y },
          to: { x: child.x, y: child.y },
          id: `${node.id}-${child.id}`,
          pruned: child.status === 'memoized',
        })
      }
    })
  })

  const SCALE_X = 70
  const SCALE_Y = 80

  return (
    <div className="relative flex items-center justify-center p-8 w-full min-h-[400px]">
      <div className="relative">
        <svg className="absolute inset-0 pointer-events-none overflow-visible z-0">
          {connections.map((conn) => {
            return (
              <motion.line
                key={conn.id}
                x1={conn.from.x * SCALE_X}
                y1={conn.from.y * SCALE_Y}
                x2={conn.to.x * SCALE_X}
                y2={conn.to.y * SCALE_Y}
                stroke={conn.pruned ? 'var(--color-outline-variant)' : 'var(--color-on-surface-variant)'} // highlight active connections
                strokeWidth="2"
                strokeDasharray={conn.pruned ? '4 4' : 'none'}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
              />
            )
          })}
        </svg>

        {nodes.map((node) => {
          if (node.x === undefined || node.y === undefined) return null

          const isComputing = node.status === 'computing'
          const isMemoized = node.status === 'memoized'
          const isComplete = node.status === 'complete'

          let bgColor = 'var(--color-surface-container)'
          let borderColor = 'var(--color-outline-variant)'
          let textColor = 'var(--color-on-surface)'
          let shadow = 'none'

          if (isComputing) {
            bgColor = 'rgba(183, 159, 255, 0.2)' // primary/20
            borderColor = 'var(--color-primary)'
            shadow = '0 0 16px rgba(183, 159, 255, 0.4)'
          } else if (isComplete) {
            bgColor = 'rgba(58, 223, 250, 0.15)' // secondary/15
            borderColor = 'var(--color-secondary)'
          } else if (isMemoized) {
            bgColor = 'var(--color-surface-container-highest)'
            textColor = 'var(--color-on-surface-variant)'
          }

          const isRoot = node.id === rootId
          return (
            <motion.div
              key={node.id}
              className="absolute flex flex-col items-center justify-center z-10"
              style={{
                top: `${node.y * SCALE_Y - 24}px`,
                left: `${node.x * SCALE_X - 40}px`,
                width: '80px',
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {isRoot && (
                <span className="absolute -top-5 text-[9px] font-mono font-bold uppercase text-primary bg-[var(--color-surface-container)] px-1 rounded">
                  root
                </span>
              )}
              {isMemoized && (
                <span className="absolute -top-5 text-[9px] font-mono font-bold uppercase text-tertiary outline-1 bg-[var(--color-surface-container-highest)] px-1 rounded">
                  Cached
                </span>
              )}
              <motion.div
                className={`flex flex-col items-center justify-center rounded-xl border-2 w-full py-1 ${isMemoized ? 'line-through decoration-outline-variant/60' : ''
                  }`}
                animate={{
                  backgroundColor: bgColor,
                  borderColor,
                  color: textColor,
                  boxShadow: shadow,
                }}
              >
                <div className="text-xs font-mono font-bold leading-tight">{node.label}</div>
                {node.result && (
                  <div className="text-[10px] font-mono text-secondary mt-1">={node.result}</div>
                )}
              </motion.div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
