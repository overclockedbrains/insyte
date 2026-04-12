import { Graph, layout } from '@dagrejs/dagre'
import { PRIMITIVE_SIZING, SPACING } from '../spacing'
import { computeLayoutResult } from '../utils'
import type { LayoutInput, LayoutResult, PositionedEdge } from '../types'

export function applyDagreLayout(
  input: LayoutInput,
  rankdir: 'TB' | 'LR' | 'BT' | 'RL' = 'TB'
): LayoutResult {
  const sizing = input.visual.type === 'system-diagram'
    ? PRIMITIVE_SIZING.systemDiagram
    : PRIMITIVE_SIZING.graph

  const g = new Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir,
    nodesep: sizing.nodesep,
    ranksep: sizing.ranksep,
    marginx: SPACING.xxl,
    marginy: SPACING.xxl,
  })

  const state = input.state as { nodes?: any[]; edges?: any[]; components?: any[]; connections?: any[] }

  // Support both "nodes/edges" (graph) and "components/connections" (system-diagram)
  const nodes = state.nodes ?? state.components ?? []
  const edges = state.edges ?? state.connections ?? []

  nodes.forEach((n: any) => {
    g.setNode(n.id, { width: sizing.nodeWidth, height: sizing.nodeHeight, label: n.label ?? n.id })
  })

  edges.forEach((e: any, i: number) => {
    // Guard: skip edges where source or target node is not registered
    if (!g.hasNode(e.from) || !g.hasNode(e.to)) return
    g.setEdge(e.from, e.to, { id: e.id ?? `e-${i}`, label: e.label })
  })

  layout(g)

  const positionedNodes = nodes.map((n: any) => {
    const pos = g.node(n.id) as { x: number; y: number } | undefined
    return {
      id: n.id,
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      width: sizing.nodeWidth,
      height: sizing.nodeHeight,
      type: input.visual.type,
      state: n as Record<string, unknown>,
    }
  })

  const positionedEdges: PositionedEdge[] = edges.flatMap((e: any, i: number) => {
    if (!g.hasNode(e.from) || !g.hasNode(e.to)) return []
    const edgeData = g.edge({ v: e.from, w: e.to }) as { points?: { x: number; y: number }[] } | undefined
    return [{
      id: e.id ?? `e-${i}`,
      from: e.from,
      to: e.to,
      label: e.label,
      waypoints: edgeData?.points ?? [],
    }]
  })

  return computeLayoutResult(positionedNodes, positionedEdges)
}
