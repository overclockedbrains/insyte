import { describe, it, expect } from 'vitest'
import { validateStates } from './states'
import { validateSteps } from './steps'
import { validateAnnotations } from './annotations'
import { validateMisc } from './misc'
import type { ISCLParsed } from '@insyte/scene-engine'

// ─── Shared test fixture ──────────────────────────────────────────────────────

function makeParsed(overrides?: Partial<ISCLParsed>): ISCLParsed {
  return {
    title: 'Binary Search',
    type: 'dsa-trace',
    layout: 'canvas-only',
    visualIds: new Set(['arr', 'ptr']),
    visualDecls: [
      { id: 'arr', type: 'array', layoutHint: 'linear-H' },
      { id: 'ptr', type: 'counter', slot: 'bottom-left' },
    ],
    stepCount: 4,
    steps: [
      { index: 0, isInit: true, sets: [] },
      { index: 1, isInit: false, sets: [{ visualId: 'arr', field: 'cells', rawValue: '[{v:1}]' }] },
      { index: 2, isInit: false, sets: [{ visualId: 'ptr', field: 'value', rawValue: '1' }] },
      { index: 3, isInit: false, sets: [{ visualId: 'arr', field: 'cells', rawValue: '[{v:2}]' }] },
    ],
    explanation: [],
    popups: [],
    challenges: [],
    controls: [],
    ...overrides,
  }
}

// ─── validateStates ───────────────────────────────────────────────────────────

describe('validateStates', () => {
  it('accepts valid initialStates covering all visual IDs', () => {
    const raw = {
      initialStates: {
        arr: { cells: [{ value: 1 }] },
        ptr: { value: 0, label: 'pointer' },
      },
    }
    const result = validateStates(raw, makeParsed())
    expect(result.ok).toBe(true)
    expect(result.states['arr']).toEqual({ cells: [{ value: 1 }] })
    expect(result.states['ptr']).toEqual({ value: 0, label: 'pointer' })
  })

  it('rejects when a visual ID is missing from initialStates', () => {
    const raw = {
      initialStates: {
        arr: { cells: [] },
        // 'ptr' missing
      },
    }
    const result = validateStates(raw, makeParsed())
    expect(result.ok).toBe(false)
    expect(result.error).toContain('"ptr"')
  })

  it('rejects malformed top-level shape (no initialStates key)', () => {
    const raw = { states: {} }
    const result = validateStates(raw, makeParsed())
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Stage 2a')
  })

  it('rejects non-object input', () => {
    const result = validateStates('not an object', makeParsed())
    expect(result.ok).toBe(false)
  })

  it('accepts extra keys in initialStates (AI may add more than declared)', () => {
    const raw = {
      initialStates: {
        arr: { cells: [] },
        ptr: { value: 0, label: 'ptr' },
        undeclared: { cells: [] },   // extra key — should be ignored
      },
    }
    const result = validateStates(raw, makeParsed())
    expect(result.ok).toBe(true)
  })
})

// ─── validateSteps ────────────────────────────────────────────────────────────

describe('validateSteps', () => {
  it('accepts valid steps with correct action targets', () => {
    const raw = {
      steps: [
        { index: 1, actions: [{ target: 'arr', params: { cells: [{ value: 1 }] } }] },
        { index: 2, actions: [{ target: 'ptr', params: { value: 1 } }] },
        { index: 3, actions: [{ target: 'arr', params: { cells: [{ value: 2 }] } }] },
      ],
    }
    const result = validateSteps(raw, makeParsed())
    expect(result.ok).toBe(true)
    expect(result.steps).toHaveLength(4)   // includes synthetic step 0
    expect(result.steps[0]).toEqual({ index: 0, actions: [] })
  })

  it('rejects an action targeting an unknown visual ID', () => {
    const raw = {
      steps: [
        { index: 1, actions: [{ target: 'unknown-id', params: {} }] },
      ],
    }
    const result = validateSteps(raw, makeParsed())
    expect(result.ok).toBe(false)
    expect(result.error).toContain('"unknown-id"')
  })

  it('rejects a step index >= stepCount', () => {
    const raw = {
      steps: [
        { index: 99, actions: [] },
      ],
    }
    const result = validateSteps(raw, makeParsed())
    expect(result.ok).toBe(false)
    expect(result.error).toContain('out of range')
  })

  it('rejects malformed top-level shape', () => {
    const result = validateSteps({ data: [] }, makeParsed())
    expect(result.ok).toBe(false)
  })

  it('sorts steps by index', () => {
    const raw = {
      steps: [
        { index: 3, actions: [] },
        { index: 1, actions: [] },
        { index: 2, actions: [] },
      ],
    }
    const result = validateSteps(raw, makeParsed())
    expect(result.ok).toBe(true)
    const indices = result.steps.map(s => s.index)
    expect(indices).toEqual([0, 1, 2, 3])
  })

  it('does NOT duplicate step 0 when AI includes it', () => {
    const raw = {
      steps: [
        { index: 0, actions: [] },
        { index: 1, actions: [{ target: 'arr', params: {} }] },
      ],
    }
    const result = validateSteps(raw, makeParsed())
    expect(result.ok).toBe(true)
    expect(result.steps.filter(s => s.index === 0)).toHaveLength(1)
  })
})

