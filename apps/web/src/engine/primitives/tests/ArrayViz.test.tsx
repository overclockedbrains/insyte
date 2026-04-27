import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ArrayViz } from '../ArrayViz'

describe('ArrayViz primitive', () => {
  it('renders standard cells without crashing', () => {
    const state = {
      items: [
        { id: 'i0', value: 10 },
        { id: 'i1', value: 20 },
        { id: 'i2', value: 30 },
      ],
    }

    const { container } = render(<ArrayViz id="test-arr" state={state} step={0} />)
    expect(container.textContent).toContain('10')
    expect(container.textContent).toContain('20')
    expect(container.textContent).toContain('30')
  })

  it('renders pointers alongside cells', () => {
    const state = {
      items: [{ id: 'i0', value: 99 }],
      pointers: [{ index: 0, label: 'i' }],
    }

    const { container } = render(<ArrayViz id="test-arr" state={state} step={0} />)
    expect(container.textContent).toContain('99')
    expect(container.textContent).toContain('i')
  })
})
