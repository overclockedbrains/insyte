import type { LayoutResult, PositionedNode, PositionedEdge } from './types'

export function computeLayoutResult(nodes: PositionedNode[], edges: PositionedEdge[]): LayoutResult {
  if (nodes.length === 0) return emptyLayoutResult()

  const minX = Math.min(...nodes.map(n => n.x - n.width / 2))
  const minY = Math.min(...nodes.map(n => n.y - n.height / 2))
  const maxX = Math.max(...nodes.map(n => n.x + n.width / 2))
  const maxY = Math.max(...nodes.map(n => n.y + n.height / 2))
  const bb = { minX, minY, maxX, maxY }

  return { nodes, edges, boundingBox: bb, viewBox: computeViewBox(bb) }
}

export function emptyLayoutResult(): LayoutResult {
  return { nodes: [], edges: [], boundingBox: { minX: 0, minY: 0, maxX: 400, maxY: 300 }, viewBox: '0 0 400 300' }
}

export function computeViewBox(bb: LayoutResult['boundingBox'], padding = 40): string {
  const w = bb.maxX - bb.minX + padding * 2
  const h = bb.maxY - bb.minY + padding * 2
  return `${bb.minX - padding} ${bb.minY - padding} ${w} ${h}`
}
