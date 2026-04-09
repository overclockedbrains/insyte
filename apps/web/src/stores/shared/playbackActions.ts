import type { PlaybackSpeed } from '../slices/playback-slice'

interface PlaybackState {
  currentStep: number
  isPlaying: boolean
  speed: PlaybackSpeed
  totalSteps: number
}

interface PlaybackActions {
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBack: () => void
  reset: () => void
  setSpeed: (speed: PlaybackSpeed) => void
  jumpToStep: (step: number) => void
  setTotalSteps: (steps: number) => void
}

type PlaybackStore = PlaybackState & PlaybackActions
type ImmerSetter<T> = (updater: (state: T) => void) => void

export function createPlaybackActions<T extends PlaybackStore>(
  set: ImmerSetter<T>,
): PlaybackActions {
  return {
    play: () =>
      set((state) => {
        if (state.totalSteps > 0) {
          state.isPlaying = true
        }
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

    jumpToStep: (step) =>
      set((state) => {
        state.currentStep = Math.max(0, Math.min(step, state.totalSteps - 1))
      }),

    setTotalSteps: (steps) =>
      set((state) => {
        state.totalSteps = steps
        if (state.currentStep >= steps) {
          state.currentStep = Math.max(0, steps - 1)
        }
      }),
  }
}
