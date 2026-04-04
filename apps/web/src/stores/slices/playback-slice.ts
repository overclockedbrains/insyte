import type { StateCreator } from 'zustand'
import type { BoundStore } from '../store'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlaybackSpeed = 0.5 | 1 | 1.5 | 2

export interface PlaybackSlice {
  // State
  currentStep: number
  isPlaying: boolean
  speed: PlaybackSpeed
  totalSteps: number

  // Actions
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBack: () => void
  reset: () => void
  setSpeed: (speed: PlaybackSpeed) => void
  jumpToStep: (n: number) => void
  setTotalSteps: (n: number) => void
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createPlaybackSlice: StateCreator<
  BoundStore,
  [['zustand/immer', never]],
  [],
  PlaybackSlice
> = (set, get) => ({
  currentStep: 0,
  isPlaying: false,
  speed: 1,
  totalSteps: 0,

  play: () =>
    set((state) => {
      if (state.totalSteps > 0) state.isPlaying = true
    }),

  pause: () =>
    set((state) => {
      state.isPlaying = false
    }),

  stepForward: () =>
    set((state) => {
      if (state.currentStep < state.totalSteps - 1) {
        state.currentStep += 1
      } else {
        // Reached end — pause
        state.isPlaying = false
      }
    }),

  stepBack: () =>
    set((state) => {
      if (state.currentStep > 0) {
        state.currentStep -= 1
      }
    }),

  reset: () =>
    set((state) => {
      state.currentStep = 0
      state.isPlaying = false
    }),

  setSpeed: (speed) =>
    set((state) => {
      state.speed = speed
    }),

  jumpToStep: (n) =>
    set((state) => {
      const clamped = Math.max(0, Math.min(n, state.totalSteps - 1))
      state.currentStep = clamped
    }),

  setTotalSteps: (n) =>
    set((state) => {
      state.totalSteps = n
      // Clamp currentStep if it's now out of range
      if (state.currentStep >= n) {
        state.currentStep = Math.max(0, n - 1)
      }
    }),
})

// Re-export for convenience
export type { BoundStore }
