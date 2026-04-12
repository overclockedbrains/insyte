import { hierarchy, tree } from 'd3-hierarchy'
import { PRIMITIVE_SIZING, SPACING } from '../spacing'
import { computeLayoutResult, emptyLayoutResult } from '../utils'
import type { LayoutInput, LayoutResult } from '../types'

export function applyD3HierarchyLayout(input: LayoutInput): LayoutResult {
  const isRecursion = input.visual.type === 'recursion-tree'
  const sizing = isRecursion ? PRIMITIVE_SIZING.recursionTree : PRIMITIVE_SIZING.tree
  const [nodeW, nodeH] = sizing.nodeSize

  const state = input.state as { root?: any; nodes?: any[]; rootId?: string }

  // Support two state shapes:
  //  1. { root: <nested object> }  — Phase 20 preferred shape
  //  2. { nodes: [...], rootId }    — legacy flat-array shape (Phase 19 bridge)
  let rootData: any = state.root

  if (!rootData && state.nodes && state.rootId) {
    // Build a nested tree from the flat nodes array so d3-hierarchy can process it
    const nodeMap = new Map<string, any>(state.nodes.map((n: any) => [n.id, { ...n }]))
    rootData = nodeMap.get(state.rootId) ?? state.nodes[0]

    // Attach children objects (not just IDs) for d3's hierarchy() traversal
    if (rootData) {
      nodeMap.forEach((n: any) => {
        if (n.children && Array.isArray(n.children)) {
          n.childNodes = n.children
            .map((cId: string) => nodeMap.get(cId))
            .filter(Boolean)
        }
      })
    }
  }

  if (!rootData) return emptyLayoutResult()

  const root = hierarchy(rootData, (d: any) => {
    // Support all tree shapes:
    //  - { left, right }        binary tree
    //  - { childNodes: [...] }  flattened children via bridge above
    //  - { children: [...] }    already nested objects
    if (d.childNodes) return d.childNodes
    if (d.left || d.right) return [d.left, d.right].filter(Boolean)
    if (d.children && d.children.length > 0 && typeof d.children[0] === 'object') return d.children
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
