import { describe, it, expect, beforeEach } from 'vitest'
import { useBoundStore } from '../store'

describe('playback-slice', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useBoundStore.setState({
      currentStep: 0,
      isPlaying: false,
      speed: 1,
      totalSteps: 0,
      isExpanded: false
    })
  })

  it('starts with default state', () => {
    const state = useBoundStore.getState()
    expect(state.currentStep).toBe(0)
    expect(state.isPlaying).toBe(false)
    expect(state.speed).toBe(1)
    expect(state.totalSteps).toBe(0)
    expect(state.isExpanded).toBe(false)
  })

  describe('setTotalSteps', () => {
    it('updates total steps', () => {
      // scene with 4 animation steps → totalSteps = 5 (positions 0..4)
      useBoundStore.getState().setTotalSteps(5)
      expect(useBoundStore.getState().totalSteps).toBe(5)
    })

    it('clamps currentStep down if new totalSteps is smaller', () => {
      // scene with 9 animation steps → totalSteps = 10 (positions 0..9)
      useBoundStore.getState().setTotalSteps(10)
      useBoundStore.getState().jumpToStep(8)
      expect(useBoundStore.getState().currentStep).toBe(8)

      // scene shrinks to 4 animation steps → totalSteps = 5 (positions 0..4)
      useBoundStore.getState().setTotalSteps(5)
      expect(useBoundStore.getState().currentStep).toBe(4) // clamped to totalSteps - 1
    })
  })

  describe('play/pause', () => {
    it('cannot play if totalSteps is 0', () => {
      useBoundStore.getState().play()
      expect(useBoundStore.getState().isPlaying).toBe(false)
    })

    it('plays if totalSteps > 0', () => {
      useBoundStore.getState().setTotalSteps(5)
      useBoundStore.getState().play()
      expect(useBoundStore.getState().isPlaying).toBe(true)
    })

    it('pauses playback', () => {
      useBoundStore.getState().setTotalSteps(5)
      useBoundStore.getState().play()
      useBoundStore.getState().pause()
      expect(useBoundStore.getState().isPlaying).toBe(false)
    })
  })

  describe('scrubbing (stepForward/stepBack)', () => {
    // Contract: scene with 3 animation steps → totalSteps = 3 + 1 = 4
    // Valid positions: step 0 (initial state) through step 3 (last animation step)
    beforeEach(() => {
      useBoundStore.getState().setTotalSteps(4)
    })

    it('steps forward from initial state through all animation steps', () => {
      expect(useBoundStore.getState().currentStep).toBe(0) // initial state

      useBoundStore.getState().stepForward()
      expect(useBoundStore.getState().currentStep).toBe(1)

      useBoundStore.getState().stepForward()
      expect(useBoundStore.getState().currentStep).toBe(2)

      useBoundStore.getState().stepForward()
      expect(useBoundStore.getState().currentStep).toBe(3) // last animation step

      // At end: clamps and stops playback instead of going out of bounds
      useBoundStore.getState().stepForward()
      expect(useBoundStore.getState().currentStep).toBe(3)
      expect(useBoundStore.getState().isPlaying).toBe(false)
    })

    it('steps backward until the beginning', () => {
      useBoundStore.getState().jumpToStep(3)
      useBoundStore.getState().stepBack()
      expect(useBoundStore.getState().currentStep).toBe(2)

      useBoundStore.getState().stepBack()
      expect(useBoundStore.getState().currentStep).toBe(1)

      useBoundStore.getState().stepBack()
      expect(useBoundStore.getState().currentStep).toBe(0)

      // Attempt to step before initial state
      useBoundStore.getState().stepBack()
      expect(useBoundStore.getState().currentStep).toBe(0)
    })

    it('correctly jumps to a specific step', () => {
      useBoundStore.getState().jumpToStep(2)
      expect(useBoundStore.getState().currentStep).toBe(2)
    })

    it('clamps jumpToStep within valid range [0, totalSteps - 1]', () => {
      // totalSteps = 4, valid range 0..3
      useBoundStore.getState().jumpToStep(10)
      expect(useBoundStore.getState().currentStep).toBe(3)

      useBoundStore.getState().jumpToStep(-5)
      expect(useBoundStore.getState().currentStep).toBe(0)
    })
  })

  describe('misc actions', () => {
    it('sets speed', () => {
      useBoundStore.getState().setSpeed(2)
      expect(useBoundStore.getState().speed).toBe(2)
    })

    it('toggles expansion', () => {
      useBoundStore.getState().toggleExpanded()
      expect(useBoundStore.getState().isExpanded).toBe(true)
      useBoundStore.getState().toggleExpanded()
      expect(useBoundStore.getState().isExpanded).toBe(false)
    })

    it('resets playback entirely', () => {
      useBoundStore.getState().setTotalSteps(5)
      useBoundStore.getState().jumpToStep(4)
      useBoundStore.getState().play()

      useBoundStore.getState().reset()
      expect(useBoundStore.getState().currentStep).toBe(0)
      expect(useBoundStore.getState().isPlaying).toBe(false)
    })
  })
})
