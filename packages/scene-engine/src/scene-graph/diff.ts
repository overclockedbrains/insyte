import type { SceneGraph, SceneGraphDiff, SceneNode, SceneEdge } from './types'

/**
 * Diff two scene graphs to produce an add/remove/move/change set.
 * Used by the DOMRenderer (Phase 27) to drive targeted animations:
 *   added → scale-in animation
 *   removed → scale-out animation
 *   moved → FLIP position animation
 *   changed → color/highlight in-place animation
 */
export function diffSceneGraphs(prev: SceneGraph, next: SceneGraph): SceneGraphDiff {
  const added: SceneNode[] = []
  const removed: SceneNode[] = []
  const moved: SceneGraphDiff['moved'] = []
  const changed: SceneGraphDiff['changed'] = []

  for (const [id, nextNode] of next.nodes) {
    const prevNode = prev.nodes.get(id)
    if (!prevNode) {
      added.push(nextNode)
      continue
    }

    const positionChanged = prevNode.x !== nextNode.x || prevNode.y !== nextNode.y
    // State compare: JSON is fast for the small state objects we carry
    const stateChanged = JSON.stringify(prevNode.state) !== JSON.stringify(nextNode.state)

    if (positionChanged) {
      moved.push({ prev: prevNode, next: nextNode })
    } else if (stateChanged) {
      changed.push({ prev: prevNode, next: nextNode })
    }
  }

  for (const [id, prevNode] of prev.nodes) {
    if (!next.nodes.has(id)) {
      removed.push(prevNode)
    }
  }

  const addedEdges: SceneEdge[] = [...next.edges.values()].filter(e => !prev.edges.has(e.id))
  const removedEdges: SceneEdge[] = [...prev.edges.values()].filter(e => !next.edges.has(e.id))

  return { added, removed, moved, changed, addedEdges, removedEdges }
}
