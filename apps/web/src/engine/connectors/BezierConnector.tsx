import { motion } from 'framer-motion'

interface BezierConnectorProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  active?: boolean
}

export function BezierConnector({ from, to, active }: BezierConnectorProps) {
  // Compute control points for a smooth S-curve horizontally
  const dx = Math.abs(to.x - from.x)
  const cp1 = { x: from.x + dx / 2, y: from.y }
  const cp2 = { x: to.x - dx / 2, y: to.y }

  const pathD = `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-0">
      <motion.path
        d={pathD}
        className="transition-colors duration-500"
        style={{
          fill: 'none',
          stroke: active ? 'var(--color-secondary)' : 'var(--color-outline-variant)',
          strokeWidth: 2,
          filter: active ? 'drop-shadow(0 0 8px var(--color-secondary))' : 'none',
        }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </svg>
  )
}
