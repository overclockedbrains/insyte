import { motion } from 'framer-motion'
import { Server, Database, Smartphone, Globe, Cpu, AlertTriangle, Activity } from 'lucide-react'
import type { PrimitiveProps } from '.'

interface SystemDiagramState {
  components: {
    id: string
    label: string
    icon?: string
    x: number
    y: number
    status?: 'normal' | 'active' | 'overloaded' | 'dead'
  }[]
  connections: {
    from: string
    to: string
    label?: string
    style?: 'solid' | 'dashed'
    active?: boolean
  }[]
}

const IconMap: Record<string, React.ElementType> = {
  server: Server,
  database: Database,
  mobile: Smartphone,
  web: Globe,
  compute: Cpu,
}

export function SystemDiagramViz({ state }: PrimitiveProps) {
  const { components = [], connections = [] } = state as SystemDiagramState

  const getComponent = (cId: string) => components.find((c) => c.id === cId)

  const maxCompY = components.length > 0
    ? Math.max(...components.map(c => c.y)) + 80
    : 300

  // Use raw coordinates as pixels directly for HLD (flexible canvas)
  return (
    <div className="relative w-full overflow-visible" style={{ minHeight: maxCompY }}>
      {/* Connections Layer */}
      <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
        <defs>
          <marker id="sys-arrow" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-outline-variant)" />
          </marker>
          <marker id="sys-arrow-active" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-secondary)" />
          </marker>
        </defs>
        {connections.map((conn, idx) => {
          const from = getComponent(conn.from)
          const to = getComponent(conn.to)
          if (!from || !to) return null

          const isDashed = conn.style === 'dashed'
          const isActive = conn.active
          const color = isActive ? 'var(--color-secondary)' : 'var(--color-outline-variant)'

          return (
            <motion.line
              key={`conn-${idx}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={isActive ? 3 : 2}
              strokeDasharray={isDashed ? '6 6' : 'none'}
              markerEnd={isActive ? 'url(#sys-arrow-active)' : 'url(#sys-arrow)'}
              className="transition-colors duration-300"
              style={{
                filter: isActive ? 'drop-shadow(0 0 6px var(--color-secondary))' : 'none',
              }}
            />
          )
        })}
      </svg>

      {/* Components Layer */}
      {components.map((comp) => {
        const isOverloaded = comp.status === 'overloaded'
        const isDead = comp.status === 'dead'
        const isActive = comp.status === 'active'

        const bgColor = 'var(--color-surface-container)' // surface-container
        let borderColor = 'var(--color-outline-variant)' // outline-variant
        let shadow = 'none'

        if (isActive) {
          borderColor = 'var(--color-primary)'
          shadow = '0 0 12px rgba(183, 159, 255, 0.2)'
        } else if (isOverloaded) {
          borderColor = 'var(--color-error)'
        }

        const IconToUse = comp.icon && IconMap[comp.icon] ? IconMap[comp.icon] : Server
        const Icon = IconToUse as React.ElementType

        return (
          <motion.div
            key={comp.id}
            className={`absolute flex flex-col items-center justify-center rounded-2xl border px-4 py-3 min-w-[120px] transition-colors ${isDead ? 'grayscale opacity-40' : ''
              }`}
            style={{
              left: comp.x,
              top: comp.y,
              x: '-50%',
              y: '-50%',
              backgroundColor: bgColor,
              borderColor: borderColor,
              boxShadow: shadow,
            }}
            animate={isOverloaded ? { x: ['-50%', '-52%', '-48%', '-50%'] } : {}}
            transition={isOverloaded ? { repeat: Infinity, duration: 0.3 } : {}}
          >
            {isDead && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="w-[120%] h-[2px] bg-error rotate-12" />
                <div className="w-[120%] h-[2px] bg-error -rotate-12 absolute" />
              </div>
            )}

            <div className={`mb-2 ${isActive ? 'text-primary' : isOverloaded ? 'text-error' : 'text-on-surface-variant'}`}>
              <Icon size={24} />
            </div>

            <span className={`text-sm font-bold tracking-wide ${isDead ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
              {comp.label}
            </span>

            {isOverloaded && (
              <div className="absolute -top-3 -right-3 bg-error text-on-error rounded-full p-1 animate-pulse shadow-lg">
                <AlertTriangle size={14} />
              </div>
            )}
            {isActive && (
              <div className="absolute -top-3 -right-3 bg-primary text-on-primary rounded-full p-1">
                <Activity size={14} />
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
