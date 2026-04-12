import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HowItWorks } from './HowItWorks'

describe('HowItWorks', () => {
  it('renders the section header', () => {
    render(<HowItWorks />)
    
    // Check if the main heading is present
    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByText('From prompt to interactive simulation in three focused steps.')).toBeInTheDocument()
  })

  it('renders all three step cards', () => {
    render(<HowItWorks />)
    
    // Step 1
    expect(screen.getAllByText('Step 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Type').length).toBeGreaterThan(0)
    
    // Step 2
    expect(screen.getAllByText('Step 2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Watch it Come Alive').length).toBeGreaterThan(0)
    
    // Step 3
    expect(screen.getAllByText('Step 3').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Master It').length).toBeGreaterThan(0)
  })
})
