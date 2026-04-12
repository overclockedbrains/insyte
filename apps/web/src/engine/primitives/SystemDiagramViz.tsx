/**
 * SystemDiagramViz — Phase 18: Coordinate System Unification
 *
 * Rewritten from (DOM absolute pos + SVG overlay) dual-coordinate approach to a
 * single SVG viewBox + <foreignObject> pattern.  The minWidth hard-cap and
 * manual pixel-offset computation are removed — the SVG viewBox absorbs
 * all fitting automatically at any container size.
 *
 * Component boxes are <foreignObject> containing full React/Tailwind.
 * Connection beziers are <path> elements in the same coordinate space.
 * Both use component (cx, cy) as center points in SVG-unit space.
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
//
// Component x/y in scene JSON are absolute pixel values (legacy format from the
// old DOM absolute-positioning approach).  We keep them as-is here since the
// SVG viewBox auto-fits — no scaling factor needed.
//
const NODE_W = 120  // component box width  (matches old ~110px + padding)
const NODE_H = 72   // component box height

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SystemComponent {
  id: string
  label: string
  icon?: string
  x: number
  y: number
  status?: 'normal' | 'active' | 'overloaded' | 'dead'
  sublabel?: string
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

  const getComp = (id: string) => components.find((c) => c.id === id)

  // viewBox fits all components with padding
  const centerPoints = components.map((c) => ({ x: c.x, y: c.y }))
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
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2

          return (
            <g key={`conn-${idx}`}>
              <motion.path
                d={systemEdgePath(from, to)}
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
        {components.map((comp) => {
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
              // Center the box on comp.x, comp.y
              x={comp.x - NODE_W / 2}
              y={comp.y - NODE_H / 2}
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
