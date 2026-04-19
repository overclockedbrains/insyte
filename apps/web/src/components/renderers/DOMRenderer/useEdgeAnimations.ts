import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'
import type { SceneGraph } from '@insyte/scene-engine'
import { diffSceneGraphs } from '@insyte/scene-engine'

/**
 * Triggers WAAPI draw-on animations for SVG edges that appear at a new step.
 * Uses a ref to track the previous graph and diffs it against the incoming one.
 */
export function useEdgeAnimations(sceneGraph: SceneGraph, speed: number): void {
  const prevGraphRef = useRef<SceneGraph | null>(null)

  useEffect(() => {
    const prev = prevGraphRef.current
    prevGraphRef.current = sceneGraph

    if (!prev) return

    const diff = diffSceneGraphs(prev, sceneGraph)
    diff.addedEdges.forEach(edge => {
      if (!document.querySelector(`#sg-edge-${edge.id}`)) return
      animate(`#sg-edge-${edge.id}`, { pathLength: [0, 1] }, { duration: 0.3 / speed })
    })
  }, [sceneGraph, speed])
}
