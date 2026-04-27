import { PRIMITIVE_SIZING, SPACING } from '../spacing'
import { computeLayoutResult } from '../utils'
import type { LayoutInput, LayoutResult } from '../types'

export function applyLinearLayout(input: LayoutInput): LayoutResult {
  // linear type — horizontal; variant drives sizing
  const variant = (input.visual as any).variant as string | undefined

  const sz = (() => {
    if (variant === 'linked-list') {
      const s = PRIMITIVE_SIZING.linkedList
      return { cellW: s.nodeWidth, cellH: s.nodeHeight, gap: s.gap }
    }
    if (variant === 'queue') {
      const s = PRIMITIVE_SIZING.queue
      return { cellW: s.itemWidth, cellH: s.itemHeight, gap: s.gap }
    }
    // array + fallback
    const s = PRIMITIVE_SIZING.array
    return { cellW: s.cellWidth, cellH: s.cellHeight, gap: s.gap }
  })()

  const state = input.state as { items?: any[] }
  const items = state.items ?? []

  const nodes = items.map((item: any, i: number) => ({
    id: item.id ?? `cell-${i}`,
    x: i * (sz.cellW + sz.gap) + sz.cellW / 2,
    y: sz.cellH / 2,
    width: sz.cellW,
    height: sz.cellH,
    type: input.visual.type,
    state: item as Record<string, unknown>,
  }))

  // linked-list: add pointer edges between adjacent nodes
  const edges = variant === 'linked-list'
    ? nodes.slice(0, -1).map((n, i) => ({
        id: `ll-edge-${i}`,
        from: n.id,
        to: nodes[i + 1]!.id,
        waypoints: [
          { x: n.x + sz.cellW / 2, y: n.y },
          { x: nodes[i + 1]!.x - sz.cellW / 2, y: nodes[i + 1]!.y },
        ],
      }))
    : []

  return computeLayoutResult(nodes, edges)
}

export function applyStackLayout(input: LayoutInput): LayoutResult {
  // Stack — vertical, bottom-to-top
  const s = PRIMITIVE_SIZING.stack
  const state = input.state as { items?: any[] }
  const items = [...(state.items ?? [])].reverse()  // top of stack = last item = rendered at top

  const nodes = items.map((item: any, i: number) => ({
    id: item.id ?? `stack-${i}`,
    x: s.itemWidth / 2,
    y: i * (s.itemHeight + SPACING.sm) + s.itemHeight / 2,
    width: s.itemWidth,
    height: s.itemHeight,
    type: input.visual.type,
    state: item as Record<string, unknown>,
  }))

  return computeLayoutResult(nodes, [])
}

export function applyGridLayout(input: LayoutInput): LayoutResult {
  // dp-table, grid — 2D grid
  const s = PRIMITIVE_SIZING.dpTable
  const state = input.state as { cells?: any[][]; rows?: any[][] }
  const rows = state.cells ?? state.rows ?? []

  const nodes = rows.flatMap((row: any[], ri: number) =>
    row.map((cell: any, ci: number) => ({
      id: cell.id ?? `cell-${ri}-${ci}`,
      x: ci * (s.cellWidth + SPACING.xs) + s.cellWidth / 2,
      y: ri * (s.cellHeight + SPACING.xs) + s.cellHeight / 2,
      width: s.cellWidth,
      height: s.cellHeight,
      type: input.visual.type,
      state: cell as Record<string, unknown>,
    }))
  )

  return computeLayoutResult(nodes, [])
}

export function applyHashmapLayout(input: LayoutInput): LayoutResult {
  const s = PRIMITIVE_SIZING.map
  const state = input.state as { buckets?: any[][]; entries?: any[] }

  // Normalize: entries may be flat or per-bucket
  const buckets: any[][] = state.buckets ?? [state.entries ?? []]

  const nodes = buckets.flatMap((bucket: any[], bi: number) =>
    (bucket || []).map((entry: any, ei: number) => ({
      id: entry.id ?? `bucket-${bi}-entry-${ei}`,
      x: (s.keyWidth + s.valueWidth + SPACING.sm) / 2,
      y: (bi * (s.bucketHeight + SPACING.xs) + s.bucketHeight / 2) + ei * (s.bucketHeight + SPACING.xs),
      width: s.keyWidth + s.valueWidth + SPACING.sm,
      height: s.bucketHeight,
      type: input.visual.type,
      state: entry as Record<string, unknown>,
    }))
  )

  return computeLayoutResult(nodes, [])
}


