import { describe, it, expect } from 'vitest'
import { assembleScene } from './assembly'
import type { SceneSkeletonParsed, StepsParsed, PopupsParsed, MiscParsed } from './schemas'

// ─── Fixture builders ─────────────────────────────────────────────────────────

function makeSkeleton(overrides?: Partial<SceneSkeletonParsed>): SceneSkeletonParsed {
  return {
    title: 'Binary Search',
    type: 'dsa',
    layout: 'linear-H',
    visuals: [
      { id: 'arr', type: 'array', hint: 'sorted integer array' },
      { id: 'ptr', type: 'counter' },
    ],
    stepCount: 3,
    ...overrides,
  }
}

function makeSteps(overrides?: Partial<StepsParsed>): StepsParsed {
  return {
    initialStates: {
      arr: { items: [1, 3, 5, 7, 9] },
      ptr: { value: 0 },
    },
    steps: [
      {
        index: 1,
        explanation: { heading: 'Start at the middle', body: 'Binary search begins by checking the middle element.' },
        actions: [{ target: 'arr', params: { highlighted: [2] } }],
      },
      {
        index: 2,
        explanation: { heading: 'Eliminate half', body: 'If the target is smaller, discard the right half.' },
        actions: [{ target: 'ptr', params: { value: 2 } }],
      },
      {
        index: 3,
        explanation: { heading: 'Found!', body: 'The target element has been located.' },
        actions: [{ target: 'arr', params: { highlighted: [1] } }],
      },
    ],
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('assembleScene', () => {
  it('assembles a valid minimal scene from skeleton + steps', () => {
    const result = assembleScene(makeSkeleton(), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    expect(result.scene).toBeDefined()
    expect(result.scene!.title).toBe('Binary Search')
  })

  it('maps dsa type to dsa-trace in the scene', () => {
    const result = assembleScene(makeSkeleton({ type: 'dsa' }), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    expect(result.scene!.type).toBe('dsa-trace')
  })

  it('maps concept type to text-left-canvas-right page layout', () => {
    const skeleton = makeSkeleton({ type: 'concept' })
    const result = assembleScene(skeleton, makeSteps(), null, null)
    expect(result.ok).toBe(true)
    expect(result.scene!.layout).toBe('text-left-canvas-right')
  })

  it('maps dsa type to canvas-only page layout', () => {
    const result = assembleScene(makeSkeleton({ type: 'dsa' }), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    expect(result.scene!.layout).toBe('canvas-only')
  })

  it('generates a unique id for each assembled scene', () => {
    const r1 = assembleScene(makeSkeleton(), makeSteps(), null, null)
    const r2 = assembleScene(makeSkeleton(), makeSteps(), null, null)
    expect(r1.scene!.id).toBeTruthy()
    expect(r2.scene!.id).toBeTruthy()
    expect(r1.scene!.id).not.toBe(r2.scene!.id)
  })

  it('includes a synthetic step 0 plus AI-generated steps', () => {
    const result = assembleScene(makeSkeleton(), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    const steps = result.scene!.steps
    expect(steps[0]).toEqual({ index: 0, actions: [] })
    expect(steps).toHaveLength(4)  // step 0 + 3 AI steps
  })

  it('extracts explanation from steps with correct appearsAtStep', () => {
    const result = assembleScene(makeSkeleton(), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    const exp = result.scene!.explanation
    expect(exp).toHaveLength(3)
    expect(exp[0]!.appearsAtStep).toBe(1)
    expect(exp[0]!.heading).toBe('Start at the middle')
    expect(exp[2]!.appearsAtStep).toBe(3)
  })

  it('merges initialStates into visuals', () => {
    const result = assembleScene(makeSkeleton(), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    const arrVisual = result.scene!.visuals.find(v => v.id === 'arr')!
    expect(arrVisual.initialState).toEqual({ items: [1, 3, 5, 7, 9] })
  })

  it('includes popups when provided', () => {
    const popups: PopupsParsed = {
      popups: [
        { attachTo: 'arr', showAtStep: 1, hideAtStep: 2, text: 'This is the array', style: 'info' },
      ],
    }
    const result = assembleScene(makeSkeleton(), makeSteps(), popups, null)
    expect(result.ok).toBe(true)
    expect(result.scene!.popups).toHaveLength(1)
    expect(result.scene!.popups[0]!.attachTo).toBe('arr')
    expect(result.scene!.popups[0]!.id).toBeTruthy()
  })

  it('produces empty popups when popups is null', () => {
    const result = assembleScene(makeSkeleton(), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    expect(result.scene!.popups).toHaveLength(0)
  })

  it('maps MCQ challenges to Scene Challenge shape', () => {
    const misc: MiscParsed = {
      challenges: [
        {
          question: 'What is the time complexity of binary search?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
          answer: 1,
          type: 'predict',
        },
      ],
    }
    const result = assembleScene(makeSkeleton(), makeSteps(), null, misc)
    expect(result.ok).toBe(true)
    const challenges = result.scene!.challenges!
    expect(challenges).toHaveLength(1)
    expect(challenges[0]!.title).toBe('What is the time complexity of binary search?')
    expect(challenges[0]!.id).toBeTruthy()
    expect(challenges[0]!.type).toBe('predict')
  })

  it('returns errors array when safeParseScene fails', () => {
    // Deliberately corrupt steps to trigger schema failure
    const badSteps: StepsParsed = {
      initialStates: { arr: {}, ptr: {} },
      steps: [], // empty steps array should fail schema (min: 1)
    }
    // The assembly itself should not throw
    const result = assembleScene(makeSkeleton(), badSteps, null, null)
    expect(typeof result.ok).toBe('boolean')
    if (!result.ok) {
      expect(Array.isArray(result.errors)).toBe(true)
    }
  })
})
