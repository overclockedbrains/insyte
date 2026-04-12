/**
 * SystemDiagramViz — Phase 20: computeLayout() / dagre LR from @insyte/scene-engine
 * Phase 27: resolveHighlight() for component status colors. Stable node IDs.
 *
 * Positions are computed by the dagre left-to-right layout engine. The SVG
 * viewBox is set from the bounding box so content is never clipped. Phase 28
 * will upgrade this to ELK for orthogonal routing.
 */

'use client'

import { useMemo } from 'react'
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
import { computeLayout } from '@insyte/scene-engine'
import { useCanvas } from '../CanvasContext'
import { resolveHighlight } from '../styles/colors'

// ─── Constants ─────────────────────────────────────────────────────────────────
const NODE_W = 120
const NODE_H = 48

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SystemComponent {
  id: string
  label: string
  icon?: string
  status?: 'normal' | 'active' | 'overloaded' | 'dead'
  sublabel?: string
}

interface SystemConnection {
  from: string
  to: string
  label?: string
  style?: 'solid' | 'dashed'
  active?: boolean
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

/** Map component status → semantic highlight token */
function statusToHighlight(status: SystemComponent['status']): string | undefined {
  switch (status) {
    case 'active':     return 'active'
    case 'overloaded': return 'error'
    case 'dead':
    case 'normal':
    default:           return undefined
  }
}

// ─── Edge path helpers ─────────────────────────────────────────────────────────
function waypointsToPath(waypoints: { x: number; y: number }[]): string {
  if (waypoints.length < 2) return ''
  const [first, ...rest] = waypoints
  const d = [`M ${first!.x} ${first!.y}`]
  for (const p of rest) {
    d.push(`L ${p.x} ${p.y}`)
  }
  return d.join(' ')
}

function sCurvePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const sx = from.x + NODE_W / 2
  const sy = from.y
  const ex = to.x - NODE_W / 2
  const ey = to.y
  const mx = (sx + ex) / 2
  return `M ${sx} ${sy} C ${mx} ${sy} ${mx} ${ey} ${ex} ${ey}`
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function SystemDiagramViz({ id, state, visual }: PrimitiveProps) {
  const { width: canvasW, height: canvasH } = useCanvas()
  const { components = [], connections = [] } = state as SystemDiagramState

  const resolvedVisual = visual ?? { id, type: 'system-diagram' as const, initialState: {} }

  const layout = useMemo(
    () => computeLayout(resolvedVisual, state as Record<string, unknown>, canvasW, canvasH),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedVisual.id, state, canvasW, canvasH],
  )

  const posById = new Map(layout.nodes.map(n => [n.id, n]))
  const rawById = new Map(components.map(c => [c.id, c]))

  const idBase = `sys-${components.map(c => c.id).join('').slice(0, 8)}`

  const [,, vw] = layout.viewBox.split(' ').map(Number)

  return (
    <div className="flex items-center justify-center w-full min-h-[220px] overflow-visible">
      <svg
        viewBox={layout.viewBox}
        width="100%"
        style={{ overflow: 'visible', display: 'block', maxWidth: vw, height: 'auto' }}
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
          const fromNode = posById.get(conn.from)
          const toNode   = posById.get(conn.to)
          if (!fromNode || !toNode) return null

          const layoutEdge = layout.edges.find(e => e.from === conn.from && e.to === conn.to)
          const pathD = layoutEdge?.waypoints.length
            ? waypointsToPath(layoutEdge.waypoints)
            : sCurvePath(fromNode, toNode)

          if (!pathD) return null

          const isDashed  = conn.style === 'dashed'
          const isActive  = !!conn.active
          const strokeColor = isActive ? 'var(--color-secondary)' : 'var(--color-outline-variant)'
          const midX = (fromNode.x + toNode.x) / 2
          const midY = (fromNode.y + toNode.y) / 2

          return (
            <g key={`conn-${idx}`}>
              <motion.path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isActive ? 2.5 : 1.8}
                strokeDasharray={isActive ? '8 5' : isDashed ? '6 4' : undefined}
                markerEnd={isActive ? `url(#${idBase}-arrow-active)` : `url(#${idBase}-arrow)`}
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

        {/* ── Components ──
         * Phase 27: stable key = posNode.id. Status → resolveHighlight colors.
         */}
        {layout.nodes.map((posNode) => {
          const comp = rawById.get(posNode.id)
          if (!comp) return null

          const isDead = comp.status === 'dead'
          const isOverloaded = comp.status === 'overloaded'

          const highlightToken = statusToHighlight(comp.status)
          const colors = resolveHighlight(highlightToken)
          const isHighlighted = !!highlightToken

          const borderColor = isHighlighted ? colors.border : 'var(--color-outline-variant)'
          const shadow      = isHighlighted ? `0 0 16px ${colors.border}40` : 'none'

          const IconToUse = comp.icon && IconMap[comp.icon] ? IconMap[comp.icon]! : Server
          const Icon = IconToUse as React.ElementType

          return (
            <foreignObject
              key={posNode.id}
              x={posNode.x - NODE_W / 2}
              y={posNode.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              style={{ overflow: 'visible' }}
            >
              <div style={{ width: NODE_W, height: NODE_H }}>
                <motion.div
                  className={`w-full h-full flex flex-col items-center justify-center rounded-2xl border px-3 py-2.5 ${isDead ? 'grayscale opacity-40' : ''}`}
                  style={{ backgroundColor: 'var(--color-surface-container)', position: 'relative' }}
                  animate={{
                    borderColor,
                    boxShadow: shadow,
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

                  <div
                    className="mb-1.5"
                    style={{ color: isHighlighted ? colors.text : 'var(--color-on-surface-variant)' }}
                  >
                    <Icon size={22} />
                  </div>

                  <span
                    className={`text-[12px] font-bold tracking-wide text-center leading-tight ${isDead ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}
                  >
                    {comp.label}
                  </span>

                  {comp.sublabel && (
                    <span className="text-[10px] text-on-surface-variant mt-0.5">
                      {comp.sublabel}
                    </span>
                  )}

                  {isOverloaded && (
                    <div className="absolute -top-2.5 -right-2.5 bg-error text-on-error rounded-full p-0.5 animate-pulse shadow-lg">
                      <AlertTriangle size={12} />
                    </div>
                  )}
                  {comp.status === 'active' && (
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
