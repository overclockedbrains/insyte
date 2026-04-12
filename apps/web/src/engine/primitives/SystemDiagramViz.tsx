/**
 * SystemDiagramViz — Phase 19 bridge: grid auto-layout
 *
 * x/y removed from scene JSON in Phase 19. Positions are now computed here
 * using a left-to-right grid arrangement.
 * Phase 20 will replace this with computeLayout() / dagre from @insyte/scene-engine.
 */

'use client'

import { motion } from 'framer-motion'
import {
  Server,
  Database,
  Smartphone,
  Globe,
  Cpu,
  AlertTriangle,
  Activity,
  Cloud,
  Shield,
  Layers,
  Zap,
} from 'lucide-react'
import type { PrimitiveProps } from '.'
import { computeViewBox } from '../CanvasContext'

// ─── Constants ─────────────────────────────────────────────────────────────────
const NODE_W    = 120  // component box width
const NODE_H    = 72   // component box height
const COL_GAP   = 80   // horizontal gap between component centres
const ROW_GAP   = 100  // vertical gap between component centres

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SystemComponent {
  id: string
  label: string
  icon?: string
  // x/y no longer in scene JSON — positions computed by bridge layout below
  x?: number
  y?: number
  status?: 'normal' | 'active' | 'overloaded' | 'dead'
  sublabel?: string
}

interface PositionedComponent extends SystemComponent {
  cx: number  // computed center x
  cy: number  // computed center y
}

interface SystemConnection {
  from: string
  to: string
  label?: string
  style?: 'solid' | 'dashed'
  active?: boolean
  showWhen?: { control: string; equals: unknown }
}

interface SystemDiagramState {
  components: SystemComponent[]
  connections: SystemConnection[]
}

// ─── Icon map ──────────────────────────────────────────────────────────────────
const IconMap: Record<string, React.ElementType> = {
  server:   Server,
  database: Database,
  mobile:   Smartphone,
  web:      Globe,
  compute:  Cpu,
  cloud:    Cloud,
  shield:   Shield,
  layers:   Layers,
  zap:      Zap,
}

// ─── Edge path ─────────────────────────────────────────────────────────────────
/**
 * S-curve cubic bezier between two component centers.
 * Connects right-edge of `from` to left-edge of `to` when laid out horizontally,
 * or adapts to arbitrary positions using a midpoint-based control-point strategy.
 */
function systemEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  // Use component centers — arrowhead already has refX so it sits on the edge
  const sx = from.x + NODE_W / 2
  const sy = from.y
  const ex = to.x - NODE_W / 2
  const ey = to.y
  const mx = (sx + ex) / 2
  return `M ${sx} ${sy} C ${mx} ${sy} ${mx} ${ey} ${ex} ${ey}`
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function SystemDiagramViz({ state }: PrimitiveProps) {
  const { components = [], connections = [] } = state as SystemDiagramState

  // TODO(Phase 20): replace with computeLayout() / dagre from @insyte/scene-engine
  // Bridge: left-to-right grid, ceil(sqrt(n)) columns
  const cols = Math.max(1, Math.ceil(Math.sqrt(components.length)))
  const positioned: PositionedComponent[] = components.map((c, i) => ({
    ...c,
    cx: (i % cols) * (NODE_W + COL_GAP) + NODE_W / 2 + COL_GAP / 2,
    cy: Math.floor(i / cols) * (NODE_H + ROW_GAP) + NODE_H / 2 + ROW_GAP / 2,
  }))

  const getComp = (id: string) => positioned.find((c) => c.id === id)

  const centerPoints = positioned.map((c) => ({ x: c.cx, y: c.cy }))
  const viewBox = computeViewBox(centerPoints, NODE_W, NODE_H, 36)
  const [, , vw] = viewBox.split(' ').map(Number)

  // Unique IDs for SVG markers
  const idBase = `sys-${components.map((c) => c.id).join('').slice(0, 8)}`

  return (
    <div className="flex items-center justify-center w-full min-h-[220px] overflow-visible">
      <svg
        viewBox={viewBox}
        width="100%"
        height="auto"
        style={{ overflow: 'visible', display: 'block', maxWidth: vw }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="System diagram visualization"
      >
        <defs>
          <marker id={`${idBase}-arrow`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--color-outline-variant)" />
          </marker>
          <marker id={`${idBase}-arrow-active`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--color-secondary)" />
          </marker>
        </defs>

        {/* ── Connections ── */}
        {connections.map((conn, idx) => {
          const from = getComp(conn.from)
          const to   = getComp(conn.to)
          if (!from || !to) return null

          const isDashed  = conn.style === 'dashed'
          const isActive  = !!conn.active
          const strokeColor = isActive
            ? 'var(--color-secondary)'
            : 'var(--color-outline-variant)'
          const midX = (from.cx + to.cx) / 2
          const midY = (from.cy + to.cy) / 2

          return (
            <g key={`conn-${idx}`}>
              <motion.path
                d={systemEdgePath({ x: from.cx, y: from.cy }, { x: to.cx, y: to.cy })}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isActive ? 2.5 : 1.8}
                strokeDasharray={isActive ? '8 5' : isDashed ? '6 4' : undefined}
                markerEnd={
                  isActive
                    ? `url(#${idBase}-arrow-active)`
                    : `url(#${idBase}-arrow)`
                }
                style={{
                  filter: isActive ? 'drop-shadow(0 0 5px var(--color-secondary))' : 'none',
                }}
                initial={{ strokeDashoffset: 0 }}
                animate={isActive ? { strokeDashoffset: [0, -26] } : { strokeDashoffset: 0 }}
                transition={
                  isActive
                    ? { repeat: Infinity, duration: 1.1, ease: 'linear' }
                    : { duration: 0 }
                }
              />
              {conn.label && (
                <text
                  x={midX}
                  y={midY - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--color-on-surface-variant)"
                  fontFamily="monospace"
                >
                  {conn.label}
                </text>
              )}
            </g>
          )
        })}

        {/* ── Components via foreignObject ── */}
        {positioned.map((comp) => {
          const isOverloaded = comp.status === 'overloaded'
          const isDead       = comp.status === 'dead'
          const isActive     = comp.status === 'active'

          let borderColor = 'var(--color-outline-variant)'
          let shadow      = 'none'
          if (isActive) {
            borderColor = 'var(--color-primary)'
            shadow      = '0 0 16px rgba(183, 159, 255, 0.20)'
          } else if (isOverloaded) {
            borderColor = 'var(--color-error)'
            shadow      = '0 0 12px rgba(255, 110, 132, 0.25)'
          }

          const IconToUse = comp.icon && IconMap[comp.icon] ? IconMap[comp.icon] : Server
          const Icon = IconToUse as React.ElementType

          return (
            <foreignObject
              key={comp.id}
              x={comp.cx - NODE_W / 2}
              y={comp.cy - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              style={{ overflow: 'visible' }}
            >
              <div style={{ width: NODE_W, height: NODE_H }}>
                <motion.div
                  className={`w-full h-full flex flex-col items-center justify-center rounded-2xl border px-3 py-2.5 ${isDead ? 'grayscale opacity-40' : ''}`}
                  style={{
                    backgroundColor: 'var(--color-surface-container)',
                    position: 'relative',
                  }}
                  animate={{
                    borderColor,
                    boxShadow: shadow,
                    // Shake for overloaded state — expressed as translateX px values
                    x: isOverloaded ? [0, -3, 3, -3, 0] : 0,
                  }}
                  transition={
                    isOverloaded
                      ? { repeat: Infinity, duration: 0.35, ease: 'easeInOut' }
                      : { duration: 0.2 }
                  }
                >
                  {/* Dead overlay */}
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
                    <span className="text-[10px] text-on-surface-variant mt-0.5">
                      {comp.sublabel}
                    </span>
                  )}

                  {/* Status badges — positioned relative to the foreignObject box */}
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
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
