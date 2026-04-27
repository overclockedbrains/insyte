import { describe, it, expect } from 'vitest'
import { validateSteps } from './steps'
import { validatePopups } from './popups'
import { MiscSchema } from '../schemas'
import type { SceneSkeletonParsed, StepsParsed, PopupsParsed } from '../schemas'

// ─── Shared test fixtures ─────────────────────────────────────────────────────

function makeSkeleton(overrides?: Partial<SceneSkeletonParsed>): SceneSkeletonParsed {
  return {
    title: 'Binary Search',
    type: 'dsa-trace',
    canvas: [
      { id: 'arr', type: 'linear', variant: 'array', layoutHint: 'linear-H' },
      { id: 'ptr', type: 'linear', variant: 'array', layoutHint: 'linear-H' },
    ],
    stepCount: 4,
    ...overrides,
  }
}

function makeSteps(overrides?: Partial<StepsParsed>): StepsParsed {
  const arrItems = [{ id: 'a1', value: '1' }, { id: 'a3', value: '3' }, { id: 'a5', value: '5' }]
  const ptrItems = [{ id: 'p0', value: '0' }]
  return {
    initialStates: {
      arr: { items: arrItems },
      ptr: { items: ptrItems },
    },
    steps: [
      {
        index: 1,
        explanation: { heading: 'Step 1', body: 'First step.' },
        canvas: { arr: { items: [{ ...arrItems[0]!, highlight: 'active' }] } },
      },
      {
        index: 2,
        explanation: { heading: 'Step 2', body: 'Second step.' },
        canvas: { ptr: { items: [{ id: 'p1', value: '1' }] } },
      },
      {
        index: 3,
        explanation: { heading: 'Step 3', body: 'Third step.' },
      },
      {
        index: 4,
        explanation: { heading: 'Step 4', body: 'Fourth step.' },
        canvas: { arr: { items: [{ ...arrItems[1]!, highlight: 'hit' }] } },
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
      initialStates: { arr: {}, ptr: { items: [] } },
    })
    const result = validateSteps(steps, makeSkeleton())
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('initialStates["arr"]'))).toBe(true)
  })

  it('rejects when a canvas update has empty params {}', () => {
    const steps = makeSteps({
      steps: [
        {
          index: 1,
          explanation: { heading: 'A', body: 'B' },
          canvas: { arr: {} },
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
        ptr: { items: [] },
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
        { index: 1, explanation: { heading: 'A', body: 'B' } },
        { index: 3, explanation: { heading: 'C', body: 'D' } },  // gap!
        { index: 4, explanation: { heading: 'E', body: 'F' } },
      ],
    })
    const result = validateSteps(steps, makeSkeleton())
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('1, 2, 3'))).toBe(true)
  })

  it('rejects a canvas update targeting an unknown visual ID', () => {
    const steps = makeSteps({
      steps: [
        {
          index: 1,
          explanation: { heading: 'A', body: 'B' },
          canvas: { 'does-not-exist': { items: [1, 2, 3] } },
        },
      ],
    })
    const result = validateSteps(steps, makeSkeleton())
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"does-not-exist"'))).toBe(true)
  })
})

  // ─── Check 7: identity-based topology keys in step canvas ──────────────────

  it('rejects graph step canvas containing topology key "nodes"', () => {
    const skeleton = makeSkeleton({
      canvas: [{ id: 'g', type: 'graph', layoutHint: 'dagre-LR' }],
    })
    const steps: StepsParsed = {
      initialStates: { g: { nodes: [{ id: 'a', label: 'A' }], edges: [] } },
      steps: [
        {
          index: 1,
          explanation: { heading: 'A', body: 'B' },
          canvas: { g: { nodes: [{ id: 'a', label: 'A', highlight: 'active' }] } },
        },
      ],
    }
    const result = validateSteps(steps, skeleton)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"nodes"') && e.includes('sparse overlay'))).toBe(true)
  })

  it('rejects system-diagram step canvas containing topology key "components"', () => {
    const skeleton = makeSkeleton({
      canvas: [{ id: 's', type: 'system-diagram', layoutHint: 'dagre-LR' }],
    })
    const steps: StepsParsed = {
      initialStates: { s: { components: [{ id: 'c1', label: 'A', icon: 'server' }], connections: [] } },
      steps: [
        {
          index: 1,
          explanation: { heading: 'A', body: 'B' },
          canvas: {
            s: {
              components: [{ id: 'c1', label: 'A', icon: 'server', status: 'active' }],
              connections: [],
            },
          },
        },
      ],
    }
    const result = validateSteps(steps, skeleton)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"components"') && e.includes('sparse overlay'))).toBe(true)
  })

  it('accepts graph step canvas with nodeStates (sparse overlay)', () => {
    const skeleton = makeSkeleton({
      canvas: [{ id: 'g', type: 'graph', layoutHint: 'dagre-LR' }],
      stepCount: 1,
    })
    const steps: StepsParsed = {
      initialStates: { g: { nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], edges: [] } },
      steps: [
        {
          index: 1,
          explanation: { heading: 'Visit A', body: 'Highlight node A.' },
          canvas: { g: { nodeStates: { a: { highlight: 'active' } } } },
        },
      ],
    }
    const result = validateSteps(steps, skeleton)
    expect(result.valid).toBe(true)
  })

  // ─── Check 8: identity-based initialState topology coverage ─────────────────

  it('rejects graph initialState missing "nodes" key', () => {
    const skeleton = makeSkeleton({
      canvas: [{ id: 'g', type: 'graph', layoutHint: 'dagre-LR' }],
      stepCount: 1,
    })
    const steps: StepsParsed = {
      initialStates: { g: { edges: [] } },  // missing nodes
      steps: [{ index: 1, explanation: { heading: 'A', body: 'B' } }],
    }
    const result = validateSteps(steps, skeleton)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"nodes"') && e.includes('topology'))).toBe(true)
  })

  it('rejects tree initialState with empty nodes[]', () => {
    const skeleton = makeSkeleton({
      canvas: [{ id: 't', type: 'tree', layoutHint: 'dagre-TB' }],
      stepCount: 1,
    })
    const steps: StepsParsed = {
      initialStates: { t: { nodes: [], rootId: 'n1' } },
      steps: [{ index: 1, explanation: { heading: 'A', body: 'B' } }],
    }
    const result = validateSteps(steps, skeleton)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('empty array') && e.includes('nodes'))).toBe(true)
  })

  it('rejects tree initialState missing "rootId"', () => {
    const skeleton = makeSkeleton({
      canvas: [{ id: 't', type: 'tree', layoutHint: 'dagre-TB' }],
      stepCount: 1,
    })
    const steps: StepsParsed = {
      initialStates: { t: { nodes: [{ id: 'n1', value: '5', children: [] }] } },
      steps: [{ index: 1, explanation: { heading: 'A', body: 'B' } }],
    }
    const result = validateSteps(steps, skeleton)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"rootId"') && e.includes('topology'))).toBe(true)
  })

  it('accepts valid graph initialState with nodes and edges', () => {
    const skeleton = makeSkeleton({
      canvas: [{ id: 'g', type: 'graph', layoutHint: 'dagre-LR' }],
      stepCount: 1,
    })
    const steps: StepsParsed = {
      initialStates: {
        g: {
          nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
          edges: [{ id: 'e0', from: 'a', to: 'b' }],
        },
      },
      steps: [{ index: 1, explanation: { heading: 'A', body: 'B' } }],
    }
    const result = validateSteps(steps, skeleton)
    expect(result.valid).toBe(true)
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
