import { describe, it, expect } from 'vitest'
import { stripCodeFences, joinStepContinuations } from './iscl-preprocess'
import { parseISCL } from '@insyte/scene-engine'

// ─── stripCodeFences ──────────────────────────────────────────────────────────

describe('stripCodeFences', () => {
  it('strips ```iscl fences', () => {
    const raw = '```iscl\nSCENE "Test"\n```'
    expect(stripCodeFences(raw)).toBe('SCENE "Test"')
  })

  it('strips ```json fences', () => {
    const raw = '```json\n{"foo":1}\n```'
    expect(stripCodeFences(raw)).toBe('{"foo":1}')
  })

  it('strips bare ``` fences', () => {
    const raw = '```\nSCENE "Test"\n```'
    expect(stripCodeFences(raw)).toBe('SCENE "Test"')
  })

  it('leaves plain text unchanged', () => {
    const raw = 'SCENE "Test"'
    expect(stripCodeFences(raw)).toBe('SCENE "Test"')
  })

  it('trims surrounding whitespace', () => {
    const raw = '  \nSCENE "Test"\n  '
    expect(stripCodeFences(raw)).toBe('SCENE "Test"')
  })
})

// ─── joinStepContinuations ────────────────────────────────────────────────────

describe('joinStepContinuations', () => {
  it('leaves well-formed single-line STEPs unchanged', () => {
    const script = [
      'SCENE "Test"',
      'STEP 0 : init',
      'STEP 1 : SET arr cells=[{v:1}]',
    ].join('\n')
    expect(joinStepContinuations(script)).toBe(script)
  })

  it('joins a bare SET continuation onto the previous STEP line', () => {
    const input = [
      'STEP 1 : SET arr cells=[{v:1}]',
      'SET arr highlight=0',
    ].join('\n')
    const output = joinStepContinuations(input)
    expect(output).toBe('STEP 1 : SET arr cells=[{v:1}] | SET arr highlight=0')
  })

  it('handles pipe-split continuation (previous line ends with |)', () => {
    const input = [
      'STEP 1 : SET arr cells=[{v:1}] |',
      'SET arr highlight=0',
    ].join('\n')
    const output = joinStepContinuations(input)
    expect(output).toBe('STEP 1 : SET arr cells=[{v:1}] | SET arr highlight=0')
  })

  it('handles empty-body STEP (body on next line)', () => {
    const input = [
      'STEP 1 :',
      'SET arr cells=[{v:1}]',
    ].join('\n')
    const output = joinStepContinuations(input)
    expect(output).toBe('STEP 1 : SET arr cells=[{v:1}]')
  })

  it('joins multiple continuation lines', () => {
    const input = [
      'STEP 1 : SET arr cells=[{v:1}]',
      'SET arr highlight=0',
      'SET counter value=1',
    ].join('\n')
    const output = joinStepContinuations(input)
    expect(output).toBe('STEP 1 : SET arr cells=[{v:1}] | SET arr highlight=0 | SET counter value=1')
  })

  it('skips blank lines between STEP and SET', () => {
    const input = [
      'STEP 1 : SET arr cells=[{v:1}]',
      '',
      'SET arr highlight=0',
    ].join('\n')
    const output = joinStepContinuations(input)
    expect(output).toBe('STEP 1 : SET arr cells=[{v:1}] | SET arr highlight=0\n')
  })

  it('does not join SET onto an init step (drops stray SET after STEP 0 : init)', () => {
    // AI sometimes puts SET lines after "STEP 0 : init" by mistake.
    // Joining them would create an invalid body "init | SET …".
    const input = [
      'STEP 0 : init',
      'SET arr cells=[{v:1}]',   // stray — should be dropped
      'STEP 1 : SET arr cells=[{v:2}]',
    ].join('\n')
    const output = joinStepContinuations(input)
    // STEP 0 must stay as-is; the stray SET must not appear anywhere
    expect(output).toContain('STEP 0 : init')
    expect(output).not.toContain('init | SET')
    // STEP 1 must be unaffected
    expect(output).toContain('STEP 1 : SET arr cells=[{v:2}]')
  })

  it('produces valid ISCL that parseISCL accepts', () => {
    const multilineSCL = [
      'SCENE "DNS Resolution"',
      'TYPE hld',
      'LAYOUT canvas-only',
      'VISUAL system-diagram dns-system HINT dagre-LR',
      'STEP 0 : init',
      'STEP 1 : SET dns-system nodes=[{id:client,label:Client},{id:resolver,label:Resolver}]',
      'SET dns-system edges=[{from:client,to:resolver,label:Query}]',
      'STEP 2 : SET dns-system nodes=[{id:client,label:Client,h:active},{id:resolver,label:Resolver}]',
      'EXPLANATION',
      '  1 : "DNS Query" | "Client sends query to resolver"',
    ].join('\n')

    const preprocessed = joinStepContinuations(multilineSCL)
    const result = parseISCL(preprocessed)
    expect(result.ok).toBe(true)
    expect(result.parsed!.stepCount).toBe(3)
  })
})
