import { describe, it, expect } from 'vitest'
import { applyStepActionsUpTo, getVisualStateAtStep } from './apply'
import type { CanvasVisual, Step } from '../types'

describe('step-engine apply', () => {
  const mockCanvas: CanvasVisual[] = [
    {
      id: 'arr',
      type: 'linear',
      variant: 'array',
      layoutHint: 'linear-H',
      initialState: { items: [] },
    },
    {
      id: 'seen',
      type: 'map',
      layoutHint: 'hashmap-buckets',
      initialState: { entries: [] },
    },
  ]

  const mockSteps: Step[] = [
    {
      index: 1,
      explanation: { heading: 'Step 1', body: 'First step' },
      canvas: {
        arr: { items: [{ id: 'i0', value: 2, highlight: 'active' }] },
      },
    },
    {
      index: 2,
      explanation: { heading: 'Step 2', body: 'Second step' },
      canvas: {
        arr: { items: [{ id: 'i0', value: 2 }, { id: 'i1', value: 7, highlight: 'active' }] },
        seen: { entries: [{ id: 'e0', key: '2', value: '0', highlight: 'insert' }] },
      },
    },
  ]

  describe('applyStepActionsUpTo', () => {
    it('returns initialStates at step 0', () => {
      const state = applyStepActionsUpTo(mockCanvas, mockSteps, 0)
      expect(state.get('arr')).toEqual({ items: [] })
      expect(state.get('seen')).toEqual({ entries: [] })
    })

    it('applies step 1 canvas snapshot', () => {
      const state = applyStepActionsUpTo(mockCanvas, mockSteps, 1)
      expect(state.get('arr')).toEqual({ items: [{ id: 'i0', value: 2, highlight: 'active' }] })
      expect(state.get('seen')).toEqual({ entries: [] })
    })

    it('applies step 2 canvas snapshots', () => {
      const state = applyStepActionsUpTo(mockCanvas, mockSteps, 2)
      expect(state.get('arr')).toEqual({ items: [{ id: 'i0', value: 2 }, { id: 'i1', value: 7, highlight: 'active' }] })
      expect((state.get('seen') as any).entries).toHaveLength(1)
    })

    it('handles out-of-bounds step (returns last known state)', () => {
      const state = applyStepActionsUpTo(mockCanvas, mockSteps, 99)
      expect(state.get('arr')).toEqual({ items: [{ id: 'i0', value: 2 }, { id: 'i1', value: 7, highlight: 'active' }] })
    })
  })

  describe('getVisualStateAtStep', () => {
    it('returns state for a specific visual', () => {
      const state = getVisualStateAtStep(mockCanvas[0]!, mockSteps, 1)
      expect(state).toEqual({ items: [{ id: 'i0', value: 2, highlight: 'active' }] })
    })
  })
})
