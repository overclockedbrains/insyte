import { applyDagreLayout } from './algorithms/dagre'
import { applyD3HierarchyLayout } from './algorithms/d3-hierarchy'
import {
  applyLinearLayout, applyStackLayout, applyGridLayout,
  applyHashmapLayout, applyRadialLayout,
  applyBarChartLayout, applyRingLayout,
} from './algorithms/arithmetic'
import { emptyLayoutResult, computeViewBox } from './utils'
import type { LayoutResult, LayoutInput } from './types'
import type { CanvasVisual } from '../types'

// Layout cache: topology hash → LayoutResult
const layoutCache = new Map<string, LayoutResult>()

/**
 * Hash only topology (node IDs + edges), not visual state (colors, highlights).
 * Same topology hash → same computed positions → cache hit.
 */
function hashTopology(visual: CanvasVisual, state: Record<string, unknown>): string {
  const type = visual.type
  const variant = (visual as any).variant as string | undefined

  if (type === 'tree') {
    const s = state as any
    const nodes: any[] = s.nodes ?? []
    return `${visual.id}|${type}|${variant ?? ''}|${nodes.map((n: any) => n.id).join(',')}`
  }

  if (type === 'linear') {
    const s = state as any
    const items: any[] = s.items ?? []
    return `${visual.id}|${type}|${variant ?? ''}|${JSON.stringify(items.map((n: any) => n.id ?? n.value))}`
  }

  if (type === 'grid') {
    const s = state as any
    const rows: any[][] = s.cells ?? []
    return `${visual.id}|${type}|${variant ?? ''}|${rows.length}x${(rows[0] ?? []).length}`
  }

  if (type === 'map') {
    const s = state as any
    const entries: any[] = s.entries ?? []
    return `${visual.id}|${type}|${entries.length}`
  }

  if (type === 'chart') {
    const s = state as any
    const bars: any[] = s.bars ?? []
    return `${visual.id}|chart|${bars.map((b: any) => b.id).join(',')}`
  }

  // graph, system-diagram — topology = node IDs + edge pairs
  const s = state as any
  const nodes: any[] = s.nodes ?? s.components ?? []
  const edges: any[] = s.edges ?? s.connections ?? []
  return `${visual.id}|${type}|${JSON.stringify(nodes.map((n: any) => n.id))}|${JSON.stringify(edges.map((e: any) => `${e.from}-${e.to}`))}`
}

export function computeLayout(
  visual: CanvasVisual,
  state: Record<string, unknown>,
  containerWidth = 800,
  containerHeight = 600
): LayoutResult {
  const topoHash = hashTopology(visual, state)

  // Cache hit — topology unchanged, reuse layout
  if (layoutCache.has(topoHash)) return layoutCache.get(topoHash)!

  const input: LayoutInput = { visual, state }
  let result: LayoutResult

  const hint = visual.layoutHint
  const variant = (visual as any).variant as string | undefined

  switch (visual.type) {
    case 'tree':
      result = applyD3HierarchyLayout(input)
      break

    case 'linear':
      if (variant === 'stack') {
        result = applyStackLayout(input)
      } else {
        result = applyLinearLayout(input)
      }
      break

    case 'graph':
      if (hint === 'radial') {
        result = applyRadialLayout(input)
      } else {
        result = applyDagreLayout(input,
          hint === 'dagre-LR' ? 'LR' :
          hint === 'dagre-BT' ? 'BT' : 'TB'
        )
      }
      break

    case 'system-diagram':
      result = hint === 'ring'
        ? applyRingLayout(input)
        : applyDagreLayout(input, 'LR')
      break

    case 'chart':
      result = applyBarChartLayout(input)
      break

    case 'grid':
      result = applyGridLayout(input)
      break

    case 'map':
      result = applyHashmapLayout(input)
      break

    default:
      result = emptyLayoutResult()
  }

  layoutCache.set(topoHash, result)
  return result
}

// computeViewBox re-exported for callers that need to convert a boundingBox to SVG viewBox string
export { computeViewBox }
