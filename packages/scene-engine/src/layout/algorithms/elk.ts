/**
 * ELK layout adapter — Phase 28.
 *
 * Converts the scene-engine LayoutInput into an ELK graph JSON object,
 * delegates to the injected `runELK` function (which runs in a Web Worker
 * on the apps/web side), then converts the ELK output back to LayoutResult.
 *
 * This module is pure: no browser APIs, no Worker instantiation.
 * The `runELK` parameter is injected at startup via `setELKRunner()` in
 * layout/index.ts so the package stays browser-API free.
 */

import { PRIMITIVE_SIZING, SPACING } from '../spacing'
import { computeLayoutResult } from '../utils'
import type { LayoutInput, LayoutResult, PositionedNode, PositionedEdge } from '../types'

// ─── ELK graph shape (minimal subset we build) ───────────────────────────────

interface ELKLabel  { text: string }
interface ELKPort   { id: string; properties: Record<string, string> }
interface ELKChildNode {
  id: string
  width: number
  height: number
  labels?: ELKLabel[]
  ports?: ELKPort[]
}

interface ELKEdgeSection {
  startPoint:  { x: number; y: number }
  endPoint:    { x: number; y: number }
  bendPoints?: { x: number; y: number }[]
}

interface ELKResultEdge {
  id: string
  sources: string[]
  targets: string[]
  labels?: ELKLabel[]
  sections?: ELKEdgeSection[]
}

interface ELKResultNode extends ELKChildNode {
  x?: number
  y?: number
  children?: ELKResultNode[]
  edges?: ELKResultEdge[]
}

interface ELKInputGraph {
  id: string
  layoutOptions: Record<string, string>
  children: ELKChildNode[]
  edges: {
    id: string
    sources: string[]
    targets: string[]
    labels?: ELKLabel[]
  }[]
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

export async function applyELKLayout(
  input: LayoutInput,
  runELK: (graph: object) => Promise<object>,
): Promise<LayoutResult> {
  const sizing = PRIMITIVE_SIZING.systemDiagram

  const raw = input.state as {
    components?: any[]
    connections?: any[]
    nodes?: any[]
    edges?: any[]
  }

  const nodes: any[] = raw.components ?? raw.nodes ?? []
  const edges: any[] = raw.connections ?? raw.edges ?? []

  if (nodes.length === 0) {
    // Nothing to lay out — return empty result immediately
    const { emptyLayoutResult } = await import('../utils')
    return emptyLayoutResult()
  }

  // Build ELK graph
  const elkGraph: ELKInputGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm':                               'layered',
      'elk.direction':                               'RIGHT',
      'elk.edgeRouting':                             'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers':   String(sizing.ranksep),
      'elk.spacing.nodeNode':                        String(sizing.nodesep),
      'elk.layered.unnecessaryBendpoints':           'true',
      'elk.layered.nodePlacement.strategy':          'BRANDES_KOEPF',
      'elk.padding':                                 `[top=${SPACING.xxl},left=${SPACING.xxl},bottom=${SPACING.xxl},right=${SPACING.xxl}]`,
    },
    children: nodes.map((n: any): ELKChildNode => ({
      id: n.id,
      width:  sizing.nodeWidth,
      height: sizing.nodeHeight,
      labels: [{ text: n.label ?? n.id }],
      ports: [
        { id: `${n.id}-left`,   properties: { 'port.side': 'WEST'  } },
        { id: `${n.id}-right`,  properties: { 'port.side': 'EAST'  } },
        { id: `${n.id}-top`,    properties: { 'port.side': 'NORTH' } },
        { id: `${n.id}-bottom`, properties: { 'port.side': 'SOUTH' } },
      ],
    })),
    edges: edges
      .filter((e: any) => {
        const nodeIds = new Set(nodes.map((n: any) => n.id))
        return nodeIds.has(e.from) && nodeIds.has(e.to)
      })
      .map((e: any, i: number) => ({
        id:      e.id ?? `e-${i}`,
        sources: [`${e.from}-right`],
        targets: [`${e.to}-left`],
        labels:  e.label ? [{ text: e.label }] : [],
      })),
  }

  const layout = await runELK(elkGraph) as ELKResultNode

  // Convert ELK output → LayoutResult
  const positionedNodes: PositionedNode[] = (layout.children ?? []).map((elkNode: ELKResultNode) => ({
    id:     elkNode.id,
    x:      (elkNode.x ?? 0) + elkNode.width / 2,   // ELK gives top-left; convert to centre
    y:      (elkNode.y ?? 0) + elkNode.height / 2,
    width:  elkNode.width,
    height: elkNode.height,
    type:   input.visual.type,
    state:  nodes.find((n: any) => n.id === elkNode.id) ?? {},
  }))

  const positionedEdges: PositionedEdge[] = (layout.edges ?? []).map((elkEdge: ELKResultEdge) => ({
    id:    elkEdge.id,
    from:  stripPortSuffix(elkEdge.sources[0] ?? ''),
    to:    stripPortSuffix(elkEdge.targets[0] ?? ''),
    label: elkEdge.labels?.[0]?.text,
    waypoints: buildWaypoints(elkEdge),
  }))

  return computeLayoutResult(positionedNodes, positionedEdges)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert ELK edge sections (start + bendPoints + end) to a flat waypoints array. */
function buildWaypoints(elkEdge: ELKResultEdge): { x: number; y: number }[] {
  const section = elkEdge.sections?.[0]
  if (!section) return []

  const pts: { x: number; y: number }[] = [section.startPoint]
  if (section.bendPoints) pts.push(...section.bendPoints)
  pts.push(section.endPoint)
  return pts
}

/** Strip the port-side suffix from an ELK port ID to get the node ID. */
function stripPortSuffix(portId: string): string {
  return portId.replace(/-(right|left|top|bottom)$/, '')
}
