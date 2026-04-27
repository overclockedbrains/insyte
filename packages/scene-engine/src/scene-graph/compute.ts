import type { Scene } from '../types'
import type { SceneGraph, SceneNode, SceneEdge, SceneGroup } from './types'
import { applyStepActionsUpTo, computeTopologyAtStep } from '../step-engine'
import { computeLayout } from '../layout'

/**
 * Compute the full scene graph at a given step index.
 * Pure and synchronous — no side effects, no caching.
 */
export function computeSceneGraphAtStep(
  scene: Scene,
  stepIndex: number,
  containerWidth = 800,
  containerHeight = 600,
): SceneGraph {
  const activeVisuals = computeTopologyAtStep(scene.canvas, scene.steps, stepIndex)
  const stateMap = applyStepActionsUpTo(scene.canvas, scene.steps, stepIndex)

  const nodes = new Map<string, SceneNode>()
  const edges = new Map<string, SceneEdge>()
  const groups = new Map<string, SceneGroup>()

  for (const visual of activeVisuals) {
    const state = stateMap.get(visual.id) ?? (visual.initialState as Record<string, unknown>)

    const layoutResult = computeLayout(visual, state, containerWidth, containerHeight)

    for (const posNode of layoutResult.nodes) {
      const globalId = `${visual.id}_${posNode.id}`
      nodes.set(globalId, {
        id: globalId,
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

    for (const posEdge of layoutResult.edges) {
      const globalId = `${visual.id}_${posEdge.id}`
      edges.set(globalId, {
        id: globalId,
        from: `${visual.id}_${posEdge.from}`,
        to: `${visual.id}_${posEdge.to}`,
        label: posEdge.label,
        waypoints: posEdge.waypoints,
      })
    }

    const bb = layoutResult.boundingBox
    groups.set(visual.id, {
      id: visual.id,
      nodeIds: layoutResult.nodes.map(n => `${visual.id}_${n.id}`),
      bbox: {
        x: bb.minX,
        y: bb.minY,
        width: bb.maxX - bb.minX,
        height: bb.maxY - bb.minY,
      },
      label: visual.label,
      isHud: false,
      visualType: visual.type,
      state,
      visual,
    })
  }

  return { nodes, edges, groups, stepIndex }
}
