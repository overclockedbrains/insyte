import { useMemo } from 'react'
import type { SceneGraph } from '@insyte/scene-engine'
import type { ControlValue } from '@/src/engine/hooks/useControls'

/**
 * Returns a SceneGraph filtered by control-toggle showWhen conditions.
 *
 * The step engine always returns `true` for control-toggle (it has no access
 * to Zustand control state). This hook applies the actual toggle values,
 * removing hidden groups — and their nodes/edges — from the graph before
 * it reaches the renderer.
 *
 * Fast path: if no groups have control-toggle showWhen, the original
 * SceneGraph reference is returned unchanged (no allocation).
 */
export function useVisibleSceneGraph(
  sceneGraph: SceneGraph,
  controlValues: Record<string, ControlValue>,
): SceneGraph {
  return useMemo(() => {
    // Fast path — avoid allocation when nothing is control-toggled
    const hasControlToggle = [...sceneGraph.groups.values()].some(
      g => g.showWhen?.type === 'control-toggle',
    )
    if (!hasControlToggle) return sceneGraph

    const removedNodeIds = new Set<string>()
    const filteredGroups = new Map(sceneGraph.groups)

    for (const [id, group] of sceneGraph.groups) {
      if (!group.showWhen || group.showWhen.type !== 'control-toggle') continue
      const cond = group.showWhen
      const val = controlValues[cond.controlId]
      const visible = cond.value !== undefined ? val === cond.value : Boolean(val)
      if (!visible) {
        filteredGroups.delete(id)
        for (const nid of group.nodeIds) removedNodeIds.add(nid)
      }
    }

    // All groups were visible — return original reference
    if (filteredGroups.size === sceneGraph.groups.size) return sceneGraph

    const filteredNodes = new Map(sceneGraph.nodes)
    for (const nid of removedNodeIds) filteredNodes.delete(nid)

    const filteredEdges = new Map(sceneGraph.edges)
    for (const [eid, edge] of sceneGraph.edges) {
      if (removedNodeIds.has(edge.from) || removedNodeIds.has(edge.to)) {
        filteredEdges.delete(eid)
      }
    }

    return {
      ...sceneGraph,
      groups: filteredGroups,
      nodes: filteredNodes,
      edges: filteredEdges,
    }
  }, [sceneGraph, controlValues])
}
