import type { StateCreator } from 'zustand'
import type { BoundStore } from '../store'
import { createPlaybackActions } from '../shared/playbackActions'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlaybackSpeed = 0.5 | 1 | 1.5 | 2

export interface PlaybackSlice {
  // State
  currentStep: number
  isPlaying: boolean
  speed: PlaybackSpeed
  totalSteps: number
  isExpanded: boolean

  // Actions
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBack: () => void
  reset: () => void
  setSpeed: (speed: PlaybackSpeed) => void
  jumpToStep: (n: number) => void
  setTotalSteps: (n: number) => void
  setExpanded: (val: boolean) => void
  toggleExpanded: () => void
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createPlaybackSlice: StateCreator<
  BoundStore,
  [['zustand/immer', never]],
  [],
  PlaybackSlice
> = (set) => ({
  currentStep: 0,
  isPlaying: false,
  speed: 1,
  totalSteps: 0,
  isExpanded: false,
  ...createPlaybackActions(set),

  setExpanded: (val) =>
    set((state) => {
      state.isExpanded = val
    }),

  toggleExpanded: () =>
    set((state) => {
      state.isExpanded = !state.isExpanded
    }),
})


