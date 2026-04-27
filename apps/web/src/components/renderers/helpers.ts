import { SceneGroup } from "@insyte/scene-engine"

/**
 * Extract the full visual state from the SceneGraph for a group.
 * All nodes in a group carry the same state snapshot (the visual's state at
 * this step), so reading the first node is sufficient.
 */
export const getGroupState = (group: SceneGroup): Record<string, unknown> => {
  return group.state ?? {}
}
