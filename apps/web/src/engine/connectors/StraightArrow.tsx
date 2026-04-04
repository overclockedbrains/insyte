import { motion } from 'framer-motion'

interface StraightArrowProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  color?: string
  label?: string
  active?: boolean
}

export function StraightArrow({
  from,
  to,
  color = 'var(--color-outline-variant)',
  label,
  active,
}: StraightArrowProps) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const distance = Math.sqrt(dx * dx + dy * dy)

  return (
    <div
      className="absolute z-0 pointer-events-none origin-left flex items-center justify-center pointer-events-none"
      style={{
        left: from.x,
        top: from.y,
        width: distance,
        transform: `rotate(${angle}deg)`,
      }}
    >
      <motion.div
        className="w-full relative h-[2px]"
        style={{
          backgroundColor: active ? 'var(--color-secondary)' : color,
          boxShadow: active ? '0 0 8px var(--color-secondary)' : 'none',
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <motion.div
          className="absolute right-[-4px] top-[-3px] w-2 h-2"
          style={{
            borderTop: `2px solid ${active ? 'var(--color-secondary)' : color}`,
            borderRight: `2px solid ${active ? 'var(--color-secondary)' : color}`,
            transform: 'rotate(45deg)',
          }}
          animate={active ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={active ? { repeat: Infinity, duration: 1 } : {}}
        />
      </motion.div>
      {label && (
        <span
          className="absolute -top-5 text-[10px] font-mono text-on-surface-variant font-bold transition-colors select-none"
          style={{ transform: `rotate(${-angle}deg)` }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
