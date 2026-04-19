import { describe, it, expect } from 'vitest'
import { validateSteps } from './steps'
import { validatePopups } from './popups'
import { MiscSchema } from '../schemas'
import type { SceneSkeletonParsed, StepsParsed, PopupsParsed } from '../schemas'

// ─── Shared test fixtures ─────────────────────────────────────────────────────

function makeSkeleton(overrides?: Partial<SceneSkeletonParsed>): SceneSkeletonParsed {
  return {
    title: 'Binary Search',
    type: 'dsa',
    layout: 'linear-H',
    visuals: [
      { id: 'arr', type: 'array' },
      { id: 'ptr', type: 'counter' },
    ],
    stepCount: 4,
    ...overrides,
  }
}

function makeSteps(overrides?: Partial<StepsParsed>): StepsParsed {
  return {
    initialStates: {
      arr: { items: [1, 3, 5] },
      ptr: { value: 0 },
    },
    steps: [
      {
        index: 1,
        explanation: { heading: 'Step 1', body: 'First step.' },
        actions: [{ target: 'arr', params: { highlighted: [0] } }],
      },
      {
        index: 2,
        explanation: { heading: 'Step 2', body: 'Second step.' },
        actions: [{ target: 'ptr', params: { value: 1 } }],
      },
      {
        index: 3,
        explanation: { heading: 'Step 3', body: 'Third step.' },
        actions: [],
      },
      {
        index: 4,
        explanation: { heading: 'Step 4', body: 'Fourth step.' },
        actions: [{ target: 'arr', params: { highlighted: [1] } }],
      },
    ],
    ...overrides,
  }
}

// ─── validateSteps ────────────────────────────────────────────────────────────

describe('validateSteps', () => {
  it('accepts valid steps covering all visual IDs', () => {
    const result = validateSteps(makeSteps(), makeSkeleton())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects when initialStates is missing entries for visual IDs', () => {
    const steps = makeSteps({
      initialStates: { arr: { items: [] } },  // ptr missing
    })
    const result = validateSteps(steps, makeSkeleton())
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"ptr"'))).toBe(true)
  })

  it('rejects when initialStates is completely empty', () => {
    const steps = makeSteps({ initialStates: {} })
    const result = validateSteps(steps, makeSkeleton())
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('empty {}'))).toBe(true)
  })

  it('rejects when an initialState value is empty {}', () => {
    const steps = makeSteps({
      initialStates: { arr: {}, ptr: { value: 0 } },
    })
    const result = validateSteps(steps, makeSkeleton())
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('initialStates["arr"]'))).toBe(true)
  })

  it('rejects when an action has empty params {}', () => {
    const steps = makeSteps({
      steps: [
        {
          index: 1,
          explanation: { heading: 'A', body: 'B' },
          actions: [{ target: 'arr', params: {} }],
        },
        ...makeSteps().steps.slice(1),
      ],
    })
    const result = validateSteps(steps, makeSkeleton())
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('empty params {}'))).toBe(true)
  })

  it('rejects when initialStates has an unknown visual ID', () => {
    const steps = makeSteps({
      initialStates: {
        arr: { items: [] },
        ptr: { value: 0 },
        unknown: { x: 1 },  // not in skeleton
      },
    })
    const result = validateSteps(steps, makeSkeleton())
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"unknown"'))).toBe(true)
  })

  it('rejects non-monotonic step indices', () => {
    const steps = makeSteps({
      steps: [
        { index: 1, explanation: { heading: 'A', body: 'B' }, actions: [] },
        { index: 3, explanation: { heading: 'C', body: 'D' }, actions: [] },  // gap!
        { index: 4, explanation: { heading: 'E', body: 'F' }, actions: [] },
      ],
    })
    const result = validateSteps(steps, makeSkeleton())
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('1, 2, 3'))).toBe(true)
  })

  it('rejects an action targeting an unknown visual ID', () => {
    const steps = makeSteps({
      steps: [
        {
          index: 1,
          explanation: { heading: 'A', body: 'B' },
          actions: [{ target: 'does-not-exist', params: {} }],
        },
      ],
    })
    const result = validateSteps(steps, makeSkeleton())
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"does-not-exist"'))).toBe(true)
  })
})

// ─── validatePopups ───────────────────────────────────────────────────────────

describe('validatePopups', () => {
  function makePopups(overrides?: Partial<PopupsParsed>): PopupsParsed {
    return {
      popups: [
        { attachTo: 'arr', showAtStep: 1, hideAtStep: 3, text: 'This is an array', style: 'info' },
      ],
      ...overrides,
    }
  }

  it('accepts valid popups with correct step range', () => {
    const result = validatePopups(makePopups(), makeSkeleton())
    expect(result.valid).toBe(true)
  })

  it('rejects popup with unknown attachTo visual ID', () => {
    const result = validatePopups(
      makePopups({ popups: [{ attachTo: 'no-such-id', showAtStep: 1, hideAtStep: 2, text: 'Bad' }] }),
      makeSkeleton(),
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"no-such-id"'))).toBe(true)
  })

  it('rejects popup where showAtStep > hideAtStep', () => {
    const result = validatePopups(
      makePopups({ popups: [{ attachTo: 'arr', showAtStep: 5, hideAtStep: 2, text: 'Backwards' }] }),
      makeSkeleton(),
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('showAtStep'))).toBe(true)
  })

  it('rejects popup where hideAtStep exceeds stepCount', () => {
    const result = validatePopups(
      makePopups({ popups: [{ attachTo: 'arr', showAtStep: 1, hideAtStep: 99, text: 'Too late' }] }),
      makeSkeleton(),
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('hideAtStep'))).toBe(true)
  })

  it('accepts empty popups array', () => {
    const result = validatePopups({ popups: [] }, makeSkeleton())
    expect(result.valid).toBe(true)
  })
})

// ─── MiscSchema ───────────────────────────────────────────────────────────────

describe('MiscSchema', () => {
  it('accepts valid open-ended challenges', () => {
    const result = MiscSchema.safeParse({
      challenges: [
        { title: 'Worst-case Steps', description: 'How many comparisons for 1,024 elements?', type: 'predict' },
        { title: 'Break the cache', description: 'What input causes the most collisions?', type: 'break-it' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects challenges with missing title', () => {
    const result = MiscSchema.safeParse({
      challenges: [{ description: 'Some question', type: 'predict' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty challenges array', () => {
    const result = MiscSchema.safeParse({ challenges: [] })
    expect(result.success).toBe(false)
  })
})
