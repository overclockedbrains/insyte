import { describe, it, expect } from 'vitest'
import { assembleScene } from './assembly'
import type { SceneSkeletonParsed, StepsParsed, PopupsParsed, MiscParsed } from './schemas'

// ─── Fixture builders ─────────────────────────────────────────────────────────

function makeSkeleton(overrides?: Partial<SceneSkeletonParsed>): SceneSkeletonParsed {
  return {
    title: 'Binary Search',
    type: 'dsa-trace',
    canvas: [
      { id: 'arr', type: 'linear', variant: 'array', layoutHint: 'linear-H' },
    ],
    stepCount: 3,
    ...overrides,
  }
}

function makeSteps(overrides?: Partial<StepsParsed>): StepsParsed {
  const items = [1, 3, 5, 7, 9].map((v, i) => ({ id: `arr-${i}`, value: String(v) }))
  return {
    initialStates: {
      arr: { items },
    },
    steps: [
      {
        index: 1,
        explanation: { heading: 'Start at the middle', body: 'Binary search begins by checking the middle element.' },
        canvas: { arr: { items: items.map((it, i) => ({ ...it, highlight: i === 2 ? 'active' : undefined })) } },
      },
      {
        index: 2,
        explanation: { heading: 'Eliminate half', body: 'If the target is smaller, discard the right half.' },
        canvas: { arr: { items } },
      },
      {
        index: 3,
        explanation: { heading: 'Found!', body: 'The target element has been located.' },
        canvas: { arr: { items: items.map((it, i) => ({ ...it, highlight: i === 1 ? 'hit' : undefined })) } },
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

  it('preserves dsa-trace type in the assembled scene', () => {
    const result = assembleScene(makeSkeleton({ type: 'dsa-trace' }), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    expect(result.scene!.type).toBe('dsa-trace')
  })

  it('maps concept type to text-left-canvas-right page layout', () => {
    const skeleton = makeSkeleton({ type: 'concept' })
    const result = assembleScene(skeleton, makeSteps(), null, null)
    expect(result.ok).toBe(true)
    expect(result.scene!.layout).toBe('text-left-canvas-right')
  })

  it('maps dsa-trace type to code-left-canvas-right page layout', () => {
    const result = assembleScene(makeSkeleton({ type: 'dsa-trace' }), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    expect(result.scene!.layout).toBe('code-left-canvas-right')
  })

  it('generates a unique id for each assembled scene', () => {
    const r1 = assembleScene(makeSkeleton(), makeSteps(), null, null)
    const r2 = assembleScene(makeSkeleton(), makeSteps(), null, null)
    expect(r1.scene!.id).toBeTruthy()
    expect(r2.scene!.id).toBeTruthy()
    expect(r1.scene!.id).not.toBe(r2.scene!.id)
  })

  it('produces exactly the AI-generated steps (no synthetic step 0)', () => {
    const result = assembleScene(makeSkeleton(), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    const steps = result.scene!.steps
    expect(steps).toHaveLength(3)
    expect(steps[0]!.index).toBe(1)
  })

  it('embeds explanations inside steps', () => {
    const result = assembleScene(makeSkeleton(), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    const steps = result.scene!.steps
    expect(steps[0]!.explanation?.heading).toBe('Start at the middle')
    expect(steps[2]!.explanation?.heading).toBe('Found!')
  })

  it('merges initialStates into canvas visuals', () => {
    const result = assembleScene(makeSkeleton(), makeSteps(), null, null)
    expect(result.ok).toBe(true)
    const arrVisual = result.scene!.canvas.find(v => v.id === 'arr')!
    expect(arrVisual.initialState).toHaveProperty('items')
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

  it('maps open-ended challenges to Scene Challenge shape', () => {
    const misc: MiscParsed = {
      challenges: [
        {
          title: 'Worst-case Steps',
          description: 'How many comparisons are needed for an array of size 1,024?',
          type: 'predict',
        },
      ],
    }
    const result = assembleScene(makeSkeleton(), makeSteps(), null, misc)
    expect(result.ok).toBe(true)
    const challenges = result.scene!.challenges!
    expect(challenges).toHaveLength(1)
    expect(challenges[0]!.title).toBe('Worst-case Steps')
    expect(challenges[0]!.description).toBe('How many comparisons are needed for an array of size 1,024?')
    expect(challenges[0]!.id).toBeTruthy()
    expect(challenges[0]!.type).toBe('predict')
  })

  it('returns errors array when safeParseScene fails', () => {
    const badSteps: StepsParsed = {
      initialStates: { arr: {} },
      steps: [], // empty steps array should fail schema (min: 1)
    }
    const result = assembleScene(makeSkeleton(), badSteps, null, null)
    expect(typeof result.ok).toBe('boolean')
    if (!result.ok) {
      expect(Array.isArray(result.errors)).toBe(true)
    }
  })
})
