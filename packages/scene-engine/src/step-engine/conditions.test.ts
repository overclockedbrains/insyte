import { describe, it, expect } from 'vitest'
import { evaluateCondition } from './conditions'
import type { Condition } from '../types'

describe('conditions evaluate', () => {
  it('handles step-range condition', () => {
    const cond: Condition = { type: 'step-range', from: 2, to: 5 }
    
    expect(evaluateCondition(cond, [], 1)).toBe(false)
    expect(evaluateCondition(cond, [], 2)).toBe(true)
    expect(evaluateCondition(cond, [], 3)).toBe(true)
    expect(evaluateCondition(cond, [], 5)).toBe(true)
    expect(evaluateCondition(cond, [], 6)).toBe(false)
  })

  it('handles after-step condition', () => {
    const cond: Condition = { type: 'after-step', after: 3 }
    
    expect(evaluateCondition(cond, [], 2)).toBe(false)
    expect(evaluateCondition(cond, [], 3)).toBe(true)
    expect(evaluateCondition(cond, [], 10)).toBe(true)
  })

  it('handles before-step condition', () => {
    const cond: Condition = { type: 'before-step', before: 3 }
    
    expect(evaluateCondition(cond, [], 1)).toBe(true)
    expect(evaluateCondition(cond, [], 2)).toBe(true)
    expect(evaluateCondition(cond, [], 3)).toBe(false)
    expect(evaluateCondition(cond, [], 4)).toBe(false)
  })

  it('handles control-toggle condition structurally (always true to engine)', () => {
    const cond: Condition = { type: 'control-toggle', controlId: 'show-hints' }
    
    // Pure step engine evaluating topological structure ignores external Zustand state.
    expect(evaluateCondition(cond, [], 0)).toBe(true)
    expect(evaluateCondition(cond, [], 99)).toBe(true)
  })

  it('handles always condition', () => {
    const cond: Condition = { type: 'always' }
    
    expect(evaluateCondition(cond, [], 0)).toBe(true)
    expect(evaluateCondition(cond, [], 99)).toBe(true)
  })
})