// ─── validateAnnotations ──────────────────────────────────────────────────────

describe('validateAnnotations', () => {
  it('accepts valid explanation and popups', () => {
    const raw = {
      explanation: [
        { appearsAtStep: 0, heading: 'What is Binary Search?', body: 'It splits in half each time.' },
        { appearsAtStep: 2, heading: 'Mid point', body: 'Check the middle element.' },
      ],
      popups: [
        { attachTo: 'arr', showAtStep: 1, hideAtStep: 3, text: 'Array is sorted', style: 'info' },
      ],
    }
    const result = validateAnnotations(raw, makeParsed())
    expect(result.ok).toBe(true)
    expect(result.explanation).toHaveLength(2)
    expect(result.popups).toHaveLength(1)
    // Popup should get a generated id
    expect(result.popups[0]!.id).toBeTruthy()
    expect(result.popups[0]!.attachTo).toBe('arr')
  })

  it('rejects explanation with appearsAtStep >= stepCount', () => {
    const raw = {
      explanation: [{ appearsAtStep: 99, heading: 'Bad', body: 'Out of range.' }],
      popups: [],
    }
    const result = validateAnnotations(raw, makeParsed())
    expect(result.ok).toBe(false)
    expect(result.error).toContain('99')
  })

  it('rejects popup attachTo referencing unknown visual ID', () => {
    const raw = {
      explanation: [],
      popups: [{ attachTo: 'no-such-visual', showAtStep: 0, text: 'Bad', style: 'info' }],
    }
    const result = validateAnnotations(raw, makeParsed())
    expect(result.ok).toBe(false)
    expect(result.error).toContain('"no-such-visual"')
  })

  it('rejects popup showAtStep >= stepCount', () => {
    const raw = {
      explanation: [],
      popups: [{ attachTo: 'arr', showAtStep: 10, text: 'Way too late', style: 'info' }],
    }
    const result = validateAnnotations(raw, makeParsed())
    expect(result.ok).toBe(false)
    expect(result.error).toContain('showAtStep 10')
  })

  it('rejects popup hideAtStep > stepCount', () => {
    const raw = {
      explanation: [],
      popups: [{ attachTo: 'arr', showAtStep: 1, hideAtStep: 999, text: 'Bad hide', style: 'info' }],
    }
    const result = validateAnnotations(raw, makeParsed())
    expect(result.ok).toBe(false)
    expect(result.error).toContain('hideAtStep 999')
  })

  it('rejects malformed top-level shape', () => {
    const result = validateAnnotations({ annotations: [] }, makeParsed())
    expect(result.ok).toBe(false)
  })
})

// ─── validateMisc ─────────────────────────────────────────────────────────────

describe('validateMisc', () => {
  it('accepts valid challenges and controls', () => {
    const raw = {
      challenges: [
        { type: 'predict',  title: 'Predict',  description: 'What is mid at step 1?' },
        { type: 'break-it', title: 'Break it', description: 'What input causes O(n)?' },
        { type: 'optimize', title: 'Optimize', description: 'How to improve for sorted input?' },
      ],
      controls: [
        { type: 'slider', id: 'size', label: 'Array Size', config: { min: 4, max: 20, defaultValue: 8 } },
      ],
    }
    const result = validateMisc(raw)
    expect(result.ok).toBe(true)
    expect(result.challenges).toHaveLength(3)
    // Each challenge should get a generated id
    expect(result.challenges[0]!.id).toBeTruthy()
    expect(result.challenges[0]!.type).toBe('predict')
    expect(result.controls).toHaveLength(1)
    expect(result.controls[0]!.type).toBe('slider')
  })

  it('accepts empty controls array', () => {
    const raw = {
      challenges: [
        { type: 'predict',  title: 'Predict',  description: 'Q1' },
        { type: 'break-it', title: 'Break it', description: 'Q2' },
        { type: 'optimize', title: 'Optimize', description: 'Q3' },
      ],
      controls: [],
    }
    const result = validateMisc(raw)
    expect(result.ok).toBe(true)
    expect(result.controls).toHaveLength(0)
  })

  it('rejects invalid challenge type', () => {
    const raw = {
      challenges: [
        { type: 'invalid-type', title: 'Bad', description: 'Bad type' },
      ],
      controls: [],
    }
    const result = validateMisc(raw)
    expect(result.ok).toBe(false)
  })

  it('uses empty defaults when challenges/controls are absent', () => {
    const result = validateMisc({})
    // z.default([]) makes this ok with empty arrays
    expect(result.ok).toBe(true)
    expect(result.challenges).toHaveLength(0)
    expect(result.controls).toHaveLength(0)
  })

  it('rejects non-object input', () => {
    const result = validateMisc('bad')
    expect(result.ok).toBe(false)
  })
})
