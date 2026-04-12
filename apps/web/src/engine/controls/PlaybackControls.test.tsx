import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlaybackControls } from './PlaybackControls'
import { usePlayerStore } from '@/src/stores/player-store'
import * as mq from '@/components/hooks/useMediaQuery'

// Mock the Zustand store entirely
vi.mock('@/src/stores/player-store', () => ({
  usePlayerStore: vi.fn(),
}))

describe('PlaybackControls', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(mq, 'useIsMobile').mockReturnValue(false)
  })

  it('renders disabled state when totalSteps is 0', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(usePlayerStore).mockImplementation((selector: any) => {
      const state = {
        totalSteps: 0,
        currentStep: 0,
        isPlaying: false,
        speed: 1,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return selector(state as any)
    })

    render(<PlaybackControls />)
    expect(screen.getByText('-- / --')).toBeInTheDocument()
    
    const playButton = screen.getByTitle('Play')
    expect(playButton).toBeDisabled()
  })

  it('renders active stats when totalSteps > 0', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(usePlayerStore).mockImplementation((selector: any) => {
      const state = {
        totalSteps: 5,
        currentStep: 2,
        isPlaying: false,
        speed: 1,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return selector(state as any)
    })

    render(<PlaybackControls />)
    
    // Shows user-friendly index (currentStep is 0-indexed, so 2 -> 3)
    expect(screen.getByText('Step 3 / 5')).toBeInTheDocument()
    
    const playButton = screen.getByTitle('Play')
    expect(playButton).not.toBeDisabled()
  })
})
