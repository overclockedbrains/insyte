import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PopularChips } from './PopularChips'

// Mock the Zustand store hook
vi.mock('@/src/stores/store', () => ({
  useBoundStore: vi.fn(() => vi.fn())
}))

describe('PopularChips', () => {
  it('renders the "Popular:" label and chips', () => {
    render(<PopularChips />)
    
    // Check for the "Popular:" label
    expect(screen.getByText('Popular:')).toBeInTheDocument()
    
    // Check that at least some known chips render
    expect(screen.getByText('Hash Tables')).toBeInTheDocument()
    expect(screen.getByText('Two Sum')).toBeInTheDocument()
  })
})
