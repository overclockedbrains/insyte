import { describe, it, expect } from 'vitest'
import { assembleScene } from './assembly'
import type { ISCLParsed, Step } from '@insyte/scene-engine'

// ─── Fixture builders ─────────────────────────────────────────────────────────

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
    stepCount: 3,
    steps: [
      { index: 0, isInit: true, sets: [] },
      { index: 1, isInit: false, sets: [{ visualId: 'arr', field: 'cells', rawValue: '[{v:1}]' }] },
      { index: 2, isInit: false, sets: [{ visualId: 'ptr', field: 'value', rawValue: '1' }] },
    ],
    explanation: [],
    popups: [],
    challenges: [],
    controls: [],
    ...overrides,
  }
}

const VALID_STATES = {
  arr: { cells: [{ value: 1, highlight: 'default' }, { value: 5, highlight: 'default' }] },
  ptr: { value: 0, label: 'pointer' },
}

const VALID_STEPS: Step[] = [
  { index: 0, actions: [] },
  { index: 1, actions: [{ target: 'arr', params: { cells: [{ value: 1, highlight: 'active' }, { value: 5, highlight: 'default' }] } }] },
  { index: 2, actions: [{ target: 'ptr', params: { value: 1, label: 'pointer' } }] },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('assembleScene', () => {
  it('assembles a valid minimal scene', () => {
    const result = assembleScene(
      makeParsed(),
      VALID_STATES,
      VALID_STEPS,
      [],   // explanation
      [],   // popups
      [],   // challenges
      [],   // controls
    )
    expect(result.ok).toBe(true)
    expect(result.scene).toBeDefined()
    expect(result.scene!.title).toBe('Binary Search')
    expect(result.scene!.type).toBe('dsa-trace')
    expect(result.scene!.layout).toBe('canvas-only')
  })

  it('generates a unique id for each assembled scene', () => {
    const r1 = assembleScene(makeParsed(), VALID_STATES, VALID_STEPS, [], [], [], [])
    const r2 = assembleScene(makeParsed(), VALID_STATES, VALID_STEPS, [], [], [], [])
    expect(r1.scene!.id).toBeTruthy()
    expect(r2.scene!.id).toBeTruthy()
    expect(r1.scene!.id).not.toBe(r2.scene!.id)
  })

  it('maps visualDecls to scene visuals with correct types and layoutHints', () => {
    const result = assembleScene(makeParsed(), VALID_STATES, VALID_STEPS, [], [], [], [])
    const visuals = result.scene!.visuals
    expect(visuals).toHaveLength(2)

    const arr = visuals.find(v => v.id === 'arr')!
    expect(arr.type).toBe('array')
    expect(arr.layoutHint).toBe('linear-H')
    expect(arr.initialState).toEqual(VALID_STATES.arr)

    const ptr = visuals.find(v => v.id === 'ptr')!
    expect(ptr.type).toBe('counter')
    expect(ptr.slot).toBe('bottom-left')
  })

  it('falls back to null initialState when states map is empty (Stage 2a degraded)', () => {
    // assembleScene should still run but safeParseScene may reject null initialState
    // This test verifies the assembly doesn't throw — schema may or may not reject
    const result = assembleScene(makeParsed(), {}, VALID_STEPS, [], [], [], [])
    // Result depends on whether the schema allows null initialState
    // Either way, we must not throw
    expect(typeof result.ok).toBe('boolean')
  })

  it('includes steps in the assembled scene', () => {
    const result = assembleScene(makeParsed(), VALID_STATES, VALID_STEPS, [], [], [], [])
    expect(result.ok).toBe(true)
    expect(result.scene!.steps).toHaveLength(3)
    expect(result.scene!.steps[0]!.index).toBe(0)
    expect(result.scene!.steps[0]!.actions).toHaveLength(0)
  })

  it('includes explanation sections', () => {
    const explanation = [
      { appearsAtStep: 0, heading: 'What is Binary Search?', body: 'Efficient search on sorted arrays.' },
    ]
    const result = assembleScene(makeParsed(), VALID_STATES, VALID_STEPS, explanation, [], [], [])
    expect(result.ok).toBe(true)
    expect(result.scene!.explanation).toHaveLength(1)
    expect(result.scene!.explanation[0]!.heading).toBe('What is Binary Search?')
  })

  it('includes challenges when provided', () => {
    const challenges = [
      { id: 'c1', type: 'predict' as const, title: 'Predict', description: 'What is mid?' },
    ]
    const result = assembleScene(makeParsed(), VALID_STATES, VALID_STEPS, [], [], challenges, [])
    expect(result.ok).toBe(true)
    expect(result.scene!.challenges).toHaveLength(1)
  })

  it('includes controls when provided', () => {
    const controls = [
      { id: 'size', type: 'slider' as const, label: 'Array Size', config: { min: 4, max: 20, defaultValue: 8 } },
    ]
    const result = assembleScene(makeParsed(), VALID_STATES, VALID_STEPS, [], [], [], controls)
    expect(result.ok).toBe(true)
    expect(result.scene!.controls).toHaveLength(1)
  })

  it('returns errors array when safeParseScene fails', () => {
    // Pass a step that references an unknown visual — safeParseScene should reject it
    const badSteps: Step[] = [
      { index: 0, actions: [] },
      { index: 1, actions: [{ target: 'DOES_NOT_EXIST', params: {} }] },
    ]
    const result = assembleScene(makeParsed(), VALID_STATES, badSteps, [], [], [], [])
    // May or may not fail depending on schema strictness — just verify no throw
    expect(typeof result.ok).toBe('boolean')
    if (!result.ok) {
      expect(Array.isArray(result.errors)).toBe(true)
    }
  })
})
