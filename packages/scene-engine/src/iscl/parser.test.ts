import { describe, it, expect } from 'vitest'
import { parseISCL } from './parser'

const BINARY_SEARCH_ISCL = [
  'SCENE "Binary Search"',
  'TYPE dsa-trace',
  'LAYOUT canvas-only',
  '',
  'VISUAL array arr HINT linear-H',
  'VISUAL counter left-ptr SLOT bottom-left',
  '',
  'STEP 0 : init',
  'STEP 1 : SET arr cells=[{v:1}] | SET left-ptr value=0',
  'STEP 2 : SET left-ptr value=1',
  'STEP 3 : SET arr cells=[{v:1},{v:2}]',
  'STEP 4 : SET arr cells=[{v:1},{v:2},{v:3}]',
  'STEP 5 : SET left-ptr value=2',
  '',
  'EXPLANATION',
  '  0 : "Init" | "Starting"',
  '  1 : "Step 1" | "Doing 1"',
  '  2 : "Step 2" | "Doing 2"'
].join('\n')

describe('parseISCL', () => {
  it('parses a valid binary search script', () => {
    const result = parseISCL(BINARY_SEARCH_ISCL)
    expect(result.ok).toBe(true)
    expect(result.parsed!.stepCount).toBe(6)
    expect(result.parsed!.visualIds).toContain('arr')
    expect(result.parsed!.visualIds).toContain('left-ptr')
  })

  it('rejects unknown visual ID in SET', () => {
    const script = ['SCENE "Test"', 'TYPE concept', 'LAYOUT canvas-only', 'VISUAL array arr', 'STEP 0 : init', 'STEP 1 : SET unknown-id cells=[{v:1}]'].join('\n')
    const result = parseISCL(script)
    expect(result.ok).toBe(false)
    expect(result.error!.message).toContain('unknown-id')
  })

  it('rejects out-of-range explanation step index', () => {
    const script = ['SCENE "Test"', 'TYPE concept', 'LAYOUT canvas-only', 'VISUAL array arr', 'STEP 0 : init', 'EXPLANATION', '  5 : "Bad" | "Too high"'].join('\n')
    const result = parseISCL(script)
    expect(result.ok).toBe(false)
    expect(result.error!.message).toContain('step 5')
  })

  it('rejects duplicate visual IDs', () => {
    const script = ['SCENE "Test"', 'TYPE concept', 'LAYOUT canvas-only', 'VISUAL array arr', 'VISUAL hashmap arr', 'STEP 0 : init'].join('\n')
    const result = parseISCL(script)
    expect(result.ok).toBe(false)
    expect(result.error!.message).toContain('Duplicate visual ID: "arr"')
  })

  it('rejects non-monotonic step numbering', () => {
    const script = ['SCENE "Test"', 'TYPE concept', 'LAYOUT canvas-only', 'VISUAL array arr', 'STEP 0 : init', 'STEP 2 : SET arr cells=[]'].join('\n')
    const result = parseISCL(script)
    expect(result.ok).toBe(false)
    expect(result.error!.message).toContain('numbered sequentially')
  })

  it('rejects POPUP referencing unknown visual', () => {
    const script = ['SCENE "Test"', 'TYPE concept', 'LAYOUT canvas-only', 'VISUAL array arr', 'STEP 0 : init', 'POPUP bad AT 0 : "Hello"'].join('\n')
    const result = parseISCL(script)
    expect(result.ok).toBe(false)
    expect(result.error!.message).toContain('unknown visual ID "bad"')
  })

  it('rejects POPUP showing out of bounds', () => {
    const script = ['SCENE "Test"', 'TYPE concept', 'LAYOUT canvas-only', 'VISUAL array arr', 'STEP 0 : init', 'POPUP arr AT 1 : "Hello"'].join('\n')
    const result = parseISCL(script)
    expect(result.ok).toBe(false)
    // Only 1 step (index 0). showing at 1 is beyond bounds
    expect(result.error!.message).toContain('exceeds step count 1')
  })

  it('rejects STEP 0 that is not init', () => {
    const script = ['SCENE "Test"', 'TYPE concept', 'LAYOUT canvas-only', 'VISUAL array arr', 'STEP 0 : SET arr cells=[]'].join('\n')
    const result = parseISCL(script)
    expect(result.ok).toBe(false)
    expect(result.error!.message).toContain('First STEP must be: STEP 0 : init')
  })

  it('parses all 13 visual types', () => {
    const types = ['array', 'hashmap', 'linked-list', 'tree', 'graph', 'stack', 'queue', 'dp-table', 'grid', 'recursion-tree', 'system-diagram', 'text-badge', 'counter']
    const decls = types.map((t, i) => "VISUAL " + t + " v" + i)
    const script = ['SCENE "Test"', 'TYPE concept', 'LAYOUT canvas-only', ...decls, 'STEP 0 : init'].join('\n')
    const result = parseISCL(script)
    expect(result.ok).toBe(true)
    expect(result.parsed!.visualDecls).toHaveLength(13)
  })

  it('parses all control types (slider/toggle/button)', () => {
    const script = ['SCENE "Test"', 'TYPE concept', 'LAYOUT canvas-only', 'VISUAL array arr', 'STEP 0 : init', 'CONTROL slider mySlider "Slider!" MIN 0 MAX 10 DEFAULT 5', 'CONTROL toggle myToggle "Toggle!" on', 'CONTROL button myButton "Button!"'].join('\n')
    const result = parseISCL(script)
    expect(result.ok).toBe(true)
    expect(result.parsed!.controls).toHaveLength(3)

    const slider = result.parsed!.controls.find(c => c.id === 'mySlider')!
    expect(slider.controlType).toBe('slider')
    expect(slider.config).toEqual({ min: 0, max: 10, default: 5 })

    const toggle = result.parsed!.controls.find(c => c.id === 'myToggle')!
    expect(toggle.controlType).toBe('toggle')
    expect(toggle.config).toEqual({ default: true })

    const button = result.parsed!.controls.find(c => c.id === 'myButton')!
    expect(button.controlType).toBe('button')
  })
})
