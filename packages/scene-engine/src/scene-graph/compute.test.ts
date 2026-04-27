import { describe, it, expect } from 'vitest'
import { computeSceneGraphAtStep } from './compute'
import type { Scene } from '../types'

describe('scene-graph compute', () => {
  const dummyScene: Scene = {
    id: 's1',
    title: 'test',
    type: 'concept',
    layout: 'canvas-only',
    canvas: [
      {
        id: 'array-viz',
        type: 'linear',
        variant: 'array',
        layoutHint: 'linear-H',
        initialState: { items: [{ id: 'i0', value: 42 }] },
      },
    ],
    steps: [
      {
        index: 1,
        explanation: { heading: 'Step 1', body: 'Update value' },
        canvas: {
          'array-viz': { items: [{ id: 'i0', value: 99 }] },
        },
      },
    ],
    controls: [],
    popups: [],
  }

  describe('computeSceneGraphAtStep', () => {
    it('computes initial graph correctly at step 0', () => {
      const graph = computeSceneGraphAtStep(dummyScene, 0, 800, 600)

      expect(graph.stepIndex).toBe(0)
      expect(graph.groups.has('array-viz')).toBe(true)

      const groupInfo = graph.groups.get('array-viz')!
      expect(groupInfo.nodeIds.length).toBeGreaterThan(0)

      const nodeId = groupInfo.nodeIds[0]!
      const nodeObj = graph.nodes.get(nodeId)!
      expect(nodeObj.type).toBe('linear')
    })

    it('computes mutated graph correctly at step 1', () => {
      const graph = computeSceneGraphAtStep(dummyScene, 1, 800, 600)

      const groupInfo = graph.groups.get('array-viz')!
      const nodeId = groupInfo.nodeIds[0]!
      const nodeObj = graph.nodes.get(nodeId)!

      expect((nodeObj.state as any).items[0].value).toBe(99)
    })
  })
})
