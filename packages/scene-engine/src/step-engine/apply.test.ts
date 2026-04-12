import { describe, it, expect } from 'vitest'
import { applyStepActionsUpTo, getVisualStateAtStep } from './apply'
import type { Visual, Step } from '../types'

describe('step-engine apply', () => {
  const mockVisuals: Visual[] = [
    {
      id: 'v1',
      type: 'array',
      initialState: { cells: [] }
    },
    {
      id: 'v2',
      type: 'text-badge',
      initialState: { text: "Init" }
    }
  ]

  const mockSteps: Step[] = [
    {
      index: 0,
      actions: [
        { target: 'v1', params: { cells: [1, 2] } }
      ]
    },
    {
      index: 1,
      actions: [
        { target: 'v1', params: { cells: [1, 2, 3] } },
        { target: 'v2', params: { text: "Running" } }
      ]
    }
  ]

  describe('applyStepActionsUpTo', () => {
    it('applies up to step 0', () => {
      const state = applyStepActionsUpTo(mockVisuals, mockSteps, 0)
      
      // v1 was modified in step 0
      expect(state.get('v1')).toEqual({ cells: [1, 2] })
      // v2 shouldn't be modified until step 1, retains initial
      expect(state.get('v2')).toEqual({ text: 'Init' })
    })

    it('applies up to step 1 (fully merged state)', () => {
      const state = applyStepActionsUpTo(mockVisuals, mockSteps, 1)
      
      expect(state.get('v1')).toEqual({ cells: [1, 2, 3] })
      expect(state.get('v2')).toEqual({ text: 'Running' })
    })

    it('handles out of bounds step correctly (caps at limits)', () => {
      const state = applyStepActionsUpTo(mockVisuals, mockSteps, 99)
      
      // Should equal state at max valid step (step 1)
      expect(state.get('v1')).toEqual({ cells: [1, 2, 3] })
      expect(state.get('v2')).toEqual({ text: 'Running' })
    })
  })

  describe('getVisualStateAtStep', () => {
    it('retrieves specific visual state correctly', () => {
      const state = getVisualStateAtStep(mockVisuals[0]!, mockSteps, 1)
      expect(state).toEqual({ cells: [1, 2, 3] })
    })
  })
})
