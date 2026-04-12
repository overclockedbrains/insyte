import { applyDagreLayout } from './algorithms/dagre'
import { applyD3HierarchyLayout } from './algorithms/d3-hierarchy'
import {
  applyLinearLayout, applyStackLayout, applyGridLayout,
  applyHashmapLayout, applySlotLayout, applyRadialLayout,
} from './algorithms/arithmetic'
import { emptyLayoutResult, computeViewBox } from './utils'
import type { LayoutResult, LayoutInput } from './types'
import type { Visual } from '../types'   // direct internal import — NOT '@insyte/scene-engine' (self-reference)

// Layout cache: topology hash → LayoutResult
const layoutCache = new Map<string, LayoutResult>()

/**
 * Hash only topology (node IDs + edges), not visual state (colors, highlights).
 * Same topology hash → same computed positions → cache hit.
 */
function hashTopology(visual: Visual, state: Record<string, unknown>): string {
  const type = visual.type

  if (type === 'tree' || type === 'recursion-tree') {
    // Trees store structure in a `root` object, not a flat `nodes` array
    const s = state as any
    if (s.root) {
      const rootHash = hashTreeNode(s.root)
      return `${visual.id}|${type}|${rootHash}`
    }
    // Legacy flat-array shape: hash by IDs
    const nodes: any[] = s.nodes ?? []
    return `${visual.id}|${type}|${nodes.map((n: any) => n.id).join(',')}`
  }

  if (type === 'array' || type === 'queue' || type === 'linked-list') {
    const s = state as any
    const items = s.cells ?? s.items ?? s.nodes ?? []
    return `${visual.id}|${type}|${JSON.stringify(items.map((n: any) => n.id ?? n.value))}`
  }

  if (type === 'dp-table' || type === 'grid') {
    const s = state as any
    const rows = s.cells ?? s.rows ?? []
    return `${visual.id}|${type}|${rows.length}x${((rows as any[])[0] ?? []).length}`
  }

  if (type === 'hashmap') {
    const s = state as any
    const buckets: any[][] = s.buckets ?? [s.entries ?? []]
    return `${visual.id}|${type}|${JSON.stringify(buckets.map((b: any[]) => b.length))}`
  }

  // graph, system-diagram, radial — topology = node IDs + edge pairs
  const s = state as any
  const nodes: any[] = s.nodes ?? s.components ?? []
  const edges: any[] = s.edges ?? s.connections ?? []
  return `${visual.id}|${type}|${JSON.stringify(nodes.map((n: any) => n.id))}|${JSON.stringify(edges.map((e: any) => `${e.from}→${e.to}`))}`
}

/** Recursively hash tree structure by identity (id or value), ignoring highlights/state. */
function hashTreeNode(node: any): string {
  if (!node) return 'null'
  const id = String(node.id ?? node.value ?? '?')
  // Support both binary trees (left/right) and n-ary trees (children)
  const children = node.children
    ? node.children.map(hashTreeNode).join(',')
    : `${hashTreeNode(node.left ?? null)},${hashTreeNode(node.right ?? null)}`
  return `${id}(${children})`
}

export function computeLayout(
  visual: Visual,
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

  switch (visual.type) {
    case 'tree':
    case 'recursion-tree':
      result = applyD3HierarchyLayout(input)
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
      result = applyDagreLayout(input, 'LR')  // Phase 28 upgrades this to ELK; dagre used here
      break

    case 'array':
    case 'linked-list':
    case 'queue':
      result = applyLinearLayout(input)
      break

    case 'stack':
      result = applyStackLayout(input)
      break

    case 'dp-table':
    case 'grid':
      result = applyGridLayout(input)
      break

    case 'hashmap':
      result = applyHashmapLayout(input)
      break

    case 'text-badge':
    case 'counter':
      result = applySlotLayout(input, containerWidth, containerHeight)
      break

    default:
      result = emptyLayoutResult()
  }

  layoutCache.set(topoHash, result)
  return result
}

// computeViewBox re-exported for callers that need to convert a boundingBox to SVG viewBox string
export { computeViewBox }
