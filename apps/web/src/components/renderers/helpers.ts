import { SceneGraph, SceneGroup } from "@insyte/scene-engine"

/**
 * Extract the full visual state from the SceneGraph for a group.
 * All nodes in a group carry the same state snapshot (the visual's state at
 * this step), so reading the first node is sufficient.
 */
export const getGroupState = (group: SceneGroup, sceneGraph: SceneGraph): Record<string, unknown> => {
  const firstId = group.nodeIds[0]
  if (!firstId) return {}
  return sceneGraph.nodes.get(firstId)?.state ?? {}
}
