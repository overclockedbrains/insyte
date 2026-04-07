import { motion } from 'framer-motion'
import { Server, Database, Smartphone, Globe, Cpu, AlertTriangle, Activity, Cloud, Shield, Layers, Zap } from 'lucide-react'
import type { PrimitiveProps } from '.'

interface SystemDiagramState {
  components: {
    id: string
    label: string
    icon?: string
    x: number
    y: number
    status?: 'normal' | 'active' | 'overloaded' | 'dead'
    sublabel?: string
  }[]
  connections: {
    from: string
    to: string
    label?: string
    style?: 'solid' | 'dashed'
    active?: boolean
    showWhen?: { control: string; equals: unknown }
  }[]
}

const IconMap: Record<string, React.ElementType> = {
  server: Server,
  database: Database,
  mobile: Smartphone,
  web: Globe,
  compute: Cpu,
  cloud: Cloud,
  shield: Shield,
  layers: Layers,
  zap: Zap,
}

export function SystemDiagramViz({ state }: PrimitiveProps) {
  const { components = [], connections = [] } = state as SystemDiagramState

  const getComponent = (cId: string) => components.find((c) => c.id === cId)

  const maxCompY = components.length > 0
    ? Math.max(...components.map(c => c.y)) + 80
    : 300
  const maxCompX = components.length > 0
    ? Math.max(...components.map(c => c.x)) + 100
    : 520

  return (
    <div className="relative w-full overflow-visible" style={{ minHeight: maxCompY, minWidth: Math.min(maxCompX, 520) }}>
      {/* Connections Layer */}
      <svg
        className="absolute inset-0 pointer-events-none z-0 overflow-visible"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          {/* Normal arrow marker */}
          <marker id="sys-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--color-outline-variant)" />
          </marker>
          {/* Active arrow marker */}
          <marker id="sys-arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--color-secondary)" />
          </marker>
        </defs>

        {connections.map((conn, idx) => {
          const from = getComponent(conn.from)
          const to = getComponent(conn.to)
          if (!from || !to) return null

          const isDashed = conn.style === 'dashed'
          const isActive = conn.active

          // Cubic bezier: horizontal S-curve
          const midX = (from.x + to.x) / 2
          const pathD = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`

          const strokeColor = isActive ? 'var(--color-secondary)' : 'var(--color-outline-variant)'

          return (
            <g key={`conn-${idx}`}>
              <motion.path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isActive ? 2.5 : 1.8}
                strokeDasharray={isActive ? '8 5' : isDashed ? '6 4' : undefined}
                markerEnd={isActive ? 'url(#sys-arrow-active)' : 'url(#sys-arrow)'}
                style={{
                  filter: isActive ? 'drop-shadow(0 0 5px var(--color-secondary))' : 'none',
                }}
                // Flowing dash animation on active connections
                animate={isActive ? { strokeDashoffset: [0, -26] } : { strokeDashoffset: 0 }}
                transition={
                  isActive
                    ? { repeat: Infinity, duration: 1.1, ease: 'linear' }
                    : { duration: 0 }
                }
              />
              {/* Connection label */}
              {conn.label && (
                <text
                  x={midX}
                  y={(from.y + to.y) / 2 - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--color-on-surface-variant)"
                  className="font-mono"
                >
                  {conn.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Components Layer */}
      {components.map((comp) => {
        const isOverloaded = comp.status === 'overloaded'
        const isDead = comp.status === 'dead'
        const isActive = comp.status === 'active'

        let borderColor = 'var(--color-outline-variant)'
        let shadow = 'none'

        if (isActive) {
          borderColor = 'var(--color-primary)'
          shadow = '0 0 16px rgba(183, 159, 255, 0.20)'
        } else if (isOverloaded) {
          borderColor = 'var(--color-error)'
          shadow = '0 0 12px rgba(255, 110, 132, 0.25)'
        }

        const IconToUse = comp.icon && IconMap[comp.icon] ? IconMap[comp.icon] : Server
        const Icon = IconToUse as React.ElementType

        return (
          <motion.div
            key={comp.id}
            className={`absolute flex flex-col items-center justify-center rounded-2xl border px-3 py-2.5 min-w-[110px] ${isDead ? 'grayscale opacity-40' : ''}`}
            style={{
              left: comp.x,
              top: comp.y,
              x: '-50%',
              y: '-50%',
              backgroundColor: 'var(--color-surface-container)',
              borderColor,
              boxShadow: shadow,
            }}
            // Shake animation for overloaded state
            animate={
              isOverloaded
                ? { x: ['-50%', '-52%', '-48%', '-52%', '-50%'] }
                : { x: '-50%' }
            }
            transition={
              isOverloaded
                ? { repeat: Infinity, duration: 0.35, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
          >
            {/* Dead overlay: X marks */}
            {isDead && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-2xl overflow-hidden">
                <div className="w-[110%] h-[2px] bg-error rotate-12 absolute" />
                <div className="w-[110%] h-[2px] bg-error -rotate-12 absolute" />
              </div>
            )}

            {/* Icon */}
            <div className={`mb-1.5 ${isActive ? 'text-primary' : isOverloaded ? 'text-error' : 'text-on-surface-variant'}`}>
              <Icon size={22} />
            </div>

            {/* Label */}
            <span className={`text-[12px] font-bold tracking-wide text-center leading-tight ${isDead ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
              {comp.label}
            </span>

            {/* Sublabel */}
            {comp.sublabel && (
              <span className="text-[10px] text-on-surface-variant mt-0.5">{comp.sublabel}</span>
            )}

            {/* Status badges */}
            {isOverloaded && (
              <div className="absolute -top-2.5 -right-2.5 bg-error text-on-error rounded-full p-0.5 animate-pulse shadow-lg">
                <AlertTriangle size={12} />
              </div>
            )}
            {isActive && (
              <div className="absolute -top-2.5 -right-2.5 bg-primary text-on-primary rounded-full p-0.5">
                <Activity size={12} />
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
