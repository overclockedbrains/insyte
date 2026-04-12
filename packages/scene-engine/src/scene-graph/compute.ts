import type { Scene } from '../types'
import type { SceneGraph, SceneNode, SceneEdge, SceneGroup } from './types'
import { applyStepActionsUpTo, computeTopologyAtStep } from '../step-engine'
import { computeLayout } from '../layout'

/**
 * Compute the full scene graph at a given step index.
 * Pure and synchronous — no side effects, no caching.
 * Caching is handled by Scene Runtime (Phase 23).
 */
export function computeSceneGraphAtStep(
  scene: Scene,
  stepIndex: number,
  containerWidth = 800,
  containerHeight = 600
): SceneGraph {
  // 1. Which visuals exist at this step?
  const activeVisuals = computeTopologyAtStep(scene.visuals, scene.steps, stepIndex)

  // 2. What is each visual's state at this step?
  const stateMap = applyStepActionsUpTo(scene.visuals, scene.steps, stepIndex)

  const nodes = new Map<string, SceneNode>()
  const edges = new Map<string, SceneEdge>()
  const groups = new Map<string, SceneGroup>()

  for (const visual of activeVisuals) {
    const state = stateMap.get(visual.id) ?? (visual.initialState as Record<string, unknown>)

    // 3. Compute layout for this visual (synchronous)
    const layoutResult = computeLayout(visual, state, containerWidth, containerHeight)

    // 4. Register positioned nodes
    for (const posNode of layoutResult.nodes) {
      nodes.set(posNode.id, {
        id: posNode.id,
        type: visual.type,
        groupId: visual.id,
        x: posNode.x,
        y: posNode.y,
        width: posNode.width,
        height: posNode.height,
        state,
        highlight: (state as any)?.highlight,
      })
    }

    // 5. Register routed edges
    for (const posEdge of layoutResult.edges) {
      edges.set(posEdge.id, {
        id: posEdge.id,
        from: posEdge.from,
        to: posEdge.to,
        label: posEdge.label,
        waypoints: posEdge.waypoints,
      })
    }

    // 6. Register group with bounding box
    // LayoutResult.boundingBox is { minX, minY, maxX, maxY }
    // SceneGroup.bbox is { x, y, width, height } for CSS absolute positioning
    const bb = layoutResult.boundingBox
    groups.set(visual.id, {
      id: visual.id,
      nodeIds: layoutResult.nodes.map(n => n.id),
      bbox: {
        x: bb.minX,
        y: bb.minY,
        width: bb.maxX - bb.minX,
        height: bb.maxY - bb.minY,
      },
    })
  }

  return { nodes, edges, groups, stepIndex }
}
