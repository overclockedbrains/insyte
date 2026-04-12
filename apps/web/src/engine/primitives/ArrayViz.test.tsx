import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ArrayViz } from './ArrayViz'

describe('ArrayViz primitive', () => {
  it('renders standard cells without crashing', () => {
    const state = {
      cells: [
        { value: 10 },
        { value: 20 },
        { value: 30 }
      ]
    }

    const { container } = render(<ArrayViz id="test-arr" state={state} step={0} />)
    expect(container.textContent).toContain('10')
    expect(container.textContent).toContain('20')
    expect(container.textContent).toContain('30')
  })

  it('renders pointers alongside cells', () => {
    const state = {
      cells: [{ value: 99 }],
      pointers: [{ index: 0, label: 'i' }]
    }

    const { container } = render(<ArrayViz id="test-arr" state={state} step={0} />)
    expect(container.textContent).toContain('99')
    expect(container.textContent).toContain('i') // Pointer label should be visible
  })
})