export function applyBarChartLayout(input: LayoutInput): LayoutResult {
  const s = PRIMITIVE_SIZING.barChart
  const state = input.state as { bars?: any[] }
  const bars = state.bars ?? []

  if (bars.length === 0) {
    return { nodes: [], edges: [], boundingBox: { minX: 0, minY: 0, maxX: 400, maxY: s.maxBarHeight + SPACING.xxl * 2 }, viewBox: `0 0 400 ${s.maxBarHeight + SPACING.xxl * 2}` }
  }

  const nodes = bars.map((bar: any, i: number) => ({
    id:     bar.id ?? `bar-${i}`,
    x:      i * (s.barWidth + s.barGap) + s.barWidth / 2,
    y:      s.maxBarHeight / 2,
    width:  s.barWidth,
    height: s.maxBarHeight,
    type:   input.visual.type,
    state:  bar as Record<string, unknown>,
  }))

  return computeLayoutResult(nodes, [])
}

export function applyRingLayout(input: LayoutInput): LayoutResult {
  const s = { nodeW: 120, nodeH: 48 }
  const state = input.state as { components?: any[]; connections?: any[] }
  const components = state.components ?? []
  const connections = state.connections ?? []

  const n = components.length
  if (n === 0) return { nodes: [], edges: [], boundingBox: { minX: 0, minY: 0, maxX: 400, maxY: 300 }, viewBox: '0 0 400 300' }

  const radius = Math.max(150, n * 40)
  const cx = radius + s.nodeW / 2 + SPACING.xxl
  const cy = radius + s.nodeH / 2 + SPACING.xxl

  const nodes = components.map((comp: any, i: number) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    return {
      id:     comp.id,
      x:      cx + radius * Math.cos(angle),
      y:      cy + radius * Math.sin(angle),
      width:  s.nodeW,
      height: s.nodeH,
      type:   input.visual.type,
      state:  comp as Record<string, unknown>,
    }
  })

  const nodeById = new Map(nodes.map(nd => [nd.id, nd]))
  const edges = connections.map((conn: any, i: number) => ({
    id:    conn.id ?? `ring-edge-${i}`,
    from:  conn.from,
    to:    conn.to,
    label: conn.label,
    waypoints: (() => {
      const src = nodeById.get(conn.from)
      const dst = nodeById.get(conn.to)
      if (!src || !dst) return []
      return [{ x: src.x, y: src.y }, { x: dst.x, y: dst.y }]
    })(),
  }))

  return computeLayoutResult(nodes, edges)
}

export function applyRadialLayout(input: LayoutInput): LayoutResult {
  // Circular placement for `radial` LayoutHint (e.g., hash rings, force-directed graphs).
  // Pure arithmetic — no external library dependency.
  const state = input.state as { nodes?: any[]; edges?: any[] }
  const stateNodes = state.nodes ?? []
  const stateEdges = state.edges ?? []

  const n = stateNodes.length
  if (n === 0) return { nodes: [], edges: [], boundingBox: { minX: 0, minY: 0, maxX: 400, maxY: 300 }, viewBox: '0 0 400 300' }

  const nodeW = 80
  const nodeH = 40
  // Scale radius with node count so nodes never overlap
  const radius = Math.max(120, n * 30)
  const cx = radius + nodeW / 2 + SPACING.xxl
  const cy = radius + nodeH / 2 + SPACING.xxl

  const nodes = stateNodes.map((node: any, i: number) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2  // start at top (12 o'clock)
    return {
      id: node.id,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      width: nodeW,
      height: nodeH,
      type: input.visual.type,
      state: node as Record<string, unknown>,
    }
  })

  const nodeById = new Map(nodes.map(nd => [nd.id, nd]))
  const edges = stateEdges.map((e: any, i: number) => ({
    id: e.id ?? `e-${i}`,
    from: e.from,
    to: e.to,
    label: e.label,
    waypoints: (() => {
      const src = nodeById.get(e.from)
      const dst = nodeById.get(e.to)
      if (!src || !dst) return []
      return [{ x: src.x, y: src.y }, { x: dst.x, y: dst.y }]
    })(),
  }))

  return computeLayoutResult(nodes, edges)
}
