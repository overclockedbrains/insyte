import { hierarchy, tree } from 'd3-hierarchy'
import { PRIMITIVE_SIZING, SPACING } from '../spacing'
import { computeLayoutResult, emptyLayoutResult } from '../utils'
import type { LayoutInput, LayoutResult } from '../types'

export function applyD3HierarchyLayout(input: LayoutInput): LayoutResult {
  const variant = (input.visual as any).variant as string | undefined
  const isRecursion = variant === 'recursion'
  const isTrie      = variant === 'trie'
  const sizing = isRecursion
    ? PRIMITIVE_SIZING.recursionTree
    : isTrie
      ? PRIMITIVE_SIZING.trie
      : PRIMITIVE_SIZING.tree
  const [nodeW, nodeH] = sizing.nodeSize

  const state = input.state as { nodes?: any[]; rootId?: string }

  if (!state.nodes || !state.rootId) return emptyLayoutResult()

  // Build nested tree from flat nodes array so d3-hierarchy can process it
  const nodeMap = new Map<string, any>(state.nodes.map((n: any) => [n.id, { ...n }]))
  const rootData = nodeMap.get(state.rootId) ?? state.nodes[0]
  if (!rootData) return emptyLayoutResult()

  // Attach children objects (not just IDs) for d3's hierarchy() traversal
  nodeMap.forEach((n: any) => {
    if (n.children && Array.isArray(n.children)) {
      n.childNodes = n.children
        .map((cId: string) => nodeMap.get(cId))
        .filter(Boolean)
    }
  })

  const root = hierarchy(rootData, (d: any) => {
    if (d.childNodes) return d.childNodes
    return null
  })

  // Reingold-Tilford via d3.tree()
  const treeLayout = tree<any>().nodeSize([nodeW + SPACING.md, nodeH + SPACING.xl])
  treeLayout(root)

  const positionedNodes = root.descendants().map(d => ({
    id: d.data.id ?? String(d.data.value ?? d.depth),
    x: d.x!,
    y: d.y!,
    width: nodeW,
    height: nodeH,
    type: input.visual.type,
    state: d.data as Record<string, unknown>,
  }))

  const positionedEdges = root.links().map((link, i) => ({
    id: `tree-edge-${i}`,
    from: link.source.data.id ?? String(link.source.data.value),
    to: link.target.data.id ?? String(link.target.data.value),
    waypoints: [
      { x: link.source.x!, y: link.source.y! + nodeH / 2 },
      { x: link.target.x!, y: link.target.y! - nodeH / 2 },
    ],
  }))

  return computeLayoutResult(positionedNodes, positionedEdges)
}
